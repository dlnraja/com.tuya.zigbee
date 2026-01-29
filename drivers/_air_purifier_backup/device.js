'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * Air Purifier Device
 *
 * DP mappings (typical):
 * DP1: On/Off
 * DP3: Mode (auto/manual/sleep)
 * DP4: Fan speed (1-5)
 * DP5: PM2.5 value
 * DP6: Filter life remaining (%)
 * DP7: Child lock
 */
class AirPurifierDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Air Purifier initializing...');

    await this._setupTuyaDP(zclNode);

    this.log('Air Purifier initialized');
  }

  async _setupTuyaDP(zclNode) {
    const ep1 = zclNode.endpoints[1];
    if (!ep1) return;

    const tuyaCluster = ep1.clusters?.tuya || ep1.clusters?.[61184];
    if (!tuyaCluster) return;

    this.log('[TUYA] DP cluster found');

    this.registerCapabilityListener('onoff', async (value) => {
      await tuyaCluster.datapoint({ dp: 1, datatype: 1, value: value });
    });

    this.registerCapabilityListener('dim', async (value) => {
      const speed = Math.round(value * 5); // 0-5
      await tuyaCluster.datapoint({ dp: 4, datatype: 2, value: speed });
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

      case 4: // Fan speed (1-5)
        this.setCapabilityValue('dim', value / 5).catch(this.error);
        break;

      case 5: // PM2.5
        if (this.hasCapability('measure_pm25')) {
          this.setCapabilityValue('measure_pm25', value).catch(this.error);
        }
        break;

      case 6: // Filter life
        this.log(`Filter life remaining: ${value}%`);
        break;
    }
  }
}

module.exports = AirPurifierDevice;
