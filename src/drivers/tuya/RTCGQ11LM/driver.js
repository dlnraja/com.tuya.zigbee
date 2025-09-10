#!/usr/bin/env node
'use strict';

'use strict';

const Homey = require('homey');
const { ZwaveDevice } = require('homey-zwavedriver');

class TuyaMotionSensorDriver extends Homey.Driver {

  async onInit() {
    this.log('Tuya Motion Sensor driver has been initialized');
    
    // Register flow cards
    this.registerFlowCards();
  }

  registerFlowCards() {
    // Motion detected trigger
    this.homey.flow.getDeviceTriggerCard('motion_detected')
      .registerRunListener(async (args, state) => {
        return args.device.getCapabilityValue('alarm_motion') === true;
      });

    // Motion cleared trigger
    this.homey.flow.getDeviceTriggerCard('motion_cleared')
      .registerRunListener(async (args, state) => {
        return args.device.getCapabilityValue('alarm_motion') === false;
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
          name: 'Tuya Motion Sensor',
          data: {
            id: 'tuya-motion-sensor-1',
            deviceId: 'tuya-motion-sensor-1',
          },
          settings: {
            // Default settings
            sensitivity: 'medium',
            led_enabled: true,
            detection_interval: 60, // seconds
          },
          store: {
            // Store any device-specific data here
          },
        },
      ];
    });
  }
}

module.exports = TuyaMotionSensorDriver;
