import pytest
from fastapi.testclient import TestClient
from main import app, get_api_key

client = TestClient(app)

def test_health_check():
    """Test the health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_unauthorized_access():
    """Test that unauthorized access is rejected."""
    response = client.get("/health", headers={"X-API-Key": "invalid-key"})
    assert response.status_code == 403
    assert "Invalid API Key" in response.json()["detail"]

# Test the API key validation
def test_api_key_validation():
    """Test the API key validation."""
    # This should raise an exception for invalid keys
    with pytest.raises(Exception):
        get_api_key("invalid-key")
    
    # This should pass with a valid key (from the test client's context)
    try:
        get_api_key("test-key")
    except Exception:
        pytest.fail("Valid key should not raise an exception")
