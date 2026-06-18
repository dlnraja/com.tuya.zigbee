'use strict';

const UnifiedSensorBase = require('../../lib/devices/UnifiedSensorBase');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');

/**
 * UltrasonicWaterMeterDevice - Ultrasonic Water Meter
 * DPs: 1=total_flow(VALUE), 2=current_flow(VALUE), 3=battery(VALUE),
 *      17=fault(BITMAP), 18=valve_state(BOOL), 19=cleaning(BOOL)
 */
class UltrasonicWaterMeterDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedSensorBase)) {

  get mainsPowered() { return false; }

  get dpMappings() {
    return {
      ...super.dpMappings,
      1: { capability: 'meter_water' },
      2: { capability: 'measure_water' },
      3: { capability: 'alarm_battery', transform: (v) => v < 20 },
      17: { capability: 'alarm_fault', transform: (v) => v !== 0 },
      18: { internal: true, type: 'valve_state', writable: true },
      19: { internal: true, type: 'cleaning', writable: true },
    };
  }

  async onNodeInit({ zclNode }) {
    if (this._initialized) return;
    this._initialized = true;

    await super.onNodeInit({ zclNode });
    this.log('[UltrasonicWaterMeter] Initialized');
  }

  onDeleted() {
    this._destroyed = true;
    if (super.onDeleted) super.onDeleted();
  }
}

module.exports = UltrasonicWaterMeterDevice;
