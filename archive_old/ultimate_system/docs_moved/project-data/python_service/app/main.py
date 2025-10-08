"""
Main FastAPI application for Tuya Zigbee Bridge microservice.
"""
import logging
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from contextlib import asynccontextmanager
from typing import Optional, Dict, Any
import uvicorn
import os
import json
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Application lifespan management
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown events."""
    # Startup
    logger.info("Starting Tuya Zigbee Bridge service...")
    
    # Load configuration
    app.state.config = load_config()
    logger.info("Configuration loaded successfully")
    
    # Initialize device manager
    from app.core.device_manager import DeviceManager
    app.state.device_manager = DeviceManager(config=app.state.config)
    
    yield  # Application runs here
    
    # Shutdown
    logger.info("Shutting down Tuya Zigbee Bridge service...")
    await app.state.device_manager.cleanup()

# Create FastAPI app
app = FastAPI(
    title="Tuya Zigbee Bridge",
    description="Microservice for managing Tuya Zigbee devices in Homey ecosystem",
    version="2.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def load_config() -> Dict[str, Any]:
    """Load configuration from file or environment variables."""
    config_path = Path("config.json")
    if config_path.exists():
        with open(config_path, "r") as f:
            return json.load(f)
    
    # Default configuration
    return {
        "debug": os.getenv("DEBUG", "false").lower() == "true",
        "log_level": os.getenv("LOG_LEVEL", "INFO"),
        "api_key": os.getenv("API_KEY", "default-secret-key"),
        "port": int(os.getenv("PORT", "8000")),
        "host": os.getenv("HOST", "0.0.0.0"),
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring and load balancing."""
    return {
        "status": "healthy",
        "version": app.version,
        "service": "tuya-zigbee-bridge"
    }

# Import and include routers
from app.api.v1 import devices, discovery, commands
app.include_router(devices.router, prefix="/api/v1/devices", tags=["devices"])
app.include_router(discovery.router, prefix="/api/v1/discovery", tags=["discovery"])
app.include_router(commands.router, prefix="/api/v1/commands", tags=["commands"])

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions with JSON responses."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

if __name__ == "__main__":
    # Run the application
    uvicorn.run(
        "app.main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("DEBUG", "false").lower() == "true",
        log_level=os.getenv("LOG_LEVEL", "info").lower(),
    )
