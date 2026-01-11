'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.475: FIXED - Moved orphaned flow card code inside onInit()
 */
class LonsonhoContactSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LonsonhoContactSensorDriver v5.5.475 initialized');

    // Register flow triggers
    this._contact_openedTrigger = this.homey.flow.getDeviceTriggerCard('contact_opened');
    this._contact_closedTrigger = this.homey.flow.getDeviceTriggerCard('contact_closed');
    this._contact_battery_lowTrigger = this.homey.flow.getDeviceTriggerCard('contact_battery_low');

    // Register flow conditions
    this._contact_is_openCondition = this.homey.flow.getDeviceConditionCard('contact_is_open');
    this._contact_is_openCondition?.registerRunListener(async (args) => {
      const { device } = args;
      return device.getCapabilityValue('alarm_contact') === true;
    });

    this.log('contact_sensor: Flow cards registered');
  }
}

module.exports = LonsonhoContactSensorDriver;
