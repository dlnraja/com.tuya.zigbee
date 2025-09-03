'use strict';

const Homey = require('homey');
const { Log } = require('homey-log');
const TuyaUtils = require('../../lib/utils/tuya');
const TuyaDevice = require('./device');

class TuyaPlugDriver extends Homey.Driver {
  /**
   * Initialize the driver
   * @async
   */
  async onInit() {
    this.logger = new Log({ homey: this.homey, logLevel: process.env.DEBUG ? 'debug' : 'info' });
    this.logger.info('Tuya Plug driver initialized');
    
    // Register flow cards
    this.registerFlowCards();
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Listen for device added events
    this.homey.on('device.added', this.onDeviceAdded.bind(this));
    
    // Listen for device deleted events
    this.homey.on('device.deleted', this.onDeviceDeleted.bind(this));
    
    // Listen for device changes
    this.homey.on('device.changed', this.onDeviceChanged.bind(this));
  }
  
  /**
   * Handle device added event
   * @param {Homey.Device} device - The added device
   */
  onDeviceAdded(device) {
    if (device.driver.id === this.id) {
      this.logger.info(`Device added: ${device.name} (${device.id})`);
      // Initialize device specific logic here
    }
  }
  
  /**
   * Handle device deleted event
   * @param {Homey.Device} device - The deleted device
   */
  onDeviceDeleted(device) {
    if (device.driver.id === this.id) {
      this.logger.info(`Device removed: ${device.name} (${device.id})`);
      // Clean up device specific resources
    }
  }

  /**
   * Handle device changed event
   * @param {Homey.Device} device - The changed device
   */
  onDeviceChanged(device) {
    if (device.driver.id === this.id) {
      this.logger.debug(`Device changed: ${device.name} (${device.id})`);
    }
  }
  
  /**
   * Register flow cards
   */
  registerFlowCards() {
    // Action: Turn on plug
    this.homey.flow.getActionCard('turn_on_plug')
      .registerRunListener(async (args) => {
        if (args.device.getCapabilityValue('onoff') !== true) {
          await args.device.setCapabilityValue('onoff', true);
          return true;
        }
        return false;
      });

    // Action: Turn off plug
    this.homey.flow.getActionCard('turn_off_plug')
      .registerRunListener(async (args) => {
        if (args.device.getCapabilityValue('onoff') !== false) {
          await args.device.setCapabilityValue('onoff', false);
          return true;
        }
        return false;
      });
    
    // Action: Toggle plug
    this.homey.flow.getActionCard('toggle_plug')
      .registerRunListener(async (args) => {
        const currentState = args.device.getCapabilityValue('onoff');
        await args.device.setCapabilityValue('onoff', !currentState);
        return true;
      });
    
    // Condition: Plug is on
    this.homey.flow.getConditionCard('plug_is_on')
      .registerRunListener(async (args) => {
        return args.device.getCapabilityValue('onoff') === true;
      });
      
    // Condition: Plug is off
    this.homey.flow.getConditionCard('plug_is_off')
      .registerRunListener(async (args) => {
        return args.device.getCapabilityValue('onoff') === false;
      });
      
    // Trigger: Plug turned on
    this.homey.flow.getDeviceTriggerCard('plug_turned_on')
      .register();
      
    // Trigger: Plug turned off
    this.homey.flow.getDeviceTriggerCard('plug_turned_off')
      .register();
  }
  
  /**
   * This method will be called when a pair session starts
   * @param {Homey.Socket} socket - The socket to communicate with the frontend
   */
  async onPair(session) {
    this.logger.debug('Pairing session started');
    
    // Show the start view
    await session.setHandler('showView', async (viewId) => {
      if (viewId === 'start') {
        this.logger.debug('Showing start view');
      }
      // Return list of discovered devices
      return devices;
    });
  }

  /**
   * Clean up on driver unload
   */
  async onUninit() {
    this.logger.info('Tuya Plug driver uninitialized');
  }
}

module.exports = TuyaPlugDriver;
