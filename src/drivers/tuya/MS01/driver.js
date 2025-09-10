#!/usr/bin/env node
'use strict';

'use strict';

const Homey = require('homey');

class TuyaMultiSensorDriver extends Homey.Driver {

  async onInit() {
    this.log('Tuya Multi-Sensor driver has been initialized');
    
    // Register flow cards
    this.registerFlowCards();
  }

  registerFlowCards() {
    // Motion detected/cleared triggers
    this.homey.flow.getDeviceTriggerCard('motion_detected')
      .registerRunListener(async (args, state) => {
        return args.condition === 'motion' ? state.motion : !state.motion;
      });

    // Temperature threshold trigger
    this.homey.flow.getDeviceTriggerCard('temperature_changed')
      .registerRunListener(async (args, state) => {
        const currentTemp = await args.device.getCapabilityValue('measure_temperature');
        const previousTemp = state.previousTemperature || currentTemp;
        
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
        
        if (args.condition === 'above') {
          return previousHumidity <= args.threshold && currentHumidity > args.threshold;
        } else {
          return previousHumidity >= args.threshold && currentHumidity < args.threshold;
        }
      });

    // Contact state changed trigger
    this.homey.flow.getDeviceTriggerCard('contact_changed')
      .registerRunListener(async (args, state) => {
        return args.condition === state.contactState;
      });

    // Water leak detected/cleared trigger
    this.homey.flow.getDeviceTriggerCard('water_leak_detected')
      .registerRunListener(async (args, state) => {
        return (args.condition === 'leak') === state.waterLeak;
      });

    // Tamper alarm triggered
    this.homey.flow.getDeviceTriggerCard('tamper_alarm')
      .registerRunListener(async (args, state) => {
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
          name: 'Tuya Multi-Sensor',
          data: {
            id: 'tuya-multi-sensor-1',
            deviceId: 'tuya-multi-sensor-1',
          },
          settings: {
            // Motion settings
            motion_timeout: 60, // seconds
            motion_sensitivity: 'medium',
            
            // Temperature settings
            temperature_offset: 0,
            temperature_unit: 'celsius',
            
            // Humidity settings
            humidity_offset: 0,
            
            // General settings
            report_interval: 300, // 5 minutes
            led_enabled: true,
            
            // Battery settings
            battery_threshold: 20, // %
          },
          store: {
            // Store any device-specific data here
          },
          capabilities: [
            'alarm_motion',
            'measure_temperature',
            'measure_humidity',
            'alarm_contact',
            'alarm_water',
            'alarm_tamper',
            'measure_battery',
            'alarm_battery'
          ],
          capabilitiesOptions: {
            'alarm_motion': { title: { en: 'Motion' } },
            'measure_temperature': { title: { en: 'Temperature' } },
            'measure_humidity': { title: { en: 'Humidity' } },
            'alarm_contact': { title: { en: 'Contact' } },
            'alarm_water': { title: { en: 'Water Leak' } },
            'alarm_tamper': { title: { en: 'Tamper' } },
            'measure_battery': { title: { en: 'Battery' } },
            'alarm_battery': { title: { en: 'Battery Low' } }
          }
        },
      ];
    });
  }
}

module.exports = TuyaMultiSensorDriver;
