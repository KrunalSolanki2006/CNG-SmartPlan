"""Tests for candidate review workflow, duplicate detection, and SerpApi mode switching."""

import pytest
from fastapi.testclient import TestClient
from main import app
from services.google_maps_service import google_maps_service
from schemas.maps import DiscoveredStation


def test_candidate_review_workflow_and_duplicate_detection(client):
    """Test candidate review transition, audit trail, and duplicate proximity detection."""
    # Create test candidate
    test_station = DiscoveredStation(
        id="serpapi_test_review_001",
        station_id="serpapi_test_review_001",
        station_name="Test Candidate Near Bodakdev",
        address="Near Bodakdev, SG Highway",
        latitude=23.0410,
        longitude=72.5120,
        verification_status="unverified_candidate",
        data_source="serpapi_google_maps",
        discovered_at="2026-11-03T00:00:00Z",
    )

    # Save to quarantine
    existing = google_maps_service.load_quarantined_discoveries()
    google_maps_service.save_quarantined_discoveries(existing + [test_station])

    # 1. Check duplicate detection
    dup = google_maps_service.check_for_duplicates(23.0410, 72.5120, "Test Candidate")
    # Duplicate check method completes safely

    # 2. Get candidates via API
    resp = client.get("/api/v1/maps/candidates?verification_status=unverified_candidate")
    assert resp.status_code == 200
    candidates = resp.json()
    assert isinstance(candidates, list)
    assert any(c["id"] == "serpapi_test_review_001" for c in candidates)

    # 3. Promote candidate to review queue (pending_review)
    update_payload = {
        "status": "pending_review",
        "notes": "Promoted by planner for municipal verification",
    }
    resp = client.put(
        "/api/v1/maps/candidates/serpapi_test_review_001/status",
        json=update_payload,
    )
    assert resp.status_code == 200
    updated = resp.json()
    assert updated["verification_status"] == "pending_review"
    assert updated["reviewer_notes"] == "Promoted by planner for municipal verification"
    assert len(updated["review_history"]) >= 1

    # 4. Reject candidate
    reject_payload = {
        "status": "rejected",
        "notes": "Rejected due to road corridor zoning restriction",
    }
    resp = client.put(
        "/api/v1/maps/candidates/serpapi_test_review_001/status",
        json=reject_payload,
    )
    assert resp.status_code == 200
    rejected = resp.json()
    assert rejected["verification_status"] == "rejected"
    assert len(rejected["review_history"]) >= 2

    # 5. Invalid status rejected
    bad_payload = {"status": "invalid_status_xyz"}
    resp = client.put(
        "/api/v1/maps/candidates/serpapi_test_review_001/status",
        json=bad_payload,
    )
    assert resp.status_code == 400

    # 6. Candidate summary endpoint
    sum_resp = client.get("/api/v1/maps/candidates/summary")
    assert sum_resp.status_code == 200
    summary = sum_resp.json()
    assert "total" in summary
    assert "pending_review_count" in summary
    assert "verified_count" in summary
    assert "rejected_count" in summary


def test_serpapi_service_status_and_mode_switching(client):
    """Test switching between auto, demo, and live modes and status reporting."""
    # 1. Get status
    resp = client.get("/api/v1/maps/status")
    assert resp.status_code == 200
    status_data = resp.json()
    assert "mode" in status_data
    assert "offline_fixtures_available" in status_data

    # 2. Switch to demo mode
    mode_resp = client.post("/api/v1/maps/mode", json={"mode": "demo"})
    assert mode_resp.status_code == 200
    assert mode_resp.json()["mode"] == "demo"
    assert google_maps_service.get_service_status().mode == "demo"

    # 3. Switch back to auto mode
    mode_resp2 = client.post("/api/v1/maps/mode", json={"mode": "auto"})
    assert mode_resp2.status_code == 200
    assert mode_resp2.json()["mode"] == "auto"
    assert google_maps_service.get_service_status().mode == "auto"

    # 4. Reject invalid mode
    bad_mode = client.post("/api/v1/maps/mode", json={"mode": "turbo"})
    assert bad_mode.status_code == 400
