#!/usr/bin/env node
'use strict';

'use strict';

const Homey = require('homey');

class TuyaWaterLeakDriver extends Homey.Driver {

  async onInit() {
    this.log('Tuya Water Leak Sensor driver has been initialized');
    
    // Register flow cards
    this.registerFlowCards();
  }

  registerFlowCards() {
    // Water leak detected trigger
    this.homey.flow.getDeviceTriggerCard('water_leak_detected')
      .registerRunListener(async (args, state) => {
        // args.condition: 'leak' or 'no_leak'
        // state.waterLeak: current leak state (true/false)
        return (args.condition === 'leak') === state.waterLeak;
      });

    // Tamper alarm triggered
    this.homey.flow.getDeviceTriggerCard('tamper_alarm')
      .registerRunListener(async (args, state) => {
        // state.tamper: boolean indicating tamper state
        return state.tamper === true;
      });

    // Battery low condition
    this.homey.flow.getConditionCard('battery_low')
      .registerRunListener(async (args, state) => {
        return args.device.getCapabilityValue('alarm_battery') === true;
      });
  }

  /**
   * Handle device pairing
   */
  async onPairListDevices() {
    // This will be called when pairing the device
    // For now, return an empty array as we'll handle discovery in the frontend
    return [];
  }

  async onPair(session) {
    let devices = [];

    session.setHandler('list_devices', async (data) => {
      // This will be called when the user clicks 'Add Device' in the Homey app
      // Here you would typically scan for devices using your discovery method
      // For now, we'll return a mock device
      return [
        {
          name: 'Tuya Water Leak Sensor',
          data: {
            id: 'tuya-water-leak-1',
            deviceId: 'tuya-water-leak-1',
          },
          settings: {
            // Default settings
            report_interval: 3600, // 1 hour
            battery_threshold: 20, // 20%
            tamper_timeout: 300, // 5 minutes
          },
          store: {
            // Store any device-specific data here
          },
        },
      ];
    });
  }
}

module.exports = TuyaWaterLeakDriver;
