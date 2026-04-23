'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * SoilSensorDriver - v5.4.3
 * Supports: _TZE284_oitavov2 and similar soil sensors
 */
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

    this.log('Soil Sensor Driver Ready');

    this._registeredIeeeAddresses = new Set();

    const safeGetTrigger = (id) => {
      try {
        return (() => { try { return ; } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })();
      } catch (e) {
        this.log(`[FLOW] Trigger '${id}' not defined - skipping`);
        return null;
      }
    };

    const safeGetCondition = (id) => {
      try {
        return (() => { try { return ; } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })();
      } catch (e) {
        this.log(`[FLOW] Condition '${id}' not defined - skipping`);
        return null;
      }
    };

    // Register triggers
    this._moistureChangedTrigger = safeGetTrigger('soil_sensor_moisture_changed');
    this._soilDryTrigger = safeGetTrigger('soil_sensor_soil_dry');
    this._soilWetTrigger = safeGetTrigger('soil_sensor_soil_wet');
    this._tempChangedTrigger = safeGetTrigger('soil_sensor_temperature_changed');
    this._batteryLowTrigger = safeGetTrigger('soil_sensor_battery_low');

    // Register conditions
    const moistureBelowCondition = safeGetCondition('soil_sensor_moisture_below');
    if (moistureBelowCondition) {
      moistureBelowCondition.registerRunListener(async (args) => {
        const moisture = args.device.getCapabilityValue('measure_humidity.soil') ?? args.device.getCapabilityValue('measure_humidity');
        return moisture !== null && moisture < args.moisture;
      });
    }

    const moistureAboveCondition = safeGetCondition('soil_sensor_moisture_above');
    if (moistureAboveCondition) {
      moistureAboveCondition.registerRunListener(async (args) => {
        const moisture = args.device.getCapabilityValue('measure_humidity.soil') ?? args.device.getCapabilityValue('measure_humidity');
        return moisture !== null && moisture > args.moisture;
      });
    }

    const tempAboveCondition = safeGetCondition('soil_sensor_temperature_above');
    if (tempAboveCondition) {
      tempAboveCondition.registerRunListener(async (args) => {
        const temp = args.device.getCapabilityValue('measure_temperature');
        return temp !== null && temp > args.temp;
      });
    }
  }

  async onPairListDevices(devices) {
    if (!devices || devices.length === 0) return devices;

    const seenIeeeAddresses = new Set();
    const filteredDevices = [];

    for (const device of devices) {
      const ieee = device.settings?.zb_ieee_address || device.data?.ieeeAddress;

      if (device.data?.subDeviceId !== undefined) continue;
      if (ieee && seenIeeeAddresses.has(ieee)) continue;

      if (ieee) seenIeeeAddresses.add(ieee);
      filteredDevices.push(device);
    }
    return filteredDevices;
  }
}

module.exports = SoilSensorDriver;
