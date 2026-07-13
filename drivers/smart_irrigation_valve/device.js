'use strict';

const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');

/**
 * SmartIrrigationValveDevice - Smart Irrigation Valve
 * DPs: 1=onoff(BOOL), 5=water_flow(VALUE), 6=countdown(VALUE),
 *      12=fault(BITMAP), 13=weather_delay(ENUM), 14=smart_irrigation(BOOL)
 */
class SmartIrrigationValveDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedPlugBase)) {

  get mainsPowered() { return true; }

  get dpMappings() {
    return {
      ...super.dpMappings,
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      5: { capability: 'measure_water' },
      6: { capability: 'countdown_remaining' },
      12: { capability: 'alarm_fault', transform: (v) => v !== 0 },
      13: { internal: true, type: 'weather_delay', writable: true },
      14: { internal: true, type: 'smart_irrigation', writable: true },
    };
  }

  async onNodeInit({ zclNode }) {
    if (this._initialized) return;
    this._initialized = true;

    await super.onNodeInit({ zclNode });
    this.log('[SmartIrrigationValve] Initialized');
  }

  onDeleted() {
    this._destroyed = true;
    if (super.onDeleted) super.onDeleted();
  }
}

module.exports = SmartIrrigationValveDevice;
