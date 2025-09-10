#!/usr/bin/env node
'use strict';

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { Cluster, CLUSTER } = require('zigbee-clusters');

class TS0505ARGBBulb extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // Enable debugging
    this.enableDebug();
    this.printNode();

    // Register on/off capability
    this.registerCapability('onoff', CLUSTER.ON_OFF, {
      get: 'onOff',
      set: 'setOnOff',
      setParser: (value) => ({ value }),
      reportParser: (value) => value === 1,
    });

    // Register dimming capability
    this.registerCapability('dim', CLUSTER.LEVEL_CONTROL, {
      get: 'currentLevel',
      set: 'moveToLevel',
      setParser: (value) => ({
        level: Math.round(value * 254),
        transitionTime: 0,
      }),
      reportParser: (value) => value / 254,
      getOpts: {
        getOnStart: true,
        pollInterval: 30000,
      },
    });

    // Register hue capability
    this.registerCapability('light_hue', CLUSTER.COLOR_CONTROL, {
      get: 'currentHue',
      set: 'moveToHue',
      setParser: (value) => ({
        hue: Math.round(value * 254),
        transitionTime: 0,
        direction: 0,
      }),
      reportParser: (value) => value / 254,
      getOpts: {
        getOnStart: true,
        pollInterval: 30000,
      },
    });

    // Register saturation capability
    this.registerCapability('light_saturation', CLUSTER.COLOR_CONTROL, {
      get: 'currentSaturation',
      set: 'moveToSaturation',
      setParser: (value) => ({
        saturation: Math.round(value * 254),
        transitionTime: 0,
      }),
      reportParser: (value) => value / 254,
      getOpts: {
        getOnStart: true,
        pollInterval: 30000,
      },
    });

    // Set up color transitions
    this.on('capability:light_hue:changed', (value) => {
      this.log('Hue changed to:', Math.round(value * 360), '°');
    });

    this.on('capability:light_saturation:changed', (value) => {
      this.log('Saturation changed to:', Math.round(value * 100), '%');
    });
  }

  onDeleted() {
    this.log('TS0505A RGB Bulb removed');
  }
}

module.exports = TS0505ARGBBulb;
