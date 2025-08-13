'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { Cluster, CLUSTER } = require('zigbee-clusters');

class TS110FSingleDimmer extends ZigBeeDevice {

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
        pollInterval: 30000, // Poll every 30 seconds
      },
    });
  }

  onDeleted() {
    this.log('TS110F Single Dimmer removed');
  }
}

module.exports = TS110FSingleDimmer;
