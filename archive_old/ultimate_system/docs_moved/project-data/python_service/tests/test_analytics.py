"""Tests for the device analytics functionality."""
import pytest
from datetime import datetime, timedelta
from main import process_analytics, analytics_db

class TestDeviceAnalytics:
    """Test suite for device analytics functionality."""
    
    def setup_method(self):
        """Clear analytics database before each test."""
        analytics_db.clear()
    
    def test_process_analytics_new_device(self):
        """Test processing analytics for a new device."""
        device_id = "test-device-1"
        metrics = {"temperature": 25.5, "humidity": 60.0}
        
        process_analytics(device_id, metrics)
        
        assert device_id in analytics_db
        assert "temperature" in analytics_db[device_id]["metrics"]
        assert "humidity" in analytics_db[device_id]["metrics"]
        assert "last_updated" in analytics_db[device_id]
    
    def test_process_analytics_update_existing(self):
        """Test updating analytics for an existing device."""
        device_id = "test-device-2"
        initial_metrics = {"temperature": 25.5}
        updated_metrics = {"temperature": 26.0, "humidity": 55.0}
        
        # First update
        process_analytics(device_id, initial_metrics)
        initial_timestamp = analytics_db[device_id]["last_updated"]
        
        # Second update after a short delay
        import time
        time.sleep(0.1)
        process_analytics(device_id, updated_metrics)
        
        # Check that the metrics were updated
        assert analytics_db[device_id]["metrics"]["temperature"] == 26.0
        assert analytics_db[device_id]["metrics"]["humidity"] == 55.0
        assert analytics_db[device_id]["last_updated"] > initial_timestamp
    
    def test_process_analytics_invalid_input(self):
        """Test handling of invalid input data."""
        with pytest.raises(ValueError, match="Device ID cannot be empty"):
            process_analytics("", {"temp": 25.0})
            
        with pytest.raises(ValueError, match="Metrics cannot be empty"):
            process_analytics("test-device-3", {})
            
        with pytest.raises(TypeError, match="Device ID must be a string"):
            process_analytics(123, {"temp": 25.0})
