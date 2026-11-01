"""Pytest fixtures and test environment setup."""

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Ensure server directory is on sys.path
SERVER_DIR = Path(__file__).resolve().parent.parent
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

from main import app
from services.data_loader import load_all_data


@pytest.fixture(scope="session", autouse=True)
def initialize_data():
    """Ensure data is loaded once before any tests run."""
    load_all_data()


@pytest.fixture
def client():
    """Test client for FastAPI app."""
    with TestClient(app) as test_client:
        yield test_client

