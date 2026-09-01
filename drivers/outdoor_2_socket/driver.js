'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerOnoffFlowCards } = require('../../lib/flow/ActuatorFlowHelper');

const RootDevice = require('./device.js');
const SecondSocketDevice = require('./device.secondSocket.js');

class outdoor2socket_driver extends ZigBeeDriver {
  async onInit() {
    /* P131-AUTO-FLOW-LISTENERS */

    try {
      const __card = this.homey.flow.getConditionCard('outdoor_2_socket_is_on');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (e) { this.error('[FLOW] outdoor_2_socket_is_on:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('outdoor_2_socket_turn_on');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('onoff', true).catch(() => {});
          } else {
            await args.device.setCapabilityValue('onoff', true).catch(() => {});
          }
          return true;
        });
      }
    } catch (e) { this.error('[FLOW] outdoor_2_socket_turn_on:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('outdoor_2_socket_turn_off');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('onoff', false).catch(() => {});
          } else {
            await args.device.setCapabilityValue('onoff', false).catch(() => {});
          }
          return true;
        });
      }
    } catch (e) { this.error('[FLOW] outdoor_2_socket_turn_off:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('outdoor_2_socket_toggle');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const v = !args.device.getCapabilityValue('onoff');
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('onoff', v).catch(() => {});
          } else {
            await args.device.setCapabilityValue('onoff', v).catch(() => {});
          }
          return true;
        });
      }
    } catch (e) { this.error('[FLOW] outdoor_2_socket_toggle:', e.message); }
    /* P131-AUTO-FLOW-LISTENERS-END */

    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;
    registerOnoffFlowCards(this, 'outdoor_2_socket');
  }

  onMapDeviceClass(device) {
    if (device.getData().subDeviceId === 'secondSocket') {
      return SecondSocketDevice;
    }
    return RootDevice;
  }
}

module.exports = outdoor2socket_driver;
