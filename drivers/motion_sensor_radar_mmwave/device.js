'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const { ZigBeeDevice } = require('homey-zigbeedriver');

class MotionRadarMmWaveDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Motion Radar mmWave v5.9.12 Ready');

    try {
      await this.configureAttributeReporting([
        {
          cluster: 'msIlluminanceMeasurement',
          attributeName: 'measuredValue',
          minInterval: 30,
          maxInterval: 600,
          minChange: 10,
        }
      ]).catch(e => this.log('[ILLUM] config failed:', e.message));
    } catch (err) {
      this.log('Config error:', err.message);
    }
  }
}

module.exports = MotionRadarMmWaveDevice;
