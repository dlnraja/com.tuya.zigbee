'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * Smart Pet Feeder Device
 *
 * DP mappings:
 * DP3: Manual feed trigger
 * DP4: Feed portion size
 * DP6: Food level alarm
 * DP12: Feed schedule
 */
class PetFeederDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Smart Pet Feeder initializing...');

    // Register feed button
    if (this.hasCapability('button.feed')) {
      this.registerCapabilityListener('button.feed', async () => {
        await this._triggerFeed();
      });
    }

    await this._setupTuyaDP(zclNode);

    this.log('Smart Pet Feeder initialized');
  }

  async _triggerFeed() {
    const ep1 = this.zclNode.endpoints[1];
    const tuyaCluster = ep1?.clusters?.tuya || ep1?.clusters?.[61184];

    if (tuyaCluster) {
      this.log('Triggering manual feed...');
      await tuyaCluster.datapoint({ dp: 3, datatype: 2, value: 1 });
    }
  }

  async _setupTuyaDP(zclNode) {
    const ep1 = zclNode.endpoints[1];
    if (!ep1) return;

    const tuyaCluster = ep1.clusters?.tuya || ep1.clusters?.[61184];
    if (!tuyaCluster) return;

    this.log('[TUYA] DP cluster found');

    tuyaCluster.on('response', (r) => this._handleDP(r?.dp, r?.value));
    tuyaCluster.on('reporting', (r) => this._handleDP(r?.dp, r?.value));
    tuyaCluster.on('datapoint', (dp, value) => this._handleDP(dp, value));
  }

  _handleDP(dp, value) {
    if (dp === undefined) return;
    this.log(`[DP${dp}] = ${value}`);

    switch (dp) {
      case 6: // Food level alarm
        if (this.hasCapability('alarm_generic')) {
          this.setCapabilityValue('alarm_generic', !!value).catch(this.error);
        }
        break;

      case 4: // Portion size
        this.log(`Portion size: ${value}`);
        break;
    }
  }
}

module.exports = PetFeederDevice;
