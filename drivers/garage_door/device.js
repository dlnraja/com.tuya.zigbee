'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Garage Door Controller Device
 *
 * DP mappings:
 * DP1: Trigger (momentary pulse to open/close)
 * DP2: Door state (open/closed/opening/closing)
 * DP3: Countdown timer
 * DP12: Door contact state
 */
class GarageDoorDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Garage Door Controller initializing...');

    // Register garagedoor_closed capability
    if (this.hasCapability('garagedoor_closed')) {
      this.registerCapabilityListener('garagedoor_closed', async (value) => {
        // Trigger door operation
        await this._triggerDoor(!value);
      });
    }

    // Try standard on/off cluster for simple controllers
    const ep1 = zclNode.endpoints[1];
    if (ep1?.clusters?.onOff) {
      this.log('[ONOFF] Using onOff cluster for control');
    }

    await this._setupTuyaDP(zclNode);

    this.log('Garage Door Controller initialized');
  }

  async _triggerDoor(open) {
    const ep1 = this.zclNode.endpoints[1];

    // Try Tuya DP first
    const tuyaCluster = ep1?.clusters?.tuya || ep1?.clusters?.[61184];
    if (tuyaCluster) {
      this.log(`Triggering door: ${open ? 'OPEN' : 'CLOSE'}`);
      await tuyaCluster.datapoint({ dp: 1, datatype: 1, value: true });
      return;
    }

    // Fallback to on/off cluster
    const onOffCluster = ep1?.clusters?.onOff;
    if (onOffCluster) {
      await onOffCluster.toggle();
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
      case 2: // Door state (0=closed, 1=open, 2=opening, 3=closing)
      case 12:
        const isClosed = value === 0 || value === false;
        this.setCapabilityValue('garagedoor_closed', isClosed).catch(this.error);
        if (this.hasCapability('alarm_contact')) {
          this.setCapabilityValue('alarm_contact', !isClosed).catch(this.error);
        }
        break;

      case 3: // Countdown
        this.log(`Door countdown: ${value}s`);
        break;
    }
  }
}

module.exports = GarageDoorDevice;
