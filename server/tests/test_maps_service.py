"""Unit and integration tests for SerpApi Google Maps features.

All external HTTP calls are mocked to ensure deterministic, zero-credit-consumption testing.
"""

import asyncio
from unittest.mock import AsyncMock, patch
import pytest
from fastapi.testclient import TestClient

from main import app
from schemas.maps import (
    DirectionsRequest,
    PlaceDetailsRequest,
)
from services.google_maps_service import (
    google_maps_service,
    parse_distance_to_km,
    parse_duration_to_mins,
)


def test_distance_and_duration_parsers():
    """Test helper parsing functions for distance and duration."""
    # Distance
    km, text = parse_distance_to_km(14900)
    assert km == 14.9
    assert text == "14.9 km"

    km, text = parse_distance_to_km("850 m")
    assert km == 0.85
    assert text == "850 m"

    km, text = parse_distance_to_km("12.4 km")
    assert km == 12.4

    # Duration
    mins, text = parse_duration_to_mins(2760)
    assert mins == 46.0
    assert "46" in text

    mins, text = parse_duration_to_mins("1 hr 15 min")
    assert mins == 75.0

    mins, text = parse_duration_to_mins("35 mins")
    assert mins == 35.0


def test_search_cng_stations_mocked():
    """Test CNG station search parsing, bounding box validation, and candidate labeling."""
    mock_payload = {
        "local_results": [
            {
                "title": "Adani CNG Station Ahmedabad",
                "address": "Drive In Rd, Memnagar, Ahmedabad",
                "gps_coordinates": {"latitude": 23.05, "longitude": 72.53},
                "rating": 4.2,
                "reviews": 150,
                "open_state": "Open 24 hours",
                "place_id": "ChIJ_mock_place_1",
                "data_cid": "123456789",
                "thumbnail": "https://example.com/photo.jpg",
                "link": "https://maps.google.com/?cid=123456789",
            },
            {
                "title": "Out of Bounds CNG",
                "address": "Delhi Road",
                "gps_coordinates": {"latitude": 28.61, "longitude": 77.20},  # Outside Ahmedabad
                "place_id": "ChIJ_mock_place_delhi",
            },
        ]
    }

    async def run_test():
        with patch("services.google_maps_service.serpapi_client.execute", new_callable=AsyncMock) as mock_exec:
            mock_exec.return_value = (mock_payload, False)

            resp = await google_maps_service.search_cng_stations(query="CNG pump")
            assert resp.total_results == 2
            assert resp.stations[0].station_name == "Adani CNG Station Ahmedabad"
            assert resp.stations[0].verification_status == "unverified_candidate"
            assert resp.stations[0].data_source == "serpapi_google_maps"
            assert resp.stations[0].is_within_study_area is True

            # Delhi station must be flagged outside study area
            assert resp.stations[1].is_within_study_area is False

    asyncio.run(run_test())


def test_autocomplete_places_vs_keywords():
    """Test autocomplete distinguishing selectable places with coords vs text keywords."""
    mock_payload = {
        "suggestions": [
            {
                "type": "place",
                "value": "SG Highway, Ahmedabad",
                "place": {
                    "title": "Sarkhej - Gandhinagar Highway",
                    "address": "Ahmedabad, Gujarat",
                    "place_id": "ChIJ_sg_highway",
                    "gps_coordinates": {"latitude": 23.06, "longitude": 72.51},
                },
            },
            {
                "type": "keyword",
                "value": "cng pump near me",
            },
        ]
    }

    async def run_test():
        with patch("services.google_maps_service.serpapi_client.execute", new_callable=AsyncMock) as mock_exec:
            mock_exec.return_value = (mock_payload, False)

            resp = await google_maps_service.autocomplete_locations("SG High")
            assert len(resp.suggestions) == 2

            place_sug = resp.suggestions[0]
            assert place_sug.is_selectable_place is True
            assert place_sug.latitude == 23.06
            assert place_sug.longitude == 72.51

            kw_sug = resp.suggestions[1]
            assert kw_sug.is_selectable_place is False
            assert kw_sug.latitude is None

    asyncio.run(run_test())


def test_place_details_mocked():
    """Test place details parser with hours, rating, photos and reviews."""
    mock_payload = {
        "place_results": {
            "title": "Torrent Gas CNG Station",
            "address": "Ring Road, Ahmedabad",
            "phone": "+91 79 1234 5678",
            "rating": 4.5,
            "reviews": 320,
            "open_state": "Open 24 hours",
            "operating_hours": {
                "monday": "Open 24 hours",
                "tuesday": "Open 24 hours",
            },
            "gps_coordinates": {"latitude": 23.08, "longitude": 72.55},
            "thumbnail": "https://example.com/thumb.jpg",
            "photos": [{"image": "https://example.com/p1.jpg"}],
            "reviews_per_score": [
                {
                    "username": "Ravi Patel",
                    "rating": 5,
                    "date": "2 weeks ago",
                    "snippet": "Fast queue, good pressure.",
                }
            ],
        }
    }

    async def run_test():
        with patch("services.google_maps_service.serpapi_client.execute", new_callable=AsyncMock) as mock_exec:
            mock_exec.return_value = (mock_payload, True)

            req = PlaceDetailsRequest(place_id="ChIJ_test_details")
            resp = await google_maps_service.get_place_details(req)

            assert resp.title == "Torrent Gas CNG Station"
            assert resp.rating == 4.5
            assert resp.reviews_count == 320
            assert resp.gps_coordinates.latitude == 23.08
            assert len(resp.hours) == 2
            assert len(resp.reviews) == 1
            assert resp.reviews[0].author == "Ravi Patel"

    asyncio.run(run_test())


def test_directions_and_detour_ratio():
    """Test road directions, polyline construction, straight-line comparison and detour ratio."""
    mock_payload = {
        "places_info": [
            {"gps_coordinates": {"latitude": 23.0225, "longitude": 72.5714}},
            {"gps_coordinates": {"latitude": 23.0800, "longitude": 72.5300}},
        ],
        "directions": [
            {
                "via": "Ashram Rd and 132 Feet Ring Rd",
                "trips": [
                    {
                        "distance": 8500,  # 8.5 km
                        "duration": 1200,  # 20 min
                        "details": [
                            {
                                "action": "Head north on Ashram Rd",
                                "distance": "2.0 km",
                                "duration": "5 min",
                                "gps_coordinates": {"latitude": 23.0400, "longitude": 72.5650},
                            },
                            {
                                "action": "Turn left onto 132 Feet Ring Rd",
                                "distance": "6.5 km",
                                "duration": "15 min",
                                "gps_coordinates": {"latitude": 23.0650, "longitude": 72.5450},
                            },
                        ],
                    }
                ],
            }
        ],
    }

    async def run_test():
        with patch("services.google_maps_service.serpapi_client.execute", new_callable=AsyncMock) as mock_exec:
            mock_exec.return_value = (mock_payload, False)

            req = DirectionsRequest(
                start_lat=23.0225,
                start_lng=72.5714,
                end_lat=23.0800,
                end_lng=72.5300,
            )
            resp = await google_maps_service.get_directions(req)

            assert resp.straight_line_distance_km > 0
            assert resp.road_distance_km == 8.5
            assert resp.detour_ratio > 1.0  # Road route is longer than straight line
            assert len(resp.routes) == 1
            assert len(resp.routes[0].steps) == 2
            # Polyline includes origin, 2 intermediate waypoints, and destination
            assert len(resp.routes[0].polyline_coords) >= 4

    asyncio.run(run_test())


def test_maps_api_endpoints_integration(client):
    """Test full HTTP endpoints for search, autocomplete, place-details, and directions."""
    # 1. Search
    search_mock = {
        "local_results": [
            {
                "title": "API Test CNG",
                "address": "CG Road",
                "gps_coordinates": {"latitude": 23.03, "longitude": 72.56},
                "place_id": "ChIJ_api_1",
            }
        ]
    }
    with patch("services.google_maps_service.serpapi_client.execute", new_callable=AsyncMock) as mock_exec:
        mock_exec.return_value = (search_mock, False)
        resp = client.get("/api/v1/maps/search?q=CNG")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_results"] == 1
        assert data["stations"][0]["station_name"] == "API Test CNG"

    # 2. Autocomplete
    ac_mock = {
        "suggestions": [
            {
                "type": "place",
                "value": "Navrangpura",
                "place": {
                    "title": "Navrangpura, Ahmedabad",
                    "place_id": "ChIJ_navrang",
                    "gps_coordinates": {"latitude": 23.036, "longitude": 72.561},
                },
            }
        ]
    }
    with patch("services.google_maps_service.serpapi_client.execute", new_callable=AsyncMock) as mock_exec:
        mock_exec.return_value = (ac_mock, False)
        resp = client.get("/api/v1/maps/autocomplete?q=Nav")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["suggestions"]) == 1
        assert data["suggestions"][0]["is_selectable_place"] is True

    # 3. Discoveries endpoint
    resp = client.get("/api/v1/maps/discoveries")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
