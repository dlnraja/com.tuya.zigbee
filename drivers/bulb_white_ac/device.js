'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Bulb White Ac
 * 
 * UNBRANDED Architecture
 * Generated: 2025-10-12
 * Supports: Philips
 */
class BulbWhiteAcDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('bulb_white_ac initialized');
    this.log('Device:', this.getData());

    await super.onNodeInit({ zclNode });

    // Register capabilities
    await this.registerCapabilities();

    await this.setAvailable();
  }

  async registerCapabilities() {
    // onoff
    if (this.hasCapability('onoff')) {
      try {
        this.registerCapability('onoff', CLUSTER.ON_OFF, {
      get: 'onOff',
      report: 'onOff',
      set: 'toggle',
      setParser: value => ({ })
    });
        this.log('✅ onoff registered');
      } catch (err) {
        this.error('onoff failed:', err);
      }
    }

    // dim
    if (this.hasCapability('dim')) {
      try {
        this.registerCapability('dim', CLUSTER.LEVEL_CONTROL, {
      get: 'currentLevel',
      report: 'currentLevel',
      set: 'moveToLevelWithOnOff',
      setParser: value => ({ level: value * 255, transitionTime: 0 })
    });
        this.log('✅ dim registered');
      } catch (err) {
        this.error('dim failed:', err);
      }
    }
  }

  async onDeleted() {
    this.log('bulb_white_ac deleted');
  }

}

module.exports = BulbWhiteAcDevice;
