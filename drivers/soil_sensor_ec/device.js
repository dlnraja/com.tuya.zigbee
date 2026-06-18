'use strict';

const UnifiedSensorBase = require('../../lib/devices/UnifiedSensorBase');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');

/**
 * SoilSensorEcDevice - Soil EC (Electrical Conductivity) Sensor
 * DPs: 1=temperature(smartDivisor), 2=humidity(smartDivisor),
 *      3=conductivity(VALUE), 4=battery(VALUE)
 */
class SoilSensorEcDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedSensorBase)) {

  get mainsPowered() { return false; }

  get dpMappings() {
    return {
      ...super.dpMappings,
      1: { capability: 'measure_temperature', smartDivisor: true },
      2: { capability: 'measure_humidity', smartDivisor: true },
      3: { capability: 'measure_conductivity' },
      4: { capability: 'measure_battery' },
    };
  }

  async onNodeInit({ zclNode }) {
    if (this._initialized) return;
    this._initialized = true;

    await super.onNodeInit({ zclNode });
    this.log('[SoilSensorEc] Initialized');
  }

  onDeleted() {
    this._destroyed = true;
    if (super.onDeleted) super.onDeleted();
  }
}

module.exports = SoilSensorEcDevice;
