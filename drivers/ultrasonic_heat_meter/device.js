'use strict';

const UnifiedSensorBase = require('../../lib/devices/UnifiedSensorBase');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');

/**
 * UltrasonicHeatMeterDevice - Ultrasonic Heat Meter
 * DPs: 1=energy_kwh(VALUE), 2=power_w(VALUE), 3=flow_temp(VALUE),
 *      4=return_temp(VALUE), 5=battery(VALUE)
 */
class UltrasonicHeatMeterDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedSensorBase)) {

  get mainsPowered() { return false; }

  get dpMappings() {
    // WHY(P2580 / Z2M herdsman#13184 + ZHA reports): jt50ea5d heat meter uses
    // DP7=metering switch (bool), DP8=cumulative heat — not the generic 1–5 map.
    const mfr = String(this.getSetting?.('zb_manufacturer_name') || '').toLowerCase();
    if (mfr.includes('jt50ea5d')) {
      return {
        ...super.dpMappings,
        7: { capability: null, internal: 'metering_switch', type: 'bool' },
        8: { capability: 'meter_power', smartDivisor: true },
        1: { capability: null, internal: 'legacy_energy' },
        2: { capability: null, internal: 'legacy_power' },
        3: { capability: 'measure_temperature', smartDivisor: true },
        4: { internal: true, type: 'return_temperature', smartDivisor: true },
        5: { capability: 'alarm_battery', transform: (v) => v < 20 },
      };
    }
    return {
      ...super.dpMappings,
      1: { capability: 'meter_power' },
      2: { capability: 'measure_power' },
      3: { capability: 'measure_temperature', smartDivisor: true },
      4: { internal: true, type: 'return_temperature', smartDivisor: true },
      5: { capability: 'alarm_battery', transform: (v) => v < 20 },
    };
  }

  async onNodeInit({ zclNode }) {
    if (this._initialized) {return;}
    this._initialized = true;

    await super.onNodeInit({ zclNode });
    this.log('[UltrasonicHeatMeter] Initialized');
  }

  onDeleted() {
    this._destroyed = true;
    if (super.onDeleted) {super.onDeleted();}
  }
}

module.exports = UltrasonicHeatMeterDevice;
