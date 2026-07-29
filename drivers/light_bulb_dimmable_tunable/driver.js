'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmartBulbDimmerDriver extends ZigBeeDriver {
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
    }
  }

  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;
    this.log('SmartBulbDimmerDriver v5.5.571 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    const _triggerIds = ["light_bulb_dimmable_tunable_bulb_dimmable_smart_bulb_dimmer_turned_on","light_bulb_dimmable_tunable_bulb_dimmable_smart_bulb_dimmer_turned_off","light_bulb_dimmable_tunable_bulb_dimmable_smart_bulb_dimmer_dim_changed","light_bulb_dimmable_tunable_bulb_dimmable_tu_f68af","light_bulb_dimmable_tunable_bulb_dimmable_tu_aac6d","light_bulb_dimmable_tunable_bulb_dimmable_ba_bf947"];
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
      const card = this.homey.flow.getConditionCard('light_bulb_dimmable_tunable_bulb_dimmable_di_f31fc');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition light_bulb_dimmable_tunable_bulb_dimmable_smart_bulb_dimmer_is_on: ${err.message}`); } }

    try {
      const card = this.homey.flow.getConditionCard('light_bulb_dimmable_tunable_bulb_dimmable_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition light_bulb_dimmable_tunable_bulb_dimmable_is_on: ${err.message}`); } }

    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('light_bulb_dimmable_tunable_bulb_dimmable_di_a4e5f');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action light_bulb_dimmable_tunable_bulb_dimmable_smart_bulb_dimmer_turn_on: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('light_bulb_dimmable_tunable_bulb_dimmable_di_28ee6');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action light_bulb_dimmable_tunable_bulb_dimmable_smart_bulb_dimmer_turn_off: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('light_bulb_dimmable_tunable_bulb_dimmable_di_4dbe8');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const current = args.device.getCapabilityValue('onoff');
          await args.device['setCapabilityValue']('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action light_bulb_dimmable_tunable_bulb_dimmable_smart_bulb_dimmer_toggle: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('light_bulb_dimmable_tunable_bulb_dimmable_di_bf48d');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('dim', args.brightness || args.value || 1).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action light_bulb_dimmable_tunable_bulb_dimmable_smart_bulb_dimmer_set_dim: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('light_bulb_dimmable_tunable_bulb_dimmable_turn_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action light_bulb_dimmable_tunable_bulb_dimmable_turn_on: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('light_bulb_dimmable_tunable_bulb_dimmable_turn_off');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action light_bulb_dimmable_tunable_bulb_dimmable_turn_off: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('light_bulb_dimmable_tunable_bulb_dimmable_toggle');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const current = args.device.getCapabilityValue('onoff');
          await args.device['setCapabilityValue']('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action light_bulb_dimmable_tunable_bulb_dimmable_toggle: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('light_bulb_dimmable_tunable_bulb_dimmable_se_92a1c');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('dim', args.brightness || args.value || 1).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action light_bulb_dimmable_tunable_bulb_dimmable_se_92a1c: ${err.message}`); } }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = SmartBulbDimmerDriver;

