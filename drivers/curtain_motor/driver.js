'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaZigbeeDriver extends ZigBeeDriver {

  async onInit() {
    this.log('Tuya Zigbee Driver has been initialized');

    // Register flow triggers
    this._cover_position_changedTrigger = this.homey.flow.getDeviceTriggerCard('cover_position_changed');
    this._cover_openedTrigger = this.homey.flow.getDeviceTriggerCard('cover_opened');
    this._cover_closedTrigger = this.homey.flow.getDeviceTriggerCard('cover_closed');
    this._cover_stoppedTrigger = this.homey.flow.getDeviceTriggerCard('cover_stopped');
    this._button_pressedTrigger = this.homey.flow.getDeviceTriggerCard('button_pressed');

    // Register flow conditions
    this._cover_position_isCondition = this.homey.flow.getDeviceConditionCard('cover_position_is');
    this._cover_position_isCondition?.registerRunListener(async (args) => {
      const { device, threshold } = args;
      const value = device.getCapabilityValue('windowcoverings_set') || 0;
      return value >= threshold;
    });
    this._cover_is_openCondition = this.homey.flow.getDeviceConditionCard('cover_is_open');
    this._cover_is_openCondition?.registerRunListener(async (args) => {
      const { device } = args;
      return device.getCapabilityValue('windowcoverings_state') === 'open';
    });

    // Register flow actions
    this._cover_set_positionAction = this.homey.flow.getDeviceActionCard('cover_set_position');
    this._cover_set_positionAction?.registerRunListener(async (args) => {
      const { device, position } = args;
      await device.setCapabilityValue('windowcoverings_set', position / 100);
      return true;
    });
    this._cover_stopAction = this.homey.flow.getDeviceActionCard('cover_stop');
    this._cover_stopAction?.registerRunListener(async (args) => {
      const { device } = args;
      await device.setCapabilityValue('windowcoverings_state', 'idle');
      return true;
    });

    this.log('curtain_motor: Flow cards registered');
  }
}

module.exports = TuyaZigbeeDriver;
