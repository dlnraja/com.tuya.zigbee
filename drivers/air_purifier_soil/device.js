'use strict';
const { safeDivide, safeParse } = require('../../lib/utils/tuyaUtils.js');

// WHY(P3018): DP5 is temperature in tenths (Z2M tuyaDatapoints soil sensors: [5,'temperature',divideBy10]).
// The old code MULTIPLIED large raws (231 → 2310 °C) in both dpMappings and _handleDP. One shared
// decoder now divides; small raws (≤100) are kept as-is (variants reporting whole °C) — unchanged.
function soilTemperature(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) { return null; }
  if (Math.abs(n) > 1000) { return safeDivide(n, 100); }
  if (Math.abs(n) > 100) { return safeDivide(n, 10); }
  return n;
}
const TuyaUnifiedDevice = require('../../lib/devices/TuyaUnifiedDevice');

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
      5: { capability: 'measure_temperature', transform: soilTemperature },
      15: { capability: 'measure_battery', divisor: 1 },
      14: { capability: 'measure_battery', transform: (v) => ({ 0: 10, 1: 50, 2: 100 }[v] ?? v) },
      112: { capability: 'measure_ec', divisor: 1 }
    };
  }

  async onNodeInit({ zclNode }) {
    await Promise.resolve().then(() => super.onNodeInit({ zclNode })).catch(err => this.log('[SOIL] Base init error:', err.message));
    this.log('Soil Sensor v5.5.317 Ready');
  }

  _handleDP(dpId, value) {
    const dp = Number(dpId);
    let parsedValue = value;
    if (Buffer.isBuffer(value)) {
       if (value.length === 4) {parsedValue = value.readInt32BE(0);}
       else if (value.length === 1) {parsedValue = value.readUInt8(0);}
    }

    if (dp === 3) {
      this.safeSetCapabilityValue('measure_humidity.soil', parseFloat(parsedValue)).catch(() => { });
    } else if (dp === 5) {
      const temp = soilTemperature(parsedValue);
      if (temp !== null) { this.safeSetCapabilityValue('measure_temperature', temp).catch(() => { }); }
    } else {
      super._handleDP(dpId, value);
    }
  }

  /**
   * Point d'entrée unique des mises à jour de capabilities : déclenche les
   * cartes *_changed avec leurs tokens (pattern voisin : soil_sensor).
   */
  async safeSetCapabilityValue(capability, value) {
    const result = await super.safeSetCapabilityValue(capability, value);
    this._maybeTriggerMeasureFlow(capability, value);
    return result;
  }

  _maybeTriggerMeasureFlow(capability, value) {
    if (this._destroyed || typeof value !== 'number' || Number.isNaN(value)) {return;}
    const CARDS = {
      'measure_humidity.soil': ['air_purifier_soil_sensor_moisture_changed', 'moisture'],
      measure_temperature: ['air_purifier_soil_sensor_temperature_changed', 'temperature'],
      measure_battery: ['air_purifier_soil_sensor_battery_changed', 'battery'],
    };
    const hit = CARDS[capability];
    if (!hit) {return;}
    this._lastFlowValues = this._lastFlowValues || {};
    if (this._lastFlowValues[capability] === value) {return;}
    this._lastFlowValues[capability] = value;
    try {
      const card = this.homey.flow.getDeviceTriggerCard(hit[0]);
      if (card) {card.trigger(this, { [hit[1]]: value }, {}).catch(() => {});}
    } catch (e) { /* flow indisponible */ }
  }

  onDeleted() {
    if (typeof super.onDeleted === 'function') {super.onDeleted();}
  }
}

module.exports = SoilSensorDevice;
module.exports.soilTemperature = soilTemperature;
