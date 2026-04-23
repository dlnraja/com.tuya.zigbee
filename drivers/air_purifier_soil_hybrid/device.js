'use strict';
const { safeDivide, safeParse } = require('../../lib/utils/tuyaUtils.js');
const TuyaUnifiedDevice = require('../../lib/devices/TuyaUnifiedDevice');
const BatteryCalculator = require('../../lib/battery/BatteryCalculator');
const { SoilMoistureInference, BatteryInference } = require('../../lib/IntelligentSensorInference');

class SoilSensorDevice extends TuyaUnifiedDevice {

  get mainsPowered() { return false; }
  get forceActiveTuyaMode() { return true; }
  get hybridModeEnabled() { return true; }

  get sensorCapabilities() {
    return ['measure_humidity.soil', 'measure_temperature', 'measure_humidity', 'measure_luminance', 'measure_battery', 'alarm_water', 'measure_ec'];
  }

  get dpMappings() {
    return {
      3: { capability: 'measure_humidity.soil', divisor: 1 },
      5: {
        capability: 'measure_temperature',
        transform: (v) => {
          if (Math.abs(v) > 1000) return v * 100;
          if (Math.abs(v) > 100) return v * 10;
          return v;
        }
      },
      15: { capability: 'measure_battery', divisor: 1 },
      14: { capability: 'measure_battery', transform: (v) => ({ 0: 10, 1: 50, 2: 100 }[v] ?? v) },
      112: { capability: 'measure_ec', divisor: 1 }
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode }).catch(err => this.log('[SOIL] Base init error:', err.message));
    this.log('Soil Sensor v5.5.317 Ready');
    this._initFlowTriggers();
  }

  _initFlowTriggers() {
    const safeGetTrigger = (id) => {
      try { return this._getFlowCard(id); }
      catch (e) { this.log(`[SOIL] Flow trigger '${id}' not available`); return null; }
    };
    this._flowTriggerMoistureChanged = safeGetTrigger('soil_sensor_moisture_changed');
  }

  _handleDP(dpId, value) {
    const dp = Number(dpId);
    let parsedValue = value;
    if (Buffer.isBuffer(value)) {
       if (value.length === 4) parsedValue = value.readInt32BE(0);
       else if (value.length === 1) parsedValue = value.readUInt8(0);
    }

    if (dp === 3) {
      this.setCapabilityValue('measure_humidity.soil', parseFloat(parsedValue)).catch(() => { });
    } else if (dp === 5) {
      let temp = parsedValue;
      if (temp > 100) temp = temp * 10;
      this.setCapabilityValue('measure_temperature', parseFloat(temp)).catch(() => { });
    } else {
      super._handleDP(dpId, value);
    }
  }

  onDeleted() {
    if (typeof super.onDeleted === 'function') super.onDeleted();
  }
}

module.exports = SoilSensorDevice;
