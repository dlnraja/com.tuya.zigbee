'use strict';

const UnifiedLightBase = require('../../lib/devices/UnifiedLightBase');

/**
 * P130: Was log-only DP dump — rebase on UnifiedLightBase for onoff/dim TX
 * (EF00 + ZCL hybrid) while keeping climate measure capabilities.
 */
class ClimateSensorDimmerDevice extends UnifiedLightBase {
  get lightCapabilities() {
    return ['onoff', 'dim', 'measure_temperature', 'measure_humidity', 'measure_power'];
  }

  get dpMappings() {
    return {
      ...super.dpMappings,
      18: { capability: 'measure_temperature', smartDivisor: true },
      19: { capability: 'measure_humidity', smartDivisor: true },
      101: { capability: 'measure_temperature', smartDivisor: true },
      102: { capability: 'measure_humidity', smartDivisor: true },
    };
  }
}

module.exports = ClimateSensorDimmerDevice;
