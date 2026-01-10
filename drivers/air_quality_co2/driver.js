'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');
class Driver extends ZigBeeDriver { onInit() { this.log('air_quality_co2 driver init'); } }
module.exports = Driver;

    
    // Register flow triggers
    this._co2_level_changedTrigger = this.homey.flow.getDeviceTriggerCard('co2_level_changed');
    this._co2_level_aboveTrigger = this.homey.flow.getDeviceTriggerCard('co2_level_above');
    this._co2_level_belowTrigger = this.homey.flow.getDeviceTriggerCard('co2_level_below');
    this._co2_alert_triggeredTrigger = this.homey.flow.getDeviceTriggerCard('co2_alert_triggered');
    
    // Register flow conditions
    this._co2_level_isCondition = this.homey.flow.getDeviceConditionCard('co2_level_is');
    this._co2_level_isCondition.registerRunListener(async (args) => {
      const { device, threshold } = args;
      const value = device.getCapabilityValue('measure_co2') || 0;
      return value >= threshold;
    });
    
    this.log('air_quality_co2: Flow cards registered');