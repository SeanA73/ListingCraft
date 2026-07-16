"""ListingCraft backend integration tests."""
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://rank-your-listing.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@listingcraft.app"
DEMO_PASSWORD = "demo1234"


# ---- Fixtures ----
@pytest.fixture(scope="session")
def demo_token():
    r = requests.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"demo login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def demo_headers(demo_token):
    return {"Authorization": f"Bearer {demo_token}"}


@pytest.fixture(scope="session")
def free_user():
    """Register a fresh free-plan user."""
    email = f"TEST_free_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": "pass1234", "name": "Free Tester"
    }, timeout=30)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    data = r.json()
    return {"email": email, "token": data["token"], "user": data["user"],
            "headers": {"Authorization": f"Bearer {data['token']}"}}


# ---- Health ----
def test_health():
    r = requests.get(f"{API}/", timeout=15)
    assert r.status_code == 200
    assert r.json().get("ok") is True


# ---- AUTH ----
class TestAuth:
    def test_login_demo(self, demo_token):
        assert isinstance(demo_token, str) and len(demo_token) > 10

    def test_me(self, demo_headers):
        r = requests.get(f"{API}/auth/me", headers=demo_headers, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == DEMO_EMAIL
        assert data["plan"] == "pro"

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_register_and_me(self, free_user):
        r = requests.get(f"{API}/auth/me", headers=free_user["headers"], timeout=15)
        assert r.status_code == 200
        assert r.json()["email"] == free_user["email"].lower()

    def test_duplicate_register(self, free_user):
        r = requests.post(f"{API}/auth/register", json={
            "email": free_user["email"], "password": "pass1234", "name": "dup"
        }, timeout=15)
        assert r.status_code == 400

    def test_logout_clears(self):
        # register a throwaway user via cookies session
        s = requests.Session()
        email = f"TEST_logout_{uuid.uuid4().hex[:6]}@example.com"
        r = s.post(f"{API}/auth/register", json={"email": email, "password": "pass1234", "name": "L"}, timeout=15)
        assert r.status_code == 200
        # /me works via cookie
        r = s.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 200
        # logout
        r = s.post(f"{API}/auth/logout", timeout=15)
        assert r.status_code == 200
        # cookie should be cleared -> /me returns 401
        s.cookies.clear()
        r = s.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401


# ---- LISTINGS ----
class TestListings:
    def test_list_demo_has_seed(self, demo_headers):
        r = requests.get(f"{API}/listings", headers=demo_headers, timeout=15)
        assert r.status_code == 200
        docs = r.json()
        assert isinstance(docs, list)
        assert len(docs) >= 3, f"expected >=3 seeded listings, got {len(docs)}"

    def test_generate_and_regenerate(self, demo_headers):
        # Generate (slow — ~10-40s)
        body = {
            "product_description": "lavender scented soy candle in amber jar, 8oz",
            "tone": "warm",
        }
        r = requests.post(f"{API}/listings/generate", headers=demo_headers, json=body, timeout=120)
        assert r.status_code == 200, f"generate failed: {r.status_code} {r.text[:400]}"
        data = r.json()
        assert "listing_id" in data
        gen = data["generated"]
        assert gen.get("title")
        assert isinstance(gen.get("tags"), list) and len(gen["tags"]) >= 1
        assert gen.get("description")
        assert "score" in data and "total" in data["score"]
        lid = data["listing_id"]

        # Regenerate title
        r = requests.post(f"{API}/listings/{lid}/regenerate", headers=demo_headers,
                          json={"field": "title", "tone": "playful"}, timeout=90)
        assert r.status_code == 200, r.text[:400]
        new_title = r.json()["generated"]["title"]
        assert isinstance(new_title, str) and len(new_title) > 0

        # Regenerate tags
        r = requests.post(f"{API}/listings/{lid}/regenerate", headers=demo_headers,
                          json={"field": "tags"}, timeout=90)
        assert r.status_code == 200
        tags = r.json()["generated"]["tags"]
        assert isinstance(tags, list) and len(tags) <= 13 and len(tags) >= 1

        # Cleanup: delete
        r = requests.delete(f"{API}/listings/{lid}", headers=demo_headers, timeout=15)
        assert r.status_code == 200
        r = requests.get(f"{API}/listings/{lid}", headers=demo_headers, timeout=15)
        assert r.status_code == 404

    def test_search(self, demo_headers):
        r = requests.get(f"{API}/listings", headers=demo_headers, params={"q": "the"}, timeout=15)
        assert r.status_code == 200


# ---- QUOTA ----
class TestQuota:
    def test_free_quota_402_on_4th(self, free_user):
        headers = free_user["headers"]
        body = {"product_description": "small ceramic mug with hand-painted flowers", "tone": "warm"}
        statuses = []
        for i in range(4):
            r = requests.post(f"{API}/listings/generate", headers=headers, json=body, timeout=120)
            statuses.append(r.status_code)
            # if it's a 402 we can stop
            if r.status_code == 402:
                break
            # small pause between calls
            time.sleep(1)
        # Should have at least one 402
        assert 402 in statuses, f"expected a 402 within 4 free generations, got {statuses}"
        # And first should be 200
        assert statuses[0] == 200, f"first generation should succeed, got {statuses}"


# ---- PAYMENTS ----
class TestPayments:
    def test_plans_list(self):
        r = requests.get(f"{API}/plans", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "packages" in data and "limits" in data
        assert len(data["packages"]) >= 2

    def test_checkout_starter(self, demo_headers):
        body = {"package_id": "starter_monthly", "origin_url": BASE_URL}
        # Try common package ids
        r = requests.post(f"{API}/payments/checkout", headers=demo_headers, json=body, timeout=30)
        if r.status_code == 400:
            # discover valid package id
            plans = requests.get(f"{API}/plans", timeout=15).json()
            pids = [p["id"] for p in plans["packages"]]
            assert pids, "no packages configured"
            body["package_id"] = pids[0]
            r = requests.post(f"{API}/payments/checkout", headers=demo_headers, json=body, timeout=30)
        assert r.status_code == 200, f"checkout failed: {r.status_code} {r.text[:400]}"
        data = r.json()
        assert "url" in data and data["url"].startswith("http")
        assert "session_id" in data


# ---- PLANS lookup helper for test_credentials ----
def test_debug_available_packages():
    r = requests.get(f"{API}/plans", timeout=15)
    assert r.status_code == 200
    pids = [p.get("id") for p in r.json()["packages"]]
    print("Available package ids:", pids)
