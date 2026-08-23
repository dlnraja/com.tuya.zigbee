'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class BoilerSwitchEnergyDriver extends ZigBeeDriver {

  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;
    this.log('BoilerSwitchEnergyDriver initialized');
    this._registerFlowCards();
  }

  /**
   * P126: flow.compose exists — register run listeners (CI flow-card watchdog).
   */
  _registerFlowCards() {
    const setOnOff = async (device, value) => {
      if (!device) { return false; }
      if (typeof device.safeSetCapabilityValue === 'function') {
        await device.safeSetCapabilityValue('onoff', value).catch(() => {});
      } else {
        await device.setCapabilityValue('onoff', value).catch(() => {});
      }
      return true;
    };

    try {
      const card = this.homey.flow.getConditionCard('boiler_switch_energy_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) { return false; }
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) {
      this.log(`[FLOW] condition is_on: ${err.message}`);
    }

    try {
      const card = this.homey.flow.getActionCard('boiler_switch_energy_turn_on');
      if (card) {
        card.registerRunListener(async (args) => setOnOff(args.device, true));
      }
    } catch (err) {
      this.log(`[FLOW] action turn_on: ${err.message}`);
    }

    try {
      const card = this.homey.flow.getActionCard('boiler_switch_energy_turn_off');
      if (card) {
        card.registerRunListener(async (args) => setOnOff(args.device, false));
      }
    } catch (err) {
      this.log(`[FLOW] action turn_off: ${err.message}`);
    }

    try {
      const card = this.homey.flow.getActionCard('boiler_switch_energy_toggle');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) { return false; }
          const current = args.device.getCapabilityValue('onoff');
          return setOnOff(args.device, !current);
        });
      }
    } catch (err) {
      this.log(`[FLOW] action toggle: ${err.message}`);
    }

    try {
      const card = this.homey.flow.getConditionCard('boiler_switch_energy_power_above');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device || !args.device.hasCapability('measure_power')) { return false; }
          const p = Number(args.device.getCapabilityValue('measure_power'));
          const thr = Number(args.threshold);
          return Number.isFinite(p) && Number.isFinite(thr) && p > thr;
        });
      }
    } catch (err) {
      this.log(`[FLOW] condition power_above: ${err.message}`);
    }

    try {
      const card = this.homey.flow.getConditionCard('boiler_switch_energy_temperature_above');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) { return false; }
          const cap = args.device.hasCapability('measure_temperature')
            ? 'measure_temperature'
            : null;
          if (!cap) { return false; }
          const t = Number(args.device.getCapabilityValue(cap));
          const thr = Number(args.threshold);
          return Number.isFinite(t) && Number.isFinite(thr) && t > thr;
        });
      }
    } catch (err) {
      this.log(`[FLOW] condition temperature_above: ${err.message}`);
    }

    this.log('[FLOW] Boiler switch energy flow cards registered');
  }
}

module.exports = BoilerSwitchEnergyDriver;
