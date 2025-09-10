'use strict';

const Homey = require('homey');

/**
 * Tuya TS0501B Driver
 * 
 * @class TuyaTs0501bDriver
 * @extends {Homey.Driver}
 */
class TuyaTs0501bDriver extends Homey.Driver {
  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('TuyaTs0501bDriver has been initialized');
    
    // Register flow cards
    this._registerFlowCards();
    
    // Register event listeners
    this.homey.on('unload', () => this.onUninit());
  }
  
  /**
   * onUninit is called when the driver is unloaded.
   */
  onUninit() {
    this.log('TuyaTs0501bDriver is unloading...');
  }
  
  /**
   * Register flow cards
   */
  _registerFlowCards() {
    // Action cards
    this.flowActionTurnOn = this.homey.flow.getActionCard('tuya_ts0501b_turn_on');
    this.flowActionTurnOn.registerRun(this._actionTurnOn.bind(this));
    
    this.flowActionTurnOff = this.homey.flow.getActionCard('tuya_ts0501b_turn_off');
    this.flowActionTurnOff.registerRun(this._actionTurnOff.bind(this));
    
    this.flowActionToggle = this.homey.flow.getActionCard('tuya_ts0501b_toggle');
    this.flowActionToggle.registerRun(this._actionToggle.bind(this));
    
    // Condition cards
    this.flowConditionIsOn = this.homey.flow.getConditionCard('tuya_ts0501b_is_on');
    this.flowConditionIsOn.registerRun(this._conditionIsOn.bind(this));
    
    // Add more flow cards as needed
  }
  
  /**
   * onPairListDevices is called when a user is adding a device.
   */
  async onPairListDevices() {
    return [
      {
        name: 'Tuya TS0501B',
        data: {
          id: '4afdc465-568e-4f9e-9efc-c0fc5fa5fc39'
        },
        store: {
          // Add store data here
        },
        settings: {
          // Add default settings here
          powerOnState: 'last',
          reportingInterval: 300
        },
        capabilities: ["onoff","dim","light_hue","light_saturation"],
        capabilitiesOptions: {
          // Add capability options here
        }
      }
    ];
  }
  
  /**
   * Action: Turn device on
   */
  async _actionTurnOn(args) {
    try {
      await args.device.setCapabilityValue('onoff', true);
      return true;
    } catch (error) {
      this.error('Error in _actionTurnOn:', error);
      throw error;
    }
  }
  
  /**
   * Action: Turn device off
   */
  async _actionTurnOff(args) {
    try {
      await args.device.setCapabilityValue('onoff', false);
      return true;
    } catch (error) {
      this.error('Error in _actionTurnOff:', error);
      throw error;
    }
  }
  
  /**
   * Action: Toggle device
   */
  async _actionToggle(args) {
    try {
      const currentState = args.device.getCapabilityValue('onoff');
      await args.device.setCapabilityValue('onoff', !currentState);
      return true;
    } catch (error) {
      this.error('Error in _actionToggle:', error);
      throw error;
    }
  }
  
  /**
   * Condition: Check if device is on
   */
  async _conditionIsOn(args) {
    try {
      return args.device.getCapabilityValue('onoff') === true;
    } catch (error) {
      this.error('Error in _conditionIsOn:', error);
      throw error;
    }
  }
}

module.exports = TuyaTs0501bDriver;