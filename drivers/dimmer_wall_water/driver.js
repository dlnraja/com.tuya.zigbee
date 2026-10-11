'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Dimmer1gangDriver extends ZigBeeDriver {
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
    this.log('Dimmer1gangDriver v5.5.578 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    const _triggerIds = ["dimmer_wall_water_dimmer_wall_1gang_physical_on","dimmer_wall_water_dimmer_wall_1gang_physical_off","dimmer_wall_water_dimmer_wall_1gang_physical_759d1","dimmer_wall_water_dimmer_wall_1gang_physical_7522c","dimmer_wall_water_dimmer_wall_1gang_dimmer_1_7277c","dimmer_wall_water_dimmer_wall_1gang_dimmer_1_e5cc9","dimmer_wall_water_dimmer_wall_1gang_dimmer_1_b9d22","dimmer_wall_water_dimmer_wall_1gang_turned_on","dimmer_wall_water_dimmer_wall_1gang_turned_off","dimmer_wall_water_dimmer_wall_1gang_power_changed"];
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
      const card = this.homey.flow.getConditionCard('dimmer_wall_water_dimmer_wall_1gang_dimmer_1_f53e3');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition dimmer_wall_water_dimmer_wall_1gang_dimmer_1_f53e3: ${err.message}`); } }

    try {
      const card = this.homey.flow.getConditionCard('dimmer_wall_water_dimmer_wall_1gang_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition dimmer_wall_water_dimmer_wall_1gang_is_on: ${err.message}`); } }

    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('dimmer_wall_water_dimmer_wall_1gang_dimmer_1_37795');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action dimmer_wall_water_dimmer_wall_1gang_dimmer_1_37795: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('dimmer_wall_water_dimmer_wall_1gang_dimmer_1_cd269');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action dimmer_wall_water_dimmer_wall_1gang_dimmer_1_cd269: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('dimmer_wall_water_dimmer_wall_1gang_dimmer_1_cf81f');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const current = args.device.getCapabilityValue('onoff');
          await args.device['setCapabilityValue']('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action dimmer_wall_water_dimmer_wall_1gang_dimmer_1_cf81f: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('dimmer_wall_water_dimmer_wall_1gang_dimmer_1_deef8');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('dim', args.brightness || args.value || 1).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action dimmer_wall_water_dimmer_wall_1gang_dimmer_1_deef8: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('dimmer_wall_water_dimmer_wall_1gang_turn_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action dimmer_wall_water_dimmer_wall_1gang_turn_on: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('dimmer_wall_water_dimmer_wall_1gang_turn_off');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action dimmer_wall_water_dimmer_wall_1gang_turn_off: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('dimmer_wall_water_dimmer_wall_1gang_toggle');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const current = args.device.getCapabilityValue('onoff');
          await args.device['setCapabilityValue']('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action dimmer_wall_water_dimmer_wall_1gang_toggle: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('dimmer_wall_water_dimmer_wall_1gang_set_brightness');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('dim', args.brightness || args.value || 1).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action dimmer_wall_water_dimmer_wall_1gang_set_brightness: ${err.message}`); } }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = Dimmer1gangDriver;

