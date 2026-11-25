"""Tests for shared Nearby Verified Stations & Network Impact Simulation APIs.

Verifies:
- Only VERIFIED_OPERATING_CNG stations with valid coordinates are included.
- Unverified POTENTIAL_CNG, DISCOVERED_CNG, NOT_CNG, and invalid coordinates are excluded.
- Haversine distance calculation and ascending nearest-first sorting.
- Radius filtering across 1, 2, 5, 10, and 15 km.
- Honest Insufficient Data handling for quantitative customer diversion/sales.
- Minimal proposed station creation (POST /api/v1/candidates) preserves separation from verified dataset.
- Consistency between nearby-stations and simulate-impact endpoints.
"""

from unittest.mock import patch
from fastapi.testclient import TestClient

from main import app
from schemas.candidates import GujaratStationModel
from services.geo_service import GeoService
from services.network_impact_service import NetworkImpactService

client = TestClient(app)


def test_verified_eligible_stations_excludes_unverified_and_invalid():
    """Verify strict filtering excludes POTENTIAL_CNG, NOT_CNG, synthetic, and (0,0)/None coords."""
    eligible = NetworkImpactService.get_verified_eligible_stations()
    assert len(eligible) == 151
    for st in eligible:
        assert st.cng_classification == "VERIFIED_OPERATING_CNG"
        assert st.latitude is not None and st.longitude is not None
        assert not (abs(st.latitude) < 1e-6 and abs(st.longitude) < 1e-6)
        assert "synthetic" not in (st.data_source or "").lower()


def test_nearby_verified_stations_haversine_sort_and_radius():
    """Verify Haversine distances, nearest-first sorting, and dynamic radius changes."""
    # Ahmedabad center near existing verified stations
    lat, lng = 23.035, 72.528

    resp_1km = client.get(f"/api/v1/network/nearby-stations?lat={lat}&lng={lng}&radius_km=1")
    assert resp_1km.status_code == 200
    d1 = resp_1km.json()

    resp_5km = client.get(f"/api/v1/network/nearby-stations?lat={lat}&lng={lng}&radius_km=5")
    assert resp_5km.status_code == 200
    d5 = resp_5km.json()

    resp_15km = client.get(f"/api/v1/network/nearby-stations?lat={lat}&lng={lng}&radius_km=15")
    assert resp_15km.status_code == 200
    d15 = resp_15km.json()

    assert d5["total_verified_stations_checked"] == 151
    assert d1["nearby_count"] <= d5["nearby_count"] <= d15["nearby_count"]
    assert d5["nearby_count"] > 0

    # Verify ascending Haversine sort and exact distance computation
    distances = [s["distance_km"] for s in d5["nearby_stations"]]
    assert distances == sorted(distances)
    assert all(dist <= 5.0 for dist in distances)

    first = d5["nearby_stations"][0]
    expected_dist = round(
        GeoService.haversine_distance_km(lat, lng, first["latitude"], first["longitude"]),
        2,
    )
    assert first["distance_km"] == expected_dist
    assert first["is_verified"] is True
    assert d5["nearest_station"]["station_id"] == first["station_id"]
    assert d5["farthest_nearby_station"]["station_id"] == d5["nearby_stations"][-1]["station_id"]


def test_nearby_stations_empty_remote_location():
    """Verify clean empty list when no verified stations exist within radius."""
    # Remote Kutch coordinates far from urban verified stations
    resp = client.get("/api/v1/network/nearby-stations?lat=23.95&lng=69.50&radius_km=5")
    assert resp.status_code == 200
    data = resp.json()
    assert data["nearby_count"] == 0
    assert data["nearby_stations"] == []
    assert data["nearest_station"] is None
    assert data["farthest_nearby_station"] is None
    assert data["nearest_overall_station"] is not None


def test_simulate_impact_ahmedabad_scenario_estimation_and_conservation():
    """Verify Ahmedabad corridor uses synthetic baseline for distance-decay demand, diversion & net impact."""
    # Coordinates near Vastrapur/Navrangpura Ahmedabad with multiple AMD* baseline stations inside 5 km
    lat, lng, radius = 23.035, 72.528, 5.0

    nearby_resp = client.get(
        f"/api/v1/network/nearby-stations?lat={lat}&lng={lng}&radius_km={radius}"
    ).json()

    sim_resp = client.post(
        "/api/v1/network/simulate-impact",
        json={
            "proposed_name": "Vastrapur Test Outlet",
            "proposed_location_label": "Vastrapur, Ahmedabad",
            "proposed_latitude": lat,
            "proposed_longitude": lng,
            "radius_km": radius,
            "expected_daily_capacity_kg": 4000,
        },
    )
    assert sim_resp.status_code == 200
    sim = sim_resp.json()

    # Exact consistency between nearby-stations and simulate-impact
    assert sim["geographical_metrics"]["nearby_verified_count"] == nearby_resp["nearby_count"]
    assert len(sim["nearby_stations"]) == len(nearby_resp["nearby_stations"])
    assert sim["geographical_metrics"]["nearest_station"]["station_id"] == nearby_resp["nearest_overall_station"]["station_id"]
    assert sim["proposed_station"]["status"] == "PROPOSED"

    # Demand estimation & synthetic demo provenance
    de = sim["demand_estimate"]
    assert de["available"] is True
    assert de["status"] == "Estimated (Scenario-Based)"
    assert de["data_origin"] == "synthetic_demo"
    assert de["nearby_with_sales_count"] >= 1
    assert de["potential_daily_sales_kg"] > 0
    assert de["potential_monthly_sales_kg"] == round(de["potential_daily_sales_kg"] * 30.0, 1)

    # Distance-decay diversion is not uniform across stations at different distances
    rows_with_sales = [r for r in sim["station_impact_rows"] if r["has_sales_data"]]
    assert len(rows_with_sales) == de["nearby_with_sales_count"]
    shares = {r["estimated_diversion_share"] for r in rows_with_sales}
    if len(rows_with_sales) > 1:
        assert len(shares) > 1

    # Network impact accounting identity
    ni = sim["network_sales_impact"]
    assert ni["available"] is True
    assert ni["status"] == "Calculated (Scenario-Based)"
    assert ni["proposed_station_daily_sales_kg"] == de["potential_daily_sales_kg"]
    assert abs(ni["net_network_sales_change_kg"] - (ni["proposed_station_daily_sales_kg"] - ni["total_nearby_sales_loss_kg"])) <= 0.2
    assert abs(ni["network_sales_after_kg"] - (ni["network_sales_before_kg"] + ni["net_network_sales_change_kg"])) <= 0.2
    assert sim["beneficial_assessment"]["outcome"] in {"Potentially Beneficial", "Potentially Not Beneficial"}


def test_simulate_impact_capacity_cap_conservation():
    """Verify tight proposed daily capacity caps sales and scales diversion proportionally."""
    # First inspect uncapped scenario demand at Vastrapur, Ahmedabad
    uncapped = client.post(
        "/api/v1/network/simulate-impact",
        json={
            "proposed_name": "Vastrapur Uncapped Check",
            "proposed_location_label": "Vastrapur, Ahmedabad",
            "proposed_latitude": 23.035,
            "proposed_longitude": 72.528,
            "radius_km": 5.0,
        },
    ).json()
    uncapped_demand = uncapped["demand_estimate"]["potential_daily_demand_kg"]
    assert uncapped_demand is not None and uncapped_demand > 50.0
    tight_cap = round(uncapped_demand * 0.5, 1)

    sim_resp = client.post(
        "/api/v1/network/simulate-impact",
        json={
            "proposed_name": "Small Skid Outlet",
            "proposed_location_label": "Vastrapur, Ahmedabad",
            "proposed_latitude": 23.035,
            "proposed_longitude": 72.528,
            "radius_km": 5.0,
            "expected_daily_capacity_kg": tight_cap,
        },
    )
    assert sim_resp.status_code == 200
    sim = sim_resp.json()
    de = sim["demand_estimate"]
    assert de["available"] is True
    assert de["potential_daily_sales_kg"] <= tight_cap
    assert de["capacity_utilization_pct"] is not None and de["capacity_utilization_pct"] > 100.0
    assert sim["network_sales_impact"]["total_nearby_sales_loss_kg"] <= de["potential_daily_sales_kg"]


def test_simulate_impact_non_ahmedabad_honest_insufficient_data():
    """Verify verified non-Ahmedabad corridors without sales baselines report Insufficient Data honestly."""
    # Surat city coordinates (verified stations exist, but no station sales history in CSV)
    sim_resp = client.post(
        "/api/v1/network/simulate-impact",
        json={
            "proposed_name": "Surat Ring Road Proposed",
            "proposed_location_label": "Ring Road, Surat, Gujarat",
            "proposed_latitude": 21.195,
            "proposed_longitude": 72.819,
            "radius_km": 10.0,
        },
    )
    assert sim_resp.status_code == 200
    sim = sim_resp.json()
    assert sim["geographical_metrics"]["nearby_verified_count"] > 0
    assert sim["diversion_assessment"]["status"] == "Insufficient Data"
    assert sim["diversion_assessment"]["available"] is False
    assert sim["demand_estimate"]["status"] == "Insufficient Data"
    assert sim["demand_estimate"]["available"] is False
    assert sim["network_sales_impact"]["status"] == "Insufficient Data"
    assert sim["network_sales_impact"]["available"] is False
    assert sim["beneficial_assessment"]["outcome"] == "Inconclusive / Insufficient Data"
    assert all(r["has_sales_data"] is False and r["current_daily_sales_kg"] is None for r in sim["station_impact_rows"])


def test_simulate_impact_coverage_gap_and_insufficient_data():
    """Verify Potential Coverage Gap for remote areas and Insufficient Data when no verified stations exist."""
    # Remote Kutch site -> Potential Coverage Gap
    resp_gap = client.post(
        "/api/v1/network/simulate-impact",
        json={
            "proposed_name": "Remote Kutch Site",
            "proposed_latitude": 23.95,
            "proposed_longitude": 69.50,
            "radius_km": 5.0,
        },
    )
    assert resp_gap.status_code == 200
    assert resp_gap.json()["overall_assessment"] == "Potential Coverage Gap"
    assert resp_gap.json()["geographical_metrics"]["nearby_verified_count"] == 0

    # Mock zero verified stations -> Insufficient Data
    with patch.object(NetworkImpactService, "get_verified_eligible_stations", return_value=[]):
        resp_empty = client.post(
            "/api/v1/network/simulate-impact",
            json={
                "proposed_name": "Empty Network Test",
                "proposed_latitude": 23.035,
                "proposed_longitude": 72.528,
                "radius_km": 5.0,
            },
        )
        assert resp_empty.status_code == 200
        assert resp_empty.json()["overall_assessment"] == "Insufficient Data"


def test_minimal_candidate_creation_preserves_verified_dataset():
    """Verify minimal candidate creation saves as proposed_candidate without altering verified stations."""
    before_verified = len(NetworkImpactService.get_verified_eligible_stations())

    create_resp = client.post(
        "/api/v1/candidates",
        json={
            "name": "Sanand Minimal Test Station",
            "selected_location": "Sanand GIDC, Ahmedabad, Gujarat",
            "latitude": 23.015,
            "longitude": 72.355,
            "expected_daily_capacity_kg": 3500,
        },
    )
    assert create_resp.status_code == 201
    created = create_resp.json()
    cid = created["candidate_id"]
    assert created["verification_status"] == "proposed_candidate"
    assert created["expected_daily_capacity_kg"] == 3500

    after_verified = len(NetworkImpactService.get_verified_eligible_stations())
    assert after_verified == before_verified

    # Clean up test candidate
    del_resp = client.delete(f"/api/v1/candidates/{cid}")
    assert del_resp.status_code == 200


def test_network_endpoints_validation():
    """Verify invalid radius and out-of-range coordinates return 422."""
    bad_radius = client.get("/api/v1/network/nearby-stations?lat=23.0&lng=72.5&radius_km=100")
    assert bad_radius.status_code == 422

    bad_lat = client.post(
        "/api/v1/network/simulate-impact",
        json={
            "proposed_latitude": 99.0,
            "proposed_longitude": 72.5,
            "radius_km": 5.0,
        },
    )
    assert bad_lat.status_code == 422
