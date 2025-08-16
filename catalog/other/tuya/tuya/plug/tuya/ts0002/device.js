#!/usr/bin/env node
'use strict';

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { Cluster, CLUSTER } = require('zigbee-clusters');

class TS0002DoubleSwitch extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // Enable debugging
    this.enableDebug();
    this.printNode();

    // Register capabilities for Switch 1 (endpoint 1)
    this.registerCapability('onoff', CLUSTER.ON_OFF, {
      get: 'onOff',
      set: 'setOnOff',
      setParser: (value) => ({ value }),
      reportParser: (value) => value === 1,
      endpoint: 1,
    });

    // Register capabilities for Switch 2 (endpoint 2)
    this.registerCapability('onoff.1', CLUSTER.ON_OFF, {
      get: 'onOff',
      set: 'setOnOff',
      setParser: (value) => ({ value }),
      reportParser: (value) => value === 1,
      endpoint: 2,
    });
  }

  onDeleted() {
    this.log('TS0002 Double Switch removed');
  }
}

module.exports = TS0002DoubleSwitch;
