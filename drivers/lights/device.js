'use strict';

const { ZigbeeDevice } = require("homey-zigbeedriver");
const { CLUSTER } = require("zigbee-clusters");

/**
 * Template for a Tuya Zigbee device
 */
class TemplateDevice extends ZigbeeDevice {
  
  /**
   * onInit is called when the device is initialized.
   */
  async onNodeInit() {
    this.log('TemplateDevice has been initialized');
    
    // Register capabilities
    // Example: this.registerCapability('onoff', 'onOff');
    
    // Enable debugging
    this.enableDebug();
    
    // Print the node info for debugging
    this.printNode();
    
    // Call parent onNodeInit
    await super.onNodeInit();
  }
  
  /**
   * onAdded is called when the user adds the device.
   */
  async onAdded() {
    this.log('TemplateDevice has been added');
  }
  
  /**
   * onSettings is called when the user changes the device settings.
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('TemplateDevice settings were changed');
    // Handle settings changes here
  }
  
  /**
   * onRenamed is called when the user changes the device name.
   */
  async onRenamed(name) {
    this.log('TemplateDevice was renamed to', name);
  }
  
  /**
   * onDeleted is called when the user deletes the device.
   */
  async onDeleted() {
    this.log('TemplateDevice has been deleted');
    await super.onDeleted();
  }
}

module.exports = TemplateDevice;
