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
    if (this._initialized) return;
    this._initialized = true;

    await super.onNodeInit({ zclNode });
    this.log('[UltrasonicHeatMeter] Initialized');
  }

  onDeleted() {
    this._destroyed = true;
    if (super.onDeleted) super.onDeleted();
  }
}

module.exports = UltrasonicHeatMeterDevice;
