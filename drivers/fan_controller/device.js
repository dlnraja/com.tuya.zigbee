'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Fan Speed Controller Device
 *
 * Supports on/off and multi-speed control
 * DP mappings:
 * DP1: On/Off
 * DP3: Speed (0-4 typically: off, low, medium, high, turbo)
 * DP6: Mode (normal, sleep, natural, etc)
 */
class FanControllerDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Fan Controller initializing...');

    // Try standard ZCL clusters first
    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', CLUSTER.ON_OFF);
    }

    if (this.hasCapability('dim')) {
      this.registerCapability('dim', CLUSTER.LEVEL_CONTROL);
    }

    // Setup Tuya DP for TS0601 devices
    await this._setupTuyaDP(zclNode);

    this.log('Fan Controller initialized');
  }

  async _setupTuyaDP(zclNode) {
    const ep1 = zclNode.endpoints[1];
    if (!ep1) return;

    const tuyaCluster = ep1.clusters?.tuya || ep1.clusters?.[61184];
    if (!tuyaCluster) return;

    this.log('[TUYA] DP cluster found');

    // Register capability listener for dim via Tuya DP
    this.registerCapabilityListener('dim', async (value) => {
      const speed = Math.round(value * 4); // 0-4 speed levels
      this.log(`Setting fan speed to: ${speed}`);
      try {
        await tuyaCluster.datapoint({ dp: 3, datatype: 2, value: speed });
      } catch (e) {
        this.error('Failed to set speed:', e);
      }
    });

    this.registerCapabilityListener('onoff', async (value) => {
      this.log(`Setting fan on/off: ${value}`);
      try {
        await tuyaCluster.datapoint({ dp: 1, datatype: 1, value: value });
      } catch (e) {
        this.error('Failed to set on/off:', e);
      }
    });

    tuyaCluster.on('response', (r) => this._handleDP(r?.dp, r?.value));
    tuyaCluster.on('reporting', (r) => this._handleDP(r?.dp, r?.value));
    tuyaCluster.on('datapoint', (dp, value) => this._handleDP(dp, value));
  }

  _handleDP(dp, value) {
    if (dp === undefined) return;
    this.log(`[DP${dp}] = ${value}`);

    switch (dp) {
      case 1: // On/Off
        this.setCapabilityValue('onoff', !!value).catch(this.error);
        break;

      case 3: // Speed (0-4)
        const dim = value / 4; // Convert to 0-1 range
        this.setCapabilityValue('dim', dim).catch(this.error);
        break;

      case 6: // Mode (some devices)
        this.log(`Fan mode: ${value}`);
        break;
    }
  }
}

module.exports = FanControllerDevice;
