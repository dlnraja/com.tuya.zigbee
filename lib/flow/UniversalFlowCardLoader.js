'use strict';

/**
 * UniversalFlowCardLoader - v5.5.597
 * Fixes forum posts 1015/1016: Dynamic FlowCard listeners for sub-capabilities
 */

class UniversalFlowCardLoader {
  constructor(homey) {
    this.homey = homey;
    this.log = (...args) => {
      try {
        if (!homey || homey.isDestroyed) {return;}
        homey.app?.log?.('[FLOW-LOADER]', ...args);
      } catch (e) {
        return;
      }
    };
    this._registered = { triggers: new Set(), conditions: new Set(), actions: new Set() };
  }

  _safeHandler(handler, name, defaultVal = false) {
    return async (args, state) => {
      try {
        if (!args?.device?.getCapabilityValue) {return defaultVal;}
        return await handler(args, state);
      } catch (e) {
        this.log(`[FLOW-LOADER] ${name}: run listener error: ${e.message}`);
        return defaultVal;
      }
    };
  }

  async initialize() {
    this.log('Initializing v5.5.597...');
    await this._registerGenericDPCards();
    await this._registerTypedDpCards();
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
    } catch (e) { this.log('tuya_dp_received error:', e.message); }

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
    } catch (e) { this.log('tuya_dp_equals error:', e.message); }

    // DP Action
    try {
      const card = this.homey.flow.getActionCard('tuya_dp_send');
      if (card) {
        card.registerRunListener(this._safeHandler(async (args) => {
          // v9.0.387 SEC: validation défense en profondeur — DP entier 1-255,
          // valeur contrainte (bool / nombre 32-bit signé / chaîne ≤ 255 chars).
          // Tout le reste est rejeté : pas d'objets, pas de payloads géants.
          const dp = Number(args.dp);
          if (!Number.isInteger(dp) || dp < 1 || dp > 255) {
            this.log(`[FLOW-LOADER] tuya_dp_send: DP invalide (${args.dp})`);
            return false;
          }
          let value;
          const raw = args.value;
          if (raw === 'true' || raw === true) {value = true;}
          else if (raw === 'false' || raw === false) {value = false;}
          else if (typeof raw === 'number' && Number.isFinite(raw) && Math.abs(raw) <= 2147483647) {value = Math.round(raw);}
          else if (typeof raw === 'string') {
            const num = Number(raw);
            if (raw.trim() !== '' && Number.isFinite(num) && Math.abs(num) <= 2147483647) {
              value = Math.round(num);
            } else if (raw.length <= 255) {
              value = raw;
            } else {
              this.log(`[FLOW-LOADER] tuya_dp_send: chaîne trop longue (${raw.length} > 255)`);
              return false;
            }
          } else {
            this.log(`[FLOW-LOADER] tuya_dp_send: type de valeur refusé (${typeof raw})`);
            return false;
          }

          const d = args.device;
          if (d.sendDP) {return await d.sendDP(dp, value), true;}
          if (d._sendTuyaDP) {return await d._sendTuyaDP(dp, value), true;}
          if (d.tuyaEF00Manager?.sendDP) {return await d.tuyaEF00Manager.sendDP(dp, value), true;}
          if (typeof d._setDP === 'function') {return await d._setDP(dp, value), true;}
          if (typeof d.setDP === 'function') {return await d.setDP(dp, value), true;}
          return false;
        }, 'tuya_dp_send'));
        this._registered.actions.add('tuya_dp_send');
      }
    } catch (e) { this.log('tuya_dp_send error:', e.message); }
  }

  async _registerTypedDpCards() {
    // v9.0.387 SEC: tuya_dp_send_typed — handler avec validation par type
    try {
      const card = this.homey.flow.getActionCard('tuya_dp_send_typed');
      if (card) {
        card.registerRunListener(this._safeHandler(async (args) => {
          const dp = Number(args.dp);
          if (!Number.isInteger(dp) || dp < 1 || dp > 255) {return false;}
          const type = args.dp_type;
          const raw = String(args.value ?? '');
          let value;

          switch (type) {
          case 'bool':
            if (!/^(true|false|0|1)$/i.test(raw)) {return false;}
            value = /^(true|1)$/i.test(raw);
            break;
          case 'value': {
            const n = Number(raw);
            if (!Number.isFinite(n) || Math.abs(n) > 2147483647) {return false;}
            value = Math.round(n);
            break;
          }
          case 'enum': {
            const n = Number(raw);
            if (!Number.isInteger(n) || n < 0 || n > 255) {return false;}
            value = n;
            break;
          }
          case 'string':
            if (raw.length > 255) {return false;}
            value = raw;
            break;
          case 'raw':
            if (!/^([0-9a-fA-F]{2}){1,64}$/.test(raw.replace(/\s+/g, ''))) {return false;}
            value = Buffer.from(raw.replace(/\s+/g, ''), 'hex');
            break;
          case 'bitmap': {
            const n = Number(raw);
            if (!Number.isInteger(n) || n < 0 || n > 4294967295) {return false;}
            value = n;
            break;
          }
          default:
            this.log(`[FLOW-LOADER] tuya_dp_send_typed: type refusé (${type})`);
            return false;
          }

          const d = args.device;
          if (typeof d.sendTuyaDP === 'function') {return await d.sendTuyaDP(dp, value, type), true;}
          if (d.sendDP) {return await d.sendDP(dp, value), true;}
          if (d._sendTuyaDP) {return await d._sendTuyaDP(dp, value), true;}
          if (d.tuyaEF00Manager?.sendDP) {return await d.tuyaEF00Manager.sendDP(dp, value), true;}
          if (typeof d.setDP === 'function') {return await d.setDP(dp, value), true;}
          return false;
        }, 'tuya_dp_send_typed'));
        this._registered.actions.add('tuya_dp_send_typed');
      }
    } catch (e) { this.log('tuya_dp_send_typed error:', e.message); }
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
    } catch (e) { this.log('sub_capability_changed error:', e.message); }

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
    } catch (e) { this.log('sub_capability_is error:', e.message); }

    // Universal sub-capability action
    try {
      const card = this.homey.flow.getActionCard('sub_capability_set');
      if (card) {
        card.registerRunListener(this._safeHandler(async (args) => {
          // v5.11.16 SEC: Validate capability exists on device before setting
          const cap = args.capability;
          if (!cap || typeof cap !== 'string' || !args.device.hasCapability(cap)) {
            return false;
          }
          this.log(`[FLOW] sub_capability_set called for ${cap} = ${args.value}`);
          if (typeof args.device.triggerCapabilityListener === 'function') {
            await args.device.triggerCapabilityListener(cap, args.value);
          } else {
            this.log(`[FLOW] Warning: triggerCapabilityListener not found on device, falling back to setCapabilityValue`);
            await args.device.setCapabilityValue(cap, args.value).catch(() => {});
          }
          return true;
        }, 'sub_capability_set'));
        this._registered.actions.add('sub_capability_set');
      }
    } catch (e) { this.log('sub_capability_set error:', e.message); }

    // v5.9.15: Fallback Multi-Gang specific cards (Issue #170)
    try {
      const turnOnCard = this.homey.flow.getActionCard('switch_multi_gang_turn_on');
      if (turnOnCard) {
        turnOnCard.registerRunListener(this._safeHandler(async (args) => {
          const gangNum = parseInt(args.gang?.id || args.gang) || 1;
          this.log(`[FLOW] switch_multi_gang_turn_on for gang ${gangNum}`);
          if (typeof args.device._setGangOnOff === 'function') {
            await args.device._setGangOnOff(gangNum, true);
            return true;
          }
          this.log(`[FLOW] Error: _setGangOnOff not found on device`);
          return false;
        }, 'switch_multi_gang_turn_on'));
      }
      
      const turnOffCard = this.homey.flow.getActionCard('switch_multi_gang_turn_off');
      if (turnOffCard) {
        turnOffCard.registerRunListener(this._safeHandler(async (args) => {
          const gangNum = parseInt(args.gang?.id || args.gang) || 1;
          this.log(`[FLOW] switch_multi_gang_turn_off for gang ${gangNum}`);
          if (typeof args.device._setGangOnOff === 'function') {
            await args.device._setGangOnOff(gangNum, false);
            return true;
          }
          this.log(`[FLOW] Error: _setGangOnOff not found on device`);
          return false;
        }, 'switch_multi_gang_turn_off'));
      }
    } catch (e) { this.log('switch_multi_gang_turn error:', e.message); }
  }

  // Called by device to trigger sub-capability flow
  async triggerSubCapabilityChanged(device, capability, value) {
    try {
      const card = this.homey.flow.getDeviceTriggerCard('sub_capability_changed');
      if (card) {await card.trigger(device, { capability, value }, {});}
    } catch (e) { this.log('triggerSubCapabilityChanged error:', e.message); }
  }

  // Called by device to trigger DP received flow
  async triggerDPReceived(device, dp, value) {
    try {
      const card = this.homey.flow.getDeviceTriggerCard('tuya_dp_received');
      if (card) {await card.trigger(device, { dp, value: String(value) }, { dp, value });}
      // Store for condition checks
      const vals = device.getStoreValue?.('lastDPValues') || {};
      vals[dp] = value;
      await device.setStoreValue?.('lastDPValues', vals);
    } catch (e) {
      this.log('triggerDPReceived error:', e.message);
    }
  }
}

module.exports = UniversalFlowCardLoader;
