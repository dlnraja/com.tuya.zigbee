import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    """Test the health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_discover_devices():
    """Test device discovery endpoint"""
    response = client.post(
        "/discover",
        json={"timeout": 5, "scan_type": "active"},
        headers={"X-API-Key": "your-secure-api-key"}
    )
    assert response.status_code == 200
    assert "devices" in response.json()

def test_send_command():
    """Test sending a command to a device"""
    response = client.post(
        "/command",
        json={"device_id": "test-device", "command": "turn_on", "params": {}},
        headers={"X-API-Key": "your-secure-api-key"}
    )
    assert response.status_code == 200
    assert "status" in response.json()

@pytest.mark.asyncio
async def test_analytics():
    """Test analytics endpoints"""
    # Send analytics
    response = client.post(
        "/analytics",
        json={"device_id": "test-device", "metrics": {"temperature": 25.5}},
        headers={"X-API-Key": "your-secure-api-key"}
    )
    assert response.status_code == 200
    
    # Get analytics
    response = client.get(
        "/analytics/test-device",
        headers={"X-API-Key": "your-secure-api-key"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["device_id"] == "test-device"
    assert "temperature" in data["metrics"]

def test_invalid_api_key():
    """Test authentication with invalid API key"""
    response = client.get("/health", headers={"X-API-Key": "invalid-key"})
    assert response.status_code == 403
    assert "Invalid API Key" in response.json()["detail"]
