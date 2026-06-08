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
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, Query
from fastapi.responses import Response as FastAPIResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

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

# ---- Storage ----
storage_key: Optional[str] = None
def init_storage():
    global storage_key
    if storage_key: return storage_key
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str):
    key = init_storage()
    if not key: raise HTTPException(status_code=500, detail="Storage not available")
    resp = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    if resp.status_code == 403:
        global storage_key; storage_key = None; key = init_storage()
        resp = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# ---- Helpers ----
def hash_password(p): return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()
def verify_password(p, h):
    try: return bcrypt.checkpw(p.encode(), h.encode())
    except: return False

def now_iso(): return datetime.now(timezone.utc).isoformat()

def create_access_token(user_id, email, roles):
    payload = {"sub": user_id, "email": email, "roles": roles, "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

ROLE = Literal["khatta", "meetha", "admin"]
PROPERTY_TYPE = Literal["PG", "Single Room", "Shared Room", "Flat", "Apartment", "Independent House"]
APPT_STATUS = Literal["pending", "approved", "rejected", "rescheduled", "completed"]

class RegisterIn(BaseModel):
    email: EmailStr; password: str; name: str; role: ROLE = "meetha"
    phone: Optional[str] = None

class LoginIn(BaseModel): email: EmailStr; password: str
class ForgotIn(BaseModel): email: EmailStr
class ResetIn(BaseModel): token: str; new_password: str
class GoogleSessionIn(BaseModel): session_id: str; role: Optional[ROLE] = "meetha"
class RoleIn(BaseModel): role: ROLE

class PropertyIn(BaseModel):
    title: str; description: str; property_type: PROPERTY_TYPE
    rent: float; deposit: float; address: str; city: str
    latitude: float; longitude: float
    amenities: List[str] = []; rules: List[str] = []
    images: List[str] = []; videos: List[str] = []
    furnished: Literal["Furnished", "Semi-Furnished", "Unfurnished"] = "Unfurnished"
    bhk: Optional[str] = None
    gender_preference: Literal["Any", "Male", "Female"] = "Any"
    food_included: bool = False; ac: bool = False; wifi: bool = False
    parking: bool = False; attached_bath: bool = False; balcony: bool = False
    pet_friendly: bool = False
    status: Literal["available", "occupied"] = "available"

class AppointmentIn(BaseModel):
    property_id: str; visit_date: str; message: Optional[str] = ""

class ApptUpdateIn(BaseModel):
    status: APPT_STATUS; visit_date: Optional[str] = None

class MessageIn(BaseModel):
    to_user_id: str; property_id: Optional[str] = None; text: str

class ReviewIn(BaseModel):
    property_id: str; rating: int; comment: str

class SaveIn(BaseModel): property_id: str
class RentReminderIn(BaseModel):
    tenant_id: str; property_id: str; amount: float; month: str
class DocumentIn(BaseModel):
    doc_type: Literal["Aadhaar", "PAN", "College ID", "Government ID"]; url: str
class TypingIn(BaseModel): conv_id: str

def conv_id_of(uid_a, uid_b, property_id=None):
    p = sorted([uid_a, uid_b])
    cid = f"{p[0]}__{p[1]}"
    if property_id: cid += f"__{property_id}"
    return cid

def make_user_public(u):
    if not u: return None
    return {
        "id": u["id"], "email": u["email"], "name": u["name"],
        "roles": u.get("roles", [u.get("role")] if u.get("role") else ["meetha"]),
        "role": u.get("role"),  # backwards compat / primary role
        "phone": u.get("phone"), "picture": u.get("picture"),
        "verified": u.get("verified", False), "created_at": u.get("created_at"),
        "last_seen": u.get("last_seen"),
    }

# ---- Notifications ----
async def create_notification(user_id: str, ntype: str, title: str, body: str = "", data: dict = None):
    doc = {
        "id": str(uuid.uuid4()), "user_id": user_id, "type": ntype,
        "title": title, "body": body, "data": data or {},
        "read": False, "created_at": now_iso(),
    }
    await db.notifications.insert_one(doc)
    return doc

async def get_current_user(request: Request):
    token = None
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "): token = auth[7:]
    if not token: token = request.cookies.get("access_token")
    if not token:
        st = request.cookies.get("session_token")
        if st:
            doc = await db.user_sessions.find_one({"session_token": st}, {"_id": 0})
            if doc:
                exp = doc.get("expires_at")
                if isinstance(exp, str): exp = datetime.fromisoformat(exp)
                if exp and exp.tzinfo is None: exp = exp.replace(tzinfo=timezone.utc)
                if exp and exp > datetime.now(timezone.utc):
                    user = await db.users.find_one({"id": doc["user_id"]}, {"_id": 0, "password_hash": 0})
                    if user:
                        await db.users.update_one({"id": user["id"]}, {"$set": {"last_seen": now_iso()}})
                        return user
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user: raise HTTPException(status_code=401, detail="User not found")
        await db.users.update_one({"id": user["id"]}, {"$set": {"last_seen": now_iso()}})
        return user
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def has_role(user, *roles):
    user_roles = set(user.get("roles") or [user.get("role")])
    return any(r in user_roles for r in roles)

def require_role(*roles):
    async def checker(user=Depends(get_current_user)):
        if not has_role(user, *roles):
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return checker

# ---- AUTH ----
@api_router.post("/auth/register")
async def register(payload: RegisterIn):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    if payload.role == "admin":
        raise HTTPException(status_code=400, detail="Cannot self-register as admin")
    uid = str(uuid.uuid4())
    # New users get BOTH khatta+meetha roles by default (dual-role enabled)
    roles = ["khatta", "meetha"]
    user = {
        "id": uid, "email": email, "name": payload.name, "role": payload.role,
        "roles": roles, "phone": payload.phone,
        "password_hash": hash_password(payload.password),
        "verified": False, "picture": None, "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    token = create_access_token(uid, email, roles)
    return {"user": make_user_public(user), "token": token}

@api_router.post("/auth/login")
async def login(payload: LoginIn):
    email = payload.email.lower()
    u = await db.users.find_one({"email": email})
    if not u or not u.get("password_hash") or not verify_password(payload.password, u["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    roles = u.get("roles") or [u.get("role")]
    token = create_access_token(u["id"], email, roles)
    return {"user": make_user_public(u), "token": token}

@api_router.post("/auth/logout")
async def logout(): return {"ok": True}

@api_router.get("/auth/me")
async def me(user=Depends(get_current_user)): return make_user_public(user)

@api_router.post("/auth/forgot-password")
async def forgot(payload: ForgotIn):
    u = await db.users.find_one({"email": payload.email.lower()})
    if not u: return {"ok": True}
    token = secrets.token_urlsafe(32)
    await db.password_reset_tokens.insert_one({
        "token": token, "user_id": u["id"], "used": False,
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
    })
    return {"ok": True, "dev_token": token}

@api_router.post("/auth/reset-password")
async def reset_pw(payload: ResetIn):
    rec = await db.password_reset_tokens.find_one({"token": payload.token, "used": False})
    if not rec: raise HTTPException(status_code=400, detail="Invalid token")
    exp = rec["expires_at"]
    if isinstance(exp, str): exp = datetime.fromisoformat(exp)
    if exp.tzinfo is None: exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc): raise HTTPException(status_code=400, detail="Token expired")
    await db.users.update_one({"id": rec["user_id"]}, {"$set": {"password_hash": hash_password(payload.new_password)}})
    await db.password_reset_tokens.update_one({"token": payload.token}, {"$set": {"used": True}})
    return {"ok": True}

@api_router.post("/auth/google/session")
async def google_session(payload: GoogleSessionIn):
    try:
        r = requests.get("https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                         headers={"X-Session-ID": payload.session_id}, timeout=15)
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
            "roles": ["khatta", "meetha"], "verified": True,
            "password_hash": None, "created_at": now_iso(),
        }
        await db.users.insert_one(user)
    else:
        await db.users.update_one({"email": email}, {"$set": {"picture": data.get("picture", user.get("picture"))}})
    await db.user_sessions.insert_one({
        "user_id": user["id"], "session_token": data["session_token"],
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
    })
    roles = user.get("roles") or ["khatta", "meetha"]
    token = create_access_token(user["id"], email, roles)
    return {"user": make_user_public(user), "token": token, "session_token": data["session_token"]}

@api_router.post("/auth/set-role")
async def set_active_role(body: RoleIn, user=Depends(get_current_user)):
    """Set active/primary role for UI hint; roles array contains all roles user can act in."""
    if body.role == "admin": raise HTTPException(status_code=400, detail="Invalid")
    cur_roles = user.get("roles") or [user.get("role")]
    if body.role not in cur_roles:
        cur_roles = list(set(cur_roles + [body.role]))
    await db.users.update_one({"id": user["id"]}, {"$set": {"role": body.role, "roles": cur_roles}})
    user["role"] = body.role; user["roles"] = cur_roles
    return make_user_public(user)

# ---- UPLOAD ----
@api_router.post("/upload")
async def upload(file: UploadFile = File(...), user=Depends(get_current_user)):
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "bin"
    if ext not in ("jpg", "jpeg", "png", "webp", "gif", "mp4", "mov", "webm", "pdf"):
        raise HTTPException(status_code=400, detail="Unsupported file type")
    path = f"{APP_NAME}/uploads/{user['id']}/{uuid.uuid4().hex}.{ext}"
    data = await file.read()
    result = put_object(path, data, file.content_type or "application/octet-stream")
    await db.files.insert_one({
        "id": str(uuid.uuid4()), "storage_path": result["path"], "owner_id": user["id"],
        "content_type": file.content_type, "size": result.get("size", len(data)),
        "is_deleted": False, "created_at": now_iso(),
    })
    return {"path": result["path"], "url": f"/api/files/{result['path']}"}

@api_router.get("/files/{path:path}")
async def files_get(path: str):
    rec = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not rec: raise HTTPException(status_code=404, detail="File not found")
    data, ct = get_object(path)
    return FastAPIResponse(content=data, media_type=rec.get("content_type") or ct)

# ---- GEO ----
@api_router.get("/geo/reverse")
async def reverse_geo(lat: float, lng: float):
    try:
        r = requests.get(f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lng}&format=json",
                         headers={"User-Agent": "khatta-meetha/1.0"}, timeout=10)
        return r.json()
    except: return {"display_name": ""}

@api_router.get("/geo/search")
async def search_geo(q: str):
    try:
        r = requests.get(f"https://nominatim.openstreetmap.org/search?q={q}&format=json&limit=5",
                         headers={"User-Agent": "khatta-meetha/1.0"}, timeout=10)
        return r.json()
    except: return []

# ---- PROPERTIES ----
def haversine_km(lat1, lon1, lat2, lon2):
    from math import radians, sin, cos, asin, sqrt
    R = 6371.0
    dlat = radians(lat2 - lat1); dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1))*cos(radians(lat2))*sin(dlon/2)**2
    return 2*R*asin(sqrt(a))

@api_router.get("/properties")
async def list_properties(
    q: Optional[str] = None, city: Optional[str] = None,
    property_type: Optional[str] = None, min_rent: Optional[float] = None,
    max_rent: Optional[float] = None, furnished: Optional[str] = None,
    ac: Optional[bool] = None, wifi: Optional[bool] = None,
    parking: Optional[bool] = None, pet_friendly: Optional[bool] = None,
    gender_preference: Optional[str] = None, status: Optional[str] = None,
    lat: Optional[float] = None, lng: Optional[float] = None,
    radius_km: Optional[float] = None, owner_id: Optional[str] = None,
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
    docs = await db.properties.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit*2)
    if lat is not None and lng is not None and radius_km:
        docs = [d for d in docs if haversine_km(lat, lng, d["latitude"], d["longitude"]) <= radius_km]
    if lat is not None and lng is not None:
        for d in docs: d["distance_km"] = round(haversine_km(lat, lng, d["latitude"], d["longitude"]), 2)
    return docs[:limit]

@api_router.get("/properties/{pid}")
async def get_property(pid: str, request: Request):
    doc = await db.properties.find_one({"id": pid}, {"_id": 0})
    if not doc: raise HTTPException(status_code=404, detail="Property not found")
    owner = await db.users.find_one({"id": doc["owner_id"]}, {"_id": 0, "password_hash": 0})
    if owner: doc["owner"] = make_user_public(owner)
    # Track view (if user logged in)
    try:
        u = await get_current_user(request)
        if u and u["id"] != doc["owner_id"]:
            await db.property_views.update_one(
                {"user_id": u["id"], "property_id": pid},
                {"$set": {"viewed_at": now_iso()}}, upsert=True,
            )
    except: pass
    return doc

@api_router.post("/properties")
async def create_property(payload: PropertyIn, user=Depends(require_role("khatta", "admin"))):
    pid = str(uuid.uuid4())
    doc = payload.model_dump()
    doc.update({"id": pid, "owner_id": user["id"], "created_at": now_iso(), "rating": 0, "review_count": 0})
    await db.properties.insert_one(doc); doc.pop("_id", None)
    return doc

@api_router.put("/properties/{pid}")
async def update_property(pid: str, payload: PropertyIn, user=Depends(require_role("khatta", "admin"))):
    existing = await db.properties.find_one({"id": pid})
    if not existing: raise HTTPException(status_code=404, detail="Property not found")
    if existing["owner_id"] != user["id"] and not has_role(user, "admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    await db.properties.update_one({"id": pid}, {"$set": payload.model_dump()})
    return {"ok": True}

@api_router.delete("/properties/{pid}")
async def delete_property(pid: str, user=Depends(require_role("khatta", "admin"))):
    existing = await db.properties.find_one({"id": pid})
    if not existing: raise HTTPException(status_code=404, detail="Not found")
    if existing["owner_id"] != user["id"] and not has_role(user, "admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    await db.properties.delete_one({"id": pid})
    return {"ok": True}

@api_router.patch("/properties/{pid}/status")
async def patch_status(pid: str, body: dict, user=Depends(require_role("khatta", "admin"))):
    status = body.get("status")
    if status not in ("available", "occupied"):
        raise HTTPException(status_code=400, detail="Bad status")
    existing = await db.properties.find_one({"id": pid})
    if not existing: raise HTTPException(status_code=404, detail="Not found")
    if existing["owner_id"] != user["id"] and not has_role(user, "admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    await db.properties.update_one({"id": pid}, {"$set": {"status": status}})
    return {"ok": True}

@api_router.get("/properties-viewed")
async def viewed_properties(user=Depends(get_current_user)):
    views = await db.property_views.find({"user_id": user["id"]}, {"_id": 0}).sort("viewed_at", -1).to_list(20)
    pids = [v["property_id"] for v in views]
    if not pids: return []
    props = await db.properties.find({"id": {"$in": pids}}, {"_id": 0}).to_list(50)
    by_id = {p["id"]: p for p in props}
    return [by_id[pid] for pid in pids if pid in by_id]

# ---- APPOINTMENTS ----
@api_router.post("/appointments")
async def create_appt(payload: AppointmentIn, user=Depends(get_current_user)):
    prop = await db.properties.find_one({"id": payload.property_id})
    if not prop: raise HTTPException(status_code=404, detail="Property not found")
    if prop["owner_id"] == user["id"]:
        raise HTTPException(status_code=400, detail="You cannot book your own property")
    doc = {
        "id": str(uuid.uuid4()), "property_id": payload.property_id,
        "property_title": prop["title"], "owner_id": prop["owner_id"],
        "tenant_id": user["id"], "tenant_name": user["name"],
        "visit_date": payload.visit_date, "message": payload.message,
        "status": "pending", "created_at": now_iso(),
    }
    await db.appointments.insert_one(doc); doc.pop("_id", None)
    await create_notification(prop["owner_id"], "appointment_request",
                              f"New visit request from {user['name']}",
                              f"For {prop['title']} on {payload.visit_date}",
                              {"appointment_id": doc["id"], "property_id": prop["id"]})
    return doc

@api_router.get("/appointments")
async def list_appts(user=Depends(get_current_user)):
    docs = await db.appointments.find(
        {"$or": [{"owner_id": user["id"]}, {"tenant_id": user["id"]}]},
        {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs

@api_router.patch("/appointments/{aid}")
async def update_appt(aid: str, payload: ApptUpdateIn, user=Depends(get_current_user)):
    appt = await db.appointments.find_one({"id": aid})
    if not appt: raise HTTPException(status_code=404, detail="Not found")
    if appt["owner_id"] != user["id"] and appt["tenant_id"] != user["id"] and not has_role(user, "admin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    upd = {"status": payload.status}
    if payload.visit_date: upd["visit_date"] = payload.visit_date
    await db.appointments.update_one({"id": aid}, {"$set": upd})
    # Notify the other party
    target = appt["tenant_id"] if user["id"] == appt["owner_id"] else appt["owner_id"]
    title_map = {"approved": "Visit approved ✓", "rejected": "Visit rejected", "rescheduled": "Visit rescheduled", "completed": "Visit completed"}
    title = title_map.get(payload.status, f"Appointment {payload.status}")
    await create_notification(target, f"appointment_{payload.status}", title,
                              f"{appt['property_title']}",
                              {"appointment_id": aid, "property_id": appt["property_id"]})
    return {"ok": True}

# ---- MESSAGES + TYPING ----
@api_router.post("/messages")
async def send_msg(payload: MessageIn, user=Depends(get_current_user)):
    cid = conv_id_of(user["id"], payload.to_user_id, payload.property_id)
    doc = {
        "id": str(uuid.uuid4()), "conv_id": cid, "from_user_id": user["id"],
        "from_name": user["name"], "to_user_id": payload.to_user_id,
        "property_id": payload.property_id, "text": payload.text,
        "created_at": now_iso(), "read": False, "delivered": True,
    }
    await db.messages.insert_one(doc); doc.pop("_id", None)
    await create_notification(payload.to_user_id, "message", f"New message from {user['name']}",
                              payload.text[:80], {"from_user_id": user["id"], "conv_id": cid})
    # Clear typing indicator for sender in this conv
    await db.typing.delete_one({"conv_id": cid, "user_id": user["id"]})
    return doc

@api_router.get("/messages")
async def get_msgs(with_user: str, property_id: Optional[str] = None, user=Depends(get_current_user)):
    cid = conv_id_of(user["id"], with_user, property_id)
    docs = await db.messages.find({"conv_id": cid}, {"_id": 0}).sort("created_at", 1).to_list(500)
    await db.messages.update_many({"conv_id": cid, "to_user_id": user["id"], "read": False}, {"$set": {"read": True, "read_at": now_iso()}})
    return docs

@api_router.get("/conversations")
async def list_convs(user=Depends(get_current_user)):
    pipeline = [
        {"$match": {"$or": [{"from_user_id": user["id"]}, {"to_user_id": user["id"]}]}},
        {"$sort": {"created_at": -1}},
        {"$group": {"_id": "$conv_id", "last": {"$first": "$$ROOT"},
                    "unread": {"$sum": {"$cond": [{"$and": [{"$eq": ["$to_user_id", user["id"]]}, {"$eq": ["$read", False]}]}, 1, 0]}}}},
    ]
    convs = []
    async for c in db.messages.aggregate(pipeline):
        last = c["last"]; last.pop("_id", None)
        last["unread_count"] = c["unread"]
        other_id = last["to_user_id"] if last["from_user_id"] == user["id"] else last["from_user_id"]
        other = await db.users.find_one({"id": other_id}, {"_id": 0, "password_hash": 0})
        last["other_user"] = make_user_public(other)
        convs.append(last)
    return convs

@api_router.post("/typing")
async def typing(payload: TypingIn, user=Depends(get_current_user)):
    await db.typing.update_one(
        {"conv_id": payload.conv_id, "user_id": user["id"]},
        {"$set": {"updated_at": datetime.now(timezone.utc)}}, upsert=True,
    )
    return {"ok": True}

@api_router.get("/typing")
async def get_typing(conv_id: str, user=Depends(get_current_user)):
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=6)
    docs = await db.typing.find({"conv_id": conv_id, "updated_at": {"$gt": cutoff}, "user_id": {"$ne": user["id"]}}).to_list(5)
    return [{"user_id": d["user_id"]} for d in docs]

# ---- NOTIFICATIONS ----
@api_router.get("/notifications")
async def list_notifs(limit: int = 50, user=Depends(get_current_user)):
    docs = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return docs

@api_router.get("/notifications/unread-count")
async def unread_count(user=Depends(get_current_user)):
    n = await db.notifications.count_documents({"user_id": user["id"], "read": False})
    return {"count": n}

@api_router.patch("/notifications/{nid}/read")
async def mark_read(nid: str, user=Depends(get_current_user)):
    await db.notifications.update_one({"id": nid, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}

@api_router.post("/notifications/read-all")
async def mark_all_read(user=Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"], "read": False}, {"$set": {"read": True}})
    return {"ok": True}

# ---- FAVORITES ----
@api_router.post("/favorites")
async def save_prop(payload: SaveIn, user=Depends(get_current_user)):
    existing = await db.saved_properties.find_one({"user_id": user["id"], "property_id": payload.property_id})
    if existing: return {"ok": True}
    await db.saved_properties.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"],
                                          "property_id": payload.property_id, "created_at": now_iso()})
    return {"ok": True}

@api_router.delete("/favorites/{pid}")
async def unsave_prop(pid: str, user=Depends(get_current_user)):
    await db.saved_properties.delete_one({"user_id": user["id"], "property_id": pid})
    return {"ok": True}

@api_router.get("/favorites")
async def list_favs(user=Depends(get_current_user)):
    s = await db.saved_properties.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    pids = [x["property_id"] for x in s]
    if not pids: return []
    return await db.properties.find({"id": {"$in": pids}}, {"_id": 0}).to_list(200)

# ---- REVIEWS ----
@api_router.post("/reviews")
async def add_review(payload: ReviewIn, user=Depends(get_current_user)):
    if payload.rating < 1 or payload.rating > 5: raise HTTPException(status_code=400, detail="1-5")
    prop = await db.properties.find_one({"id": payload.property_id})
    if not prop: raise HTTPException(status_code=404, detail="Not found")
    if prop["owner_id"] == user["id"]: raise HTTPException(status_code=400, detail="Cannot review your own property")
    doc = {"id": str(uuid.uuid4()), "property_id": payload.property_id,
           "user_id": user["id"], "user_name": user["name"],
           "rating": payload.rating, "comment": payload.comment,
           "owner_reply": None, "created_at": now_iso()}
    await db.reviews.insert_one(doc)
    all_r = await db.reviews.find({"property_id": payload.property_id}).to_list(1000)
    avg = sum(r["rating"] for r in all_r) / len(all_r)
    await db.properties.update_one({"id": payload.property_id}, {"$set": {"rating": round(avg, 2), "review_count": len(all_r)}})
    await create_notification(prop["owner_id"], "review", f"New review from {user['name']}",
                              f"{payload.rating}★ — {prop['title']}",
                              {"property_id": prop["id"]})
    doc.pop("_id", None); return doc

@api_router.get("/reviews/{pid}")
async def get_reviews(pid: str):
    return await db.reviews.find({"property_id": pid}, {"_id": 0}).sort("created_at", -1).to_list(200)

@api_router.post("/reviews/{rid}/reply")
async def reply_review(rid: str, body: dict, user=Depends(get_current_user)):
    rev = await db.reviews.find_one({"id": rid})
    if not rev: raise HTTPException(status_code=404, detail="Not found")
    prop = await db.properties.find_one({"id": rev["property_id"]})
    if not prop or prop["owner_id"] != user["id"]: raise HTTPException(status_code=403, detail="Forbidden")
    await db.reviews.update_one({"id": rid}, {"$set": {"owner_reply": body.get("reply", "")}})
    return {"ok": True}

# ---- RENT ----
@api_router.post("/rent-reminders")
async def rent_remind(payload: RentReminderIn, user=Depends(require_role("khatta"))):
    doc = {"id": str(uuid.uuid4()), "owner_id": user["id"], "tenant_id": payload.tenant_id,
           "property_id": payload.property_id, "amount": payload.amount,
           "month": payload.month, "status": "pending", "created_at": now_iso()}
    await db.rent_records.insert_one(doc); doc.pop("_id", None)
    await create_notification(payload.tenant_id, "rent_reminder", f"Rent due: ₹{payload.amount}",
                              f"For {payload.month}", {"rent_id": doc["id"]})
    return doc

@api_router.get("/rent-records")
async def list_rent(user=Depends(get_current_user)):
    q = {"$or": [{"owner_id": user["id"]}, {"tenant_id": user["id"]}]}
    return await db.rent_records.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)

@api_router.patch("/rent-records/{rid}")
async def update_rent(rid: str, body: dict, user=Depends(get_current_user)):
    await db.rent_records.update_one({"id": rid}, {"$set": {"status": body.get("status", "paid")}})
    return {"ok": True}

# ---- DOCS ----
@api_router.post("/documents")
async def add_doc(payload: DocumentIn, user=Depends(get_current_user)):
    doc = {"id": str(uuid.uuid4()), "user_id": user["id"], "doc_type": payload.doc_type,
           "url": payload.url, "verified": False, "created_at": now_iso()}
    await db.documents.insert_one(doc); doc.pop("_id", None); return doc

@api_router.get("/documents")
async def list_docs(user=Depends(get_current_user)):
    if has_role(user, "admin"):
        return await db.documents.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return await db.documents.find({"user_id": user["id"]}, {"_id": 0}).to_list(50)

@api_router.patch("/documents/{did}/verify")
async def verify_doc(did: str, user=Depends(require_role("admin", "khatta"))):
    await db.documents.update_one({"id": did}, {"$set": {"verified": True}})
    return {"ok": True}

# ---- DASHBOARDS ----
@api_router.get("/dashboard/khatta")
async def k_dash(user=Depends(get_current_user)):
    if not has_role(user, "khatta", "admin"): raise HTTPException(403, "Forbidden")
    total = await db.properties.count_documents({"owner_id": user["id"]})
    avail = await db.properties.count_documents({"owner_id": user["id"], "status": "available"})
    occ = await db.properties.count_documents({"owner_id": user["id"], "status": "occupied"})
    pending = await db.appointments.count_documents({"owner_id": user["id"], "status": "pending"})
    approved = await db.appointments.count_documents({"owner_id": user["id"], "status": "approved"})
    recs = await db.rent_records.find({"owner_id": user["id"]}, {"_id": 0}).to_list(1000)
    rc = sum(r["amount"] for r in recs if r["status"] == "paid")
    chats = await db.messages.count_documents({"to_user_id": user["id"]})
    return {"total_properties": total, "available": avail, "occupied": occ,
            "pending_appointments": pending, "approved_appointments": approved,
            "active_listings": avail, "active_tenants": occ, "rent_collected": rc,
            "active_chats": chats}

@api_router.get("/dashboard/meetha")
async def m_dash(user=Depends(get_current_user)):
    saved = await db.saved_properties.count_documents({"user_id": user["id"]})
    upcoming = await db.appointments.count_documents({"tenant_id": user["id"], "status": {"$in": ["pending", "approved"]}})
    unread = await db.messages.count_documents({"to_user_id": user["id"], "read": False})
    viewed = await db.property_views.count_documents({"user_id": user["id"]})
    return {"saved_properties": saved, "upcoming_visits": upcoming, "unread_messages": unread, "viewed_properties": viewed}

# ---- ADMIN ----
@api_router.get("/admin/users")
async def admin_users(user=Depends(require_role("admin"))):
    return await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)

@api_router.get("/admin/stats")
async def admin_stats(user=Depends(require_role("admin"))):
    return {
        "users": await db.users.count_documents({}),
        "owners": await db.users.count_documents({"roles": "khatta"}),
        "tenants": await db.users.count_documents({"roles": "meetha"}),
        "properties": await db.properties.count_documents({}),
        "appointments": await db.appointments.count_documents({}),
        "reviews": await db.reviews.count_documents({}),
    }

@api_router.delete("/admin/users/{uid}")
async def admin_del_user(uid: str, user=Depends(require_role("admin"))):
    await db.users.delete_one({"id": uid}); return {"ok": True}

@api_router.delete("/admin/properties/{pid}")
async def admin_del_prop(pid: str, user=Depends(require_role("admin"))):
    await db.properties.delete_one({"id": pid}); return {"ok": True}

@api_router.get("/")
async def root(): return {"message": "KHATTA-MEETHA API"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=False,
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
    await db.notifications.create_index([("user_id", 1), ("read", 1)])
    await db.typing.create_index("updated_at", expireAfterSeconds=10)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    init_storage()
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@khattameetha.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    if not await db.users.find_one({"email": admin_email}):
        await db.users.insert_one({"id": str(uuid.uuid4()), "email": admin_email, "name": "Admin",
                                   "role": "admin", "roles": ["admin", "khatta", "meetha"],
                                   "password_hash": hash_password(admin_password),
                                   "verified": True, "created_at": now_iso()})
    for em, pw, name, role in [("owner@test.com", "owner123", "Test Owner", "khatta"),
                                ("tenant@test.com", "tenant123", "Test Tenant", "meetha")]:
        if not await db.users.find_one({"email": em}):
            await db.users.insert_one({"id": str(uuid.uuid4()), "email": em, "name": name,
                                       "role": role, "roles": ["khatta", "meetha"],
                                       "password_hash": hash_password(pw),
                                       "verified": True, "created_at": now_iso()})
    # Migration: ensure roles array exists on every user
    async for u in db.users.find({"roles": {"$exists": False}}, {"_id": 0, "id": 1, "role": 1}):
        roles = ["admin"] if u.get("role") == "admin" else ["khatta", "meetha"]
        await db.users.update_one({"id": u["id"]}, {"$set": {"roles": roles}})
    logger.info("Startup complete")

@app.on_event("shutdown")
async def shutdown(): client.close()
