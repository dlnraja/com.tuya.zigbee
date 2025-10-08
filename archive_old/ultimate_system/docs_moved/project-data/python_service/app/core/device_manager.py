"""
Device Manager for Tuya Zigbee Bridge.
Handles device discovery, management, and communication with robust error handling.
"""
import asyncio
import json
import uuid
from typing import Dict, List, Optional, Any, Set, Tuple
from pathlib import Path
from datetime import datetime, timezone
import aiofiles
from dataclasses import dataclass, asdict, field
from enum import Enum, auto

from .logger import log_with_context

class DeviceStatus(Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    UNAVAILABLE = "unavailable"
    ERROR = "error"

class DeviceType(Enum):
    SWITCH = "switch"
    LIGHT = "light"
    SENSOR = "sensor"
    PLUG = "plug"
    UNKNOWN = "unknown"

@dataclass
class DeviceState:
    """Represents the current state of a device."""
    online: bool = False
    last_seen: Optional[datetime] = None
    attributes: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "online": self.online,
            "last_seen": self.last_seen.isoformat() if self.last_seen else None,
            "attributes": self.attributes
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'DeviceState':
        """Create from dictionary."""
        last_seen = data.get('last_seen')
        return cls(
            online=data.get('online', False),
            last_seen=datetime.fromisoformat(last_seen) if last_seen else None,
            attributes=data.get('attributes', {})
        )

@dataclass
class Device:
    """Represents a Tuya Zigbee device."""
    device_id: str
    name: str
    device_type: DeviceType
    model: str
    manufacturer: str
    capabilities: List[str]
    state: DeviceState = field(default_factory=DeviceState)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    @property
    def is_online(self) -> bool:
        """Check if device is currently online."""
        return self.state.online
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "device_id": self.device_id,
            "name": self.name,
            "type": self.device_type.value,
            "model": self.model,
            "manufacturer": self.manufacturer,
            "capabilities": self.capabilities,
            "state": self.state.to_dict(),
            "metadata": self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Device':
        """Create from dictionary."""
        return cls(
            device_id=data['device_id'],
            name=data['name'],
            device_type=DeviceType(data.get('type', 'unknown')),
            model=data.get('model', 'unknown'),
            manufacturer=data.get('manufacturer', 'unknown'),
            capabilities=data.get('capabilities', []),
            state=DeviceState.from_dict(data.get('state', {})),
            metadata=data.get('metadata', {})
        )

class DeviceManager:
    """Manages Tuya Zigbee devices with thread-safe operations."""
    
    def __init__(self, config: Dict[str, Any], logger):
        """Initialize the device manager.
        
        Args:
            config: Application configuration
            logger: Configured logger instance
        """
        self.config = config
        self.logger = logger
        self._devices: Dict[str, Device] = {}
        self._discovery_running = False
        self._storage_path = Path(config.get('storage_path', 'data/devices.json'))
        self._lock = asyncio.Lock()
        
        # Ensure data directory exists
        self._storage_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Load existing devices
        asyncio.create_task(self._load_devices())
    
    async def start_discovery(self, timeout: int = 30) -> Dict[str, Any]:
        """Start device discovery process.
        
        Args:
            timeout: Timeout in seconds for discovery
            
        Returns:
            Dictionary with discovery results
        """
        if self._discovery_running:
            log_with_context(
                self.logger,
                'warning',
                'Discovery already in progress',
                component='device_manager',
                operation='start_discovery'
            )
            return {"status": "error", "message": "Discovery already in progress"}
        
        self._discovery_running = True
        
        try:
            log_with_context(
                self.logger,
                'info',
                'Starting device discovery',
                component='device_manager',
                operation='start_discovery',
                timeout=timeout
            )
            
            # Simulate device discovery (replace with actual implementation)
            await asyncio.sleep(2)
            
            # Example discovered devices
            discovered_devices = [
                Device(
                    device_id=f"tuya_zigbee_{i}",
                    name=f"Tuya Zigbee Device {i}",
                    device_type=DeviceType.SWITCH if i % 2 == 0 else DeviceType.LIGHT,
                    model=f"TS00{i}",
                    manufacturer="Tuya",
                    capabilities=["onoff", "measure_power" if i % 2 == 0 else "light_hue"],
                    state=DeviceState(
                        online=True,
                        last_seen=datetime.now(timezone.utc),
                        attributes={"rssi": -60 + i, "lqi": 100 - i}
                    )
                ) for i in range(1, 4)
            ]
            
            # Add discovered devices
            added_devices = []
            async with self._lock:
                for device in discovered_devices:
                    if device.device_id not in self._devices:
                        self._devices[device.device_id] = device
                        added_devices.append(device)
            
            # Save updated device list
            await self._save_devices()
            
            log_with_context(
                self.logger,
                'info',
                'Device discovery completed',
                component='device_manager',
                operation='start_discovery',
                discovered=len(discovered_devices),
                added=len(added_devices)
            )
            
            return {
                "status": "success",
                "discovered": len(discovered_devices),
                "added": len(added_devices),
                "devices": [device.to_dict() for device in added_devices]
            }
            
        except Exception as e:
            log_with_context(
                self.logger,
                'error',
                'Error during device discovery',
                component='device_manager',
                operation='start_discovery',
                error=str(e),
                exc_info=True
            )
            return {"status": "error", "message": str(e)}
            
        finally:
            self._discovery_running = False
    
    async def get_devices(self, online_only: bool = False) -> List[Dict[str, Any]]:
        """Get list of all known devices.
        
        Args:
            online_only: If True, return only online devices
            
        Returns:
            List of device dictionaries
        """
        async with self._lock:
            devices = list(self._devices.values())
            
        if online_only:
            devices = [d for d in devices if d.is_online]
            
        return [device.to_dict() for device in devices]
    
    async def get_device(self, device_id: str) -> Optional[Dict[str, Any]]:
        """Get device by ID.
        
        Args:
            device_id: Device identifier
            
        Returns:
            Device dictionary or None if not found
        """
        async with self._lock:
            device = self._devices.get(device_id)
            return device.to_dict() if device else None
    
    async def send_command(
        self, 
        device_id: str, 
        command: str, 
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Send command to a device.
        
        Args:
            device_id: Target device ID
            command: Command to execute
            params: Command parameters
            
        Returns:
            Command execution result
        """
        params = params or {}
        
        log_context = {
            'component': 'device_manager',
            'operation': 'send_command',
            'device_id': device_id,
            'command': command,
            'params': params
        }
        
        try:
            async with self._lock:
                if device_id not in self._devices:
                    error_msg = f"Device {device_id} not found"
                    log_with_context(
                        self.logger,
                        'error',
                        error_msg,
                        **log_context
                    )
                    raise ValueError(error_msg)
                
                device = self._devices[device_id]
                
                # Update last seen timestamp
                device.state.last_seen = datetime.now(timezone.utc)
                
                # Simulate command execution (replace with actual implementation)
                log_with_context(
                    self.logger,
                    'debug',
                    f"Executing command '{command}' on device {device_id}",
                    **log_context
                )
                
                # Update device state based on command
                if command == "onoff" and "value" in params:
                    device.state.attributes["onoff"] = params["value"]
                    device.state.online = True
                
                # Save updated device state
                await self._save_devices()
                
                result = {
                    "status": "success",
                    "device_id": device_id,
                    "command": command,
                    "result": device.state.attributes
                }
                
                log_with_context(
                    self.logger,
                    'info',
                    f"Command '{command}' executed successfully",
                    **{**log_context, 'result': result}
                )
                
                return result
                
        except Exception as e:
            log_with_context(
                self.logger,
                'error',
                f"Error executing command on device {device_id}",
                error=str(e),
                exc_info=True,
                **log_context
            )
            return {
                "status": "error",
                "device_id": device_id,
                "command": command,
                "error": str(e)
            }
    
    async def cleanup(self):
        """Clean up resources."""
        try:
            await self._save_devices()
            log_with_context(
                self.logger,
                'info',
                'Device manager cleanup completed',
                component='device_manager',
                operation='cleanup'
            )
        except Exception as e:
            log_with_context(
                self.logger,
                'error',
                'Error during device manager cleanup',
                component='device_manager',
                operation='cleanup',
                error=str(e),
                exc_info=True
            )
    
    async def _load_devices(self):
        """Load devices from storage."""
        try:
            if not self._storage_path.exists():
                log_with_context(
                    self.logger,
                    'debug',
                    'No device storage file found, starting with empty device list',
                    component='device_manager',
                    operation='_load_devices',
                    storage_path=str(self._storage_path)
                )
                return
                
            async with aiofiles.open(self._storage_path, mode='r') as f:
                data = await f.read()
                devices_data = json.loads(data)
                
            async with self._lock:
                self._devices = {
                    device_id: Device.from_dict(device_data)
                    for device_id, device_data in devices_data.items()
                }
                
            log_with_context(
                self.logger,
                'info',
                'Successfully loaded devices from storage',
                component='device_manager',
                operation='_load_devices',
                device_count=len(self._devices),
                storage_path=str(self._storage_path)
            )
                
        except json.JSONDecodeError as e:
            log_with_context(
                self.logger,
                'error',
                'Invalid JSON in device storage file',
                component='device_manager',
                operation='_load_devices',
                error=str(e),
                storage_path=str(self._storage_path)
            )
            # Reset to empty devices on corrupt file
            self._devices = {}
            
        except Exception as e:
            log_with_context(
                self.logger,
                'error',
                'Error loading devices from storage',
                component='device_manager',
                operation='_load_devices',
                error=str(e),
                exc_info=True,
                storage_path=str(self._storage_path)
            )
            # Reset to empty devices on error
            self._devices = {}
    
    async def _save_devices(self):
        """Save devices to storage."""
        try:
            # Create a copy of devices to avoid holding the lock during file I/O
            devices_copy = {}
            async with self._lock:
                devices_copy = {
                    device_id: device.to_dict()
                    for device_id, device in self._devices.items()
                }
            
            # Ensure directory exists
            self._storage_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Save to temporary file first, then rename (atomic write)
            temp_path = self._storage_path.with_suffix('.tmp')
            async with aiofiles.open(temp_path, 'w') as f:
                await f.write(json.dumps(devices_copy, indent=2, default=str))
            
            # On Windows, we need to remove the destination file first
            if self._storage_path.exists():
                self._storage_path.unlink()
                
            # Rename temp file to actual file
            temp_path.rename(self._storage_path)
            
            log_with_context(
                self.logger,
                'debug',
                'Successfully saved devices to storage',
                component='device_manager',
                operation='_save_devices',
                device_count=len(devices_copy),
                storage_path=str(self._storage_path)
            )
            
        except Exception as e:
            log_with_context(
                self.logger,
                'error',
                'Error saving devices to storage',
                component='device_manager',
                operation='_save_devices',
                error=str(e),
                exc_info=True,
                storage_path=str(self._storage_path)
            )
            raise
