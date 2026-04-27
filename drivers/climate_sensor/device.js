'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');

class ClimateSensorDevice extends UnifiedSensorBase {
  get mainsPowered() { return false; }
  get usesTuyaDPBattery() { return true; }
  get hybridModeEnabled() { return true; }

  get sensorCapabilities() {
    return ['measure_temperature', 'measure_humidity', 'measure_battery'];
  }

  get dpMappings() {
    return {
      1: { capability: 'measure_temperature', divisor: 10 },
      2: { capability: 'measure_humidity', divisor: 1 },
      4: { capability: 'measure_battery', transform: (v) => Math.min(100, safeMultiply(v, 2)) }
    };
  }

  async onNodeInit({ zclNode }) {
    this.log('Climate Sensor Ultimate initialized');
    await super.onNodeInit({ zclNode });
  }

  async handleTuyaDataReport(data) {
     this.log('Climate DP:', data.dp, data.value);
  }
}

module.exports = ClimateSensorDevice;
