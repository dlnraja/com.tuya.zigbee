'use strict';
const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      AIR QUALITY CO2 SENSOR - v5.5.129 FIXED (extends HybridSensorBase)     ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  HybridSensorBase handles: Tuya DP, battery                                 ║
 * ║  This class: dpMappings + ZCL temp/humidity listeners (specific to CO2)     ║
 * ║  DPs: 1,2,14,15,18,19,21-23 | ZCL: 1026,1029,1,EF00                        ║
 * ║  Variants: _TZE200_ywagc4rj, _TZE200_zl1kmjqx                               ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class AirQualityCO2Device extends HybridSensorBase {

  get mainsPowered() { return false; }

  get sensorCapabilities() {
    return ['measure_co2', 'measure_temperature', 'measure_humidity', 'measure_battery'];
  }

  get dpMappings() {
    return {
      2: { capability: 'measure_co2', divisor: 1 },
      21: { capability: 'measure_co2', divisor: 1 },
      18: { capability: 'measure_temperature', divisor: 10 },
      19: { capability: 'measure_humidity', divisor: 10 },
      22: { capability: 'measure_voc', divisor: 100 },
      23: { capability: 'measure_voc', divisor: 100 },
      14: { capability: 'measure_battery', divisor: 1 },
      15: { capability: null, internal: 'battery_low', transform: (v) => v === 1 || v === 'low' }, // SDK3: alarm_battery obsolète
      1: { capability: 'alarm_generic', transform: (v) => v === true || v === 1 }
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[CO2] v5.5.129 - DPs: 1,2,14,15,18,19,21-23 | ZCL: 1026,1029,1,EF00');

    // Setup ZCL temp/humidity (specific to air quality sensors)
    await this._setupAirQualityZCL(zclNode);

    this.log('[CO2] ✅ Ready');
  }

  async _setupAirQualityZCL(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    try {
      const temp = ep1.clusters?.msTemperatureMeasurement;
      if (temp?.on) {
        temp.on('attr.measuredValue', (v) => this.setCapabilityValue('measure_temperature', v / 100).catch(() => { }));
      }
      const hum = ep1.clusters?.msRelativeHumidity;
      if (hum?.on) {
        hum.on('attr.measuredValue', (v) => this.setCapabilityValue('measure_humidity', v / 100).catch(() => { }));
      }
    } catch (e) { /* ignore */ }
  }
}

module.exports = AirQualityCO2Device;
