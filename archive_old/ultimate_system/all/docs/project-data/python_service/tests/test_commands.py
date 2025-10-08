"""Tests for the device command functionality."""
import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException
from main import app
from models import DeviceCommand

class TestDeviceCommands:
    """Test suite for device command functionality."""
    
    @pytest.fixture
    def valid_command(self):
        """Fixture for a valid device command."""
        return {
            "device_id": "test-device-1",
            "command": "turn_on",
            "params": {"brightness": 100}
        }
    
    @patch('main.send_device_command')
    def test_send_command_success(self, mock_send, test_client, auth_headers, valid_command):
        """Test sending a command successfully."""
        # Mock the command sending function
        mock_send.return_value = {"status": "success", "message": "Command sent"}
        
        # Make the request
        response = test_client.post(
            "/command",
            json=valid_command,
            headers=auth_headers
        )
        
        # Verify the response
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "message" in data
        
        # Verify the mock was called with correct parameters
        mock_send.assert_called_once_with(
            valid_command["device_id"],
            valid_command["command"],
            valid_command["params"]
        )
    
    @patch('main.send_device_command')
    def test_send_command_device_offline(self, mock_send, test_client, auth_headers, valid_command):
        """Test sending a command to an offline device."""
        # Mock the command sending function to simulate an offline device
        mock_send.side_effect = ConnectionError("Device is offline")
        
        # Make the request
        response = test_client.post(
            "/command",
            json=valid_command,
            headers=auth_headers
        )
        
        # Verify the error response
        assert response.status_code == 503
        assert "Device is offline" in response.json()["detail"]
    
    def test_send_command_invalid_input(self, test_client, auth_headers):
        """Test sending a command with invalid input."""
        # Test missing device_id
        response = test_client.post(
            "/command",
            json={"command": "turn_on", "params": {}},
            headers=auth_headers
        )
        assert response.status_code == 422  # Validation error
        
        # Test missing command
        response = test_client.post(
            "/command",
            json={"device_id": "test-device-1", "params": {}},
            headers=auth_headers
        )
        assert response.status_code == 422  # Validation error
        
        # Test invalid command type
        response = test_client.post(
            "/command",
            json={"device_id": "test-device-1", "command": 123, "params": {}},
            headers=auth_headers
        )
        assert response.status_code == 422  # Validation error
