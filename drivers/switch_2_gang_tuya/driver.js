'use strict';

const { Driver } = require('homey');

class TS0002Driver extends Driver {
  
  /**
   * Driver initialized
   */
  async onInit() {
    this.log('TS0002 2-Gang Switch/Outlet Driver initialized');
    
    // Register flow cards
    await this.registerFlowCards();
  }
  
  /**
   * Register flow cards
   */
  async registerFlowCards() {
    try {
      // Trigger: Gang turned on/off
      this.homey.flow.getDeviceTriggerCard('gang_turned_on_off')
        .registerRunListener(async (args, state) => {
          return args.gang === state.gang;
        });
      
      // Trigger: Gang 1 turned on
      this.homey.flow.getDeviceTriggerCard('gang_1_turned_on');
      
      // Trigger: Gang 1 turned off
      this.homey.flow.getDeviceTriggerCard('gang_1_turned_off');
      
      // Trigger: Gang 2 turned on
      this.homey.flow.getDeviceTriggerCard('gang_2_turned_on');
      
      // Trigger: Gang 2 turned off
      this.homey.flow.getDeviceTriggerCard('gang_2_turned_off');
      
      // Condition: Gang is on
      this.homey.flow.getConditionCard('gang_is_on')
        .registerRunListener(async (args) => {
          const capability = args.gang === 1 ? 'onoff' : 'onoff.gang2';
          return args.device.getCapabilityValue(capability) === true;
        });
      
      // Action: Turn gang on
      this.homey.flow.getActionCard('turn_gang_on')
        .registerRunListener(async (args) => {
          const capability = args.gang === 1 ? 'onoff' : 'onoff.gang2';
          await args.device.setCapabilityValue(capability, true);
          return true;
        });
      
      // Action: Turn gang off
      this.homey.flow.getActionCard('turn_gang_off')
        .registerRunListener(async (args) => {
          const capability = args.gang === 1 ? 'onoff' : 'onoff.gang2';
          await args.device.setCapabilityValue(capability, false);
          return true;
        });
      
      // Action: Toggle gang
      this.homey.flow.getActionCard('toggle_gang')
        .registerRunListener(async (args) => {
          const capability = args.gang === 1 ? 'onoff' : 'onoff.gang2';
          const currentValue = args.device.getCapabilityValue(capability);
          await args.device.setCapabilityValue(capability, !currentValue);
          return true;
        });
      
      this.log('✅ Flow cards registered');
      
    } catch (err) {
      this.error('Failed to register flow cards:', err);
    }
  }
  
  /**
   * Pairing
   */
  async onPair(session) {
    this.log('TS0002 pairing session started');
    
    // Custom pairing view handler
    session.setHandler('showView', async (viewId) => {
      this.log('Showing view:', viewId);
    });
    
    // List devices handler
    session.setHandler('list_devices', async () => {
      this.log('Listing devices...');
      
      // Return empty - devices will be discovered via Zigbee
      return [];
    });
  }
  
}

module.exports = TS0002Driver;
