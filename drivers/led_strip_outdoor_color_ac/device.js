'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Led Strip Outdoor Color Ac
 * 
 * UNBRANDED Architecture
 * Generated: 2025-10-12
 * Supports: Philips
 */
class LedStripOutdoorColorAcDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('led_strip_outdoor_color_ac initialized');
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

    // light_hue
    if (this.hasCapability('light_hue')) {
      try {
        this.registerCapability('light_hue', CLUSTER.COLOR_CONTROL, {
      get: 'currentHue',
      report: 'currentHue',
      set: 'moveToHue',
      setParser: value => ({ hue: value * 254, direction: 0, transitionTime: 0 })
    });
        this.log('✅ light_hue registered');
      } catch (err) {
        this.error('light_hue failed:', err);
      }
    }

    // light_saturation
    if (this.hasCapability('light_saturation')) {
      try {
        this.registerCapability('light_saturation', CLUSTER.COLOR_CONTROL, {
      get: 'currentSaturation',
      report: 'currentSaturation',
      set: 'moveToSaturation',
      setParser: value => ({ saturation: value * 254, transitionTime: 0 })
    });
        this.log('✅ light_saturation registered');
      } catch (err) {
        this.error('light_saturation failed:', err);
      }
    }
  }

  async onDeleted() {
    this.log('led_strip_outdoor_color_ac deleted');
  }

}

module.exports = LedStripOutdoorColorAcDevice;
