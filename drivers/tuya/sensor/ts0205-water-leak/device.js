'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { Cluster, CLUSTER } = require('zigbee-clusters');

class TS0205WaterLeakSensor extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // Enable debugging
    this.enableDebug();
    this.printNode();

    // Register water leak alarm capability
    this.registerCapability('alarm_water', CLUSTER.IAS_ZONE, {
      get: 'zoneStatus',
      getOpts: {
        getOnStart: true,
        pollInterval: 30000, // Poll every 30 seconds (critical sensor)
      },
      reportParser: (value) => {
        // IAS Zone status: bit 0 = alarm, bit 1 = tamper, bit 2 = battery
        const hasLeak = (value & 0x01) === 0x01;
        this.log('Water leak detected:', hasLeak);
        return hasLeak;
      },
    });

    // Register battery monitoring capability
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      get: 'batteryPercentageRemaining',
      getOpts: {
        getOnStart: true,
        pollInterval: 300000, // Poll every 5 minutes
      },
      reportParser: (value) => {
        const battery = value / 2; // Convert from 0.5% to %
        this.log('Battery level:', battery, '%');
        return battery;
      },
    });

    // Set up water leak detection with critical alerts
    this.on('capability:alarm_water:changed', (value) => {
      if (value) {
        this.log('🚨🚨🚨 WATER LEAK DETECTED! 🚨🚨🚨');
        // Critical alert - you can add notifications, SMS, etc.
        this.setCapabilityValue('alarm_water', true);
      } else {
        this.log('✅ Water leak cleared');
        this.setCapabilityValue('alarm_water', false);
      }
    });

    // Set up tamper detection
    this.on('capability:alarm_water:changed', (value) => {
      // Check for tamper (bit 1)
      const tamper = (value & 0x02) === 0x02;
      if (tamper) {
        this.log('⚠️ Sensor tampered with!');
      }
    });
  }

  onDeleted() {
    this.log('TS0205 Water Leak Sensor removed');
  }
}

module.exports = TS0205WaterLeakSensor;
