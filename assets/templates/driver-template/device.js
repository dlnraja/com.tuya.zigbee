#!/usr/bin/env node
'use strict';

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { Cluster, CLUSTER } = require('zigbee-clusters');

class TuyaDeviceTemplate extends ZigBeeDevice {

  /**
   * onInit is called when the device is initialized.
   */
  async onNodeInit({ zclNode }) {
    this.log('Tuya device initialized');

    // Register capabilities
    this.registerCapability('onoff', CLUSTER.ON_OFF);
    
    // Example: Register temperature measurement if device supports it
    if (this.hasCapability('measure_temperature')) {
      this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT, {
        get: 'measuredValue',
        getOpts: {
          getOnStart: true,
          pollInterval: 30000, // 30 seconds
        },
        report: 'measuredValue',
        reportParser: value => {
          // Convert from centiCelsius to Celsius
          return Math.round((value / 100) * 10) / 10;
        },
      });
    }

    // Handle incoming commands
    this.registerReportListener(
      CLUSTER.ON_OFF,
      'onWithTimedOff',
      this.onCommandOnWithTimedOff.bind(this)
    );
  }

  /**
   * onAdded is called when the user adds the device.
   */
  async onAdded() {
    this.log('Tuya device added');
  }

  /**
   * onSettings is called when the user updates the device's settings.
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Tuya device settings changed', changedKeys);
  }

  /**
   * onDeleted is called when the user deletes the device.
   */
  async onDeleted() {
    this.log('Tuya device removed');
  }

  /**
   * Handle on/off commands with timed off
   */
  onCommandOnWithTimedOff({ onOffControl, onTime, offWaitTime }) {
    this.log('onWithTimedOff:', {
      onOffControl,
      onTime,
      offWaitTime,
    });
    
    // Implement your logic here
  }
}

module.exports = TuyaDeviceTemplate;
