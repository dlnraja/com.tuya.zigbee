'use strict';

const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');

class IlluminanceSensorDevice extends HybridSensorBase {
  async onNodeInit({ zclNode }) {
    this.log('[ILLUMINANCE] Initializing illuminance sensor');
    await super.onNodeInit({ zclNode });
    await this._setupIlluminanceCluster(zclNode);
  }

  async _setupIlluminanceCluster(zclNode) {
    try {
      const endpoint = zclNode.endpoints[1];
      if (!endpoint) return;

      const illuminanceCluster = endpoint.clusters?.illuminanceMeasurement ||
                                  endpoint.clusters?.['msIlluminanceMeasurement'] ||
                                  endpoint.clusters?.[1024];

      if (illuminanceCluster) {
        this.log('[ILLUMINANCE] Found illuminance cluster');

        if (typeof illuminanceCluster.on === 'function') {
          illuminanceCluster.on('attr.measuredValue', async (value) => {
            const lux = this._convertToLux(value);
            this.log(`[ILLUMINANCE] Received: raw=${value}, lux=${lux}`);
            await this.setCapabilityValue('measure_luminance', lux).catch(this.error);
          });
        }

        if (typeof illuminanceCluster.configureReporting === 'function') {
          await illuminanceCluster.configureReporting({
            measuredValue: {
              minInterval: 10,
              maxInterval: 3600,
              minChange: 100
            }
          }).catch(e => this.log('[ILLUMINANCE] Reporting config failed:', e.message));
        }
      }
    } catch (err) {
      this.error('[ILLUMINANCE] Setup error:', err.message);
    }
  }

  _convertToLux(value) {
    if (value === 0 || value === 0xFFFF) return 0;
    return Math.round(Math.pow(10, (value - 1) / 10000));
  }
}

module.exports = IlluminanceSensorDevice;
