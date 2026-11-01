"""Test standard API error envelope per docs/API_CONTRACT.md Section 2."""

import pytest


def test_404_error_schema(client):
    """Test 404 response matches standard error format."""
    response = client.get("/api/v1/nonexistent-route")
    assert response.status_code == 404

    data = response.json()
    assert "error" in data
    err = data["error"]
    assert "code" in err
    assert "message" in err
    assert "fields" in err
    assert err["code"] == "STATION_NOT_FOUND" or err["code"] == "HTTP_ERROR"


def test_cors_headers(client):
    """Test that CORS headers allow the frontend dev origin."""
    response = client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    # Status code 200 for CORS preflight
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_validation_error_handler_schema():
    """Test validation error handler produces the standard 422 envelope."""
    from pydantic import BaseModel, Field
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from main import validation_exception_handler
    from fastapi.exceptions import RequestValidationError

    test_app = FastAPI()
    test_app.add_exception_handler(RequestValidationError, validation_exception_handler)

    class Item(BaseModel):
        val: int = Field(gt=10)

    @test_app.post("/test-val")
    def post_val(item: Item):
        return {"ok": True}

    with TestClient(test_app) as tc:
        resp = tc.post("/test-val", json={"val": 2})
        assert resp.status_code == 422
        body = resp.json()
        assert "error" in body
        assert body["error"]["code"] == "VALIDATION_ERROR"
        assert "fields" in body["error"]
        assert body["error"]["fields"] is not None
