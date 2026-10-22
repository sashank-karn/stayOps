import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_new_resident_unallocated_profile():
    # Register new tenant
    import uuid
    uid = uuid.uuid4().hex[:8]
    email = f"resident_{uid}@example.com"
    reg_res = client.post("/api/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": f"New Resident {uid}",
        "role": "tenant"
    })
    assert reg_res.status_code == 200, reg_res.text

    # Fetch profile
    prof_res = client.get(f"/api/resident/profile?email={email}")
    assert prof_res.status_code == 200
    prof = prof_res.json()
    assert prof["has_active_lease"] is False
    assert prof["room"] is None
    assert prof["bed"] is None
    assert prof["property"] is None

    # Search available rooms
    avail_res = client.get("/api/resident/available-rooms?location=Bengaluru&budget=20000")
    assert avail_res.status_code == 200
    avail = avail_res.json()
    assert avail["success"] is True
    assert avail["count"] > 0
    first_bed = avail["matches"][0]

    # Book room
    book_res = client.post("/api/resident/book-room", json={
        "bed_id": first_bed["bed_id"],
        "email": email,
    })
    assert book_res.status_code == 200
    book_data = book_res.json()
    assert book_data["success"] is True

    # Re-fetch profile
    prof_after = client.get(f"/api/resident/profile?email={email}").json()
    assert prof_after["has_active_lease"] is True
    assert prof_after["room"] is not None
    assert prof_after["property"] is not None
    assert prof_after["lease"] is not None
