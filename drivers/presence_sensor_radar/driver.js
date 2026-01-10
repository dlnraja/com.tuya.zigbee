'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class PresenceSensorRadarDriver extends ZigBeeDriver {

  async onInit() {
    this.log('PresenceSensorRadarDriver initialized');

    // Register flow triggers
    this._presenceDetectedTrigger = this.homey.flow.getDeviceTriggerCard('presence_detected');
    this._presenceClearedTrigger = this.homey.flow.getDeviceTriggerCard('presence_cleared');
    this._presenceDistanceChangedTrigger = this.homey.flow.getDeviceTriggerCard('presence_distance_changed');
    this._presenceIlluminanceChangedTrigger = this.homey.flow.getDeviceTriggerCard('presence_illuminance_changed');
    this._presenceSomeoneEntersTrigger = this.homey.flow.getDeviceTriggerCard('presence_someone_enters');
    this._presenceZoneEmptyTrigger = this.homey.flow.getDeviceTriggerCard('presence_zone_empty');

    // Register flow conditions
    this._presenceIsDetectedCondition = this.homey.flow.getDeviceConditionCard('presence_is_detected');
    this._presenceIsDetectedCondition.registerRunListener(async (args) => {
      const { device } = args;
      return device.getCapabilityValue('alarm_human') === true;
    });

    this._presenceDistanceIsCondition = this.homey.flow.getDeviceConditionCard('presence_distance_is');
    this._presenceDistanceIsCondition.registerRunListener(async (args) => {
      const { device, threshold } = args;
      const distance = device.getCapabilityValue('measure_distance') || 0;
      return distance < threshold;
    });

    this.log('PresenceSensorRadarDriver: Flow cards registered');
  }
}

module.exports = PresenceSensorRadarDriver;
