const { ZigbeeDevice } = require("homey-zigbeedriver");

/**
 * Tuya TS0201 device
 */
class TuyaTs0201Device extends ZigbeeDevice {
  
  async onZigbeeInit() {
    // Configure temperature reporting
    await this.configureReporting('temperatureMeasurement', {
      minInterval: 0,
      maxInterval: 300,
      minChange: 10, // 0.1°C
    });
  }


  async onZigbeeInit() {
    // Configure humidity reporting
    await this.configureReporting('humidityMeasurement', {
      minInterval: 0,
      maxInterval: 300,
      minChange: 20, // 0.5%
    });
  }


  // TODO: Implement measure_battery capability


  // TODO: Implement alarm_battery capability
  
  /**
   * onInit is called when the device is initialized.
   */
  async onNodeInit() {
    this.log('TuyaTs0201Device has been initialized');
    
    // Register capabilities
    this.registerCapability('measure_temperature', 'measure');
    this.registerCapability('measure_humidity', 'measure');
    this.registerCapability('measure_battery', 'measure');
    this.registerCapability('alarm_battery', 'measure');
    
    // Call parent onNodeInit
    await super.onNodeInit();
  }
  
  /**
   * onAdded is called when the user adds the device.
   */
  async onAdded() {
    this.log('TuyaTs0201Device has been added');
  }
  
  /**
   * onSettings is called when the user changes the device settings.
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('TuyaTs0201Device settings were changed');
    // Handle settings changes here
  }
  
  /**
   * onRenamed is called when the user changes the device name.
   */
  async onRenamed(name) {
    this.log('TuyaTs0201Device was renamed to', name);
  }
  
  /**
   * onDeleted is called when the user deletes the device.
   */
  async onDeleted() {
    this.log('TuyaTs0201Device has been deleted');
    await super.onDeleted();
  }
}

module.exports = TuyaTs0201Device;