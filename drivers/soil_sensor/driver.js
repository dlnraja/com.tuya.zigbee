'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * SoilSensorDriver - v5.4.3 NEW
 *
 * Dedicated driver for Tuya Soil Moisture sensors (TS0601)
 * Supports: _TZE284_oitavov2 and similar soil sensors
 *
 * IMPORTANT: Separated from climate_sensor to avoid conflicts
 * - Climate sensors: temperature + humidity only
 * - Soil sensors: temperature + humidity + soil moisture
 */
class SoilSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('╔══════════════════════════════════════════════════════════════╗');
    this.log('║    SOIL SENSOR DRIVER v5.5.506 - FLOW FIX                   ║');
    this.log('╚══════════════════════════════════════════════════════════════╝');

    // Track IEEE addresses to prevent duplicates
    this._registeredIeeeAddresses = new Set();

    // v5.5.551: Fixed flow card IDs to match driver.flow.compose.json
    try {
      // Use correct IDs from driver.flow.compose.json
      this._moistureChangedTrigger = this.homey.flow.getDeviceTriggerCard('soil_sensor_moisture_changed');
      this._soilDryTrigger = this.homey.flow.getDeviceTriggerCard('soil_sensor_soil_dry');
      this._soilWetTrigger = this.homey.flow.getDeviceTriggerCard('soil_sensor_soil_wet');
      this._tempChangedTrigger = this.homey.flow.getDeviceTriggerCard('soil_sensor_temperature_changed');
      this._batteryLowTrigger = this.homey.flow.getDeviceTriggerCard('soil_sensor_battery_low');

      // Register condition cards
      const moistureAboveCondition = this.homey.flow.getConditionCard('soil_sensor_moisture_above');
      if (moistureAboveCondition) {
        moistureAboveCondition.registerRunListener(async (args) => {
          if (!args.device) throw new Error('Device not found');
          const moisture = args.device.getCapabilityValue('measure_humidity');
          return moisture !== null && moisture > args.moisture;
        });
      }

      const tempAboveCondition = this.homey.flow.getConditionCard('soil_sensor_temperature_above');
      if (tempAboveCondition) {
        tempAboveCondition.registerRunListener(async (args) => {
          if (!args.device) throw new Error('Device not found');
          const temp = args.device.getCapabilityValue('measure_temperature');
          return temp !== null && temp > args.temp;
        });
      }

      this.log('Soil Sensor ✅ Flow cards registered');
    } catch (err) {
      this.error('Soil Sensor flow card registration failed:', err.message);
    }
  }

  /**
   * Filter out sub-devices during pairing
   * v5.5.506: Moved flow card registration to onInit with error handling
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
      this.log(`[PAIR] ✅ Added device: ${device.name || 'Soil Sensor'} (IEEE: ${ieee || 'unknown'})`);
    }

    this.log(`[PAIR] Filtered: ${devices.length} → ${filteredDevices.length} devices`);
    return filteredDevices;
  }

}

module.exports = SoilSensorDriver;
