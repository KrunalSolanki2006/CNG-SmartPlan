"""Unit and integration tests for geographic verification, Haversine distance, and candidate quarantine.

Governed by Prompt 4 Task F, docs/API_CONTRACT.md, and docs/DATA_PROVENANCE.md.
"""

import math
from pathlib import Path
import pytest
import pandas as pd

from services.geo_service import GeoService
from services.station_service import StationService
from services.data_loader import get_data_store


def test_haversine_distance_zero():
    """Distance between identical coordinates must be exactly 0.0 km."""
    d = GeoService.haversine_distance_km(23.0225, 72.5714, 23.0225, 72.5714)
    assert d == pytest.approx(0.0, abs=1e-6)


def test_haversine_distance_known_points():
    """Verify geodesic distance between Ahmedabad and Gandhinagar is approximately 22-23 km."""
    ahmedabad_lat, ahmedabad_lon = 23.0225, 72.5714
    gandhinagar_lat, gandhinagar_lon = 23.2156, 72.6369

    dist = GeoService.haversine_distance_km(
        ahmedabad_lat, ahmedabad_lon, gandhinagar_lat, gandhinagar_lon
    )
    # Great-circle distance between (23.0225, 72.5714) and (23.2156, 72.6369) is ~22.4 km
    assert 21.0 <= dist <= 24.0

    # 1 degree of latitude on equator should be approx 111.19 km
    eq_dist = GeoService.haversine_distance_km(0.0, 0.0, 1.0, 0.0)
    assert 110.0 <= eq_dist <= 112.0


def test_haversine_symmetry_and_non_negative():
    """Haversine distance must be strictly symmetric and non-negative."""
    p1 = (23.1157, 72.5878)
    p2 = (22.9989, 72.6356)

    d1 = GeoService.haversine_distance_km(p1[0], p1[1], p2[0], p2[1])
    d2 = GeoService.haversine_distance_km(p2[0], p2[1], p1[0], p1[1])

    assert d1 >= 0.0
    assert d1 == pytest.approx(d2, abs=1e-9)


def test_haversine_distance_out_of_range_rejected():
    """Geodesic distance calculation must raise ValueError for out-of-bounds coordinates."""
    # Latitude > 90
    with pytest.raises(ValueError, match="Latitude 95.0 is out of valid range"):
        GeoService.haversine_distance_km(95.0, 72.5, 23.0, 72.5)

    # Latitude < -90
    with pytest.raises(ValueError, match="Latitude -91.0 is out of valid range"):
        GeoService.haversine_distance_km(-91.0, 72.5, 23.0, 72.5)

    # Longitude > 180
    with pytest.raises(ValueError, match="Longitude 185.0 is out of valid range"):
        GeoService.haversine_distance_km(23.0, 185.0, 23.0, 72.5)

    # Longitude < -180
    with pytest.raises(ValueError, match="Longitude -190.0 is out of valid range"):
        GeoService.haversine_distance_km(23.0, -190.0, 23.0, 72.5)

    # NaN / Inf coordinates
    with pytest.raises(ValueError, match="NaN or infinite"):
        GeoService.haversine_distance_km(float("nan"), 72.5, 23.0, 72.5)


def test_study_area_bounding_box_checks():
    """Verify bounding box containment for Ahmedabad study area [22.8, 23.3] lat, [72.3, 72.8] lon."""
    # Ahmedabad city center
    assert GeoService.is_within_study_area_bbox(23.0225, 72.5714) is True

    # Chandkheda (northern urban corridor)
    assert GeoService.is_within_study_area_bbox(23.1157, 72.5878) is True

    # Mumbai (completely outside)
    assert GeoService.is_within_study_area_bbox(19.0760, 72.8777) is False

    # Delhi (completely outside)
    assert GeoService.is_within_study_area_bbox(28.6139, 77.2090) is False

    # Bounding box corners
    assert GeoService.is_within_study_area_bbox(22.80, 72.30) is True
    assert GeoService.is_within_study_area_bbox(23.30, 72.80) is True

    # Points just outside
    assert GeoService.is_within_study_area_bbox(22.79, 72.50) is False
    assert GeoService.is_within_study_area_bbox(23.31, 72.50) is False
    assert GeoService.is_within_study_area_bbox(23.00, 72.29) is False
    assert GeoService.is_within_study_area_bbox(23.00, 72.81) is False


def test_find_nearby_approved_stations_returns_unavailable_state():
    """find_nearby_approved_stations must return unavailable status because 0 stations have verified coordinates."""
    res = GeoService.find_nearby_approved_stations(lat=23.05, lon=72.60, radius_km=3.0)

    assert res["geographic_analysis_available"] is False
    assert "No stations have independently verified coordinates" in res["reason"]
    assert "approved_for_map_pin=no" in res["reason"]
    assert res["nearby_stations"] == []
    assert res["approved_station_count"] == 0
    assert res["query_point"]["latitude"] == 23.05
    assert res["query_point"]["longitude"] == 72.60
    assert res["query_point"]["in_study_area_bbox"] is True
    assert res["radius_km"] == 3.0
    assert "straight-line" in res["distance_method"].lower()
    assert "not road distance" in res["distance_method"].lower()


def test_find_nearby_stations_invalid_radius():
    """Search radius outside (0.0, 50.0] km must raise ValueError."""
    with pytest.raises(ValueError, match="between 0.1 and 50.0"):
        GeoService.find_nearby_approved_stations(lat=23.05, lon=72.60, radius_km=0.0)

    with pytest.raises(ValueError, match="between 0.1 and 50.0"):
        GeoService.find_nearby_approved_stations(lat=23.05, lon=72.60, radius_km=55.0)


def test_candidate_audit_summary_integrity():
    """Verify candidate audit summary catches all 8 candidates, operator conflicts, and missing stations."""
    summary = GeoService.get_candidate_audit_summary()

    assert summary["total_stations"] == 12
    assert summary["candidates_found"] == 8
    assert summary["approved_for_map_pin_count"] == 0
    assert summary["unapproved_candidates_count"] == 8

    # 4 stations have no candidate coordinates
    assert set(summary["stations_without_candidates"]) == {
        "AMD004",
        "AMD008",
        "AMD010",
        "AMD012",
    }

    # Operator conflicts for AMD001 and AMD002 (Adani CNG vs Gujarat Energy)
    assert "AMD001" in summary["operator_conflict_stations"]
    assert "AMD002" in summary["operator_conflict_stations"]

    # Unconfirmed dispenser capability
    assert "AMD003" in summary["unconfirmed_dispenser_stations"]
    assert "AMD005" in summary["unconfirmed_dispenser_stations"]
    assert "AMD006" in summary["unconfirmed_dispenser_stations"]
    assert "AMD007" in summary["unconfirmed_dispenser_stations"]
    assert "AMD009" in summary["unconfirmed_dispenser_stations"]
    assert "AMD011" in summary["unconfirmed_dispenser_stations"]

    # Boundary and attribution metadata
    assert summary["boundary_status"] == "provisional_locality_screen"
    assert summary["amc_polygon_validated"] is False
    assert "OpenStreetMap" in summary["open_street_map_attribution"]
    assert "ODbL" in summary["open_street_map_attribution"]


def test_station_service_delegates_to_geo_service():
    """StationService helper methods must delegate correctly to GeoService."""
    nearby = StationService.find_nearby_stations(23.05, 72.60, 3.0)
    assert nearby["geographic_analysis_available"] is False
    assert nearby["approved_station_count"] == 0

    audit = StationService.get_candidate_audit_summary()
    assert audit["total_stations"] == 12
    assert audit["approved_for_map_pin_count"] == 0


def test_evaluate_candidate_point_isolated_from_master():
    """Evaluating a candidate point must keep it separate from master station records."""
    store = get_data_store()
    initial_station_count = len(store.stations)

    eval_res = GeoService.evaluate_candidate_point(23.05, 72.60)
    assert eval_res["is_valid"] is True
    assert eval_res["in_study_area_bbox"] is True
    assert eval_res["classification"] == "user_scenario_candidate_point"

    # Confirms master records were NOT altered
    assert len(store.stations) == initial_station_count


def test_curated_station_verification_registry_file():
    """Verify curated registry file on disk conforms to provenance rules."""
    registry_path = Path("server/data/curated/station_verification_registry.csv")
    assert registry_path.exists(), "Curated registry file missing"

    df = pd.read_csv(registry_path)
    assert len(df) == 12, "Must contain exactly 12 station audit records"
    assert set(df["station_id"]) == {f"AMD{i:03d}" for i in range(1, 13)}

    # None of the 12 may be approved for map pin
    approved_vals = df["approved_for_map_pin"].astype(str).str.lower().tolist()
    assert all(v in ("false", "0", "no") for v in approved_vals)

    # 8 candidate coordinates present, 4 empty
    candidates_present = df[df["candidate_latitude"].notna()]
    assert len(candidates_present) == 8

    # AMD001 and AMD002 must have operator conflict flag True
    c_amd001 = df[df["station_id"] == "AMD001"].iloc[0]
    assert str(c_amd001["operator_conflict_flag"]).lower() in ("true", "1")

    # AMD010 must be marked uncertain_periphery
    c_amd010 = df[df["station_id"] == "AMD010"].iloc[0]
    assert c_amd010["study_boundary_eligibility"] == "uncertain_periphery"

