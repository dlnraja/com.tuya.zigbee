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
    const _triggerIds = ["dimmer_air_purifier_air_purifier_dimmer_dimmer_wall_1gang_physical_on","dimmer_air_purifier_air_purifier_dimmer_dimmer_wall_1gang_physical_off","dimmer_air_purifier_air_purifier_dimmer_dimmer_wall_1gang_physical_brightness_up","dimmer_air_purifier_air_purifier_dimmer_dimmer_wall_1gang_physical_brightness_down","dimmer_air_purifier_air_purifier_dimmer_dimmer_wall_1gang_dimmer_1gang_turned_on","dimmer_air_purifier_air_purifier_dimmer_dimmer_wall_1gang_dimmer_1gang_turned_off","dimmer_air_purifier_air_purifier_dimmer_dimmer_wall_1gang_dimmer_1gang_dim_changed","dimmer_air_purifier_air_purifier_dimmer_dimmer_wall_1gang_turned_on","dimmer_air_purifier_air_purifier_dimmer_dimmer_wall_1gang_turned_off","dimmer_air_purifier_air_purifier_dimmer_dimmer_wall_1gang_power_changed"];
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
      const card = this.homey.flow.getConditionCard('dimmer_air_purifier_air_purifier_dimmer_wall_f05a4');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition dimmer_air_purifier_air_purifier_dimmer_wall_f05a4: ${err.message}`); } }

    try {
      const card = this.homey.flow.getConditionCard('dimmer_air_purifier_air_purifier_dimmer_wall_9b26f');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition dimmer_air_purifier_air_purifier_dimmer_wall_9b26f: ${err.message}`); } }

    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('dimmer_air_purifier_air_purifier_dimmer_wall_165a6');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action dimmer_air_purifier_air_purifier_dimmer_wall_165a6: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('dimmer_air_purifier_air_purifier_dimmer_wall_4c4ad');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action dimmer_air_purifier_air_purifier_dimmer_wall_4c4ad: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('dimmer_air_purifier_air_purifier_dimmer_wall_bf27d');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const current = args.device.getCapabilityValue('onoff');
          await args.device['setCapabilityValue']('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action dimmer_air_purifier_air_purifier_dimmer_wall_bf27d: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('dimmer_air_purifier_air_purifier_dimmer_wall_60a7a');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('dim', args.brightness || args.value || 1).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action dimmer_air_purifier_air_purifier_dimmer_wall_60a7a: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('dimmer_air_purifier_air_purifier_dimmer_wall_a0fdd');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action dimmer_air_purifier_air_purifier_dimmer_wall_a0fdd: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('dimmer_air_purifier_air_purifier_dimmer_wall_32169');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action dimmer_air_purifier_air_purifier_dimmer_wall_32169: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('dimmer_air_purifier_air_purifier_dimmer_wall_9df13');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const current = args.device.getCapabilityValue('onoff');
          await args.device['setCapabilityValue']('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action dimmer_air_purifier_air_purifier_dimmer_wall_9df13: ${err.message}`); } }

    try {
      const card = this.homey.flow.getActionCard('dimmer_air_purifier_air_purifier_dimmer_wall_10f30');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('dim', args.brightness || args.value || 1).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action dimmer_air_purifier_air_purifier_dimmer_wall_10f30: ${err.message}`); } }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = Dimmer1gangDriver;

