from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.security import APIKeyHeader
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import logging
import uvicorn
import json
import asyncio
from pathlib import Path
import os
from dotenv import load_dotenv
from datetime import datetime

# Configuration
CONFIG_PATH = Path("config.json")
API_KEYS = ["your-secure-api-key"]  # In production, use environment variables
load_dotenv()
API_KEY = os.getenv("API_KEY")

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="Tuya Zigbee Bridge",
    description="Microservice for Tuya Zigbee device management",
    version="2.0.0"
)

# Security
auth_header = APIKeyHeader(name="X-API-Key")

def get_api_key(api_key: str = Security(auth_header)) -> str:
    if api_key not in API_KEYS and api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API Key")
    return api_key

# Models
class DeviceDiscoveryRequest(BaseModel):
    timeout: int = 30
    scan_type: str = "active"

class DeviceCommand(BaseModel):
    device_id: str
    command: str
    params: Dict[str, Any]

class DeviceAnalyticsRequest(BaseModel):
    device_id: str
    metrics: dict

# In-memory storage for demo (replace with database in production)
analytics_db = {}

def process_analytics(device_id: str, metrics: dict):
    """Process and store device analytics"""
    timestamp = datetime.utcnow().isoformat()
    
    if device_id not in analytics_db:
        analytics_db[device_id] = []
    
    entry = {
        "timestamp": timestamp,
        "metrics": metrics
    }
    
    analytics_db[device_id].append(entry)
    logger.info(f"Processed analytics for device {device_id}")

# Routes
@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "tuya-zigbee-bridge"}

@app.post("/discover")
async def discover_devices(
    request: DeviceDiscoveryRequest,
    api_key: str = Depends(get_api_key)
):
    """Discover Tuya Zigbee devices on the network"""
    try:
        # Simulate device discovery
        await asyncio.sleep(2)  # Simulate network scan
        return {
            "status": "success",
            "devices": [
                {"id": "tuya_zigbee_1", "name": "Tuya Zigbee Device 1", "type": "switch"},
                {"id": "tuya_zigbee_2", "name": "Tuya Zigbee Device 2", "type": "sensor"}
            ]
        }
    except Exception as e:
        logger.error(f"Discovery failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/command")
async def send_command(
    command: DeviceCommand,
    api_key: str = Depends(get_api_key)
):
    """Send command to a Tuya Zigbee device"""
    try:
        # Process command here
        logger.info(f"Sending command: {command}")
        return {"status": "success", "message": "Command executed"}
    except Exception as e:
        logger.error(f"Command failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analytics")
async def receive_analytics(
    data: DeviceAnalyticsRequest,
    api_key: str = Depends(get_api_key)
):
    """Receive device analytics data"""
    process_analytics(data.device_id, data.metrics)
    return {"status": "processed"}

@app.get("/analytics/{device_id}")
async def get_analytics(device_id: str, api_key: str = Depends(get_api_key)):
    """Get stored analytics for a device"""
    return analytics_db.get(device_id, [])

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
