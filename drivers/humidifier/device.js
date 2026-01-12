'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * Smart Humidifier Device
 *
 * DP mappings (typical):
 * DP1: On/Off
 * DP2: Target humidity (30-80%)
 * DP3: Current humidity
 * DP5: Mist level (low/medium/high)
 * DP12: Water shortage alarm
 */
class HumidifierDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Smart Humidifier initializing...');

    await this._setupTuyaDP(zclNode);

    this.log('Smart Humidifier initialized');
  }

  async _setupTuyaDP(zclNode) {
    const ep1 = zclNode.endpoints[1];
    if (!ep1) return;

    const tuyaCluster = ep1.clusters?.tuya || ep1.clusters?.[61184];
    if (!tuyaCluster) return;

    this.log('[TUYA] DP cluster found');

    // Register capability listeners
    this.registerCapabilityListener('onoff', async (value) => {
      await tuyaCluster.datapoint({ dp: 1, datatype: 1, value: value });
    });

    this.registerCapabilityListener('dim', async (value) => {
      const level = Math.round(value * 3); // 0=off, 1=low, 2=medium, 3=high
      await tuyaCluster.datapoint({ dp: 5, datatype: 4, value: level });
    });

    if (this.hasCapability('target_humidity')) {
      this.registerCapabilityListener('target_humidity', async (value) => {
        await tuyaCluster.datapoint({ dp: 2, datatype: 2, value: Math.round(value) });
      });
    }

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

      case 2: // Target humidity
        if (this.hasCapability('target_humidity')) {
          this.setCapabilityValue('target_humidity', value).catch(this.error);
        }
        break;

      case 3: // Current humidity
        if (this.hasCapability('measure_humidity')) {
          this.setCapabilityValue('measure_humidity', value).catch(this.error);
        }
        break;

      case 5: // Mist level (0-3)
        const dim = value / 3;
        this.setCapabilityValue('dim', dim).catch(this.error);
        break;

      case 12: // Water shortage
        this.log(`Water shortage alarm: ${value}`);
        break;
    }
  }
}

module.exports = HumidifierDevice;
