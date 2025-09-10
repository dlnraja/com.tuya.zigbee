#!/usr/bin/env node
'use strict';

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { Cluster, CLUSTER } = require('zigbee-clusters');

class TS0003TripleSwitch extends ZigBeeDevice {

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

    // Register capabilities for Switch 3 (endpoint 3)
    this.registerCapability('onoff.2', CLUSTER.ON_OFF, {
      get: 'onOff',
      set: 'setOnOff',
      setParser: (value) => ({ value }),
      reportParser: (value) => value === 1,
      endpoint: 3,
    });

    // Set up status monitoring
    this.on('capability:onoff:changed', (value) => {
      this.log('Switch 1 changed to:', value ? 'ON' : 'OFF');
    });

    this.on('capability:onoff.1:changed', (value) => {
      this.log('Switch 2 changed to:', value ? 'ON' : 'OFF');
    });

    this.on('capability:onoff.2:changed', (value) => {
      this.log('Switch 3 changed to:', value ? 'ON' : 'OFF');
    });
  }

  onDeleted() {
    this.log('TS0003 Triple Switch removed');
  }
}

module.exports = TS0003TripleSwitch;
