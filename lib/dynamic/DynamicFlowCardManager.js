'use strict';

/**
 * DynamicFlowCardManager - v5.3.57
 *
 * Automatically creates and registers flow cards based on:
 * - Device capabilities (existing + dynamically discovered)
 * - Capability type (boolean → triggers, number → conditions/triggers)
 * - Device driver context
 *
 * Flow Card Types Generated:
 * - TRIGGERS: When capability value changes
 * - CONDITIONS: Check capability state
 * - ACTIONS: Set capability value (if settable)
 */

class DynamicFlowCardManager {

  constructor(device) {
    this.device = device;
    this.homey = device.homey;
    this.driverId = device.driver?.id || 'unknown';
    this.log = (...args) => device.log('[DYN-FLOW]', ...args);
    this.error = (...args) => device.error('[DYN-FLOW]', ...args);

    // Track registered flow cards
    this._registeredTriggers = new Set();
    this._registeredConditions = new Set();
    this._registeredActions = new Set();

    // Flow card definitions to create
    this._pendingCards = [];
  }

  /**
   * Initialize flow cards for all device capabilities
   */
  async initialize() {
    this.log('Initializing dynamic flow cards...');

    const capabilities = this.device.getCapabilities();
    this.log(`Device has ${capabilities.length} capabilities:`, capabilities.join(', '));

    for (const capabilityId of capabilities) {
      await this._registerFlowCardsForCapability(capabilityId);
    }

    this.log(`✅ Registered: ${this._registeredTriggers.size} triggers, ${this._registeredConditions.size} conditions, ${this._registeredActions.size} actions`);
  }

  /**
   * Register flow cards for a specific capability
   */
  async _registerFlowCardsForCapability(capabilityId) {
    const capabilityOptions = this.device.getCapabilityOptions(capabilityId) || {};
    const isSettable = capabilityOptions.setable !== false;
    const isGettable = capabilityOptions.getable !== false;

    // Determine capability type
    const capabilityType = this._getCapabilityType(capabilityId);

    this.log(`Processing ${capabilityId} (type: ${capabilityType}, settable: ${isSettable})`);

    // Register triggers (value changed)
    await this._registerTrigger(capabilityId, capabilityType);

    // Register conditions (check value)
    if (isGettable) {
      await this._registerCondition(capabilityId, capabilityType);
    }

    // Register actions (set value)
    if (isSettable) {
      await this._registerAction(capabilityId, capabilityType);
    }
  }

  /**
   * Register a trigger for capability value change
   */
  async _registerTrigger(capabilityId, capabilityType) {
    const triggerId = `${this.driverId}_${capabilityId}_changed`;

    if (this._registeredTriggers.has(triggerId)) {
      return;
    }

    try {
      // Check if trigger card exists in app manifest
      const triggerCard = this.homey.flow.getDeviceTriggerCard(triggerId);

      if (triggerCard) {
        // Card exists, just register the run listener if needed
        this._registeredTriggers.add(triggerId);
        this.log(`✅ Trigger ready: ${triggerId}`);
      }
    } catch (err) {
      // Card doesn't exist - would need app.json update
      // Store for potential dynamic creation
      this._pendingCards.push({
        type: 'trigger',
        id: triggerId,
        capability: capabilityId,
        capabilityType
      });
    }

    // Setup capability listener to trigger flows
    this._setupCapabilityListener(capabilityId);
  }

  /**
   * Register a condition for capability state check
   */
  async _registerCondition(capabilityId, capabilityType) {
    const conditionId = `${this.driverId}_${capabilityId}_is`;

    if (this._registeredConditions.has(conditionId)) {
      return;
    }

    try {
      const conditionCard = this.homey.flow.getConditionCard(conditionId);

      if (conditionCard) {
        // Register run listener
        conditionCard.registerRunListener(async (args, state) => {
          const currentValue = this.device.getCapabilityValue(capabilityId);

          if (capabilityType === 'boolean') {
            return currentValue === true;
          } else if (capabilityType === 'number') {
            // For numeric, compare with threshold
            const threshold = args.value ?? args.threshold ?? 0;
            const operator = args.operator ?? 'equals';

            switch (operator) {
              case 'equals': return currentValue === threshold;
              case 'greater': return currentValue > threshold;
              case 'less': return currentValue < threshold;
              case 'greater_equal': return currentValue >= threshold;
              case 'less_equal': return currentValue <= threshold;
              default: return currentValue === threshold;
            }
          }

          return currentValue === args.value;
        });

        this._registeredConditions.add(conditionId);
        this.log(`✅ Condition ready: ${conditionId}`);
      }
    } catch (err) {
      this._pendingCards.push({
        type: 'condition',
        id: conditionId,
        capability: capabilityId,
        capabilityType
      });
    }
  }

  /**
   * Register an action for capability control
   */
  async _registerAction(capabilityId, capabilityType) {
    const actionId = `${this.driverId}_${capabilityId}_set`;

    if (this._registeredActions.has(actionId)) {
      return;
    }

    try {
      const actionCard = this.homey.flow.getActionCard(actionId);

      if (actionCard) {
        actionCard.registerRunListener(async (args, state) => {
          const value = args.value ?? args[capabilityId];
          await this.device.setCapabilityValue(capabilityId, value);
          this.log(`Action executed: ${capabilityId} = ${value}`);
          return true;
        });

        this._registeredActions.add(actionId);
        this.log(`✅ Action ready: ${actionId}`);
      }
    } catch (err) {
      this._pendingCards.push({
        type: 'action',
        id: actionId,
        capability: capabilityId,
        capabilityType
      });
    }
  }

  /**
   * Setup capability listener to auto-trigger flows
   */
  _setupCapabilityListener(capabilityId) {
    // Avoid duplicate listeners
    const listenerKey = `_flowListener_${capabilityId}`;
    if (this.device[listenerKey]) {
      return;
    }

    // v5.4.5: CRITICAL FIX - Only register listener if capability exists on device
    // Prevents "Invalid Capability" errors for capabilities in app.json but not yet added
    if (!this.device.hasCapability(capabilityId)) {
      this.log(`⚠️ Skipping listener for ${capabilityId} - capability not present on device`);
      return;
    }

    try {
      this.device.registerCapabilityListener(capabilityId, async (value) => {
        // Trigger capability changed flow
        await this.triggerCapabilityChanged(capabilityId, value);
      });

      this.device[listenerKey] = true;
    } catch (err) {
      this.error(`Failed to register listener for ${capabilityId}:`, err.message);
    }
  }

  /**
   * Trigger flow when capability changes
   */
  async triggerCapabilityChanged(capabilityId, value) {
    const triggerId = `${this.driverId}_${capabilityId}_changed`;

    try {
      const triggerCard = this.homey.flow.getDeviceTriggerCard(triggerId);

      if (triggerCard) {
        const tokens = { value };
        await triggerCard.trigger(this.device, tokens);
        this.log(`🔔 Triggered: ${triggerId} with value: ${value}`);
      }
    } catch (err) {
      // Flow card doesn't exist, try generic triggers
      await this._tryGenericTriggers(capabilityId, value);
    }
  }

  /**
   * Try generic flow triggers that work across all devices
   */
  async _tryGenericTriggers(capabilityId, value) {
    // Boolean capabilities - try true/false triggers
    if (typeof value === 'boolean') {
      const boolTriggerId = value
        ? `${this.driverId}_${capabilityId}_true`
        : `${this.driverId}_${capabilityId}_false`;

      try {
        const triggerCard = this.homey.flow.getDeviceTriggerCard(boolTriggerId);
        if (triggerCard) {
          await triggerCard.trigger(this.device);
          this.log(`🔔 Triggered: ${boolTriggerId}`);
        }
      } catch (err) {
        // Silently ignore
      }
    }

    // Alarm capabilities - try alarm_changed trigger
    if (capabilityId.startsWith('alarm_')) {
      try {
        const alarmTrigger = this.homey.flow.getDeviceTriggerCard(`${this.driverId}_alarm_changed`);
        if (alarmTrigger) {
          await alarmTrigger.trigger(this.device, { alarm: capabilityId, value });
        }
      } catch (err) {
        // Silently ignore
      }
    }

    // Measure capabilities - try measure_changed trigger
    if (capabilityId.startsWith('measure_')) {
      try {
        const measureTrigger = this.homey.flow.getDeviceTriggerCard(`${this.driverId}_measure_changed`);
        if (measureTrigger) {
          await measureTrigger.trigger(this.device, { measure: capabilityId, value });
        }
      } catch (err) {
        // Silently ignore
      }
    }
  }

  /**
   * Handle new capability discovered by DynamicCapabilityManager
   */
  async onCapabilityDiscovered({ capability, dpId }) {
    this.log(`New capability discovered: ${capability} (DP${dpId})`);
    await this._registerFlowCardsForCapability(capability);
  }

  /**
   * Handle capability value changed
   */
  async onValueChanged({ capability, value, dpId }) {
    await this.triggerCapabilityChanged(capability, value);
  }

  /**
   * Get capability type (boolean, number, string, enum)
   */
  _getCapabilityType(capabilityId) {
    // Standard Homey capability types
    const booleanCaps = [
      'onoff', 'alarm_motion', 'alarm_contact', 'alarm_water',
      'alarm_smoke', 'alarm_battery', 'alarm_tamper', 'alarm_generic'
    ];

    const numberCaps = [
      'measure_temperature', 'measure_humidity', 'measure_luminance',
      'measure_battery', 'measure_power', 'measure_voltage', 'measure_current',
      'dim', 'windowcoverings_set', 'target_temperature', 'measure_pressure',
      'measure_co2', 'measure_pm25'
    ];

    if (booleanCaps.includes(capabilityId) || capabilityId.startsWith('alarm_')) {
      return 'boolean';
    }

    if (numberCaps.includes(capabilityId) || capabilityId.startsWith('measure_')) {
      return 'number';
    }

    if (capabilityId.startsWith('tuya_dp_')) {
      // Dynamic capability - check current value type
      const currentValue = this.device.getCapabilityValue(capabilityId);
      return typeof currentValue === 'boolean' ? 'boolean' : 'number';
    }

    return 'unknown';
  }

  /**
   * Generate flow card definitions for app.json
   * Call this to get the JSON structure for missing flow cards
   */
  generateMissingFlowCards() {
    const cards = {
      triggers: [],
      conditions: [],
      actions: []
    };

    for (const pending of this._pendingCards) {
      const definition = this._generateCardDefinition(pending);

      if (pending.type === 'trigger') {
        cards.triggers.push(definition);
      } else if (pending.type === 'condition') {
        cards.conditions.push(definition);
      } else if (pending.type === 'action') {
        cards.actions.push(definition);
      }
    }

    return cards;
  }

  /**
   * Generate a single flow card definition
   */
  _generateCardDefinition(pending) {
    const { id, capability, capabilityType, type } = pending;

    const title = this._formatCapabilityTitle(capability);

    const definition = {
      id,
      title: {
        en: type === 'trigger'
          ? `${title} changed`
          : type === 'condition'
            ? `${title} is...`
            : `Set ${title}`
      }
    };

    // Add args for conditions/actions
    if (type === 'condition' && capabilityType === 'number') {
      definition.args = [
        {
          name: 'value',
          type: 'number',
          title: { en: 'Value' }
        }
      ];
    }

    if (type === 'action') {
      definition.args = [
        {
          name: 'value',
          type: capabilityType === 'boolean' ? 'checkbox' : 'number',
          title: { en: 'Value' }
        }
      ];
    }

    // Add tokens for triggers
    if (type === 'trigger' && capabilityType === 'number') {
      definition.tokens = [
        {
          name: 'value',
          type: 'number',
          title: { en: 'Value' }
        }
      ];
    }

    return definition;
  }

  /**
   * Format capability ID to human-readable title
   */
  _formatCapabilityTitle(capabilityId) {
    return capabilityId
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
      .replace('Measure ', '')
      .replace('Alarm ', '')
      .replace('Tuya Dp ', 'DP ');
  }

  /**
   * Get statistics about registered flow cards
   */
  getStats() {
    return {
      triggers: this._registeredTriggers.size,
      conditions: this._registeredConditions.size,
      actions: this._registeredActions.size,
      pending: this._pendingCards.length
    };
  }
}

module.exports = DynamicFlowCardManager;
