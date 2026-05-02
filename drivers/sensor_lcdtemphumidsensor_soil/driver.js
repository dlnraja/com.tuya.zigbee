'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SoilSensorDriver extends ZigBeeDriver {

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

    this.log('');
    this.log('    SOIL SENSOR DRIVER v5.5.564 - SAFE FLOW REGISTRATION     ');
    this.log('');

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

    // Register trigger cards
    this._moistureChangedTrigger = safeGetTrigger('soil_sensor_moisture_changed');
    this._soilDryTrigger = safeGetTrigger('soil_sensor_soil_dry');
    this._soilWetTrigger = safeGetTrigger('soil_sensor_soil_wet');
    this._tempChangedTrigger = safeGetTrigger('soil_sensor_temperature_changed');
    this._batteryLowTrigger = safeGetTrigger('soil_sensor_battery_low');

    // Register condition cards
    const moistureBelowCondition = safeGetCondition('soil_sensor_moisture_below');
    if (moistureBelowCondition) {
      moistureBelowCondition.registerRunListener(async (args) => {
        if (!args?.device || typeof args.device.getCapabilityValue !== 'function') return false;
        const moisture = args.device.getCapabilityValue('measure_humidity.soil') ?? args.device.getCapabilityValue('measure_humidity');
        return moisture !== null && moisture < args.moisture;
      });
    }

    const moistureAboveCondition = safeGetCondition('soil_sensor_moisture_above');
    if (moistureAboveCondition) {
      moistureAboveCondition.registerRunListener(async (args) => {
        if (!args?.device || typeof args.device.getCapabilityValue !== 'function') return false;
        const moisture = args.device.getCapabilityValue('measure_humidity.soil') ?? args.device.getCapabilityValue('measure_humidity');
        return moisture !== null && moisture > args.moisture;
      });
    }

    const tempAboveCondition = safeGetCondition('soil_sensor_temperature_above');
    if (tempAboveCondition) {
      tempAboveCondition.registerRunListener(async (args) => {
        if (!args?.device || typeof args.device.getCapabilityValue !== 'function') return false;
        const temp = args.device.getCapabilityValue('measure_temperature');
        return temp !== null && temp > args.temp;
      });
    }

    this.log('Soil Sensor flow cards registered');
  }

  async onPairListDevices(devices) {
    if (!devices || devices.length === 0) return devices;
    return devices.filter(device => device.data?.subDeviceId === undefined);
  }
}

module.exports = SoilSensorDriver;
