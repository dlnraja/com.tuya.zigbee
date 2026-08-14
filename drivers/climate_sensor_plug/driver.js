'use strict';

const { safeMultiply } = require('../../lib/utils/tuyaUtils.js');
const { ZigBeeDriver } = require('homey-zigbeedriver');

class PlugSmartDriver extends ZigBeeDriver {
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
    }
  }

  async onInit() {
    /* P131-AUTO-FLOW-LISTENERS */

    try {
      const __card = this.homey.flow.getActionCard('climate_sensor_plug_smart_toggle');
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
    } catch (e) { this.error('[FLOW] climate_sensor_plug_smart_toggle:', e.message); }
    /* P131-AUTO-FLOW-LISTENERS-END */

    await super.onInit();
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;
    this.log('PlugSmartDriver v5.5.570 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    const _triggerIds = ["climate_sensor_plug_on","climate_sensor_plug_off","climate_sensor_plug_restored","climate_sensor_plug_changed","climate_sensor_plug_threshold","climate_sensor_plug_low"];
    for (const _tid of _triggerIds) {
      try {
        const _card = this._getFlowCard(_tid, "trigger");
        if (_card) {
          _card.registerRunListener(async (args) => {
            if (!args.device) {return;}
            args.device.emit(`flow:${  _tid}`, args);
          });
        }
      } catch (_err) { this.error(`Trigger ${  _tid  }: ${  _err.message}`); }
    }
    // END TRIGGERS
    // CONDITIONS
    try {
      const card = this.homey.flow.getConditionCard('climate_sensor_plug_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition climate_sensor_plug_plug_smart_is_on: ${err.message}`); } }

    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('climate_sensor_plug_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action climate_sensor_plug_plug_smart_turn_on: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('climate_sensor_plug_off');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action climate_sensor_plug_plug_smart_turn_off: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('climate_sensor_plug_on_delay');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action climate_sensor_plug_plug_smart_turn_on_delay: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('climate_sensor_plug_off_delay');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action climate_sensor_plug_plug_smart_turn_off_delay: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('climate_sensor_plug_indicator');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          // Generic action handler
          this.log('[FLOW] Action climate_sensor_plug_plug_smart_set_indicator triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action climate_sensor_plug_plug_smart_set_indicator: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('climate_sensor_plug_power_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action climate_sensor_plug_plug_smart_set_power_on: ${err.message}`); } }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = PlugSmartDriver;

