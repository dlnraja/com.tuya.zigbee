'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { Cluster, CLUSTER } = require('zigbee-clusters');

class TS0203DoorSensor extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // Enable debugging
    this.enableDebug();
    this.printNode();

    // Register contact alarm capability
    this.registerCapability('alarm_contact', CLUSTER.IAS_ZONE, {
      get: 'zoneStatus',
      getOpts: {
        getOnStart: true,
        pollInterval: 60000, // Poll every minute
      },
      reportParser: (value) => {
        // IAS Zone status: bit 0 = alarm, bit 1 = tamper, bit 2 = battery
        const isOpen = (value & 0x01) === 0x01;
        this.log('Door status:', isOpen ? 'OPEN' : 'CLOSED');
        return isOpen;
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

    // Set up tamper detection
    this.on('capability:alarm_contact:changed', (value) => {
      if (value) {
        this.log('🚨 DOOR OPENED!');
        // You can add additional logic here (e.g., notifications, alarms)
      } else {
        this.log('✅ Door closed');
      }
    });
  }

  onDeleted() {
    this.log('TS0203 Door Sensor removed');
  }
}

module.exports = TS0203DoorSensor;
