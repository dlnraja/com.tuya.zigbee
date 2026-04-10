'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');

class AirPurifierDriver extends ZigBeeDriver {
  /**
   * v7.0.12: Defensive getDeviceById override to prevent crashes during deserialization.
   * If a device cannot be found (e.g. removed while flow is triggering), return null instead of throwing.
   */
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
    }
  }

  async onInit() {
    this.log('Air Purifier Driver initialized');
    const triggers = ['air_purifier_turned_on', 'air_purifier_turned_off', 'air_purifier_pm25_changed'];
    for (const id of triggers) {
      try {
      this.homey.flow.getTriggerCard(id) } catch (e) { this.error(`Trigger ${id}: ${e.message}`); }
    }
    try {
      this.homey.flow.getActionCard('air_purifier_set_fan_speed')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('dim', args.speed / 100);
          return true;
        });
    } catch (e) { this.error('Action set_fan_speed:', e.message); }
    try {
      this.homey.flow.getActionCard('air_purifier_turn_on')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device._setGangOnOff(1, true).catch(() => {});
          await args.device.setCapabilityValue('onoff', true).catch(() => {});
          return true;
        });
    } catch (e) { this.error('Action turn_on:', e.message); }
    try {
      this.homey.flow.getActionCard('air_purifier_turn_off')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device._setGangOnOff(1, false).catch(() => {});
          await args.device.setCapabilityValue('onoff', false).catch(() => {});
          return true;
        });
    } catch (e) { this.error('Action turn_off:', e.message); }
    try {
      this.homey.flow.getActionCard('air_purifier_toggle')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', !args.device.getCapabilityValue('onoff'));
          return true;
        });
    } catch (e) { this.error('Action toggle:', e.message); }
    try {
      this.homey.flow.getActionCard('air_purifier_set_brightness')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('dim', args.brightness / 100);
          return true;
        });
    } catch (e) { this.error('Action set_brightness:', e.message); }
  }
}

module.exports = AirPurifierDriver;

