"""Iteration 3 backend tests: Smart Search, Localities, Suggest, Lifestyle, Locality Intel,
DELETE/CLEAR messages+notifications, Revenue chart, available-first ordering."""
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
    assert r.status_code == 200, f"Login failed for {email}: {r.text}"
    d = r.json()
    return d["token"], d["user"]


@pytest.fixture(scope="session")
def owner_auth():
    tok, u = _login(*OWNER)
    return {"headers": {"Authorization": f"Bearer {tok}"}, "user": u, "token": tok}


@pytest.fixture(scope="session")
def tenant_auth():
    tok, u = _login(*TENANT)
    return {"headers": {"Authorization": f"Bearer {tok}"}, "user": u, "token": tok}


# Helper to create a property with extra fields
def _create_prop(owner_headers, **overrides):
    payload = {
        "title": f"TEST_iter3_{uuid.uuid4().hex[:6]}",
        "description": "iter3 property",
        "property_type": "Flat",
        "rent": 15000, "deposit": 30000,
        "address": "MG Road",
        "city": "Bangalore",
        "locality": "Indiranagar",
        "latitude": 12.97, "longitude": 77.59,
        "lifestyle_tags": ["Student Friendly", "Pet Friendly"],
        "status": "available",
    }
    payload.update(overrides)
    r = requests.post(f"{API}/properties", headers=owner_headers, json=payload, timeout=30)
    assert r.status_code == 200, f"create_property failed: {r.status_code} {r.text}"
    return r.json()


# ======================= SEARCH / DISCOVERY =======================
class TestSmartSearch:
    def test_cities_returns_indian_cities_with_bangalore(self):
        r = requests.get(f"{API}/cities", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) > 0
        names = [c["city"].lower() for c in data]
        assert "bangalore" in names, f"Bangalore missing from cities: {names[:5]}"
        for c in data:
            assert "city" in c and "count" in c and isinstance(c["count"], int)

    def test_cities_filtered_by_q(self):
        r = requests.get(f"{API}/cities", params={"q": "Ban"}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert any("bangalore" in c["city"].lower() for c in data), f"got={data}"
        for c in data:
            assert "ban" in c["city"].lower()

    def test_search_suggest_autocorrect_banglore(self):
        r = requests.get(f"{API}/search/suggest", params={"q": "Banglore"}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        corrections = [s for s in data if s.get("type") == "correction"]
        assert corrections, f"no correction in {data}"
        assert corrections[0]["value"] == "Bangalore"

    def test_search_suggest_returns_cities_for_partial(self):
        r = requests.get(f"{API}/search/suggest", params={"q": "Mum"}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        cities = [s for s in data if s.get("type") == "city"]
        assert any(s["value"] == "Mumbai" for s in cities), f"cities={cities}"


# ======================= LOCALITIES =======================
class TestLocalities:
    def test_localities_for_bangalore_after_creating_prop(self, owner_auth):
        # Ensure at least one property in Bangalore/Indiranagar
        _create_prop(owner_auth["headers"], locality="Indiranagar", city="Bangalore")
        r = requests.get(f"{API}/localities", params={"city": "Bangalore"}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) > 0
        names = [l["locality"].lower() for l in data]
        assert "indiranagar" in names, f"localities={data}"
        for l in data:
            assert "locality" in l and "count" in l
            assert isinstance(l["count"], int) and l["count"] >= 1


# ======================= PROPERTY: lifestyle + locality persistence =======================
class TestPropertyLifestyleLocality:
    def test_create_persists_lifestyle_and_locality(self, owner_auth):
        prop = _create_prop(
            owner_auth["headers"],
            locality="Koramangala",
            city="Bangalore",
            lifestyle_tags=["Student Friendly", "Working Pro"],
        )
        # GET back from DB
        g = requests.get(f"{API}/properties/{prop['id']}", timeout=30)
        assert g.status_code == 200
        doc = g.json()
        assert doc.get("locality") == "Koramangala", f"locality not persisted: {doc.get('locality')}"
        tags = doc.get("lifestyle_tags") or []
        assert "Student Friendly" in tags and "Working Pro" in tags, f"lifestyle_tags={tags}"

    def test_filter_by_lifestyle_tag(self, owner_auth):
        _create_prop(owner_auth["headers"], lifestyle_tags=["Student Friendly"], city="Bangalore", locality="BTM")
        r = requests.get(f"{API}/properties", params={"lifestyle_tag": "Student Friendly"}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) > 0
        for p in data:
            assert "Student Friendly" in (p.get("lifestyle_tags") or []), f"missing tag in {p.get('id')}"

    def test_filter_by_city_and_locality(self, owner_auth):
        _create_prop(owner_auth["headers"], city="Bangalore", locality="Indiranagar")
        r = requests.get(f"{API}/properties",
                        params={"city": "Bangalore", "locality": "Indiranagar"}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) > 0
        for p in data:
            assert p["city"].lower() == "bangalore"
            assert "indiranagar" in (p.get("locality") or "").lower()

    def test_available_listed_before_occupied(self, owner_auth):
        # create one available + one occupied
        _create_prop(owner_auth["headers"], status="available", city="Bangalore", locality="Whitefield")
        _create_prop(owner_auth["headers"], status="occupied", city="Bangalore", locality="Whitefield")
        r = requests.get(f"{API}/properties", params={"limit": 200}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        statuses = [p.get("status", "available") for p in data]
        # Confirm no "occupied" appears before an "available"
        first_occupied = next((i for i, s in enumerate(statuses) if s == "occupied"), None)
        last_available = max((i for i, s in enumerate(statuses) if s == "available"), default=-1)
        if first_occupied is not None and last_available != -1:
            assert first_occupied > last_available, f"occupied at {first_occupied} comes before last available at {last_available}"


# ======================= APPOINTMENT: owner cannot book own =======================
class TestOwnerSelfBook:
    def test_owner_books_own_returns_400(self, owner_auth):
        prop = _create_prop(owner_auth["headers"])
        visit = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
        r = requests.post(f"{API}/appointments", headers=owner_auth["headers"],
                          json={"property_id": prop["id"], "visit_date": visit, "message": "own"},
                          timeout=30)
        assert r.status_code == 400, r.text
        body = r.json()
        assert "own" in str(body.get("detail", "")).lower(), body


# ======================= DELETE messages + clear conv =======================
class TestMessageDeletion:
    def test_delete_message_marks_deleted(self, owner_auth, tenant_auth):
        # tenant sends to owner
        r = requests.post(f"{API}/messages", headers=tenant_auth["headers"],
                          json={"to_user_id": owner_auth["user"]["id"], "text": "to be deleted iter3"},
                          timeout=30)
        assert r.status_code == 200
        msg = r.json()
        mid = msg["id"]
        # tenant deletes
        d = requests.delete(f"{API}/messages/{mid}", headers=tenant_auth["headers"], timeout=30)
        assert d.status_code == 200, d.text
        # fetch messages — should see [message deleted]
        msgs = requests.get(f"{API}/messages",
                            headers=owner_auth["headers"],
                            params={"with_user": tenant_auth["user"]["id"]}, timeout=30).json()
        found = [m for m in msgs if m["id"] == mid]
        assert found and found[0]["text"] == "[message deleted]", f"got={found}"

    def test_clear_conversation_removes_messages(self, owner_auth, tenant_auth):
        # send fresh message to ensure conv exists
        r = requests.post(f"{API}/messages", headers=tenant_auth["headers"],
                          json={"to_user_id": owner_auth["user"]["id"], "text": "x iter3 clear"},
                          timeout=30)
        assert r.status_code == 200
        cid = r.json()["conv_id"]
        d = requests.delete(f"{API}/messages/conversation/{cid}",
                            headers=tenant_auth["headers"], timeout=30)
        assert d.status_code == 200, d.text
        # All messages cleared
        msgs = requests.get(f"{API}/messages",
                            headers=tenant_auth["headers"],
                            params={"with_user": owner_auth["user"]["id"]}, timeout=30).json()
        # In same conv (no property_id used) — should be empty
        same_conv = [m for m in msgs if m.get("conv_id") == cid]
        assert len(same_conv) == 0, f"expected empty, got {len(same_conv)}: {same_conv}"


# ======================= DELETE notifications + clear all =======================
class TestNotificationDeletion:
    def test_delete_single_notification(self, owner_auth, tenant_auth):
        # Trigger: tenant sends a message -> owner gets notif
        requests.post(f"{API}/messages", headers=tenant_auth["headers"],
                      json={"to_user_id": owner_auth["user"]["id"], "text": "ping for notif iter3"},
                      timeout=30)
        notifs = requests.get(f"{API}/notifications", headers=owner_auth["headers"], timeout=30).json()
        assert notifs, "expected at least one notification"
        nid = notifs[0]["id"]
        d = requests.delete(f"{API}/notifications/{nid}", headers=owner_auth["headers"], timeout=30)
        assert d.status_code == 200
        # Confirm gone
        after = requests.get(f"{API}/notifications", headers=owner_auth["headers"], timeout=30).json()
        assert not any(n["id"] == nid for n in after)

    def test_clear_all_notifications(self, tenant_auth, owner_auth):
        # Ensure tenant has at least 1 notif by sending message owner->tenant
        owner_tok = owner_auth["token"]
        requests.post(f"{API}/messages",
                      headers={"Authorization": f"Bearer {owner_tok}"},
                      json={"to_user_id": tenant_auth["user"]["id"], "text": "notif spam iter3"},
                      timeout=30)
        d = requests.delete(f"{API}/notifications", headers=tenant_auth["headers"], timeout=30)
        assert d.status_code == 200
        after = requests.get(f"{API}/notifications", headers=tenant_auth["headers"], timeout=30).json()
        assert after == [] or len(after) == 0, f"still has {len(after)} notifs"


# ======================= REVENUE CHART =======================
class TestRevenueChart:
    def test_revenue_returns_6_months_series(self, owner_auth):
        r = requests.get(f"{API}/dashboard/khatta/revenue",
                         headers=owner_auth["headers"], timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "series" in data and "total" in data
        series = data["series"]
        assert isinstance(series, list) and len(series) == 6, f"expected 6 months, got {len(series)}"
        for s in series:
            assert "month" in s and "revenue" in s
            assert isinstance(s["revenue"], (int, float))
            # Format YYYY-MM
            assert len(s["month"]) == 7 and s["month"][4] == "-", f"bad month {s['month']}"
        assert isinstance(data["total"], (int, float))


# ======================= LOCALITY INTELLIGENCE =======================
class TestLocalityIntel:
    def test_locality_intel_returns_scores(self, owner_auth):
        # Ensure data exists
        _create_prop(owner_auth["headers"], city="Bangalore", locality="Indiranagar",
                     property_type="PG", bhk="2BHK")
        r = requests.get(f"{API}/locality/intel",
                         params={"city": "Bangalore", "locality": "Indiranagar"}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["city"] == "Bangalore" and d["locality"] == "Indiranagar"
        assert "scores" in d
        if d["scores"]:
            scores = d["scores"]
            for k in ("safety", "connectivity", "student_friendly", "family_friendly", "overall"):
                assert k in scores and isinstance(scores[k], int)
            assert isinstance(d.get("pros"), list) and len(d["pros"]) > 0
            assert isinstance(d.get("cons"), list) and len(d["cons"]) > 0
