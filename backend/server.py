from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import secrets
import bcrypt
import jwt as pyjwt
import requests
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, Query, Header
from fastapi.responses import Response as FastAPIResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ---- Config ----
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
APP_NAME = os.environ.get('APP_NAME', 'khattameetha')
JWT_ALGORITHM = "HS256"
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="KHATTA-MEETHA API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ---- Storage helpers ----
storage_key: Optional[str] = None

def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        logger.info("Object storage initialized")
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str):
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not available")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    if resp.status_code == 403:
        # try re-init
        global storage_key
        storage_key = None
        key = init_storage()
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120,
        )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# ---- Password / JWT ----
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

# ---- Models ----
ROLE = Literal["khatta", "meetha", "admin"]
PROPERTY_TYPE = Literal["PG", "Single Room", "Shared Room", "Flat", "Apartment", "Independent House"]
APPT_STATUS = Literal["pending", "approved", "rejected", "rescheduled", "completed"]
PROP_STATUS = Literal["available", "occupied"]

class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: ROLE
    phone: Optional[str] = None

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class ForgotIn(BaseModel):
    email: EmailStr

class ResetIn(BaseModel):
    token: str
    new_password: str

class GoogleSessionIn(BaseModel):
    session_id: str
    role: Optional[ROLE] = "meetha"

class PropertyIn(BaseModel):
    title: str
    description: str
    property_type: PROPERTY_TYPE
    rent: float
    deposit: float
    address: str
    city: str
    latitude: float
    longitude: float
    amenities: List[str] = []
    rules: List[str] = []
    images: List[str] = []
    videos: List[str] = []
    furnished: Literal["Furnished", "Semi-Furnished", "Unfurnished"] = "Unfurnished"
    bhk: Optional[str] = None
    gender_preference: Literal["Any", "Male", "Female"] = "Any"
    food_included: bool = False
    ac: bool = False
    wifi: bool = False
    parking: bool = False
    attached_bath: bool = False
    balcony: bool = False
    pet_friendly: bool = False
    status: PROP_STATUS = "available"

class AppointmentIn(BaseModel):
    property_id: str
    visit_date: str  # ISO
    message: Optional[str] = ""

class ApptUpdateIn(BaseModel):
    status: APPT_STATUS
    visit_date: Optional[str] = None

class MessageIn(BaseModel):
    to_user_id: str
    property_id: Optional[str] = None
    text: str

class ReviewIn(BaseModel):
    property_id: str
    rating: int
    comment: str

class SaveIn(BaseModel):
    property_id: str

class RentReminderIn(BaseModel):
    tenant_id: str
    property_id: str
    amount: float
    month: str

class DocumentIn(BaseModel):
    doc_type: Literal["Aadhaar", "PAN", "College ID", "Government ID"]
    url: str

# ---- Auth helpers ----
def make_user_public(u: dict) -> dict:
    return {
        "id": u["id"],
        "email": u["email"],
        "name": u["name"],
        "role": u["role"],
        "phone": u.get("phone"),
        "picture": u.get("picture"),
        "verified": u.get("verified", False),
        "created_at": u.get("created_at"),
    }

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        # Try session_token (google)
        st = request.cookies.get("session_token")
        if st:
            doc = await db.user_sessions.find_one({"session_token": st}, {"_id": 0})
            if doc:
                exp = doc.get("expires_at")
                if isinstance(exp, str):
                    exp = datetime.fromisoformat(exp)
                if exp and exp.tzinfo is None:
                    exp = exp.replace(tzinfo=timezone.utc)
                if exp and exp > datetime.now(timezone.utc):
                    user = await db.users.find_one({"id": doc["user_id"]}, {"_id": 0, "password_hash": 0})
                    if user:
                        return user
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_role(*roles):
    async def checker(user: dict = Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return checker

def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token", value=token, httponly=True, secure=True,
        samesite="none", max_age=7 * 24 * 3600, path="/",
    )

# ---- Auth endpoints ----
@api_router.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    if payload.role == "admin":
        raise HTTPException(status_code=400, detail="Cannot self-register as admin")
    uid = str(uuid.uuid4())
    user_doc = {
        "id": uid, "email": email, "name": payload.name, "role": payload.role,
        "phone": payload.phone, "password_hash": hash_password(payload.password),
        "verified": False, "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    token = create_access_token(uid, email, payload.role)
    set_auth_cookie(response, token)
    return {"user": make_user_public(user_doc), "token": token}

@api_router.post("/auth/login")
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], email, user["role"])
    set_auth_cookie(response, token)
    return {"user": make_user_public(user), "token": token}

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("session_token", path="/")
    return {"ok": True}

@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return make_user_public(user)

@api_router.post("/auth/forgot-password")
async def forgot_password(payload: ForgotIn):
    user = await db.users.find_one({"email": payload.email.lower()})
    if not user:
        return {"ok": True}  # no leak
    token = secrets.token_urlsafe(32)
    await db.password_reset_tokens.insert_one({
        "token": token, "user_id": user["id"], "used": False,
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
    })
    logger.info(f"PASSWORD RESET LINK for {payload.email}: /reset-password?token={token}")
    return {"ok": True, "dev_token": token}

@api_router.post("/auth/reset-password")
async def reset_password(payload: ResetIn):
    rec = await db.password_reset_tokens.find_one({"token": payload.token, "used": False})
    if not rec:
        raise HTTPException(status_code=400, detail="Invalid token")
    exp = rec["expires_at"]
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp)
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token expired")
    await db.users.update_one({"id": rec["user_id"]}, {"$set": {"password_hash": hash_password(payload.new_password)}})
    await db.password_reset_tokens.update_one({"token": payload.token}, {"$set": {"used": True}})
    return {"ok": True}

@api_router.post("/auth/google/session")
async def google_session(payload: GoogleSessionIn, response: Response):
    """Exchange Emergent OAuth session_id for our user."""
    try:
        r = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": payload.session_id}, timeout=15,
        )
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid session: {e}")
    email = data["email"].lower()
    user = await db.users.find_one({"email": email})
    if not user:
        uid = str(uuid.uuid4())
        user = {
            "id": uid, "email": email, "name": data.get("name", email),
            "picture": data.get("picture"), "role": payload.role or "meetha",
            "verified": True, "password_hash": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user)
    else:
        await db.users.update_one({"email": email}, {"$set": {"picture": data.get("picture", user.get("picture"))}})
    # store session_token
    await db.user_sessions.insert_one({
        "user_id": user["id"], "session_token": data["session_token"],
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
    })
    response.set_cookie(
        key="session_token", value=data["session_token"], httponly=True, secure=True,
        samesite="none", max_age=7 * 24 * 3600, path="/",
    )
    # Also issue our JWT access token so both work
    token = create_access_token(user["id"], email, user["role"])
    set_auth_cookie(response, token)
    return {"user": make_user_public(user), "token": token}

@api_router.post("/auth/set-role")
async def set_role(body: dict, user: dict = Depends(get_current_user)):
    role = body.get("role")
    if role not in ("khatta", "meetha"):
        raise HTTPException(status_code=400, detail="Invalid role")
    await db.users.update_one({"id": user["id"]}, {"$set": {"role": role}})
    user["role"] = role
    return make_user_public(user)

# ---- Upload ----
@api_router.post("/upload")
async def upload(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "bin"
    if ext not in ("jpg", "jpeg", "png", "webp", "gif", "mp4", "mov", "webm", "pdf"):
        raise HTTPException(status_code=400, detail="Unsupported file type")
    path = f"{APP_NAME}/uploads/{user['id']}/{uuid.uuid4().hex}.{ext}"
    data = await file.read()
    result = put_object(path, data, file.content_type or "application/octet-stream")
    await db.files.insert_one({
        "id": str(uuid.uuid4()), "storage_path": result["path"], "owner_id": user["id"],
        "content_type": file.content_type, "size": result.get("size", len(data)),
        "is_deleted": False, "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"path": result["path"], "url": f"/api/files/{result['path']}"}

@api_router.get("/files/{path:path}")
async def files_get(path: str):
    rec = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not rec:
        raise HTTPException(status_code=404, detail="File not found")
    data, ct = get_object(path)
    return FastAPIResponse(content=data, media_type=rec.get("content_type") or ct)

# ---- Properties ----
def haversine_km(lat1, lon1, lat2, lon2):
    from math import radians, sin, cos, asin, sqrt
    R = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return 2 * R * asin(sqrt(a))

@api_router.get("/properties")
async def list_properties(
    q: Optional[str] = None,
    city: Optional[str] = None,
    property_type: Optional[str] = None,
    min_rent: Optional[float] = None,
    max_rent: Optional[float] = None,
    furnished: Optional[str] = None,
    ac: Optional[bool] = None,
    wifi: Optional[bool] = None,
    parking: Optional[bool] = None,
    pet_friendly: Optional[bool] = None,
    gender_preference: Optional[str] = None,
    status: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius_km: Optional[float] = None,
    owner_id: Optional[str] = None,
    limit: int = 60,
):
    query = {}
    if status: query["status"] = status
    if city: query["city"] = {"$regex": city, "$options": "i"}
    if property_type: query["property_type"] = property_type
    if furnished: query["furnished"] = furnished
    if owner_id: query["owner_id"] = owner_id
    if gender_preference: query["gender_preference"] = gender_preference
    if ac is not None: query["ac"] = ac
    if wifi is not None: query["wifi"] = wifi
    if parking is not None: query["parking"] = parking
    if pet_friendly is not None: query["pet_friendly"] = pet_friendly
    rent_q = {}
    if min_rent is not None: rent_q["$gte"] = min_rent
    if max_rent is not None: rent_q["$lte"] = max_rent
    if rent_q: query["rent"] = rent_q
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"address": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.properties.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit * 2)
    if lat is not None and lng is not None and radius_km:
        docs = [d for d in docs if haversine_km(lat, lng, d["latitude"], d["longitude"]) <= radius_km]
    if lat is not None and lng is not None:
        for d in docs:
            d["distance_km"] = round(haversine_km(lat, lng, d["latitude"], d["longitude"]), 2)
    return docs[:limit]

@api_router.get("/properties/{pid}")
async def get_property(pid: str):
    doc = await db.properties.find_one({"id": pid}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Property not found")
    owner = await db.users.find_one({"id": doc["owner_id"]}, {"_id": 0, "password_hash": 0})
    if owner:
        doc["owner"] = make_user_public(owner)
    return doc

@api_router.post("/properties")
async def create_property(payload: PropertyIn, user: dict = Depends(require_role("khatta", "admin"))):
    pid = str(uuid.uuid4())
    doc = payload.model_dump()
    doc["id"] = pid
    doc["owner_id"] = user["id"]
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["rating"] = 0
    doc["review_count"] = 0
    await db.properties.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.put("/properties/{pid}")
async def update_property(pid: str, payload: PropertyIn, user: dict = Depends(require_role("khatta", "admin"))):
    existing = await db.properties.find_one({"id": pid})
    if not existing:
        raise HTTPException(status_code=404, detail="Property not found")
    if existing["owner_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    update = payload.model_dump()
    await db.properties.update_one({"id": pid}, {"$set": update})
    return {"ok": True}

@api_router.delete("/properties/{pid}")
async def delete_property(pid: str, user: dict = Depends(require_role("khatta", "admin"))):
    existing = await db.properties.find_one({"id": pid})
    if not existing:
        raise HTTPException(status_code=404, detail="Property not found")
    if existing["owner_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    await db.properties.delete_one({"id": pid})
    return {"ok": True}

@api_router.patch("/properties/{pid}/status")
async def patch_status(pid: str, body: dict, user: dict = Depends(require_role("khatta", "admin"))):
    status = body.get("status")
    if status not in ("available", "occupied"):
        raise HTTPException(status_code=400, detail="Bad status")
    existing = await db.properties.find_one({"id": pid})
    if not existing:
        raise HTTPException(status_code=404, detail="Not found")
    if existing["owner_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    await db.properties.update_one({"id": pid}, {"$set": {"status": status}})
    return {"ok": True}

# ---- Appointments ----
@api_router.post("/appointments")
async def create_appointment(payload: AppointmentIn, user: dict = Depends(require_role("meetha"))):
    prop = await db.properties.find_one({"id": payload.property_id})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    doc = {
        "id": str(uuid.uuid4()),
        "property_id": payload.property_id,
        "property_title": prop["title"],
        "owner_id": prop["owner_id"],
        "tenant_id": user["id"],
        "tenant_name": user["name"],
        "visit_date": payload.visit_date,
        "message": payload.message,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.appointments.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/appointments")
async def list_appointments(user: dict = Depends(get_current_user)):
    if user["role"] == "khatta":
        docs = await db.appointments.find({"owner_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    elif user["role"] == "meetha":
        docs = await db.appointments.find({"tenant_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    else:
        docs = await db.appointments.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs

@api_router.patch("/appointments/{aid}")
async def update_appointment(aid: str, payload: ApptUpdateIn, user: dict = Depends(get_current_user)):
    appt = await db.appointments.find_one({"id": aid})
    if not appt:
        raise HTTPException(status_code=404, detail="Not found")
    if user["role"] == "khatta" and appt["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    if user["role"] == "meetha" and appt["tenant_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    upd = {"status": payload.status}
    if payload.visit_date:
        upd["visit_date"] = payload.visit_date
    await db.appointments.update_one({"id": aid}, {"$set": upd})
    return {"ok": True}

# ---- Chat ----
@api_router.post("/messages")
async def send_message(payload: MessageIn, user: dict = Depends(get_current_user)):
    if user["role"] == "guest":
        raise HTTPException(status_code=403, detail="Guests cannot chat")
    participants = sorted([user["id"], payload.to_user_id])
    conv_id = f"{participants[0]}__{participants[1]}"
    if payload.property_id:
        conv_id += f"__{payload.property_id}"
    doc = {
        "id": str(uuid.uuid4()),
        "conv_id": conv_id,
        "from_user_id": user["id"],
        "from_name": user["name"],
        "to_user_id": payload.to_user_id,
        "property_id": payload.property_id,
        "text": payload.text,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "read": False,
    }
    await db.messages.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/messages")
async def get_messages(with_user: str, property_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    participants = sorted([user["id"], with_user])
    conv_id = f"{participants[0]}__{participants[1]}"
    if property_id:
        conv_id += f"__{property_id}"
    docs = await db.messages.find({"conv_id": conv_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    # mark as read
    await db.messages.update_many({"conv_id": conv_id, "to_user_id": user["id"]}, {"$set": {"read": True}})
    return docs

@api_router.get("/conversations")
async def list_conversations(user: dict = Depends(get_current_user)):
    pipeline = [
        {"$match": {"$or": [{"from_user_id": user["id"]}, {"to_user_id": user["id"]}]}},
        {"$sort": {"created_at": -1}},
        {"$group": {"_id": "$conv_id", "last": {"$first": "$$ROOT"}}},
    ]
    convs = []
    async for c in db.messages.aggregate(pipeline):
        last = c["last"]
        last.pop("_id", None)
        other_id = last["to_user_id"] if last["from_user_id"] == user["id"] else last["from_user_id"]
        other = await db.users.find_one({"id": other_id}, {"_id": 0, "password_hash": 0})
        last["other_user"] = make_user_public(other) if other else None
        convs.append(last)
    return convs

# ---- Saved ----
@api_router.post("/favorites")
async def save_property(payload: SaveIn, user: dict = Depends(require_role("meetha"))):
    existing = await db.saved_properties.find_one({"user_id": user["id"], "property_id": payload.property_id})
    if existing:
        return {"ok": True}
    await db.saved_properties.insert_one({
        "id": str(uuid.uuid4()), "user_id": user["id"], "property_id": payload.property_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True}

@api_router.delete("/favorites/{pid}")
async def unsave_property(pid: str, user: dict = Depends(require_role("meetha"))):
    await db.saved_properties.delete_one({"user_id": user["id"], "property_id": pid})
    return {"ok": True}

@api_router.get("/favorites")
async def get_favorites(user: dict = Depends(require_role("meetha"))):
    saves = await db.saved_properties.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    pids = [s["property_id"] for s in saves]
    if not pids:
        return []
    props = await db.properties.find({"id": {"$in": pids}}, {"_id": 0}).to_list(200)
    return props

# ---- Reviews ----
@api_router.post("/reviews")
async def add_review(payload: ReviewIn, user: dict = Depends(require_role("meetha"))):
    if payload.rating < 1 or payload.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be 1-5")
    doc = {
        "id": str(uuid.uuid4()), "property_id": payload.property_id,
        "user_id": user["id"], "user_name": user["name"],
        "rating": payload.rating, "comment": payload.comment,
        "owner_reply": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.reviews.insert_one(doc)
    # update aggregate
    all_rev = await db.reviews.find({"property_id": payload.property_id}).to_list(1000)
    avg = sum(r["rating"] for r in all_rev) / len(all_rev)
    await db.properties.update_one({"id": payload.property_id}, {"$set": {"rating": round(avg, 2), "review_count": len(all_rev)}})
    doc.pop("_id", None)
    return doc

@api_router.get("/reviews/{pid}")
async def get_reviews(pid: str):
    docs = await db.reviews.find({"property_id": pid}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs

@api_router.post("/reviews/{rid}/reply")
async def reply_review(rid: str, body: dict, user: dict = Depends(require_role("khatta"))):
    rev = await db.reviews.find_one({"id": rid})
    if not rev:
        raise HTTPException(status_code=404, detail="Not found")
    prop = await db.properties.find_one({"id": rev["property_id"]})
    if not prop or prop["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    await db.reviews.update_one({"id": rid}, {"$set": {"owner_reply": body.get("reply", "")}})
    return {"ok": True}

# ---- Rent ----
@api_router.post("/rent-reminders")
async def send_rent_reminder(payload: RentReminderIn, user: dict = Depends(require_role("khatta"))):
    doc = {
        "id": str(uuid.uuid4()), "owner_id": user["id"], "tenant_id": payload.tenant_id,
        "property_id": payload.property_id, "amount": payload.amount,
        "month": payload.month, "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.rent_records.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/rent-records")
async def list_rent(user: dict = Depends(get_current_user)):
    q = {"owner_id": user["id"]} if user["role"] == "khatta" else {"tenant_id": user["id"]}
    docs = await db.rent_records.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs

@api_router.patch("/rent-records/{rid}")
async def update_rent(rid: str, body: dict, user: dict = Depends(get_current_user)):
    await db.rent_records.update_one({"id": rid}, {"$set": {"status": body.get("status", "paid")}})
    return {"ok": True}

# ---- Documents ----
@api_router.post("/documents")
async def add_document(payload: DocumentIn, user: dict = Depends(require_role("meetha"))):
    doc = {
        "id": str(uuid.uuid4()), "user_id": user["id"],
        "doc_type": payload.doc_type, "url": payload.url,
        "verified": False, "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.documents.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/documents")
async def list_documents(user: dict = Depends(get_current_user)):
    if user["role"] == "admin":
        docs = await db.documents.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    else:
        docs = await db.documents.find({"user_id": user["id"]}, {"_id": 0}).to_list(50)
    return docs

@api_router.patch("/documents/{did}/verify")
async def verify_document(did: str, user: dict = Depends(require_role("admin", "khatta"))):
    await db.documents.update_one({"id": did}, {"$set": {"verified": True}})
    return {"ok": True}

# ---- Owner dashboard stats ----
@api_router.get("/dashboard/khatta")
async def khatta_dashboard(user: dict = Depends(require_role("khatta"))):
    total = await db.properties.count_documents({"owner_id": user["id"]})
    available = await db.properties.count_documents({"owner_id": user["id"], "status": "available"})
    occupied = await db.properties.count_documents({"owner_id": user["id"], "status": "occupied"})
    pending = await db.appointments.count_documents({"owner_id": user["id"], "status": "pending"})
    approved = await db.appointments.count_documents({"owner_id": user["id"], "status": "approved"})
    rent_records = await db.rent_records.find({"owner_id": user["id"]}, {"_id": 0}).to_list(1000)
    rent_collected = sum(r["amount"] for r in rent_records if r["status"] == "paid")
    return {
        "total_properties": total, "available": available, "occupied": occupied,
        "pending_appointments": pending, "approved_appointments": approved,
        "active_listings": available, "active_tenants": occupied,
        "rent_collected": rent_collected,
    }

@api_router.get("/dashboard/meetha")
async def meetha_dashboard(user: dict = Depends(require_role("meetha"))):
    saved = await db.saved_properties.count_documents({"user_id": user["id"]})
    upcoming = await db.appointments.count_documents({"tenant_id": user["id"], "status": {"$in": ["pending", "approved"]}})
    unread = await db.messages.count_documents({"to_user_id": user["id"], "read": False})
    return {"saved_properties": saved, "upcoming_visits": upcoming, "unread_messages": unread}

# ---- Admin ----
@api_router.get("/admin/users")
async def admin_users(user: dict = Depends(require_role("admin"))):
    docs = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return docs

@api_router.get("/admin/stats")
async def admin_stats(user: dict = Depends(require_role("admin"))):
    return {
        "users": await db.users.count_documents({}),
        "owners": await db.users.count_documents({"role": "khatta"}),
        "tenants": await db.users.count_documents({"role": "meetha"}),
        "properties": await db.properties.count_documents({}),
        "appointments": await db.appointments.count_documents({}),
        "reviews": await db.reviews.count_documents({}),
    }

@api_router.delete("/admin/users/{uid}")
async def admin_delete_user(uid: str, user: dict = Depends(require_role("admin"))):
    await db.users.delete_one({"id": uid})
    return {"ok": True}

@api_router.delete("/admin/properties/{pid}")
async def admin_delete_property(pid: str, user: dict = Depends(require_role("admin"))):
    await db.properties.delete_one({"id": pid})
    return {"ok": True}

@api_router.get("/")
async def root():
    return {"message": "KHATTA-MEETHA API running"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.properties.create_index([("city", 1), ("status", 1)])
    await db.properties.create_index("owner_id")
    await db.appointments.create_index("owner_id")
    await db.appointments.create_index("tenant_id")
    await db.messages.create_index("conv_id")
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    init_storage()
    # seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@khattameetha.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "email": admin_email, "name": "Admin",
            "role": "admin", "password_hash": hash_password(admin_password),
            "verified": True, "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Admin user seeded: {admin_email}")
    # seed test users
    for em, pw, name, role in [
        ("owner@test.com", "owner123", "Test Owner", "khatta"),
        ("tenant@test.com", "tenant123", "Test Tenant", "meetha"),
    ]:
        if not await db.users.find_one({"email": em}):
            await db.users.insert_one({
                "id": str(uuid.uuid4()), "email": em, "name": name, "role": role,
                "password_hash": hash_password(pw), "verified": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
    logger.info("Startup complete")

@app.on_event("shutdown")
async def shutdown():
    client.close()
