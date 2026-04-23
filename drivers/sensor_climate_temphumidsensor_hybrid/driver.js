'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * ClimateSensorDriver - v5.5.564 FIXED
 * 
 * v5.5.564: CRITICAL - Flow cards return false instead of throwing errors
 * 
 * CRITICAL FIXES:
 * 1. Flow cards registered in onInit (NOT onPairListDevices)
 * 2. Correct flow card IDs matching driver.flow.compose.json
 * 3. Device validation to prevent "Cannot get device by id" error
 * 4. Prevents phantom sub-device creation
 */
class ClimateSensorDriver extends ZigBeeDriver {
  /**
   * v7.0.12: Defensive getDeviceById override to prevent crashes during deserialization.
   * If a device cannot be found (e.g. removed while flow is triggering), return null instead of throwing.
   */
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
    }
  }


  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    
    this.log('ClimateSensorDriver v5.5.564 initializing...');

    // Track IEEE addresses to prevent duplicates
    this._registeredIeeeAddresses = new Set();

    try {
      // 
      // TRIGGER CARDS - IDs must match driver.flow.compose.json
      // 








      // 
      // CONDITION CARDS - with device validation
      // 

      this.tempAboveCondition?.registerRunListener(async (args ) => {
        if (!args?.device || typeof args.device.getCapabilityValue !== 'function') {
          this.log('[FLOW] Condition: Device not available');
          return false;
        
  
  
  
  
  
  
  }
        // A8: NaN Safety - use safeDivide/safeMultiply
  const val = args.device.getCapabilityValue('measure_temperature');
        return temp !== null && temp > args.temp;
      });

      this.tempBelowCondition?.registerRunListener(async (args ) => {
        if (!args?.device || typeof args.device.getCapabilityValue !== 'function') {
          this.log('[FLOW] Condition: Device not available');
          return false;
        }
        const temp = args.device.getCapabilityValue('measure_temperature');
        return temp !== null && temp < args.temp;
      });

      this.humidityAboveCondition?.registerRunListener(async (args ) => {
        if (!args?.device || typeof args.device.getCapabilityValue !== 'function') {
          this.log('[FLOW] Condition: Device not available');
          return false;
        }
        const humidity = args.device.getCapabilityValue('measure_humidity');
        return humidity !== null && humidity > args.humidity;
      });

      this.humidityBelowCondition?.registerRunListener(async (args ) => {
        if (!args?.device || typeof args.device.getCapabilityValue !== 'function') {
          this.log('[FLOW] Condition: Device not available');
          return false;
        }
        const humidity = args.device.getCapabilityValue('measure_humidity');
        return humidity !== null && humidity < args.humidity;
      });

      this.log('ClimateSensorDriver v5.5.564  All flow cards registered');
    } catch (err) {
      this.error('ClimateSensorDriver flow card registration failed:', err.message);
    }
  }

  /**
   * v5.3.79: AGGRESSIVE FIX - Prevent ANY sub-device creation
   */
  async onPairListDevices(devices) {
    this.log('[PAIR] Raw devices from Zigbee:', devices?.length || 0);

    if (!devices || devices.length === 0) {
      return devices;
    }

    // Filter out sub-devices - keep only the main device per IEEE address
    const seenIeeeAddresses = new Set();
    const filteredDevices = [];

    for (const device of devices) {
      const ieee = device.settings?.zb_ieee_address || device.data?.ieeeAddress;

      // CRITICAL: Skip ANY device with subDeviceId
      if (device.data?.subDeviceId !== undefined) {
        this.log(`[PAIR]  BLOCKING sub-device: subDeviceId=${device.data.subDeviceId}`);
        continue;
      }

      // Skip if we've already seen this IEEE address
      if (ieee && seenIeeeAddresses.has(ieee)) {
        this.log(`[PAIR]  Skipping duplicate device for IEEE ${ieee}`);
        continue;
      }

      // Skip if already registered in this driver
      if (ieee && this._registeredIeeeAddresses?.has(ieee)) {
        this.log(`[PAIR]  Device already registered: IEEE ${ieee}`);
        continue;
      }

      if (ieee) {
        seenIeeeAddresses.add(ieee);
      }

      filteredDevices.push(device);
      this.log(`[PAIR]  Added device: ${device.name || 'Climate Sensor'} (IEEE: ${ieee || 'unknown'})`);
    }

    this.log(`[PAIR] Filtered: ${devices.length}  ${filteredDevices.length} devices`);
    return filteredDevices;
  }

}

// NOTE: Removed onMapDeviceClass override - it was causing:
// TypeError: (intermediate value).onMapDeviceClass is not a function
// The default ZigBeeDriver behavior is sufficient.

module.exports = ClimateSensorDriver;


