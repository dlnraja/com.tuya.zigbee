/**
 * Common device helper utilities
 */

class DeviceHelpers {
  /**
   * Get device capability value safely
   */
  static getCapabilityValue(device, capability) {
    try {
      return device.getCapabilityValue(capability);
    } catch (error) {
      return null;
    }
  }

  /**
   * Set device capability value safely
   */
  static async setCapabilityValue(device, capability, value) {
    try {
      await device.setCapabilityValue(capability, value);
      return true;
    } catch (error) {
      device.error(`Failed to set ${capability}:`, error);
      return false;
    }
  }

  /**
   * Check if device has capability
   */
  static hasCapability(device, capability) {
    try {
      return device.hasCapability(capability);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get device settings safely
   */
  static getSetting(device, key, defaultValue = null) {
    try {
      return device.getSetting(key) || defaultValue;
    } catch (error) {
      return defaultValue;
    }
  }

  /**
   * Log device info for debugging
   */
  static logDeviceInfo(device) {
    try {
      const info = {
        id: device.getData().id,
        name: device.getName(),
        capabilities: device.getCapabilities(),
        settings: device.getSettings(),
        data: device.getData()
      };
      device.log('Device info:', JSON.stringify(info, null, 2));
    } catch (error) {
      device.error('Failed to log device info:', error);
    }
  }
}

module.exports = DeviceHelpers;
