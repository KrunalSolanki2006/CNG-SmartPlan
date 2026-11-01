"""CNG SmartPlan API - Main Application Entrypoint.

Problem Statement: PS000002 - Station-Level Demand Forecasting for CNG Sales
to Optimize Network Expansion (Gujarat Gas Company Limited).
"""

from contextlib import asynccontextmanager
import logging
from typing import Any, Dict

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from config import settings
from routers import health, overview, stations, quality, forecast, supply, hourly, impact
from services.data_loader import DataValidationError, load_all_data

# Configure standard logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("cng_smartplan")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context: loads and validates all CSV datasets on startup."""
    logger.info("Initializing CNG SmartPlan backend...")
    try:
        load_all_data()
        logger.info("Data package loaded and verified successfully.")
    except Exception as e:
        logger.critical(f"FATAL: Data validation failed on startup: {e}", exc_info=True)
        raise
    yield
    logger.info("CNG SmartPlan backend shutting down.")


app = FastAPI(
    title="CNG SmartPlan API",
    version="1.0.0",
    description="Station-Level Demand Forecasting for CNG Sales to Optimize Network Expansion",
    lifespan=lifespan,
)

# CORS middleware configuration strictly matching API_CONTRACT.md Section 4
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


# Exception Handlers enforcing API_CONTRACT.md Section 2 schema
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors, returning standard 422 VALIDATION_ERROR envelope."""
    field_errors: Dict[str, Any] = {}
    for err in exc.errors():
        loc = ".".join(str(x) for x in err.get("loc", []))
        field_errors[loc] = err.get("msg")

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Input validation failed. Please check the supplied fields.",
                "fields": field_errors,
            }
        },
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTPExceptions (including 404 Not Found) returning standard error envelope."""
    code_map = {
        status.HTTP_400_BAD_REQUEST: "INVALID_REQUEST",
        status.HTTP_404_NOT_FOUND: "STATION_NOT_FOUND",
        status.HTTP_422_UNPROCESSABLE_ENTITY: "VALIDATION_ERROR",
        status.HTTP_500_INTERNAL_SERVER_ERROR: "INTERNAL_ERROR",
    }
    code = code_map.get(exc.status_code, "HTTP_ERROR")

    # If detail is already a dict with 'code' and 'message'
    if isinstance(exc.detail, dict) and "code" in exc.detail:
        code = exc.detail.get("code", code)
        msg = exc.detail.get("message", "An error occurred.")
        fields = exc.detail.get("fields", None)
    else:
        msg = str(exc.detail) if exc.detail else "Resource not found"
        fields = None

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": code,
                "message": msg,
                "fields": fields,
            }
        },
    )


@app.exception_handler(DataValidationError)
async def data_validation_exception_handler(request: Request, exc: DataValidationError):
    """Handle internal data validation errors."""
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": f"Data integrity error: {exc.message}",
                "fields": exc.details or None,
            }
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Catch-all unhandled exception handler returning standard INTERNAL_ERROR envelope."""
    logger.error(f"Unhandled server error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected server error occurred.",
                "fields": None,
            }
        },
    )


# Include API v1 routers
app.include_router(health.router, prefix="/api/v1")
app.include_router(overview.router, prefix="/api/v1")
app.include_router(stations.router, prefix="/api/v1")
app.include_router(quality.router, prefix="/api/v1")
app.include_router(forecast.router, prefix="/api/v1")
app.include_router(supply.router, prefix="/api/v1")
app.include_router(hourly.router, prefix="/api/v1")
app.include_router(impact.router, prefix="/api/v1")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=(settings.environment == "development"),
    )
