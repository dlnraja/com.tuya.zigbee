'use strict';

const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');

class IlluminanceSensorDevice extends UnifiedSensorBase {

  // v8.1.131: Tuya DP mappings for TS0601 luminance sensors
  // _TZE284_aaeasoll and similar send lux via Tuya DPs, not ZCL illuminance cluster
  get dpMappings() {
    return {
      3: { capability: 'measure_luminance', divisor: 1 },
      4: { capability: 'measure_luminance', divisor: 1 },
      12: { capability: 'measure_luminance', divisor: 1 },
    };
  }

  async onNodeInit({ zclNode }) {
    this.log('[ILLUMINANCE] Initializing illuminance sensor');
    await super.onNodeInit({ zclNode });

    // v8.1.131: FIX #2075 — Removed ZCL configureAttributeReporting
    // TS0601 devices with Tuya DPs don't have the ZCL illuminance cluster
    // The device sends illuminance via Tuya DPs (DP3, DP4, DP12)
    // ZCL reporting config was silently failing and preventing DP reports

    // Setup ZCL illuminance listener for devices that DO have the cluster
    await this._setupIlluminanceCluster(zclNode);

    // v8.1.131: Add periodic DP request for devices that don't send spontaneously
    this._pollInterval = setInterval(() => {
      if (this.tuyaEF00Manager && !this._lastLuminance) {
        this.log('[ILLUMINANCE] Polling for luminance data...');
        this.tuyaEF00Manager.requestDPs?.([3, 4, 12]).catch(() => {});
      }
    }, 60000); // Poll every 60 seconds if no data received

    this.log('[ILLUMINANCE] Sensor ready — waiting for Tuya DP data');
  }

  async _setupIlluminanceCluster(zclNode) {
    try {
      const endpoint = zclNode.endpoints[1];
      if (!endpoint) { return; }

      const illuminanceCluster = endpoint.clusters?.illuminanceMeasurement ||
                                  endpoint.clusters?.['msIlluminanceMeasurement'] ||
                                  endpoint.clusters?.[1024];

      if (illuminanceCluster) {
        this.log('[ILLUMINANCE] Found ZCL illuminance cluster — setting up listener');

        if (typeof illuminanceCluster.on === 'function') {
          illuminanceCluster.on('attr.measuredValue', async (value) => {
            this._lastLuminance = Date.now();
            const lux = this._convertToLux(value);
            this.log(`[ILLUMINANCE] ZCL received: raw=${value}, lux=${lux}`);
            await this.setCapabilityValue('measure_luminance', lux).catch(this.error);
          });
        }
      } else {
        this.log('[ILLUMINANCE] No ZCL illuminance cluster — using Tuya DPs only');
      }
    } catch (err) {
      this.log('[ILLUMINANCE] ZCL cluster setup error:', err.message);
    }
  }

  _convertToLux(zclValue) {
    // ZCL illuminance measurement: lux = 10^((value - 1) / 10000)
    if (typeof zclValue === 'number' && zclValue > 1) {
      return Math.round(Math.pow(10, (zclValue - 1) / 10000));
    }
    return zclValue;
  }

  async onUninit() {
    if (this._pollInterval) {
      clearInterval(this._pollInterval);
      this._pollInterval = null;
    }
    await super.onUninit();
  }
}

module.exports = IlluminanceSensorDevice;
