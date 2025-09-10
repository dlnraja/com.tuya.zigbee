#!/usr/bin/env node
'use strict';

'use strict';

const Homey = require('homey');

class TuyaTemperatureHumidityDriver extends Homey.Driver {

  async onInit() {
    this.log('Tuya Temperature/Humidity Sensor driver has been initialized');
    
    // Register flow cards
    this.registerFlowCards();
  }

  registerFlowCards() {
    // Temperature threshold trigger
    this.homey.flow.getDeviceTriggerCard('temperature_changed')
      .registerRunListener(async (args, state) => {
        const currentTemp = await args.device.getCapabilityValue('measure_temperature');
        const previousTemp = state.previousTemperature || currentTemp;
        
        // Check if temperature crossed the threshold
        if (args.condition === 'above') {
          return previousTemp <= args.threshold && currentTemp > args.threshold;
        } else {
          return previousTemp >= args.threshold && currentTemp < args.threshold;
        }
      });

    // Humidity threshold trigger
    this.homey.flow.getDeviceTriggerCard('humidity_changed')
      .registerRunListener(async (args, state) => {
        const currentHumidity = await args.device.getCapabilityValue('measure_humidity');
        const previousHumidity = state.previousHumidity || currentHumidity;
        
        // Check if humidity crossed the threshold
        if (args.condition === 'above') {
          return previousHumidity <= args.threshold && currentHumidity > args.threshold;
        } else {
          return previousHumidity >= args.threshold && currentHumidity < args.threshold;
        }
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
          name: 'Tuya Temperature/Humidity Sensor',
          data: {
            id: 'tuya-th-sensor-1',
            deviceId: 'tuya-th-sensor-1',
          },
          settings: {
            // Default settings
            temperature_offset: 0,
            humidity_offset: 0,
            report_interval: 300, // 5 minutes
            temperature_unit: 'celsius',
          },
          store: {
            // Store any device-specific data here
          },
        },
      ];
    });
  }
}

module.exports = TuyaTemperatureHumidityDriver;
