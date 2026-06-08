"""Backend tests for KHATTA-MEETHA API."""
import os
import io
import time
import uuid
import pytest
import requests
from datetime import datetime, timezone, timedelta

BASE = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
# Override with frontend env
if not BASE:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE = line.strip().split("=", 1)[1].rstrip("/")

API = f"{BASE}/api"

ADMIN = ("admin@khattameetha.com", "admin123")
OWNER = ("owner@test.com", "owner123")
TENANT = ("tenant@test.com", "tenant123")


def _login(email, pw):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=30)
    assert r.status_code == 200, f"Login failed for {email}: {r.status_code} {r.text}"
    data = r.json()
    return data["token"], data["user"]


@pytest.fixture(scope="session")
def admin_auth():
    tok, u = _login(*ADMIN)
    return {"headers": {"Authorization": f"Bearer {tok}"}, "user": u, "token": tok}


@pytest.fixture(scope="session")
def owner_auth():
    tok, u = _login(*OWNER)
    return {"headers": {"Authorization": f"Bearer {tok}"}, "user": u, "token": tok}


@pytest.fixture(scope="session")
def tenant_auth():
    tok, u = _login(*TENANT)
    return {"headers": {"Authorization": f"Bearer {tok}"}, "user": u, "token": tok}


# ===== Auth =====
class TestAuth:
    def test_register_khatta_and_me(self):
        email = f"TEST_khatta_{uuid.uuid4().hex[:6]}@example.com"
        r = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "Pass1234!", "name": "T Khatta", "role": "khatta"
        }, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data and data["user"]["role"] == "khatta"
        # httpOnly cookie
        assert "access_token" in r.cookies
        # me
        me = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {data['token']}"}, timeout=30)
        assert me.status_code == 200
        assert me.json()["email"] == email

    def test_login_seeded(self):
        for em, pw in [OWNER, TENANT, ADMIN]:
            tok, u = _login(em, pw)
            assert tok and u["email"] == em

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": OWNER[0], "password": "wrong"}, timeout=30)
        assert r.status_code == 401

    def test_forgot_and_reset(self):
        # Register a temp user, forgot, reset, re-login
        em = f"TEST_reset_{uuid.uuid4().hex[:6]}@example.com"
        r = requests.post(f"{API}/auth/register", json={
            "email": em, "password": "Old123!", "name": "R U", "role": "meetha"
        }, timeout=30)
        assert r.status_code == 200
        fr = requests.post(f"{API}/auth/forgot-password", json={"email": em}, timeout=30)
        assert fr.status_code == 200
        token = fr.json().get("dev_token")
        assert token
        rr = requests.post(f"{API}/auth/reset-password", json={"token": token, "new_password": "New123!"}, timeout=30)
        assert rr.status_code == 200
        # login with new pw
        tok, _ = _login(em, "New123!")
        assert tok
        # old pw fails
        r2 = requests.post(f"{API}/auth/login", json={"email": em, "password": "Old123!"}, timeout=30)
        assert r2.status_code == 401


# ===== Properties =====
class TestProperties:
    def test_create_list_filter_get(self, owner_auth):
        payload = {
            "title": f"TEST_prop_{uuid.uuid4().hex[:6]}",
            "description": "Test description",
            "property_type": "Flat", "rent": 15000, "deposit": 30000,
            "address": "MG Road", "city": "TestCity", "latitude": 12.97, "longitude": 77.59,
            "amenities": ["WiFi"], "rules": [], "images": [], "videos": [],
            "ac": True, "wifi": True,
        }
        r = requests.post(f"{API}/properties", headers=owner_auth["headers"], json=payload, timeout=30)
        assert r.status_code == 200, r.text
        prop = r.json()
        pid = prop["id"]
        # list with city filter
        lr = requests.get(f"{API}/properties", params={"city": "TestCity"}, timeout=30)
        assert lr.status_code == 200
        assert any(p["id"] == pid for p in lr.json())
        # filter by min/max rent
        lr2 = requests.get(f"{API}/properties", params={"min_rent": 14000, "max_rent": 16000, "city": "TestCity"}, timeout=30)
        assert any(p["id"] == pid for p in lr2.json())
        # ac wifi true
        lr3 = requests.get(f"{API}/properties", params={"ac": "true", "wifi": "true", "city": "TestCity"}, timeout=30)
        assert any(p["id"] == pid for p in lr3.json())
        # get single
        gr = requests.get(f"{API}/properties/{pid}", timeout=30)
        assert gr.status_code == 200
        body = gr.json()
        assert body["id"] == pid and "owner" in body
        return pid

    def test_nearby_distance(self, owner_auth):
        # use seeded Bangalore listings (lat~12.97 lng~77.59)
        r = requests.get(f"{API}/properties", params={"lat": 12.97, "lng": 77.59, "radius_km": 50}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        # If owner has seeded data they should appear with distance_km
        for d in data:
            assert "distance_km" in d

    def test_status_toggle(self, owner_auth):
        payload = {
            "title": f"TEST_status_{uuid.uuid4().hex[:6]}", "description": "x",
            "property_type": "PG", "rent": 9000, "deposit": 9000,
            "address": "A", "city": "TestCity", "latitude": 12.97, "longitude": 77.59,
        }
        r = requests.post(f"{API}/properties", headers=owner_auth["headers"], json=payload, timeout=30)
        pid = r.json()["id"]
        pr = requests.patch(f"{API}/properties/{pid}/status",
                            headers=owner_auth["headers"], json={"status": "occupied"}, timeout=30)
        assert pr.status_code == 200
        g = requests.get(f"{API}/properties/{pid}", timeout=30).json()
        assert g["status"] == "occupied"

    def test_update_delete(self, owner_auth):
        payload = {
            "title": f"TEST_ud_{uuid.uuid4().hex[:6]}", "description": "x",
            "property_type": "PG", "rent": 8000, "deposit": 8000,
            "address": "A", "city": "TestCity", "latitude": 12.97, "longitude": 77.59,
        }
        r = requests.post(f"{API}/properties", headers=owner_auth["headers"], json=payload, timeout=30)
        pid = r.json()["id"]
        payload["title"] = "UPDATED"
        ur = requests.put(f"{API}/properties/{pid}", headers=owner_auth["headers"], json=payload, timeout=30)
        assert ur.status_code == 200
        g = requests.get(f"{API}/properties/{pid}", timeout=30).json()
        assert g["title"] == "UPDATED"
        dr = requests.delete(f"{API}/properties/{pid}", headers=owner_auth["headers"], timeout=30)
        assert dr.status_code == 200
        g2 = requests.get(f"{API}/properties/{pid}", timeout=30)
        assert g2.status_code == 404


# ===== Appointments =====
class TestAppointments:
    def test_appointment_flow(self, owner_auth, tenant_auth):
        # use any owner property
        props = requests.get(f"{API}/properties", params={"owner_id": owner_auth["user"]["id"]}, timeout=30).json()
        if not props:
            # create one
            payload = {"title": "TEST_appt", "description": "x", "property_type": "Flat",
                       "rent": 1, "deposit": 1, "address": "x", "city": "TestCity",
                       "latitude": 12.97, "longitude": 77.59}
            props = [requests.post(f"{API}/properties", headers=owner_auth["headers"], json=payload, timeout=30).json()]
        pid = props[0]["id"]
        visit = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        r = requests.post(f"{API}/appointments", headers=tenant_auth["headers"],
                          json={"property_id": pid, "visit_date": visit, "message": "test"}, timeout=30)
        assert r.status_code == 200, r.text
        aid = r.json()["id"]
        # owner sees it
        ow = requests.get(f"{API}/appointments", headers=owner_auth["headers"], timeout=30).json()
        assert any(a["id"] == aid for a in ow)
        # tenant sees it
        te = requests.get(f"{API}/appointments", headers=tenant_auth["headers"], timeout=30).json()
        assert any(a["id"] == aid for a in te)
        # approve
        ur = requests.patch(f"{API}/appointments/{aid}", headers=owner_auth["headers"],
                            json={"status": "approved"}, timeout=30)
        assert ur.status_code == 200


# ===== Favorites =====
class TestFavorites:
    def test_favorites(self, owner_auth, tenant_auth):
        props = requests.get(f"{API}/properties", timeout=30).json()
        assert props
        pid = props[0]["id"]
        s = requests.post(f"{API}/favorites", headers=tenant_auth["headers"], json={"property_id": pid}, timeout=30)
        assert s.status_code == 200
        g = requests.get(f"{API}/favorites", headers=tenant_auth["headers"], timeout=30).json()
        assert any(p["id"] == pid for p in g)
        d = requests.delete(f"{API}/favorites/{pid}", headers=tenant_auth["headers"], timeout=30)
        assert d.status_code == 200
        g2 = requests.get(f"{API}/favorites", headers=tenant_auth["headers"], timeout=30).json()
        assert not any(p["id"] == pid for p in g2)


# ===== Messages =====
class TestMessages:
    def test_send_get_conv(self, owner_auth, tenant_auth):
        m = requests.post(f"{API}/messages", headers=tenant_auth["headers"],
                          json={"to_user_id": owner_auth["user"]["id"], "text": "hi"}, timeout=30)
        assert m.status_code == 200
        gm = requests.get(f"{API}/messages", headers=owner_auth["headers"],
                          params={"with_user": tenant_auth["user"]["id"]}, timeout=30).json()
        assert any(msg["text"] == "hi" for msg in gm)
        conv = requests.get(f"{API}/conversations", headers=tenant_auth["headers"], timeout=30).json()
        assert isinstance(conv, list) and len(conv) >= 1


# ===== Reviews =====
class TestReviews:
    def test_review_updates_rating(self, owner_auth, tenant_auth):
        payload = {"title": f"TEST_rev_{uuid.uuid4().hex[:6]}", "description": "x", "property_type": "PG",
                   "rent": 1, "deposit": 1, "address": "x", "city": "TestCity",
                   "latitude": 12.97, "longitude": 77.59}
        prop = requests.post(f"{API}/properties", headers=owner_auth["headers"], json=payload, timeout=30).json()
        pid = prop["id"]
        rv = requests.post(f"{API}/reviews", headers=tenant_auth["headers"],
                           json={"property_id": pid, "rating": 4, "comment": "ok"}, timeout=30)
        assert rv.status_code == 200
        rs = requests.get(f"{API}/reviews/{pid}", timeout=30).json()
        assert any(r["rating"] == 4 for r in rs)
        g = requests.get(f"{API}/properties/{pid}", timeout=30).json()
        assert g["review_count"] >= 1 and g["rating"] >= 1


# ===== Upload =====
class TestUpload:
    def test_upload_and_fetch(self, tenant_auth):
        # 1x1 PNG bytes
        png = bytes.fromhex(
            "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4"
            "890000000D49444154789C6300010000000500010D0A2DB40000000049454E44AE426082"
        )
        files = {"file": ("t.png", io.BytesIO(png), "image/png")}
        r = requests.post(f"{API}/upload", headers={"Authorization": tenant_auth["headers"]["Authorization"]},
                          files=files, timeout=60)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "path" in body and "url" in body
        # fetch
        g = requests.get(f"{BASE}{body['url']}", timeout=60)
        assert g.status_code == 200
        assert g.headers.get("content-type", "").startswith("image/")


# ===== Documents =====
class TestDocuments:
    def test_doc_create_verify(self, tenant_auth, owner_auth):
        r = requests.post(f"{API}/documents", headers=tenant_auth["headers"],
                          json={"doc_type": "Aadhaar", "url": "http://example.com/a.pdf"}, timeout=30)
        assert r.status_code == 200
        did = r.json()["id"]
        # khatta can verify (per route)
        vr = requests.patch(f"{API}/documents/{did}/verify", headers=owner_auth["headers"], timeout=30)
        assert vr.status_code == 200


# ===== Dashboards =====
class TestDashboards:
    def test_khatta_dashboard(self, owner_auth):
        r = requests.get(f"{API}/dashboard/khatta", headers=owner_auth["headers"], timeout=30)
        assert r.status_code == 200
        d = r.json()
        for k in ["total_properties", "available", "occupied", "pending_appointments"]:
            assert k in d and isinstance(d[k], (int, float))

    def test_meetha_dashboard(self, tenant_auth):
        r = requests.get(f"{API}/dashboard/meetha", headers=tenant_auth["headers"], timeout=30)
        assert r.status_code == 200
        d = r.json()
        for k in ["saved_properties", "upcoming_visits", "unread_messages"]:
            assert k in d


# ===== Admin =====
class TestAdmin:
    def test_admin_stats_and_users(self, admin_auth, tenant_auth):
        s = requests.get(f"{API}/admin/stats", headers=admin_auth["headers"], timeout=30)
        assert s.status_code == 200
        st = s.json()
        for k in ["users", "owners", "tenants", "properties"]:
            assert k in st
        u = requests.get(f"{API}/admin/users", headers=admin_auth["headers"], timeout=30)
        assert u.status_code == 200 and isinstance(u.json(), list)
        # tenant forbidden
        f = requests.get(f"{API}/admin/stats", headers=tenant_auth["headers"], timeout=30)
        assert f.status_code == 403
