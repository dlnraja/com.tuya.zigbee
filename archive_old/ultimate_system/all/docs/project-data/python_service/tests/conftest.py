"""Pytest configuration and fixtures for the Python service tests."""
import pytest
from fastapi.testclient import TestClient
from main import app

@pytest.fixture(scope="module")
def test_client():
    """Create a test client for the FastAPI application."""
    with TestClient(app) as client:
        yield client

@pytest.fixture(scope="module")
def auth_headers():
    """Return headers with a valid API key for testing."""
    return {"X-API-Key": "test-key"}

# Configure pytest to capture all warnings
pytest_plugins = ["pytest_cov"]

def pytest_configure(config):
    """Configure pytest with custom settings."""
    # Add markers
    config.addinivalue_line(
        "markers",
        "integration: mark test as integration test"
    )
    config.addinivalue_line(
        "markers",
        "slow: mark test as slow-running"
    )
