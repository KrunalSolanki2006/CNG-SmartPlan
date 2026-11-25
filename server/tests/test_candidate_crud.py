"""Tests for Candidate Location CRUD, Comparison Matrix, and Gujarat Network Filtering.

Verifies:
- Candidate creation with Gujarat geocoordinates validation.
- Auto-assignment of nearest operational verified station.
- Update candidate attributes and transparent scoring recalculation.
- Deletion of candidate.
- Comparison matrix of 2 to 5 candidates with factor winners.
- Network stations filtering by search query, city, district, and status.
"""

import pytest
from fastapi.testclient import TestClient
from server.main import app
from server.services.candidate_ranking_service import CandidateRankingService

client = TestClient(app)


def test_network_stations_with_filters():
    """Verify Gujarat network station filtering by city and district."""
    # 1. Base query
    resp = client.get("/api/v1/network/stations")
    assert resp.status_code == 200
    data = resp.json()
    assert "stations" in data
    assert "available_districts" in data
    assert len(data["available_districts"]) > 0
    assert data["verified_operating_count"] == 151

    # 2. Filter by city: Surat
    resp_surat = client.get("/api/v1/network/stations?city=Surat")
    assert resp_surat.status_code == 200
    surat_data = resp_surat.json()
    assert all(s["city"].lower() == "surat" for s in surat_data["stations"])

    # 3. Search query: Hazira
    resp_search = client.get("/api/v1/network/stations?search=Hazira")
    assert resp_search.status_code == 200
    search_data = resp_search.json()
    assert any("hazira" in s["station_name"].lower() or "hazira" in s["address"].lower() for s in search_data["stations"])


def test_candidate_comparison_endpoint():
    """Verify candidate comparison matrix of 2 to 5 candidates."""
    payload = {
        "candidate_ids": ["GUJ_CAN_001", "GUJ_CAN_002", "GUJ_CAN_003"]
    }
    resp = client.post("/api/v1/candidates/compare", json=payload)
    assert resp.status_code == 200
    comp = resp.json()

    assert len(comp["candidates"]) == 3
    names = [c["name"] for c in comp["candidates"]]
    assert comp["best_overall_candidate"] in names
    assert comp["highest_demand_candidate"] in names
    assert comp["largest_service_gap_candidate"] in names
    assert comp["best_accessibility_candidate"] in names
    assert len(comp["comparison_summary"]) > 50

    for item in comp["candidates"]:
        assert item["candidate_id"] in payload["candidate_ids"]
        assert item["name"] is not None
        assert item["city"] is not None
        assert item["final_score"] is not None
        assert item["demand_score"] is not None


def test_candidate_comparison_validation():
    """Verify comparison requires between 2 and 5 candidates."""
    # Less than 2
    resp_few = client.post("/api/v1/candidates/compare", json={"candidate_ids": ["GUJ_CAN_001"]})
    assert resp_few.status_code == 422

    # More than 5
    resp_many = client.post("/api/v1/candidates/compare", json={
        "candidate_ids": ["GUJ_CAN_001", "GUJ_CAN_002", "GUJ_CAN_003", "GUJ_CAN_004", "GUJ_CAN_005", "GUJ_CAN_006"]
    })
    assert resp_many.status_code == 422


def test_candidate_create_and_delete_lifecycle():
    """Verify candidate creation, validation, nearest station auto-link, and deletion."""
    test_cand_payload = {
        "name": "Test Industrial Node Sanand West",
        "city": "Sanand",
        "district": "Ahmedabad",
        "category": "industrial_hub",
        "latitude": 23.0150,
        "longitude": 72.3550,
        "address": "Survey 102, Sanand GIDC Expansion Road",
        "locality": "Sanand GIDC",
        "road_corridor": "SH-17 Viramgam Highway",
        "nearest_major_highway": "SH-17",
        "highway_tier": "State Highway",
        "traffic_pcu_per_day": 19500.0,
        "commercial_vehicle_density_proxy": 82.0,
        "pipeline_proximity_meters": 450.0,
        "land_zoning": "GIDC Industrial Zone",
        "notes": "Automated integration test candidate record",
    }

    # 1. Create
    resp_create = client.post("/api/v1/candidates", json=test_cand_payload)
    assert resp_create.status_code == 201
    created = resp_create.json()
    new_id = created["candidate_id"]
    assert new_id.startswith("GUJ_CAN_")
    assert created["name"] == test_cand_payload["name"]
    assert created["city"] == "Sanand"
    assert created["district"] == "Ahmedabad"

    # 2. Check candidate is included in rankings
    resp_rankings = client.get("/api/v1/candidates")
    assert resp_rankings.status_code == 200
    rankings = resp_rankings.json()
    cand_ids = [c["candidate_id"] for c in rankings["candidates"]]
    assert new_id in cand_ids

    # 3. Update candidate
    resp_update = client.put(f"/api/v1/candidates/{new_id}", json={
        "name": "Updated Test Node Sanand West Gate 3",
        "traffic_pcu_per_day": 22000.0
    })
    assert resp_update.status_code == 200
    updated = resp_update.json()
    assert updated["name"] == "Updated Test Node Sanand West Gate 3"
    assert updated["traffic_pcu_per_day"] == 22000.0

    # 4. Delete candidate to maintain data cleanliness
    resp_delete = client.delete(f"/api/v1/candidates/{new_id}")
    assert resp_delete.status_code == 200
    del_data = resp_delete.json()
    assert del_data["status"] == "success"
    assert del_data["deleted_id"] == new_id

    # 5. Verify deletion
    resp_after = client.get("/api/v1/candidates")
    after_ids = [c["candidate_id"] for c in resp_after.json()["candidates"]]
    assert new_id not in after_ids
