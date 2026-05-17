'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.572: CRITICAL FIX - Flow card run listeners were missing
 */
class PlugEnergyMonitorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('PlugEnergyMonitorDriver v5.5.572 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    const conditionCards = [
      {
        id: 'button_wireless_plug_is_on',
        fn: async (args) => args.device.getCapabilityValue('onoff') === true
      },
      {
        id: 'button_wireless_plug_power_above',
        fn: async (args) => {
          const power = args.device.getCapabilityValue('measure_power') || 0;
          return power > (args.power || 100);
        }
      },
      {
        id: 'button_wireless_plug_energy_above',
        fn: async (args) => {
          const energy = args.device.getCapabilityValue('meter_power') || 0;
          return energy > (args.energy || 10);
        }
      }
    ];

    for (const { id, fn } of conditionCards) {
      try {
        const card = this.homey.flow.getConditionCard(id);
        if (card) {
          card.registerRunListener(async (args) => {
            if (!args.device) return false;
            return fn(args);
          });
          this.log(`[FLOW] ✅ Condition ${id} registered`);
        }
      } catch (err) {
        this.error(`[FLOW] ⚠️ Condition ${id} registration error: ${err.message}`);
      }
    }

    const actionCards = [
      {
        id: 'button_wireless_plug_turn_on',
        fn: async (args) => {
          await args.device._setGangOnOff(1, true).catch(() => { });
          await args.device.setCapabilityValue('onoff', true).catch(() => {});
          return true;
        }
      },
      {
        id: 'button_wireless_plug_turn_off',
        fn: async (args) => {
          await args.device._setGangOnOff(1, false).catch(() => { });
          await args.device.setCapabilityValue('onoff', false).catch(() => {});
          return true;
        }
      },
      {
        id: 'button_wireless_plug_toggle',
        fn: async (args) => {
          const current = args.device.getCapabilityValue('onoff');
          await args.device._setGangOnOff(1, !current).catch(() => { });
          await args.device.setCapabilityValue('onoff', !current).catch(() => {});
          return true;
        }
      },
      {
        id: 'button_wireless_plug_reset_meter',
        fn: async (args) => {
          await args.device.triggerCapabilityListener('meter_power', 0);
          return true;
        }
      }
    ];

    for (const { id, fn } of actionCards) {
      try {
        const card = this.homey.flow.getActionCard(id);
        if (card) {
          card.registerRunListener(async (args) => {
            if (!args.device) return false;
            return fn(args);
          });
          this.log(`[FLOW] ✅ Action ${id} registered`);
        }
      } catch (err) {
        this.error(`[FLOW] ⚠️ Action ${id} registration error: ${err.message}`);
      }
    }

    this.log('[FLOW] Energy monitor plug flow cards registered');
  }
}

module.exports = PlugEnergyMonitorDriver;
