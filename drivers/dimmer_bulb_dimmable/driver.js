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
    const _triggerIds = ["dimmer_bulb_dimmable_bulb_dimmable_dimmer_bulb_dimmable_smart_bulb_dimmer_turned_on","dimmer_bulb_dimmable_bulb_dimmable_dimmer_bulb_dimmable_smart_bulb_dimmer_turned_off","dimmer_bulb_dimmable_bulb_dimmable_dimmer_bulb_dimmable_smart_bulb_dimmer_dim_changed","dimmer_bulb_dimmable_bulb_dimmable_dimmer_bu_e7ee7","dimmer_bulb_dimmable_bulb_dimmable_dimmer_bu_030bd","dimmer_bulb_dimmable_bulb_dimmable_dimmer_bu_cf29f"];
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
      const card = this.homey.flow.getConditionCard('dimmer_bulb_dimmable_bulb_dimmable_dimmer_bu_6c729');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition dimmer_bulb_dimmable_bulb_dimmable_dimmer_bulb_dimmable_smart_bulb_dimmer_is_on: ${err.message}`); } }

    try {
      const card = this.homey.flow.getConditionCard('dimmer_bulb_dimmable_bulb_dimmable_dimmer_bu_66c9b');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition dimmer_bulb_dimmable_bulb_dimmable_dimmer_bu_66c9b: ${err.message}`); } }

    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('dimmer_bulb_dimmable_bulb_dimmable_dimmer_bu_84d0c');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action dimmer_bulb_dimmable_bulb_dimmable_dimmer_bulb_dimmable_smart_bulb_dimmer_turn_on: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('dimmer_bulb_dimmable_bulb_dimmable_dimmer_bu_72177');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action dimmer_bulb_dimmable_bulb_dimmable_dimmer_bulb_dimmable_smart_bulb_dimmer_turn_off: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('dimmer_bulb_dimmable_bulb_dimmable_dimmer_bu_3dc54');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const current = args.device.getCapabilityValue('onoff');
          await args.device['setCapabilityValue']('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action dimmer_bulb_dimmable_bulb_dimmable_dimmer_bulb_dimmable_smart_bulb_dimmer_toggle: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('dimmer_bulb_dimmable_bulb_dimmable_dimmer_bu_631da');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('dim', args.brightness || args.value || 1).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action dimmer_bulb_dimmable_bulb_dimmable_dimmer_bulb_dimmable_smart_bulb_dimmer_set_dim: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('dimmer_bulb_dimmable_bulb_dimmable_dimmer_bu_89495');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action dimmer_bulb_dimmable_bulb_dimmable_dimmer_bu_89495: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('dimmer_bulb_dimmable_bulb_dimmable_dimmer_bu_578bb');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action dimmer_bulb_dimmable_bulb_dimmable_dimmer_bu_578bb: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('dimmer_bulb_dimmable_bulb_dimmable_dimmer_bu_f3f9a');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const current = args.device.getCapabilityValue('onoff');
          await args.device['setCapabilityValue']('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action dimmer_bulb_dimmable_bulb_dimmable_dimmer_bu_f3f9a: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('dimmer_bulb_dimmable_bulb_dimmable_dimmer_bu_e071f');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('dim', args.brightness || args.value || 1).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action dimmer_bulb_dimmable_bulb_dimmable_dimmer_bu_e071f: ${err.message}`); } }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = SmartBulbDimmerDriver;

