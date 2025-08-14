'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { Cluster, CLUSTER } = require('zigbee-clusters');

class TS011FSmartPlug extends ZigBeeDevice {

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

    // Power measurement
    this.registerCapability('measure_power', CLUSTER.ELECTRICAL_MEASUREMENT, {
      get: 'activePower',
      getOpts: {
        getOnStart: true,
        pollInterval: 60000, // Poll every minute
      },
      reportParser: (value) => value / 10, // Convert from 0.1W to W
    });

    // Current measurement
    this.registerCapability('measure_current', CLUSTER.ELECTRICAL_MEASUREMENT, {
      get: 'rmsCurrent',
      getOpts: {
        getOnStart: true,
        pollInterval: 60000,
      },
      reportParser: (value) => value / 1000, // Convert from mA to A
    });

    // Voltage measurement
    this.registerCapability('measure_voltage', CLUSTER.ELECTRICAL_MEASUREMENT, {
      get: 'rmsVoltage',
      getOpts: {
        getOnStart: true,
        pollInterval: 60000,
      },
      reportParser: (value) => value / 10, // Convert from 0.1V to V
    });
  }

  onDeleted() {
    this.log('TS011F Smart Plug removed');
  }
}

module.exports = TS011FSmartPlug;
