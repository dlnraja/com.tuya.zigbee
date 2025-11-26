'use strict';

/**
 * Power Management Utilities
 * Based on Homey Battery Best Practices
 * 
 * Official Doc: https://apps.developer.homey.app/the-basics/devices/best-practices/battery-status
 * 
 * CRITICAL RULE: Never use both measure_battery AND alarm_battery
 * 
 * @module powerUtils
 */

module.exports = {
  
  /**
   * Remove battery capability from AC/USB powered devices
   * This prevents showing battery status on mains-powered devices
   * 
   * @param {Device} device - Homey device instance
   * @returns {Promise<boolean>} True if capabilities were removed
   */
  async removeBatteryFromACDevices(device) {
    if (!device) return false;
    
    const powerSource = device.powerSource || 
                       device.getStoreValue?.('powerSource') || 
                       'unknown';
    
    if (device.log) device.log(`[PowerUtils] Detected power source: ${powerSource}`);
    
    // AC or USB powered = no battery
    if (powerSource === 'mains' || powerSource === 'usb' || powerSource === 'dc') {
      
      let removed = false;
      
      // Remove measure_battery
      if (device.hasCapability('measure_battery')) {
        if (device.log) device.log('[PowerUtils] Removing measure_battery from AC device');
        await device.removeCapability('measure_battery')
          .catch(err => {
            if (device.error) device.error('Failed to remove measure_battery:', err);
          });
        removed = true;
      }
      
      // Remove alarm_battery
      if (device.hasCapability('alarm_battery')) {
        if (device.log) device.log('[PowerUtils] Removing alarm_battery from AC device');
        await device.removeCapability('alarm_battery')
          .catch(err => {
            if (device.error) device.error('Failed to remove alarm_battery:', err);
          });
        removed = true;
      }
      
      if (removed && device.log) {
        device.log('[PowerUtils] ✅ Battery capabilities removed from AC device');
      }
      
      return removed;
    }
    
    return false;
  },
  
  /**
   * Ensure only ONE battery capability exists
   * Based on official best practice: NEVER both measure_battery AND alarm_battery
   * 
   * @param {Device} device - Homey device instance
   * @returns {Promise<boolean>} True if conflict was resolved
   */
  async ensureSingleBatteryCapability(device) {
    if (!device) return false;
    
    const hasMeasure = device.hasCapability('measure_battery');
    const hasAlarm = device.hasCapability('alarm_battery');
    
    // VIOLATION: Both capabilities present
    if (hasMeasure && hasAlarm) {
      if (device.log) device.log('[PowerUtils] ⚠️ VIOLATION: Both battery capabilities present');
      
      // Keep measure_battery (more useful), remove alarm_battery
      if (device.log) device.log('[PowerUtils] Keeping measure_battery, removing alarm_battery');
      await device.removeCapability('alarm_battery')
        .catch(err => {
          if (device.error) device.error('Failed to remove alarm_battery:', err);
        });
      
      if (device.log) device.log('[PowerUtils] ✅ Battery capability conflict resolved');
      return true;
    }
    
    return false;
  },
  
  /**
   * Verify energy.batteries array exists for battery devices
   * 
   * @param {Device} device - Homey device instance
   * @param {Object} driver - Driver manifest
   * @returns {boolean} True if valid
   */
  verifyEnergyBatteries(device, driver) {
    if (!device || !driver) return false;
    
    const hasBatteryCapability = device.hasCapability('measure_battery') || 
                                 device.hasCapability('alarm_battery');
    
    if (hasBatteryCapability) {
      const batteries = driver.energy?.batteries;
      
      if (!batteries || !Array.isArray(batteries) || batteries.length === 0) {
        if (device.error) {
          device.error('[PowerUtils] ⚠️ MISSING: energy.batteries array for battery device');
          device.error('[PowerUtils] Add to driver.json: "energy": { "batteries": ["CR2032"] }');
        }
        return false;
      } else {
        if (device.log) device.log(`[PowerUtils] ✅ Energy batteries defined: ${batteries.join(', ')}`);
        return true;
      }
    }
    
    return true; // No battery capability, no requirement
  },
  
  /**
   * Get battery type from driver manifest
   * 
   * @param {Object} driver - Driver manifest
   * @returns {string[]} Battery types (e.g., ["CR2032", "AAA"])
   */
  getBatteryTypes(driver) {
    return driver?.energy?.batteries || [];
  },
  
  /**
   * Detect power source from Zigbee clusters
   * Based on ZCL Power Configuration cluster (0x0001)
   * 
   * @param {Object} zclNode - Zigbee node
   * @returns {string} 'battery', 'mains', 'usb', or 'unknown'
   */
  async detectPowerSource(zclNode) {
    try {
      const endpoint = zclNode?.endpoints?.[1];
      const powerCfg = endpoint?.clusters?.powerConfiguration;
      
      if (!powerCfg) return 'unknown';
      
      // Read mainsVoltage attribute
      const mainsVoltage = await powerCfg.readAttributes(['mainsVoltage'])
        .catch(() => null);
      
      if (mainsVoltage && mainsVoltage.mainsVoltage > 0) {
        return 'mains';
      }
      
      // Read batteryVoltage attribute
      const batteryVoltage = await powerCfg.readAttributes(['batteryVoltage'])
        .catch(() => null);
      
      if (batteryVoltage && batteryVoltage.batteryVoltage > 0) {
        return 'battery';
      }
      
      return 'unknown';
      
    } catch (err) {
      return 'unknown';
    }
  }
  
};
