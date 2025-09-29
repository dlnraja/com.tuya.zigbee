"""Tests for the device discovery functionality."""
import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException
from main import app
from models import DeviceDiscoveryRequest

class TestDeviceDiscovery:
    """Test suite for device discovery functionality."""
    
    @pytest.fixture
    def discovery_request(self):
        """Fixture for a valid device discovery request."""
        return DeviceDiscoveryRequest(
            timeout=30,
            scan_type="active"
        )
    
    @patch('main.discover_tuya_devices')
    def test_discover_devices_success(self, mock_discover, test_client, auth_headers, discovery_request):
        """Test successful device discovery."""
        # Mock the device discovery function
        mock_devices = [
            {"id": "device1", "name": "Test Device 1", "type": "switch"},
            {"id": "device2", "name": "Test Device 2", "type": "light"}
        ]
        mock_discover.return_value = mock_devices
        
        # Make the request
        response = test_client.post(
            "/discover",
            json=discovery_request.dict(),
            headers=auth_headers
        )
        
        # Verify the response
        assert response.status_code == 200
        data = response.json()
        assert len(data["devices"]) == 2
        assert data["devices"][0]["id"] == "device1"
        assert data["devices"][1]["id"] == "device2"
    
    @patch('main.discover_tuya_devices')
    def test_discover_devices_timeout(self, mock_discover, test_client, auth_headers):
        """Test device discovery with a timeout."""
        # Mock a timeout
        mock_discover.side_effect = TimeoutError("Discovery timed out")
        
        # Make the request
        response = test_client.post(
            "/discover",
            json={"timeout": 1, "scan_type": "active"},
            headers=auth_headers
        )
        
        # Verify the error response
        assert response.status_code == 408
        assert "Request timed out" in response.json()["detail"]
    
    def test_discover_devices_invalid_scan_type(self, test_client, auth_headers):
        """Test device discovery with an invalid scan type."""
        response = test_client.post(
            "/discover",
            json={"timeout": 30, "scan_type": "invalid"},
            headers=auth_headers
        )
        
        assert response.status_code == 422  # Validation error
        assert "scan_type" in response.text
