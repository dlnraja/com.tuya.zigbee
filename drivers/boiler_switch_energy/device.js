'use strict';

const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');

/**
 * BoilerSwitchEnergyDevice - Boiler Switch with Energy Monitoring
 * DPs: 1=onoff(BOOL), 6=current(smartDivisor), 7=power(smartDivisor),
 *      8=voltage(smartDivisor), 9=metering(smartDivisor),
 *      12=temperature(smartDivisor), 14=fault(BITMAP)
 */
class BoilerSwitchEnergyDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedPlugBase)) {

  get mainsPowered() { return true; }

  get dpMappings() {
    return {
      ...super.dpMappings,
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      6: { capability: 'measure_current', smartDivisor: true },
      7: { capability: 'measure_power', smartDivisor: true },
      8: { capability: 'measure_voltage', smartDivisor: true },
      9: { capability: 'meter_power', smartDivisor: true },
      12: { capability: 'measure_temperature', smartDivisor: true },
      14: { internal: true, type: 'fault', transform: (v) => v !== 0 },
    };
  }

  async onNodeInit({ zclNode }) {
    if (this._initialized) return;
    this._initialized = true;

    await super.onNodeInit({ zclNode });
    this.log('[BoilerSwitchEnergy] Initialized');
  }

  onDeleted() {
    this._destroyed = true;
    if (super.onDeleted) super.onDeleted();
  }
}

module.exports = BoilerSwitchEnergyDevice;
