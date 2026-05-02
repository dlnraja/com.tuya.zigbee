'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const { ZigBeeDevice } = require('homey-zigbeedriver');

class IlluminanceSensorDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Illuminance Sensor v5.9.12 Ready');

    try {
      await this.configureAttributeReporting([
        {
          cluster: 'msIlluminanceMeasurement',
          attributeName: 'measuredValue',
          minInterval: 30,
          maxInterval: 600,
          minChange: 10,
        }
      ]).catch(e => this.log('[ILLUMINANCE] Reporting config failed:', e.message));
    } catch (err) {
      this.log('Reporting config error:', err.message);
    }

    const ep = zclNode.endpoints[1];
    if (ep && ep.clusters.msIlluminanceMeasurement) {
      ep.clusters.msIlluminanceMeasurement.on('attr.measuredValue', (value) => {
        this.setCapabilityValue('measure_luminance', value).catch(() => {});
      });
      this._readInitialLuminance(ep.clusters.msIlluminanceMeasurement);
    }
  }

  async _readInitialLuminance(cluster) {
    try {
      const data = await cluster.readAttributes(['measuredValue']).catch(() => ({}));
      if (data.measuredValue != null) {
        this.setCapabilityValue('measure_luminance', data.measuredValue).catch(() => {});
      }
    } catch (e) {
      this.log('Initial luminance read failed:', e.message);
    }
  }
}

module.exports = IlluminanceSensorDevice;
