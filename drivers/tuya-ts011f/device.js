'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class TuyaTS011FDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('TS011F Device has been initialized');

    // Register capabilities
    this.registerCapability('onoff', CLUSTER.ON_OFF);
    
    // Register energy monitoring capabilities if supported
    if (this.hasCapability('measure_power')) {
      this.registerCapability('measure_power', CLUSTER.ELECTRICAL_MEASUREMENT, {
        get: 'activePower',
        report: 'activePower',
        reportParser: value => value / 10, // Convert to Watts
      });
    }

    if (this.hasCapability('meter_power')) {
      this.registerCapability('meter_power', CLUSTER.METERING, {
        get: 'currentSummationDelivered',
        report: 'currentSummationDelivered',
        reportParser: value => value / 1000, // Convert to kWh
      });
    }

    // Handle device specific settings
    this.registerSettings();
  }

  registerSettings() {
    // Register settings specific to this device
    this.registerSetting('powerOnState', (value) => {
      return {
        powerOnState: value ? 1 : 0,
      };
    });
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('TS011F settings were changed');
    // Handle settings changes if needed
  }

  onDeleted() {
    this.log('TS011F device removed');
  }
}

module.exports = TuyaTS011FDevice;
