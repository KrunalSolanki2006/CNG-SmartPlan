"""Unit and integration tests for Gujarat-wide SerpAPI CNG Station Discovery & Classification Service."""

import pytest
from fastapi.testclient import TestClient

from main import app
from services.gujarat_discovery_service import GujaratDiscoveryService
from services.candidate_ranking_service import CandidateRankingService


def test_discovery_service_cached_records():
    """Verify discovery service loads curated discovered records with Place IDs and audit classifications."""
    records = GujaratDiscoveryService.load_discovered_stations()
    assert len(records) >= 220, f"Expected at least 220 records, got {len(records)}"

    # Verify Place ID uniqueness
    place_ids = [r["place_id"] for r in records if r.get("place_id")]
    assert len(place_ids) == len(set(place_ids)), "Duplicate Google Place IDs detected in discovered records"

    # Verify every record has valid audit classification
    for rec in records:
        assert rec.get("cng_classification") in ["VERIFIED_OPERATING_CNG", "DISCOVERED_CNG", "POTENTIAL_CNG", "NOT_CNG"], f"Invalid tier for {rec['station_id']}"
        assert rec.get("cng_audit_reason") is not None, f"Missing audit reason for {rec['station_id']}"
        assert rec.get("data_source") == "serpapi_google_maps"


def test_discovery_diagnostics():
    """Verify discovery diagnostics returns accurate metrics."""
    diag = GujaratDiscoveryService.load_discovery_diagnostics()
    assert diag["api_requests_total"] >= 12
    assert diag["new_records_added"] >= 220
    assert len(diag["cities_searched"]) >= 12
    assert "Ahmedabad" in diag["cities_searched"]
    assert "Surat" in diag["cities_searched"]
    assert "Vadodara" in diag["cities_searched"]
    assert "Rajkot" in diag["cities_searched"]


def test_diagnostics_api_endpoint():
    """Verify GET /api/v1/maps/discovery/diagnostics endpoint works."""
    client = TestClient(app)
    response = client.get("/api/v1/maps/discovery/diagnostics")
    assert response.status_code == 200
    data = response.json()
    assert "cities_searched" in data
    assert data["new_records_added"] >= 220
    assert len(data["city_breakdown"]) >= 12
    assert data["mode"] in ["LIVE API RESULTS", "CACHED RESULTS", "OFFLINE DEMO DATA"]


def test_network_stations_cng_filtering():
    """Verify CandidateRankingService strictly excludes NOT_CNG general petrol bunks from active network."""
    stations = CandidateRankingService.load_network_stations(include_discovered=True, include_rejected=False)
    # 20 verified + 131 discovered + 26 potential = 177 active CNG stations across Gujarat
    assert len(stations) == 177, f"Expected 177 active CNG stations, got {len(stations)}"

    # Zero NOT_CNG records should be in the active network
    assert all(
        s.cng_classification in ["VERIFIED_OPERATING_CNG", "DISCOVERED_CNG", "POTENTIAL_CNG"]
        for s in stations
    ), "Detected NOT_CNG records in active network!"

    verified = [s for s in stations if s.cng_classification == "VERIFIED_OPERATING_CNG"]
    discovered = [s for s in stations if s.cng_classification == "DISCOVERED_CNG"]
    potential = [s for s in stations if s.cng_classification == "POTENTIAL_CNG"]

    assert len(verified) == 151, f"Expected 151 verified operating CNG stations, got {len(verified)}"
    assert len(discovered) == 0, f"Expected 0 unpromoted discovered CNG listings, got {len(discovered)}"
    assert len(potential) == 26, f"Expected 26 potential CNG stations, got {len(potential)}"


def test_network_stations_summary_api():
    """Verify GET /api/v1/network/stations returns verified, discovered, potential, and rejected counts."""
    client = TestClient(app)
    response = client.get("/api/v1/network/stations")
    assert response.status_code == 200
    data = response.json()

    assert data["total_stations"] == 177
    assert data["verified_operating_count"] == 151
    assert data["discovered_cng_count"] == 0
    assert data["potential_count"] == 26
    assert data["rejected_count"] >= 70
    assert len(data["available_cities"]) >= 12


def test_ranking_preserves_verified_distance_calculation():
    """Verify Candidate ranking only computes nearest-station distance against verified stations."""
    response = CandidateRankingService.rank_candidates()
    assert response.total_candidates == 16
    assert response.rankable_count == 15

    # Check that nearest station calculation uses verified operating stations
    top_cand = response.candidates[0]
    assert top_cand.nearest_station is not None
    assert top_cand.nearest_station.station_id is not None
    assert top_cand.nearest_station.is_verified is True
