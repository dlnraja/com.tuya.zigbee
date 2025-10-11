'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class GasSensorDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.log('Gas Sensor TS0601 initialized');

    // Enable debug logging
    this.enableDebug();
    this.printNode();

    // Gas alarm (CO)
    if (this.hasCapability('alarm_co')) {
      zclNode.endpoints[1].clusters.basic.on('reporting', (value) => {
        this.log('Gas detection report:', value);
        if (value && value.hasOwnProperty('gas_value')) {
          const gasDetected = value.gas_value > 0;
          this.setCapabilityValue('alarm_co', gasDetected).catch(this.error);
        }
      });
    }

    // Smoke alarm
    if (this.hasCapability('alarm_smoke')) {
      zclNode.endpoints[1].clusters.basic.on('reporting', (value) => {
        this.log('Smoke detection report:', value);
        if (value && value.hasOwnProperty('smoke_value')) {
          const smokeDetected = value.smoke_value > 0;
          this.setCapabilityValue('alarm_smoke', smokeDetected).catch(this.error);
        }
      });
    }

    // Battery
    if (this.hasCapability('measure_battery')) {
      this.registerCapability('measure_battery', 1, {
        reportParser: value => {
          this.log('Battery report:', value);
          return Math.min(100, Math.max(0, value / 2));
        },
        getOpts: {
          getOnStart: true,
          pollInterval: 3600000 // Every hour
        }
      });
    }
  }

  onDeleted() {
    this.log('Gas Sensor TS0601 deleted');
  }
}

module.exports = GasSensorDevice;
