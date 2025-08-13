'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { Cluster, CLUSTER } = require('zigbee-clusters');

class TS0001SingleSwitch extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // Enable debugging
    this.enableDebug();
    this.printNode();

    // Register capabilities
    this.registerCapability('onoff', CLUSTER.ON_OFF, {
      get: 'onOff',
      set: 'setOnOff',
      setParser: (value) => ({ value }),
      reportParser: (value) => value === 1,
    });
  }

  onDeleted() {
    this.log('TS0001 Single Switch removed');
  }
}

module.exports = TS0001SingleSwitch;
