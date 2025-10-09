'use strict';
const { ZigBeeDevice } = require('homey-zigbeedriver');

class TuyaDevice extends ZigBeeDevice {
  async onNodeInit() {
    this.enableDebug();
    this.printNode();
    
    // Register capabilities
    // Register capabilities with numeric Zigbee clusters
    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', 6);
    }
    if (this.hasCapability('dim')) {
      this.registerCapability('dim', 8);
    }
    if (this.hasCapability('light_hue')) {
      this.registerCapability('light_hue', 768);
    }
    if (this.hasCapability('light_saturation')) {
      this.registerCapability('light_saturation', 768);
    }
    if (this.hasCapability('light_temperature')) {
      this.registerCapability('light_temperature', 768);
    }
    if (this.hasCapability('measure_temperature')) {
      this.registerCapability('measure_temperature', 1026);
    }
    if (this.hasCapability('measure_humidity')) {
      this.registerCapability('measure_humidity', 1029);
    }
    if (this.hasCapability('alarm_motion')) {
      this.registerCapability('alarm_motion', 1280);
    }
    if (this.hasCapability('alarm_contact')) {
      this.registerCapability('alarm_contact', 1280);
    }
    if (this.hasCapability('alarm_co')) {
      this.registerCapability('alarm_co', 1280);
    }
    if (this.hasCapability('measure_battery')) {
      this.registerCapability('measure_battery', 1);
    }
    if (this.hasCapability('alarm_battery')) {
      this.registerCapability('alarm_battery', 1);
    }
    // Energy monitoring capabilities
    if (this.hasCapability('measure_power')) {
      this.registerCapability('measure_power', 2820); // Electrical Measurement cluster
    }
    if (this.hasCapability('meter_power')) {
      this.registerCapability('meter_power', 1794); // Metering cluster
    }
    if (this.hasCapability('measure_voltage')) {
      this.registerCapability('measure_voltage', 2820); // Electrical Measurement cluster
    }
    if (this.hasCapability('measure_current')) {
      this.registerCapability('measure_current', 2820); // Electrical Measurement cluster
    }
  }
}
module.exports = TuyaDevice;