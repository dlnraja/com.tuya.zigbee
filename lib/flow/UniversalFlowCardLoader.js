'use strict';

/**
 * UniversalFlowCardLoader - v5.5.597
 * Fixes forum posts 1015/1016: Dynamic FlowCard listeners for sub-capabilities
 */

class UniversalFlowCardLoader {
  constructor(homey) {
    this.homey = homey;
    this.log = (...args) => homey.app?.log?.('[FLOW-LOADER]', ...args);
    this._registered = { triggers: new Set(), conditions: new Set(), actions: new Set() };
  }

  _safeHandler(handler, name, defaultVal = false) {
    return async (args, state) => {
      try {
        if (!args?.device?.getCapabilityValue) return defaultVal;
        return await handler(args, state);
      } catch (e) { return defaultVal; }
    };
  }

  async initialize() {
    this.log('Initializing v5.5.597...');
    await this._registerGenericDPCards();
    await this._registerSubCapabilityCards();
    this.log(`✅ Done: ${this._registered.triggers.size}T/${this._registered.conditions.size}C/${this._registered.actions.size}A`);
  }

  async _registerGenericDPCards() {
    // DP Trigger
    try {
      const card = this.homey.flow.getDeviceTriggerCard('tuya_dp_received');
      if (card) {
        card.registerRunListener(async (args, state) => args.dp === 0 || args.dp === state.dp);
        this._registered.triggers.add('tuya_dp_received');
      }
    } catch (e) {}

    // DP Condition
    try {
      const card = this.homey.flow.getConditionCard('tuya_dp_equals');
      if (card) {
        card.registerRunListener(this._safeHandler(async (args) => {
          const dpVals = args.device.getStoreValue?.('lastDPValues') || {};
          return String(dpVals[args.dp]) === String(args.value);
        }, 'tuya_dp_equals'));
        this._registered.conditions.add('tuya_dp_equals');
      }
    } catch (e) {}

    // DP Action
    try {
      const card = this.homey.flow.getActionCard('tuya_dp_send');
      if (card) {
        card.registerRunListener(this._safeHandler(async (args) => {
          const d = args.device;
          if (d.sendDP) return await d.sendDP(args.dp, args.value), true;
          if (d._sendTuyaDP) return await d._sendTuyaDP(args.dp, args.value), true;
          if (d.tuyaEF00Manager?.sendDP) return await d.tuyaEF00Manager.sendDP(args.dp, args.value), true;
          return false;
        }, 'tuya_dp_send'));
        this._registered.actions.add('tuya_dp_send');
      }
    } catch (e) {}
  }

  async _registerSubCapabilityCards() {
    // Universal sub-capability trigger
    try {
      const card = this.homey.flow.getDeviceTriggerCard('sub_capability_changed');
      if (card) {
        card.registerRunListener(async (args, state) => 
          !args.capability || args.capability === state.capability
        );
        this._registered.triggers.add('sub_capability_changed');
      }
    } catch (e) {}

    // Universal sub-capability condition
    try {
      const card = this.homey.flow.getConditionCard('sub_capability_is');
      if (card) {
        card.registerRunListener(this._safeHandler(async (args) => {
          const val = args.device.getCapabilityValue(args.capability);
          return val === args.value || val === true;
        }, 'sub_capability_is'));
        this._registered.conditions.add('sub_capability_is');
      }
    } catch (e) {}

    // Universal sub-capability action
    try {
      const card = this.homey.flow.getActionCard('sub_capability_set');
      if (card) {
        card.registerRunListener(this._safeHandler(async (args) => {
          await args.device.setCapabilityValue(args.capability, args.value);
          return true;
        }, 'sub_capability_set'));
        this._registered.actions.add('sub_capability_set');
      }
    } catch (e) {}
  }

  // Called by device to trigger sub-capability flow
  async triggerSubCapabilityChanged(device, capability, value) {
    try {
      const card = this.homey.flow.getDeviceTriggerCard('sub_capability_changed');
      if (card) await card.trigger(device, { capability, value }, {});
    } catch (e) {}
  }

  // Called by device to trigger DP received flow
  async triggerDPReceived(device, dp, value) {
    try {
      const card = this.homey.flow.getDeviceTriggerCard('tuya_dp_received');
      if (card) await card.trigger(device, { dp, value: String(value) }, { dp, value });
      // Store for condition checks
      const vals = device.getStoreValue?.('lastDPValues') || {};
      vals[dp] = value;
      await device.setStoreValue?.('lastDPValues', vals);
    } catch (e) {}
  }
}

module.exports = UniversalFlowCardLoader;
