'use strict';

/**
 * TuyaDPFlowCardManager.js - v5.5.603
 * Generic FlowCard dispatcher for TS0601 Tuya devices
 * Fixes forum #1016: DP  FlowCard triggering, conditions, actions
 */

const ATTRS = {
  temp_unit: { 0: 'celsius', 1: 'fahrenheit' },
  device_mode: { 0: 'normal', 1: 'eco', 2: 'comfort', 3: 'boost' },
  thermostat_mode: { 0: 'off', 1: 'heat', 2: 'cool', 3: 'auto' },
  'dim.speed': { 0: 'auto', 1: 'low', 2: 'medium', 3: 'high' },
  battery_state: { 0: 'normal', 1: 'low', 2: 'critical' }
};

const DP_TYPES = { BOOL: 0, VALUE: 1, STRING: 2, ENUM: 3, BITMAP: 4, RAW: 5 };

class TuyaDPFlowCardManager {
  constructor(device, homey) {
    this.device = device;
    this.homey = homey;
    this.dpConfig = {};
    this.dpValues = {};
    this.previousValues = {};
    this.thresholds = {};
    this.registeredCards = new Set();
  }

  initialize(dpConfig) {
    this.dpConfig = dpConfig || {};
    this.device.log('[DP-FLOW] Initializing with config:', Object.keys(this.dpConfig));
    this._registerGenericFlowCards();
    this._registerConditionCards();
    this._registerActionCards();
  }

  // Called when a DP value changes - triggers appropriate flow cards
  onDPValueChanged(dp, value, dataType) {
    const prev = this.previousValues[dp];
    this.previousValues[dp] = value;
    this.dpValues[dp] = value;

    this.device.log(`[DP-FLOW] DP${dp}: ${prev}  ${value}`);

    // Find matching config
    const config = this._findDPConfig(dp);
    if (!config) {
      this._triggerGenericDPCard(dp, value, dataType);
      return;
    }

    // Trigger capability-specific cards
    if (config.capability) {
      this._triggerCapabilityCard(config.capability, value, prev);
    }

    // Check thresholds
    if (config.thresholds) {
      this._checkThresholds(dp, value, prev, config);
    }

    // Trigger generic DP card
    this._triggerGenericDPCard(dp, value, dataType, config.enumMapping);
  }

  _findDPConfig(dp) {
    for (const [key, cfg] of Object.entries(this.dpConfig)) {
      if (cfg.dp === dp) return { ...cfg, name: key };
    }
    return null;
  }

  _triggerGenericDPCard(dp, value, dataType, enumMapping) {
    const cardId = 'tuya_dp_changed';
    try {
      const card = this.device._getFlowCard(cardId, 'trigger');
      if (card) {
        const humanValue = enumMapping ? (ENUM_MAPPINGS[enumMapping]?.[value] || value) : value;
        card.trigger(this.device, {
          dp: dp,
          value: value,
          value_text: String(humanValue),
          data_type: dataType || 0
        }).catch(() => {});
        this.device.log(`[DP-FLOW]  Triggered ${cardId} for DP${dp}`);
      }
    } catch (e) { /* ignore */ }
  }

  _triggerCapabilityCard(capability, value, prev) {
    if (value === prev) return;
    
    const cardIds = [
      `${capability}_changed`,
      `${this.device.driver?.id}_${capability}_changed`
    ];for (const cardId of cardIds) {
      try {
        const card = this.device._getFlowCard(cardId, 'trigger');
        if (card) {
          card.trigger(this.device, { value, previous: prev }).catch(() => {});
          this.device.log(`[DP-FLOW]  Triggered ${cardId}`);
          break;
        }
      } catch (e) { /* ignore */ }
    }
  }

  _checkThresholds(dp, value, prev, config) {
    if (!config.thresholds || typeof value !== 'number') return;

    for (const threshold of config.thresholds) {
      const crossed = (prev < threshold.value && value >= threshold.value) ||
                      (prev > threshold.value && value <= threshold.value);
      if (crossed) {
        this._triggerThresholdCard(dp, value, threshold);
      }
    }
  }

  _triggerThresholdCard(dp, value, threshold) {
    try {
      const card = this.device._getFlowCard('tuya_dp_threshold_crossed', 'trigger');
      if (card) {
        card.trigger(this.device, {
          dp, value, threshold: threshold.value, direction: value >= threshold.value ? 'above' : 'below'
        }).catch(() => {});
      }
    } catch (e) { /* ignore */ }
  }

  _registerGenericFlowCards() {
    this.device.log('[DP-FLOW] Registering generic DP flow cards...');
    // Cards are registered in app.json, we just need to handle them
  }

  _registerConditionCards() {
    const conditionCard = this.device._getFlowCard('tuya_dp_value_is', 'condition');
    if (conditionCard && !this.registeredCards.has('tuya_dp_value_is')) {
      // v5.13.3: Use generic run listener (args.device) to prevent multi-device collisions
      conditionCard.registerRunListener(async (args, state) => {
        const targetDevice = args.device || this.device;
        if (!targetDevice) return false;
        
        // If targetDevice is this instance's device, we can use our local cache
        // Otherwise, we must try to access the manager on that device
        const manager = (targetDevice === this.device) ? this : (targetDevice.tuyaDPFlowManager || targetDevice.tuyaEF00Manager);
        if (!manager || !manager.dpValues) return false;
        
        const currentValue = manager.dpValues[args.dp];
        return this._evaluateCondition(currentValue, args.operator, args.value);
      });
      this.registeredCards.add('tuya_dp_value_is');
      this.device.log('[DP-FLOW]  Registered condition: tuya_dp_value_is');
    }
  }

  _evaluateCondition(current, operator, target) {
    const numCurrent = parseFloat(current);
    const numTarget = parseFloat(target);
    switch (operator) {
    case 'eq': return current == target;
    case 'neq': return current != target;
    case 'gt': return numCurrent > numTarget;
    case 'gte': return numCurrent >= numTarget;
    case 'lt': return numCurrent < numTarget;
    case 'lte': return numCurrent <= numTarget;
    default: return current == target;
    }
  }

  _registerActionCards() {
    const actionCard = this.device._getFlowCard('tuya_dp_set', 'action');
    if (actionCard && !this.registeredCards.has('tuya_dp_set')) {
      // v5.13.3: Use generic run listener (args.device) to prevent multi-device collisions
      actionCard.registerRunListener(async (args) => {
        const targetDevice = args.device || this.device;
        if (typeof targetDevice.sendDP === 'function') {
          return await targetDevice.sendDP(args.dp, args.data_type || 1, this._parseValue(args.value, args.data_type));
        }
        return false;
      });
      this.registeredCards.add('tuya_dp_set');
      this.device.log('[DP-FLOW]  Registered action: tuya_dp_set');
    }
  }

  _parseValue(value, dataType) {
    switch (dataType) {
    case 0: return value === 'true' || value === '1' || value === true;
    case 1: return parseInt(value) || 0;
    case 3: return parseInt(value) || 0;
    default: return value;
    }
  }

  getDPValue(dp) { return this.dpValues[dp]; }
  getEnumText(mapping, value) { return ENUM_MAPPINGS[mapping]?.[value] || value; }
}

module.exports = TuyaDPFlowCardManager;




