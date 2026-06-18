'use strict';

const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');

/**
 * EnergyMeterDinDevice - DIN Rail Energy Meter
 * DPs: 1=onoff(BOOL), 6=current(smartDivisor), 7=power(smartDivisor),
 *      8=voltage(smartDivisor), 9=metering(smartDivisor), 11=frequency(smartDivisor)
 */
class EnergyMeterDinDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedPlugBase)) {

  get mainsPowered() { return true; }

  get dpMappings() {
    return {
      ...super.dpMappings,
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      6: { capability: 'measure_current', smartDivisor: true },
      7: { capability: 'measure_power', smartDivisor: true },
      8: { capability: 'measure_voltage', smartDivisor: true },
      9: { capability: 'meter_power', smartDivisor: true },
      11: { capability: 'measure_frequency', smartDivisor: true },
    };
  }

  async onNodeInit({ zclNode }) {
    if (this._initialized) return;
    this._initialized = true;

    await super.onNodeInit({ zclNode });
    this.log('[EnergyMeterDin] Initialized');
  }

  onDeleted() {
    this._destroyed = true;
    if (super.onDeleted) super.onDeleted();
  }
}

module.exports = EnergyMeterDinDevice;
