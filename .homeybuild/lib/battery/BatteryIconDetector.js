'use strict';

/**
 * Battery Icon Dynamic Detector
 * 
 * Automatically shows battery icon when device has battery capability
 * Displays charging status dynamically on device thumbnails
 */

module.exports = class BatteryIconDetector {
  
  /**
   * Check if device should show battery icon
   * @param {Array} capabilities - Device capabilities
   * @returns {boolean} True if battery icon should be shown
   */
  static shouldShowBatteryIcon(capabilities) {
    if (!Array.isArray(capabilities)) return false;
    
    // Check for battery-related capabilities
    const batteryCapabilities = [
      'measure_battery',
      'alarm_battery'
    ];
    
    return capabilities.some(cap => 
      batteryCapabilities.includes(cap) || 
      cap.startsWith('measure_battery')
    );
  }
  
  /**
   * Enable battery icon for device dynamically
   * @param {Object} device - Homey device instance
   * @returns {Promise<void>}
   */
  static async enableBatteryIcon(device) {
    try {
      // Check if device has battery capability
      const hasBattery = this.shouldShowBatteryIcon(device.getCapabilities());
      
      if (!hasBattery) {
        return;
      }
      
      // Check if energy is already set
      const currentEnergy = device.getEnergy();
      
      if (currentEnergy && currentEnergy.batteries) {
        device.log('[BatteryIcon] Already configured');
        return;
      }
      
      // Set energy to enable battery icon in UI
      await device.setEnergy({
        batteries: ['OTHER']
      });
      
      device.log('[BatteryIcon] ✅ Enabled dynamically');
      
    } catch (err) {
      device.error('[BatteryIcon] Failed to enable:', err.message);
    }
  }
  
  /**
   * Update battery icon based on battery level
   * @param {Object} device - Homey device instance
   * @param {number} batteryLevel - Battery level (0-100)
   * @returns {Promise<void>}
   */
  static async updateBatteryStatus(device, batteryLevel) {
    try {
      if (typeof batteryLevel !== 'number') return;
      
      // Ensure battery icon is enabled
      await this.enableBatteryIcon(device);
      
      // Set alarm_battery if level is low
      if (device.hasCapability('alarm_battery')) {
        const isLow = batteryLevel <= 20;
        const currentAlarm = device.getCapabilityValue('alarm_battery');
        
        if (currentAlarm !== isLow) {
          await device.setCapabilityValue('alarm_battery', isLow);
          device.log(`[BatteryIcon] Low battery alarm: ${isLow}`);
        }
      }
      
    } catch (err) {
      device.error('[BatteryIcon] Failed to update status:', err.message);
    }
  }
  
  /**
   * Initialize battery icon on device init
   * Call this in device.onInit()
   * @param {Object} device - Homey device instance
   * @returns {Promise<void>}
   */
  static async initialize(device) {
    try {
      // Enable battery icon if device has battery
      await this.enableBatteryIcon(device);
      
      // Get current battery level
      if (device.hasCapability('measure_battery')) {
        const batteryLevel = device.getCapabilityValue('measure_battery');
        if (typeof batteryLevel === 'number') {
          await this.updateBatteryStatus(device, batteryLevel);
        }
      }
      
    } catch (err) {
      device.error('[BatteryIcon] Initialization failed:', err.message);
    }
  }
};
