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
    this.log('║    SOIL SENSOR DRIVER v5.5.556 - SAFE FLOW REGISTRATION     ║');
    this.log('╚══════════════════════════════════════════════════════════════╝');

    // Track IEEE addresses to prevent duplicates
    this._registeredIeeeAddresses = new Set();

    // v5.5.556: Safe flow card registration helper (no stderr on missing cards)
    const safeGetTrigger = (id) => {
      try {
        return this.homey.flow.getDeviceTriggerCard(id);
      } catch (e) {
        this.log(`[FLOW] Trigger '${id}' not defined - skipping`);
        return null;
      }
    };

    const safeGetCondition = (id) => {
      try {
        return this.homey.flow.getConditionCard(id);
      } catch (e) {
        this.log(`[FLOW] Condition '${id}' not defined - skipping`);
        return null;
      }
    };

    // Register trigger cards (graceful if not defined)
    this._moistureChangedTrigger = safeGetTrigger('soil_sensor_moisture_changed');
    this._soilDryTrigger = safeGetTrigger('soil_sensor_soil_dry');
    this._soilWetTrigger = safeGetTrigger('soil_sensor_soil_wet');
    this._tempChangedTrigger = safeGetTrigger('soil_sensor_temperature_changed');
    this._batteryLowTrigger = safeGetTrigger('soil_sensor_battery_low');
    this._soilOptimalTrigger = safeGetTrigger('soil_sensor_soil_optimal');
    this._frostWarningTrigger = safeGetTrigger('soil_sensor_frost_warning');
    this._batteryChangedTrigger = safeGetTrigger('soil_sensor_battery_changed');

    // Register condition cards with run listeners
    const moistureAboveCondition = safeGetCondition('soil_sensor_moisture_above');
    if (moistureAboveCondition) {
      moistureAboveCondition.registerRunListener(async (args) => {
        if (!args.device) throw new Error('Device not found');
        const moisture = args.device.getCapabilityValue('measure_humidity');
        return moisture !== null && moisture > args.moisture;
      });
    }

    const tempAboveCondition = safeGetCondition('soil_sensor_temperature_above');
    if (tempAboveCondition) {
      tempAboveCondition.registerRunListener(async (args) => {
        if (!args.device) throw new Error('Device not found');
        const temp = args.device.getCapabilityValue('measure_temperature');
        return temp !== null && temp > args.temp;
      });
    }

    const needsWaterCondition = safeGetCondition('soil_sensor_needs_water');
    if (needsWaterCondition) {
      needsWaterCondition.registerRunListener(async (args) => {
        if (!args.device) throw new Error('Device not found');
        return args.device.getCapabilityValue('alarm_water') === true;
      });
    }

    const batteryAboveCondition = safeGetCondition('soil_sensor_battery_above');
    if (batteryAboveCondition) {
      batteryAboveCondition.registerRunListener(async (args) => {
        if (!args.device) throw new Error('Device not found');
        const battery = args.device.getCapabilityValue('measure_battery');
        return battery !== null && battery > args.threshold;
      });
    }

    const triggers = [this._moistureChangedTrigger, this._soilDryTrigger, this._soilWetTrigger,
                      this._tempChangedTrigger, this._batteryLowTrigger].filter(Boolean).length;
    const conditions = [moistureAboveCondition, tempAboveCondition, needsWaterCondition, 
                        batteryAboveCondition].filter(Boolean).length;
    this.log(`Soil Sensor ✅ ${triggers} triggers + ${conditions} conditions registered`);
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
