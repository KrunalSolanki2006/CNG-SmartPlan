"""Canonical error schema matching docs/API_CONTRACT.md Section 2."""

from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict, Field


class ErrorDetail(BaseModel):
    """Detailed error object within the API error response."""

    model_config = ConfigDict(extra="forbid")

    code: str = Field(
        ...,
        description="SCREAMING_SNAKE_CASE machine-readable error code",
        examples=["STATION_NOT_FOUND", "VALIDATION_ERROR", "INVALID_REQUEST", "INTERNAL_ERROR"],
    )
    message: str = Field(
        ...,
        description="Human-readable explanation of the error",
    )
    fields: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Per-field validation errors (used primarily for 422 responses)",
    )


class ErrorResponse(BaseModel):
    """Authoritative API error response envelope."""

    model_config = ConfigDict(extra="forbid")

    error: ErrorDetail

