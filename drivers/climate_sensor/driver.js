'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * ClimateSensorDriver - v5.5.530 FIXED
 * 
 * CRITICAL FIXES:
 * 1. Flow cards registered in onInit (NOT onPairListDevices)
 * 2. Correct flow card IDs matching driver.flow.compose.json
 * 3. Device validation to prevent "Cannot get device by id" error
 * 4. Prevents phantom sub-device creation
 */
class ClimateSensorDriver extends ZigBeeDriver {

  async onInit() {
    await super.onInit();
    this.log('ClimateSensorDriver v5.5.530 initializing...');

    // Track IEEE addresses to prevent duplicates
    this._registeredIeeeAddresses = new Set();

    try {
      // ═══════════════════════════════════════════════════════════════
      // TRIGGER CARDS - IDs must match driver.flow.compose.json
      // ═══════════════════════════════════════════════════════════════
      this.temperatureChangedTrigger = this.homey.flow.getDeviceTriggerCard('climate_sensor_temperature_changed');
      this.humidityChangedTrigger = this.homey.flow.getDeviceTriggerCard('climate_sensor_humidity_changed');
      this.batteryLowTrigger = this.homey.flow.getDeviceTriggerCard('climate_sensor_battery_low');
      this.tempAlarmHighTrigger = this.homey.flow.getDeviceTriggerCard('climate_sensor_temperature_alarm_high');
      this.tempAlarmLowTrigger = this.homey.flow.getDeviceTriggerCard('climate_sensor_temperature_alarm_low');
      this.humidityAlarmHighTrigger = this.homey.flow.getDeviceTriggerCard('climate_sensor_humidity_alarm_high');
      this.humidityAlarmLowTrigger = this.homey.flow.getDeviceTriggerCard('climate_sensor_humidity_alarm_low');

      // ═══════════════════════════════════════════════════════════════
      // CONDITION CARDS - with device validation
      // ═══════════════════════════════════════════════════════════════
      this.tempAboveCondition = this.homey.flow.getConditionCard('climate_sensor_temperature_above');
      this.tempAboveCondition?.registerRunListener(async (args) => {
        if (!args.device) throw new Error('Device not found');
        const temp = args.device.getCapabilityValue('measure_temperature');
        return temp !== null && temp > args.temp;
      });

      this.tempBelowCondition = this.homey.flow.getConditionCard('climate_sensor_temperature_below');
      this.tempBelowCondition?.registerRunListener(async (args) => {
        if (!args.device) throw new Error('Device not found');
        const temp = args.device.getCapabilityValue('measure_temperature');
        return temp !== null && temp < args.temp;
      });

      this.humidityAboveCondition = this.homey.flow.getConditionCard('climate_sensor_humidity_above');
      this.humidityAboveCondition?.registerRunListener(async (args) => {
        if (!args.device) throw new Error('Device not found');
        const humidity = args.device.getCapabilityValue('measure_humidity');
        return humidity !== null && humidity > args.humidity;
      });

      this.humidityBelowCondition = this.homey.flow.getConditionCard('climate_sensor_humidity_below');
      this.humidityBelowCondition?.registerRunListener(async (args) => {
        if (!args.device) throw new Error('Device not found');
        const humidity = args.device.getCapabilityValue('measure_humidity');
        return humidity !== null && humidity < args.humidity;
      });

      this.log('ClimateSensorDriver v5.5.530 ✅ All flow cards registered');
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
        this.log(`[PAIR] 🚫 BLOCKING sub-device: subDeviceId=${device.data.subDeviceId}`);
        continue;
      }

      // Skip if we've already seen this IEEE address
      if (ieee && seenIeeeAddresses.has(ieee)) {
        this.log(`[PAIR] 🚫 Skipping duplicate device for IEEE ${ieee}`);
        continue;
      }

      // Skip if already registered in this driver
      if (ieee && this._registeredIeeeAddresses?.has(ieee)) {
        this.log(`[PAIR] 🚫 Device already registered: IEEE ${ieee}`);
        continue;
      }

      if (ieee) {
        seenIeeeAddresses.add(ieee);
      }

      filteredDevices.push(device);
      this.log(`[PAIR] ✅ Added device: ${device.name || 'Climate Sensor'} (IEEE: ${ieee || 'unknown'})`);
    }

    this.log(`[PAIR] Filtered: ${devices.length} → ${filteredDevices.length} devices`);
    return filteredDevices;
  }

}

// NOTE: Removed onMapDeviceClass override - it was causing:
// TypeError: (intermediate value).onMapDeviceClass is not a function
// The default ZigBeeDriver behavior is sufficient.

module.exports = ClimateSensorDriver;
