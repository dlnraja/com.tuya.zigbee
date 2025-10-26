'use strict';

const { Driver } = require('homey');

/**
 * Driver for Wall Touch Button 3 Gang Hybrid
 * Handles pairing and flow cards
 */
class WallTouch3GangHybridDriver extends Driver {

  async onInit() {
    this.log('WallTouch3GangHybridDriver has been initialized');
    
    // Register flow cards
    await this.registerFlowCards();
  }

  /**
   * Register all flow cards
   */
  async registerFlowCards() {
    this.log('📇 Registering flow cards...');
    
    // TRIGGERS
    
    // Button pressed (generic)
    this.buttonPressedTrigger = this.homey.flow.getDeviceTriggerCard('wall_touch_3gang_button_pressed');
    this.buttonPressedTrigger.registerRunListener(async (args, state) => {
      return args.button === state.button;
    });
    
    // Button 1 pressed
    this.button1PressedTrigger = this.homey.flow.getDeviceTriggerCard('wall_touch_3gang_button1_pressed');
    
    // Button 2 pressed  
    this.button2PressedTrigger = this.homey.flow.getDeviceTriggerCard('wall_touch_3gang_button2_pressed');
    
    // Button 3 pressed
    this.button3PressedTrigger = this.homey.flow.getDeviceTriggerCard('wall_touch_3gang_button3_pressed');
    
    // Button combination
    this.buttonCombinationTrigger = this.homey.flow.getDeviceTriggerCard('wall_touch_3gang_button_combination');
    
    // Power source changed
    this.powerSourceChangedTrigger = this.homey.flow.getDeviceTriggerCard('wall_touch_3gang_power_source_changed');
    
    // Tamper alarm
    this.tamperAlarmTrigger = this.homey.flow.getDeviceTriggerCard('wall_touch_3gang_tamper_alarm');
    
    // CONDITIONS
    
    // Is on battery
    this.homey.flow.getConditionCard('wall_touch_3gang_is_on_battery')
      .registerRunListener(async (args) => {
        return args.device.powerType === 'BATTERY';
      });
    
    // Is on mains
    this.homey.flow.getConditionCard('wall_touch_3gang_is_on_mains')
      .registerRunListener(async (args) => {
        return args.device.powerType === 'AC' || args.device.powerType === 'DC';
      });
    
    // Battery level below
    this.homey.flow.getConditionCard('wall_touch_3gang_battery_below')
      .registerRunListener(async (args) => {
        if (!args.device.hasCapability('measure_battery')) return false;
        
        const battery = args.device.getCapabilityValue('measure_battery') || 0;
        return battery < args.level;
      });
    
    // ACTIONS
    
    // Toggle button
    this.homey.flow.getActionCard('wall_touch_3gang_toggle_button')
      .registerRunListener(async (args) => {
        const capabilityId = `onoff.button${args.button}`;
        
        if (!args.device.hasCapability(capabilityId)) {
          throw new Error(`Button ${args.button} not available`);
        }
        
        const currentState = args.device.getCapabilityValue(capabilityId);
        await args.device.setCapabilityValue(capabilityId, !currentState);
      });
    
    // Set button state
    this.homey.flow.getActionCard('wall_touch_3gang_set_button')
      .registerRunListener(async (args) => {
        const capabilityId = `onoff.button${args.button}`;
        
        if (!args.device.hasCapability(capabilityId)) {
          throw new Error(`Button ${args.button} not available`);
        }
        
        await args.device.setCapabilityValue(capabilityId, args.state === 'on');
      });
    
    // Refresh device
    this.homey.flow.getActionCard('wall_touch_3gang_refresh')
      .registerRunListener(async (args) => {
        await args.device.detectPowerSource();
        await args.device.configurePowerCapabilities();
        await args.device.configureReporting();
      });
    
    this.log('[OK] Flow cards registered');
  }

  /**
   * Trigger flow cards from device
   */
  async triggerButtonPressed(device, tokens) {
    return this.buttonPressedTrigger.trigger(device, tokens);
  }

  async triggerButtonCombination(device, tokens) {
    return this.buttonCombinationTrigger.trigger(device, tokens);
  }

  async triggerPowerSourceChanged(device, tokens) {
    return this.powerSourceChangedTrigger.trigger(device, tokens);
  }

  async triggerTamperAlarm(device) {
    return this.tamperAlarmTrigger.trigger(device);
  }

  /**
   * Pairing handler
   */
  async onPair(session) {
    this.log('🔗 Pairing started');
    
    let pairingDevice = {};
    
    session.setHandler('list_devices', async () => {
      this.log('📋 list_devices called');
      
      // Return discovered devices
      // In real implementation, this would scan for Zigbee devices
      
      return [{
        name: 'Wall Touch 3 Gang',
        data: {
          id: 'wall_touch_3gang_' + Math.random().toString(36).substr(2, 9)
        },
        capabilities: [
          'onoff.button1',
          'onoff.button2',
          'onoff.button3',
          'measure_temperature',
          'measure_battery',
          'alarm_battery',
          'alarm_tamper'
        ]
      }];
    });
    
    session.setHandler('add_device', async (device) => {
      this.log('➕ add_device called:', device.name);
      
      return device;
    });
  }

  /**
   * Repair handler
   */
  async onRepair(session, device) {
    this.log('[FIX] Repair started for:', device.getName());
    
    session.setHandler('refresh', async () => {
      await device.detectPowerSource();
      await device.configurePowerCapabilities();
      await device.configureReporting();
      
      return {
        powerType: device.powerType,
        batteryType: device.batteryType
      };
    });
  }

}

module.exports = WallTouch3GangHybridDriver;
