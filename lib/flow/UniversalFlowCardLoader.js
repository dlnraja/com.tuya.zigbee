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
      } catch (e) { 
        this.log(` Error in flow card ${name}:`, e.message);
        return defaultVal; 
      }
    };
  }

  _getCard(id, type = 'trigger') {
    try {
      if (type === 'trigger') return (() => { try { return ; } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })();
      if (type === 'condition') return (() => { try { return ; } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })();
      if (type === 'action') return (() => { try { return ; } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })();
    } catch (e) {
      this.log(` Card ${id} not found in app.json`);
    }
    return null;
  }

  async initialize() {
    this.log('Initializing v7.0.18...');
    await this._registerGenericDPCards();
    await this._registerSubCapabilityCards();
    this.log(` Done: ${this._registered.triggers.size}T/${this._registered.conditions.size}C/${this._registered.actions.size}A`);
  }
  async _registerGenericDPCards() {
    this.log('Registering Generic DP cards...');
    // DP Trigger
    const dpReceived = this._getCard('tuya_dp_received');
    if (dpReceived) {
      dpReceived.registerRunListener(async (args, state) => args.dp === 0 || args.dp === state.dp);
      this._registered.triggers.add('tuya_dp_received');
    }

    // v7.0.18: Bitmap Trigger
    const bitmapChanged = this._getCard('tuya_bitmap_changed');
    if (bitmapChanged) {
      bitmapChanged.registerRunListener(async (args, state) => args.dp === 0 || args.dp === state.dp);
      this._registered.triggers.add('tuya_bitmap_changed');
    }

    // v7.0.18: Detailed DP Trigger
    const dpChanged = this._getCard('tuya_dp_changed');
    if (dpChanged) {
      dpChanged.registerRunListener(async (args, state) => true); // Filters handled in trigger
      this._registered.triggers.add('tuya_dp_changed');
    }

    // v7.0.18: Raw Trigger
    const rawReceived = this._getCard('tuya_raw_received');
    if (rawReceived) {
      rawReceived.registerRunListener(async (args, state) => args.dp === 0 || args.dp === state.dp);
      this._registered.triggers.add('tuya_raw_received');
    }

    // v7.0.18: Threshold Trigger
    const thresholdCrossed = this._getCard('tuya_dp_threshold_crossed');
    if (thresholdCrossed) {
      thresholdCrossed.registerRunListener(async (args, state) => {
        if (args.dp !== state.dp) return false;
        const direction = args.direction || 'any'; // If provided in Flow
        if (direction === 'above') return state.value >= args.threshold && state.previous < args.threshold;
        if (direction === 'below') return state.value <= args.threshold && state.previous > args.threshold;
        return true;
      });
      this._registered.triggers.add('tuya_dp_threshold_crossed');
    }

    // v7.0.18: Cluster Trigger
    const clusterReceived = this._getCard('tuya_cluster_received');
    if (clusterReceived) {
      clusterReceived.registerRunListener(async (args, state) => true);
      this._registered.triggers.add('tuya_cluster_received');
    }

    // DP Condition
    const dpEquals = this._getCard('tuya_dp_equals', 'condition');
    if (dpEquals) {
      dpEquals.registerRunListener(this._safeHandler(async (args) => {
        const dpVals = args.device.getStoreValue?.('lastDPValues') || {};
        return String(dpVals[args.dp]) === String(args.value);
      }, 'tuya_dp_equals'));
      this._registered.conditions.add('tuya_dp_equals');
    }

    // DP Action
    const dpSend = this._getCard('tuya_dp_send', 'action');
    if (dpSend) {
      dpSend.registerRunListener(this._safeHandler(async (args) => {
        const d = args.device;
        if (d.sendDP) return await d.sendDP(args.dp, args.value), true;
        if (d._sendTuyaDP) return await d._sendTuyaDP(args.dp, args.value), true;
        if (d.tuyaEF00Manager?.sendDP) return await d.tuyaEF00Manager.sendDP(args.dp, args.value), true;
        return false;
      }, 'tuya_dp_send'));
      this._registered.actions.add('tuya_dp_send');
    }

    // v7.0.18: Typed DP Action
    const dpSendTyped = this._getCard('tuya_dp_send_typed', 'action');
    if (dpSendTyped) {
      dpSendTyped.registerRunListener(this._safeHandler(async (args) => {
        const d = args.device;
        const manager = d.tuyaEF00Manager || (typeof d.getTuyaManager === 'function' ? d.getTuyaManager() : null);
        
        // Internal Tuya Types: 0=raw, 1=bool, 2=value, 3=string, 4=enum, 5=bitmap
        const TYPE_MAP = { raw: 0, bool: 1, value: 2, string: 3, enum: 4, bitmap: 5 };
        const dpType = TYPE_MAP[args.dp_type] ?? args.dp_type;

        if (manager && typeof manager.sendTuyaDP === 'function') {
          await manager.sendTuyaDP(args.dp, dpType, args.value);
          return true;
        }
        if (d.sendDP) return await d.sendDP(args.dp, args.value, dpType), true;
        return false;
      }, 'tuya_dp_send_typed'));
      this._registered.actions.add('tuya_dp_send_typed');
    }
  }

  async _registerSubCapabilityCards() {
    // Universal sub-capability trigger
    try {
      const card = this._getCard('sub_capability_changed', 'trigger');
      if (card) {
        card.registerRunListener(async (args, state) => 
          !args.capability || args.capability === state.capability
        );
        this._registered.triggers.add('sub_capability_changed');
      }
    } catch (e) {}

    // Universal sub-capability condition
    try {
      const card = this._getCard('sub_capability_is', 'condition');
      if (card) {
        card.registerRunListener(this._safeHandler(async (args) => {
          const val = args.device.getCapabilityValue(args.capability);
          return val === args.value || val === true;
        }, 'sub_capability_is'));
        this._registered.conditions.add('sub_capability_is');
      }
    } catch (e) {}

    // Universal sub-capability action
    const capSet = this._getCard('sub_capability_set', 'action');
    if (capSet) {
      capSet.registerRunListener(this._safeHandler(async (args) => {
        // v5.11.16 SEC: Validate capability exists on device before setting
        const cap = args.capability;
        if (!cap || typeof cap !== 'string' || !args.device.hasCapability(cap)) {
          return false;
        }
        // v7.0.12: MANDATORY - use triggerCapabilityListener to forward to Zigbee
        if (typeof args.device.triggerCapabilityListener === 'function') {
          await args.device.triggerCapabilityListener(cap, args.value);
        } else {
          await args.device.setCapabilityValue(cap, args.value);
        }
        return true;
      }, 'sub_capability_set'));
      this._registered.actions.add('sub_capability_set');
    }

    // v7.0.18: Universal sub-capability toggle
    const capToggle = this._getCard('sub_capability_toggle', 'action');
    if (capToggle) {
      capToggle.registerRunListener(this._safeHandler(async (args) => {
        const cap = args.capability;
        if (!cap || !args.device.hasCapability(cap)) return false;
        
        const current = args.device.getCapabilityValue(cap);
        const targetValue = !current;
        
        if (typeof args.device.triggerCapabilityListener === 'function') {
          await args.device.triggerCapabilityListener(cap, targetValue);
        } else {
          await args.device.setCapabilityValue(cap, targetValue);
        }
        return true;
      }, 'sub_capability_toggle'));
      this._registered.actions.add('sub_capability_toggle');
    }

    // v7.0.15: REGISTER DRIVER-SPECIFIC MULTI-GANG CARDS (Issue #170)
    // Support pattern: switch_{N}gang_turn_{on|off}_gang{M}
    // and switch_{N}gang_toggle_gang{M}
    for (let gangs = 1; gangs <= 8; gangs++) {
      const driverPrefix = `switch_${gangs}gang_`;
      for (let gang = 1; gang <= 8; gang++) {
        const gangId = gang === 1 ? 'onoff' : `onoff.gang${gang}`;
        
        ['on', 'off'].forEach(state => {
          const cardId = `${driverPrefix}turn_${state}_gang${gang}`;
          try {
            const card = this._getCard(cardId, 'action');
            if (card) {
              card.registerRunListener(this._safeHandler(async (args) => {
                const targetValue = state === 'on';
                if (typeof args.device.triggerCapabilityListener === 'function') {
                  await args.device.triggerCapabilityListener(gangId, targetValue);
                } else if (typeof args.device._setGangOnOff === 'function') {
                  await args.device._setGangOnOff(gang, targetValue);
                } else {
                  await args.device.setCapabilityValue(gangId, targetValue);
                }
                return true;
              }, cardId));
              this._registered.actions.add(cardId);
            }
          } catch (e) {}
        });

        const toggleId = `${driverPrefix}toggle_gang${gang}`;
        try {
          const card = this._getCard(toggleId, 'action');
          if (card) {
            card.registerRunListener(this._safeHandler(async (args) => {
              const current = args.device.getCapabilityValue(gangId);
              const targetValue = !current;
              if (typeof args.device.triggerCapabilityListener === 'function') {
                await args.device.triggerCapabilityListener(gangId, targetValue);
              } else if (typeof args.device._setGangOnOff === 'function') {
                await args.device._setGangOnOff(gang, targetValue);
              } else {
                await args.device.setCapabilityValue(gangId, targetValue);
              }
              return true;
            }, toggleId));
            this._registered.actions.add(toggleId);
          }
        } catch (e) {}
      }
    }

    // v5.9.15: Fallback Multi-Gang specific cards (Issue #170)
    try {
      const turnOnCard = this._getCard('switch_multi_gang_turn_on', 'action');
      if (turnOnCard) {
        turnOnCard.registerRunListener(this._safeHandler(async (args) => {
          const gangNum = parseInt(args.gang?.id || args.gang) || 1;
          const gangId = gangNum === 1 ? 'onoff' : `onoff.gang${gangNum}`;
          if (typeof args.device.triggerCapabilityListener === 'function' && args.device.hasCapability(gangId)) {
            await args.device.triggerCapabilityListener(gangId, true);
          } else if (typeof args.device._setGangOnOff === 'function') {
            await args.device._setGangOnOff(gangNum, true);
          } else if (args.device.hasCapability(gangId)) {
            await args.device.setCapabilityValue(gangId, true);
          }
          return true;
        }, 'switch_multi_gang_turn_on'));
      }
      
      const turnOffCard = this._getCard('switch_multi_gang_turn_off', 'action');
      if (turnOffCard) {
        turnOffCard.registerRunListener(this._safeHandler(async (args) => {
          const gangNum = parseInt(args.gang?.id || args.gang) || 1;const gangId = gangNum === 1 ? 'onoff' : `onoff.gang${gangNum}`;
          if (typeof args.device.triggerCapabilityListener === 'function' && args.device.hasCapability(gangId)) {
            await args.device.triggerCapabilityListener(gangId, false);
          } else if (typeof args.device._setGangOnOff === 'function') {
            await args.device._setGangOnOff(gangNum, false);
          } else if (args.device.hasCapability(gangId)) {
            await args.device.setCapabilityValue(gangId, false);
          }
          return true;
        }, 'switch_multi_gang_turn_off'));
      }
    } catch (e) {}
  }

  // Called by device to trigger sub-capability flow
  async triggerSubCapabilityChanged(device, capability, value) {
    try {
      const card = this._getCard('sub_capability_changed', 'trigger');
      if (card) await card.trigger(device, { capability, value }, {});
    } catch (e) {}
  }

  // Called by device to trigger DP received flow
  async triggerDPReceived(device, dp, value) {
    try {
      const card = this._getCard('tuya_dp_received');
      if (card) await card.trigger(device, { dp, value: String(value) }, { dp, value });
      
      // v7.0.18: Store for condition checks
      const vals = device.getStoreValue?.('lastDPValues') || {};const previous = vals[dp];
      vals[dp] = value;
      await device.setStoreValue?.('lastDPValues', vals);

      // v7.0.18: Detailed DP Trigger
      const detailedCard = this._getCard('tuya_dp_changed');
      if (detailedCard) {
        let type = typeof value;
        if (Buffer.isBuffer(value)) type = 'raw';
        await detailedCard.trigger(device, { 
          dp_number: dp, 
          dp_value: String(value), 
          dp_type: type, 
          dp_numeric: typeof value === 'number' ? value : 0 
        }, {});
      }

      // v7.0.18: Threshold Trigger
      if (typeof value === 'number' && typeof previous === 'number') {
        const thresholdCard = this._getCard('tuya_dp_threshold_crossed');
        if (thresholdCard) await thresholdCard.trigger(device, { dp }, { dp, value, previous });
      }
    } catch (e) {
      this.log(' TriggerDPReceived Error:', e.message);
    }
  }

  // v7.0.18: Helper for Bitmap Trigger
  async triggerBitmapChanged(device, dp, bitmap) {
    try {
      const card = this._getCard('tuya_bitmap_changed');
      if (card) await card.trigger(device, { dp_number: dp, bitmap }, { dp, bitmap });
    } catch (e) {}
  }

  // v7.0.18: Helper for Raw Trigger
  async triggerRawReceived(device, dp, rawBuffer) {
    try {
      const card = this._getCard('tuya_raw_received');
      const hex = rawBuffer.toString('hex');
      if (card) await card.trigger(device, { dp_number: dp, raw_hex: hex }, { dp, hex });
    } catch (e) {}
  }

  // v7.0.18: Helper for Cluster Trigger
  async triggerClusterReceived(device, clusterId, commandId, dataBuffer) {
    try {
      const card = this._getCard('tuya_cluster_received');
      const hex = dataBuffer?.toString?.('hex') || '';
      if (card) await card.trigger(device, { cluster_id: clusterId, command_id: commandId, data_hex: hex }, {});
    } catch (e) {}
  }
}

module.exports = UniversalFlowCardLoader;



