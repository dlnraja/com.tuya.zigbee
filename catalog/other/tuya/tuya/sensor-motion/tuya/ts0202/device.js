#!/usr/bin/env node
'use strict';

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { Cluster, CLUSTER } = require('zigbee-clusters');

class TS0202MotionSensor extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // Enable debugging
    this.enableDebug();
    this.printNode();

    // Register motion detection capability
    this.registerCapability('alarm_motion', CLUSTER.OCCUPANCY_SENSING, {
      get: 'occupancy',
      getOpts: {
        getOnStart: true,
        pollInterval: 30000, // Poll every 30 seconds
      },
      reportParser: (value) => {
        const motion = value === 1;
        this.log('Motion detected:', motion);
        return motion;
      },
    });

    // Register battery monitoring capability
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      get: 'batteryPercentageRemaining',
      getOpts: {
        getOnStart: true,
        pollInterval: 600000, // Poll every 10 minutes
      },
      reportParser: (value) => {
        const battery = value / 2; // Convert from 0.5% to %
        this.log('Battery level:', battery, '%');
        return battery;
      },
    });

    // Set up motion timeout (reset after 2 minutes of no motion)
    this.motionTimeout = null;
    this.on('capability:alarm_motion:changed', (value) => {
      if (value) {
        // Motion detected, clear timeout
        if (this.motionTimeout) {
          clearTimeout(this.motionTimeout);
        }
        // Set timeout to reset motion after 2 minutes
        this.motionTimeout = setTimeout(() => {
          this.setCapabilityValue('alarm_motion', false);
        }, 120000);
      }
    });
  }

  onDeleted() {
    if (this.motionTimeout) {
      clearTimeout(this.motionTimeout);
    }
    this.log('TS0202 Motion Sensor removed');
  }
}

module.exports = TS0202MotionSensor;
