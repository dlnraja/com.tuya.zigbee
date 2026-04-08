'use strict';
const Homey = require('homey');

class WaterValveGardenDriver extends Homey.Driver {
  async onInit() {
    this.log('WaterValveGardenDriver v5.9.21 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    try {
      (() => { try { return this.homey.flow.getDeviceConditionCard('water_valve_garden_is_open'); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
    } catch (e) { this.log('[FLOW] ' + e.message); }

    try {
      (() => { try { return this.homey.flow.getDeviceActionCard('water_valve_garden_open'); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device._setGangOnOff(1, true).catch(() => {});
          await args.device.setCapabilityValue('onoff', true).catch(() => {});
          return true;
        });
    } catch (e) { this.log('[FLOW] ' + e.message); }

    try {
      (() => { try { return this.homey.flow.getDeviceActionCard('water_valve_garden_close'); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device._setGangOnOff(1, false).catch(() => {});
          await args.device.setCapabilityValue('onoff', false).catch(() => {});
          return true;
        });
    } catch (e) { this.log('[FLOW] ' + e.message); }

    try {
      (() => { try { return this.homey.flow.getDeviceActionCard('water_valve_garden_toggle'); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const cur = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !cur);
          return true;
        });
    } catch (e) { this.log('[FLOW] ' + e.message); }

    this.log('[FLOW] Garden valve flow cards registered');
  }
}
module.exports = WaterValveGardenDriver;
