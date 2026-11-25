"""Asynchronous SerpApi client with secure key management, disk caching, and offline demo fallback."""

import hashlib
import json
import logging
import os
import re
import time
from pathlib import Path
from typing import Any, Dict, Optional, Tuple
import httpx

try:
    from config import settings
except ImportError:
    from server.config import settings

logger = logging.getLogger(__name__)

# Pattern to redact API key from URLs or query strings in logs and error traces
API_KEY_REDACTION_PATTERN = re.compile(r"api_key=[a-zA-Z0-9_\-]+", re.IGNORECASE)


def redact_sensitive_str(text: str) -> str:
    """Redact api_key values from URLs or error text."""
    if not text:
        return ""
    return API_KEY_REDACTION_PATTERN.sub("api_key=[REDACTED]", text)


class SerpApiClient:
    """Client for SerpApi Google Maps integrations with disk caching and demo fallback."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        cache_dir: Optional[Path] = None,
        fixtures_path: Optional[Path] = None,
        mode: Optional[str] = None,
    ):
        self.api_key = api_key or settings.serpapi_api_key or os.getenv("SERPAPI_API_KEY", "")
        # SerpApi root endpoint
        raw_base = base_url or settings.serpapi_base_url or "https://serpapi.com/search.json"
        if not raw_base.endswith(".json") and not raw_base.endswith("/search"):
            self.base_url = f"{raw_base.rstrip('/')}/search.json"
        else:
            self.base_url = raw_base

        self.cache_dir = cache_dir or settings.serpapi_cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        self.fixtures_path = fixtures_path or getattr(settings, "serpapi_fixtures_path", None)
        self.mode = mode or getattr(settings, "serpapi_mode", "auto")
        self._fixtures_cache: Optional[Dict[str, Any]] = None

    def set_mode(self, mode: str) -> None:
        """Set operational mode: 'auto', 'live', or 'demo'."""
        clean = mode.lower().strip()
        if clean not in ("auto", "live", "demo"):
            raise ValueError(f"Invalid mode '{mode}'. Must be 'auto', 'live', or 'demo'.")
        self.mode = clean
        logger.info(f"SerpApi client mode set to '{self.mode}'")

    def get_mode(self) -> str:
        """Return current operational mode."""
        return self.mode

    def _load_fixtures(self) -> Dict[str, Any]:
        """Load offline demo fixtures lazily from disk."""
        if self._fixtures_cache is not None:
            return self._fixtures_cache

        if self.fixtures_path and self.fixtures_path.exists():
            try:
                with open(self.fixtures_path, "r", encoding="utf-8") as f:
                    self._fixtures_cache = json.load(f)
                    return self._fixtures_cache
            except Exception as e:
                logger.warning(f"Could not load SerpApi fixtures from {self.fixtures_path}: {e}")

        self._fixtures_cache = {}
        return self._fixtures_cache

    def _get_demo_fixture(self, params: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Extract appropriate genuine demo fixture based on query parameters."""
        fixtures = self._load_fixtures()
        if not fixtures:
            return None

        engine = params.get("engine", "google_maps")
        if engine == "google_maps_directions":
            return fixtures.get("directions")
        elif engine == "google_maps_autocomplete":
            return fixtures.get("autocomplete")
        elif engine == "google_maps":
            if params.get("place_id") or params.get("type") == "place":
                return fixtures.get("place_details")
            return fixtures.get("search")

        return None

    def _get_cache_path(self, params: Dict[str, Any]) -> Path:
        """Generate deterministic cache file path based on sorted parameters (excluding api_key)."""
        clean_params = {k: v for k, v in params.items() if k != "api_key"}
        serialized = json.dumps(clean_params, sort_keys=True)
        key_hash = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
        engine = clean_params.get("engine", "default")
        return self.cache_dir / f"{engine}_{key_hash}.json"

    def _read_cache(self, cache_file: Path, ttl_seconds: int, ignore_ttl: bool = False) -> Optional[Dict[str, Any]]:
        """Read cached payload if valid and within TTL."""
        if not cache_file.exists():
            return None
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                cached_obj = json.load(f)
            if ignore_ttl:
                return cached_obj.get("data")
            cached_time = cached_obj.get("_cached_at", 0)
            if (time.time() - cached_time) < ttl_seconds:
                return cached_obj.get("data")
        except Exception as e:
            logger.warning(f"Failed to read SerpApi cache at {cache_file.name}: {e}")
        return None

    def _write_cache(self, cache_file: Path, data: Dict[str, Any]) -> None:
        """Write payload to cache directory."""
        try:
            payload = {
                "_cached_at": time.time(),
                "data": data,
            }
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(payload, f)
        except Exception as e:
            logger.warning(f"Failed to write SerpApi cache to {cache_file.name}: {e}")

    async def execute(
        self,
        params: Dict[str, Any],
        ttl_seconds: int = 86400,
    ) -> Tuple[Dict[str, Any], bool, bool]:
        """Execute a SerpApi query with automatic disk cache lookup and demo fixture fallback.

        Args:
            params: Dictionary of SerpApi parameters.
            ttl_seconds: Cache TTL in seconds.

        Returns:
            Tuple of (response_json_dict, is_cached_bool, is_fixture_bool).

        Raises:
            RuntimeError: Only in strict 'live' mode when both live and cache fail.
        """
        # 1. If explicitly in demo mode, return fixture directly
        if self.mode == "demo":
            fixture = self._get_demo_fixture(params)
            if fixture is not None:
                return fixture, False, True

        # 2. Check disk cache
        cache_file = self._get_cache_path(params)
        cached_data = self._read_cache(cache_file, ttl_seconds)
        if cached_data is not None:
            return cached_data, True, False

        # 3. Check for API key before network request
        if not self.api_key:
            if self.mode in ("auto", "demo"):
                logger.info("SerpApi key missing; falling back to offline demo fixture.")
                fixture = self._get_demo_fixture(params)
                if fixture is not None:
                    return fixture, False, True
                # Try reading expired cache
                expired = self._read_cache(cache_file, ttl_seconds, ignore_ttl=True)
                if expired is not None:
                    return expired, True, False
            raise ValueError(
                "SerpApi API key is not configured. Please set SERPAPI_API_KEY in server/.env or switch to Demo Mode."
            )

        # 4. Attempt live API call
        request_params = dict(params)
        request_params["api_key"] = self.api_key

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(self.base_url, params=request_params)
                response.raise_for_status()
                data = response.json()

            if "error" in data:
                raise RuntimeError(f"SerpApi returned an error: {data['error']}")

            # Save to disk cache
            self._write_cache(cache_file, data)
            return data, False, False

        except Exception as e:
            sanitized_err = redact_sensitive_str(str(e))
            logger.warning(f"Live SerpApi call failed: {sanitized_err}")

            if self.mode in ("auto", "demo"):
                logger.info("Automatic fallback to cached or demo fixture response.")
                # Try reading expired cache first
                expired = self._read_cache(cache_file, ttl_seconds, ignore_ttl=True)
                if expired is not None:
                    return expired, True, False

                # Then fallback to genuine demo fixture
                fixture = self._get_demo_fixture(params)
                if fixture is not None:
                    return fixture, False, True

            # If strict 'live' mode, raise
            raise RuntimeError(f"SerpApi live request failed: {sanitized_err}") from None


# Singleton client instance
serpapi_client = SerpApiClient()
