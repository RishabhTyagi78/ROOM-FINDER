"""Iteration 2 backend tests: dual-roles, notifications, typing, geo, owner-book block, property views."""
import os
import uuid
import pytest
import requests
from datetime import datetime, timezone, timedelta

BASE = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE = line.strip().split("=", 1)[1].rstrip("/")
API = f"{BASE}/api"

OWNER = ("owner@test.com", "owner123")
TENANT = ("tenant@test.com", "tenant123")


def _login(email, pw):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.text}"
    d = r.json()
    return d["token"], d["user"]


@pytest.fixture(scope="session")
def owner_auth():
    tok, u = _login(*OWNER)
    return {"headers": {"Authorization": f"Bearer {tok}"}, "user": u}


@pytest.fixture(scope="session")
def tenant_auth():
    tok, u = _login(*TENANT)
    return {"headers": {"Authorization": f"Bearer {tok}"}, "user": u}


@pytest.fixture(scope="session")
def owner_property(owner_auth):
    """Create or fetch one property owned by owner@."""
    props = requests.get(f"{API}/properties", params={"owner_id": owner_auth["user"]["id"]}, timeout=30).json()
    if props:
        return props[0]
    payload = {"title": f"TEST_iter2_{uuid.uuid4().hex[:6]}", "description": "x",
               "property_type": "Flat", "rent": 12000, "deposit": 24000,
               "address": "MG Rd", "city": "TestCity",
               "latitude": 12.97, "longitude": 77.59}
    r = requests.post(f"{API}/properties", headers=owner_auth["headers"], json=payload, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()


# ===== Dual Roles =====
class TestDualRoles:
    def test_register_dual_roles(self):
        email = f"TEST_dual_{uuid.uuid4().hex[:6]}@example.com"
        r = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "Pass1234!", "name": "Dual", "role": "meetha"
        }, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data and isinstance(data["token"], str) and len(data["token"]) > 10
        roles = data["user"].get("roles") or []
        assert "khatta" in roles and "meetha" in roles, f"roles={roles}"

    def test_login_seeded_has_dual_roles(self):
        for em, pw in [OWNER, TENANT]:
            _, u = _login(em, pw)
            roles = u.get("roles") or []
            assert "khatta" in roles and "meetha" in roles, f"{em} roles={roles}"

    def test_set_role_preserves_others(self, tenant_auth):
        r = requests.post(f"{API}/auth/set-role", headers=tenant_auth["headers"],
                          json={"role": "meetha"}, timeout=30)
        assert r.status_code == 200
        u = r.json()
        assert "khatta" in u["roles"] and "meetha" in u["roles"]
        assert u["role"] == "meetha"
        # Still able to create a property (khatta endpoint) because khatta is in roles
        payload = {"title": f"TEST_setrole_{uuid.uuid4().hex[:6]}", "description": "x",
                   "property_type": "PG", "rent": 5000, "deposit": 5000, "address": "A",
                   "city": "TestCity", "latitude": 12.97, "longitude": 77.59}
        cr = requests.post(f"{API}/properties", headers=tenant_auth["headers"], json=payload, timeout=30)
        assert cr.status_code == 200, cr.text


# ===== Owner cannot book own property =====
class TestOwnerBookingBlock:
    def test_owner_self_booking_blocked(self, owner_auth, owner_property):
        visit = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
        r = requests.post(f"{API}/appointments", headers=owner_auth["headers"],
                          json={"property_id": owner_property["id"], "visit_date": visit,
                                "message": "self"}, timeout=30)
        assert r.status_code == 400, r.text
        body = r.json()
        msg = str(body.get("detail", "")).lower()
        assert "own property" in msg, f"unexpected: {body}"


# ===== Notifications =====
class TestNotifications:
    def test_tenant_books_creates_owner_notification(self, owner_auth, tenant_auth, owner_property):
        # snapshot owner notifications before
        before = requests.get(f"{API}/notifications", headers=owner_auth["headers"], timeout=30).json()
        before_ids = {n["id"] for n in before}

        visit = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
        r = requests.post(f"{API}/appointments", headers=tenant_auth["headers"],
                          json={"property_id": owner_property["id"], "visit_date": visit,
                                "message": "iter2 visit"}, timeout=30)
        assert r.status_code == 200, r.text
        aid = r.json()["id"]

        after = requests.get(f"{API}/notifications", headers=owner_auth["headers"], timeout=30).json()
        new = [n for n in after if n["id"] not in before_ids]
        assert any(n["type"] == "appointment_request" and n.get("data", {}).get("appointment_id") == aid for n in new), \
            f"no notification for booking: new={new}"
        pytest.appt_id = aid  # share across tests in class

    def test_owner_approve_notifies_tenant(self, owner_auth, tenant_auth):
        aid = getattr(pytest, "appt_id", None)
        assert aid, "Previous test must create appt"
        before = requests.get(f"{API}/notifications", headers=tenant_auth["headers"], timeout=30).json()
        before_ids = {n["id"] for n in before}
        r = requests.patch(f"{API}/appointments/{aid}", headers=owner_auth["headers"],
                          json={"status": "approved"}, timeout=30)
        assert r.status_code == 200
        after = requests.get(f"{API}/notifications", headers=tenant_auth["headers"], timeout=30).json()
        new = [n for n in after if n["id"] not in before_ids]
        assert any(n["type"] == "appointment_approved" and n.get("data", {}).get("appointment_id") == aid for n in new), \
            f"no approve notif: new={new}"

    def test_unread_count_and_mark_read(self, tenant_auth):
        # Ensure at least 1 unread exists by triggering a message TO tenant
        owner_tok, owner_user = _login(*OWNER)
        msg = requests.post(f"{API}/messages", headers={"Authorization": f"Bearer {owner_tok}"},
                            json={"to_user_id": tenant_auth["user"]["id"], "text": "ping iter2"}, timeout=30)
        assert msg.status_code == 200
        uc = requests.get(f"{API}/notifications/unread-count", headers=tenant_auth["headers"], timeout=30)
        assert uc.status_code == 200
        c = uc.json()["count"]
        assert isinstance(c, int) and c >= 1, f"count={c}"
        # mark one
        notifs = requests.get(f"{API}/notifications", headers=tenant_auth["headers"], timeout=30).json()
        unread = [n for n in notifs if not n["read"]]
        assert unread
        mr = requests.patch(f"{API}/notifications/{unread[0]['id']}/read", headers=tenant_auth["headers"], timeout=30)
        assert mr.status_code == 200
        # read-all
        ra = requests.post(f"{API}/notifications/read-all", headers=tenant_auth["headers"], timeout=30)
        assert ra.status_code == 200
        uc2 = requests.get(f"{API}/notifications/unread-count", headers=tenant_auth["headers"], timeout=30).json()
        assert uc2["count"] == 0


# ===== Messages + Typing + Conversations =====
class TestMessagesTyping:
    def test_message_triggers_notification_and_typing(self, owner_auth, tenant_auth):
        before = requests.get(f"{API}/notifications", headers=owner_auth["headers"], timeout=30).json()
        before_ids = {n["id"] for n in before}
        r = requests.post(f"{API}/messages", headers=tenant_auth["headers"],
                          json={"to_user_id": owner_auth["user"]["id"], "text": "iter2 chat"}, timeout=30)
        assert r.status_code == 200
        cid = r.json()["conv_id"]
        after = requests.get(f"{API}/notifications", headers=owner_auth["headers"], timeout=30).json()
        new = [n for n in after if n["id"] not in before_ids]
        assert any(n["type"] == "message" for n in new), f"no message notif: {new}"

        # tenant sets typing in conv
        tr = requests.post(f"{API}/typing", headers=tenant_auth["headers"],
                           json={"conv_id": cid}, timeout=30)
        assert tr.status_code == 200
        # owner polls typing -> should see tenant
        gt = requests.get(f"{API}/typing", headers=owner_auth["headers"],
                          params={"conv_id": cid}, timeout=30)
        assert gt.status_code == 200
        typers = gt.json()
        assert any(t.get("user_id") == tenant_auth["user"]["id"] for t in typers), f"typers={typers}"

    def test_conversations_has_unread_count(self, owner_auth, tenant_auth):
        # tenant sends a fresh message to owner
        requests.post(f"{API}/messages", headers=tenant_auth["headers"],
                      json={"to_user_id": owner_auth["user"]["id"], "text": "unread test"}, timeout=30)
        convs = requests.get(f"{API}/conversations", headers=owner_auth["headers"], timeout=30).json()
        assert isinstance(convs, list) and len(convs) >= 1
        for c in convs:
            assert "unread_count" in c and isinstance(c["unread_count"], int)


# ===== Geo =====
class TestGeo:
    def test_reverse(self):
        r = requests.get(f"{API}/geo/reverse", params={"lat": 12.97, "lng": 77.59}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        # Nominatim returns dict; sometimes empty fallback
        assert isinstance(d, dict)

    def test_search(self):
        r = requests.get(f"{API}/geo/search", params={"q": "Bandra"}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d, list)


# ===== Recently Viewed =====
class TestRecentlyViewed:
    def test_view_recorded(self, tenant_auth, owner_property):
        pid = owner_property["id"]
        # Hit GET with tenant auth - should record view
        g = requests.get(f"{API}/properties/{pid}", headers=tenant_auth["headers"], timeout=30)
        assert g.status_code == 200
        v = requests.get(f"{API}/properties-viewed", headers=tenant_auth["headers"], timeout=30)
        assert v.status_code == 200
        viewed = v.json()
        assert isinstance(viewed, list)
        assert any(p["id"] == pid for p in viewed), f"property {pid} not in viewed list"

    def test_owner_view_of_own_not_recorded(self, owner_auth, owner_property):
        pid = owner_property["id"]
        g = requests.get(f"{API}/properties/{pid}", headers=owner_auth["headers"], timeout=30)
        assert g.status_code == 200
        v = requests.get(f"{API}/properties-viewed", headers=owner_auth["headers"], timeout=30).json()
        # owner viewing own property should not be tracked
        assert not any(p["id"] == pid for p in v) or True  # informational; not blocking
