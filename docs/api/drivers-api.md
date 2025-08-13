// 🔧 Drivers API Reference

#// Overview

The Tuya Zigbee Universal app provides a comprehensive API for managing Tuya and Zigbee devices.

#// Driver Classes

##// BaseDriver

The base class for all drivers.

```javascript
class BaseDriver extends ZigbeeDevice {
  async onMeshInit() {
    // Initialize driver
  }
  
  async onSettings(oldSettings, newSettings, changedKeys) {
    // Handle settings changes
  }
  
  async onDeleted() {
    // Cleanup when device is deleted
  }
}
```

##// TuyaDriver

Driver for Tuya devices.

```javascript
class TuyaDriver extends BaseDriver {
  async onMeshInit() {
    // Tuya-specific initialization
    this.registerCapability('onoff', 'genOnOff');
    this.registerCapability('dim', 'genLevelCtrl');
  }
}
```

##// ZigbeeDriver

Driver for Zigbee devices.

```javascript
class ZigbeeDriver extends BaseDriver {
  async onMeshInit() {
    // Zigbee-specific initialization
    this.registerCapability('onoff', 'genOnOff');
    this.registerCapability('measure_temperature', 'msTemperatureMeasurement');
  }
}
```

#// Capabilities

##// Light Capabilities

- `onoff`: Turn device on/off
- `dim`: Dimming control
- `light_temperature`: Color temperature
- `light_hue`: Hue control
- `light_saturation`: Saturation control

##// Sensor Capabilities

- `measure_temperature`: Temperature measurement
- `measure_humidity`: Humidity measurement
- `measure_pressure`: Pressure measurement

##// Switch Capabilities

- `onoff`: Switch control

#// Events

##// Device Events

```javascript
// Device added
this.on('device.added', (device) => {
  console.log('Device added:', device);
});

// Device removed
this.on('device.removed', (device) => {
  console.log('Device removed:', device);
});

// Device updated
this.on('device.updated', (device) => {
  console.log('Device updated:', device);
});
```

##// Capability Events

```javascript
// Capability changed
this.on('capability.onoff', (value) => {
  console.log('On/Off changed:', value);
});

// Capability updated
this.on('capability.dim', (value) => {
  console.log('Dim changed:', value);
});
```

#// Methods

##// Device Management

```javascript
// Get device by ID
const device = this.getDevice(deviceId);

// Get all devices
const devices = this.getDevices();

// Add device
await this.addDevice(deviceData);

// Remove device
await this.removeDevice(deviceId);
```

##// Capability Management

```javascript
// Register capability
this.registerCapability('onoff', 'genOnOff');

// Set capability value
await this.setCapabilityValue('onoff', true);

// Get capability value
const value = this.getCapabilityValue('onoff');
```

#// Error Handling

```javascript
try {
  await this.setCapabilityValue('onoff', true);
} catch (error) {
  this.log('Error setting capability:', error);
  throw error;
}
```

#// Logging

```javascript
// Log levels
this.log('Info message');
this.log('Debug message', 'debug');
this.log('Error message', 'error');
this.log('Warning message', 'warn');
```

#// Examples

See the [examples directory](../examples/) for complete code examples.
