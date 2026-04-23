'use strict';
const { safeParse } = require('../../lib/utils/tuyaUtils.js');


const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');

class IlluminanceSensorDevice extends UnifiedSensorBase {
  async onNodeInit({ zclNode }) {
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'msIlluminanceMeasurement',
          attributeName: 'measuredValue',
          minInterval: 30,
          maxInterval: 600,
          minChange: 50,
        },
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    this.log('[ILLUMINANCE] Initializing illuminance sensor');
    await super.onNodeInit({ zclNode });
    this._registerCapabilityListeners(); // rule-12a injected
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
        this.log('[ILLUMINANCE] Found illuminance cluster' );

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
          }).catch(e => this.log('[ILLUMINANCE] Reporting config failed:', e.message);
        }
      }
    } catch (err) {
      this.error('[ILLUMINANCE] Setup error:', err.message);
    }
  }

  _convertToLux(value) {
    if (value === 0 || value === 0xFFFF) return 0;
    return Math.round(Math.pow(10, (value  - 1) / 10000));
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = IlluminanceSensorDevice;
