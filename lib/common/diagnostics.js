/**
 * Diagnostics utilities for Tuya Zigbee devices
 */

class Diagnostics {
  static maybeLogInterview(device, options = {}) {
    const { unknownDpWarn = false } = options;
    
    if (unknownDpWarn) {
      device.log('🔍 Device interview completed - unknown DPs will be logged');
    }
  }
  
  static logUnknownDp(device, dp, value) {
    device.log(`❓ Unknown DP ${dp}: ${value}`);
    
    // Log to file for analysis
    const logEntry = {
      timestamp: new Date().toISOString(),
      device: device.getData().id,
      dp: dp,
      value: value,
      deviceInfo: {
        manufacturer: device.getData().manufacturer,
        model: device.getData().model
      }
    };
    
    // TODO: Append to diagnostics log file
    console.log('Unknown DP logged:', logEntry);
  }
  
  static generateDiagnosticReport(device) {
    return {
      deviceId: device.getData().id,
      manufacturer: device.getData().manufacturer,
      model: device.getData().model,
      capabilities: device.getCapabilities(),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = Diagnostics;
