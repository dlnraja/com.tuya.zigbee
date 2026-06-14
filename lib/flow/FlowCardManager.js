'use strict';

/**
 * Flow Card Manager
 * v5.9.0: DYNAMIC registration of ALL flow cards from app.json manifest.
 * Scans this.homey.manifest.flow.actions and registers run listeners for every
 * declared action card, with special-case handlers for known card types and a
 * generic fallback that derives the capability from the card ID.
 *
 * Cards handled by UniversalFlowCardLoader (tuya_dp_send, sub_capability_set, etc.)
 * are skipped here to avoid double-registration.
 *
 * v5.5.342: Safe device handler wrapper prevents "cant get device by id" errors
 */

/** Card IDs that are registered by UniversalFlowCardLoader -- skip them here */
const LOADER_MANAGED_IDS = new Set([
  'tuya_dp_send',
  'tuya_dp_send_typed',
  'sub_capability_set',
  'sub_capability_toggle',
  'switch_multi_gang_turn_on',
  'switch_multi_gang_turn_off',
]);

/**
 * Map of card IDs to custom run-listener handlers.
 * Cards present here get their specific handler; all others get the generic handler.
 */
const SPECIAL_CARD_HANDLERS = {};

// -- Generic custom action cards ------------------------------------------------

SPECIAL_CARD_HANDLERS.resetEnergyMeter = async (args) => {
  if (typeof args.device.resetEnergyMeter === 'function') {
    await args.device.resetEnergyMeter();
    return true;
  } else if (args.device.hasCapability('meter_power')) {
    await args.device.setCapabilityValue('meter_power', 0);
    await args.device.setStoreValue('energy_start', Date.now());
    return true;
  }
  throw new Error('Device does not support energy reset');
};

SPECIAL_CARD_HANDLERS.set_software_child_lock = async (args) => {
  if (typeof args.device.setChildLock === 'function') {
    await args.device.setChildLock(args.locked === true || args.locked === 'true');
    return true;
  } else if (args.device.hasCapability('child_lock')) {
    await args.device.triggerCapabilityListener('child_lock', args.locked === true || args.locked === 'true');
    return true;
  }
  throw new Error('Device does not support software child lock');
};

SPECIAL_CARD_HANDLERS.natural_light_enable = async (args) => {
  if (typeof args.device.enableNaturalLight === 'function') {
    await args.device.enableNaturalLight();
    return true;
  }
  throw new Error('Device does not support natural light');
};

SPECIAL_CARD_HANDLERS.natural_light_disable = async (args) => {
  if (typeof args.device.disableNaturalLight === 'function') {
    await args.device.disableNaturalLight();
    return true;
  }
  throw new Error('Device does not support natural light');
};

SPECIAL_CARD_HANDLERS.start_effect = async (args) => {
  if (typeof args.device.startEffect === 'function') {
    await args.device.startEffect(args);
    return true;
  }
  throw new Error('Device does not support start effect');
};

// -- Switch backlight / countdown / child_lock cards ----------------------------

const SWITCH_DRIVERS = ['switch_1gang', 'switch_2gang', 'switch_3gang', 'switch_4gang'];

for (const driver of SWITCH_DRIVERS) {
  SPECIAL_CARD_HANDLERS[`${driver}_set_backlight`] = async (args) => {
    if (typeof args.device.setBacklightMode === 'function') {
      await args.device.setBacklightMode(args.mode);
      return true;
    }
    throw new Error('Device does not support backlight control');
  };

  SPECIAL_CARD_HANDLERS[`${driver}_set_backlight_color`] = async (args) => {
    if (typeof args.device.setBacklightColor === 'function') {
      await args.device.setBacklightColor(args.state, args.color);
      return true;
    }
    throw new Error('Device does not support LED color');
  };

  SPECIAL_CARD_HANDLERS[`${driver}_set_backlight_brightness`] = async (args) => {
    if (typeof args.device.setBacklightBrightness === 'function') {
      await args.device.setBacklightBrightness(args.brightness);
      return true;
    }
    throw new Error('Device does not support LED brightness');
  };

  SPECIAL_CARD_HANDLERS[`${driver}_set_countdown`] = async (args) => {
    if (typeof args.device.setCountdown === 'function') {
      await args.device.setCountdown(1, args.seconds);
      return true;
    }
    throw new Error('Device does not support countdown');
  };

  SPECIAL_CARD_HANDLERS[`${driver}_set_child_lock`] = async (args) => {
    if (typeof args.device.setChildLock === 'function') {
      await args.device.setChildLock(args.locked === 'true');
      return true;
    }
    throw new Error('Device does not support child lock');
  };
}

// -- Plug LED indicator / power-on behavior cards -------------------------------

SPECIAL_CARD_HANDLERS.plug_smart_set_indicator = async (args) => {
  if (typeof args.device.setIndicatorMode === 'function') {
    await args.device.setIndicatorMode(args.mode);
    return true;
  }
  throw new Error('Device does not support LED indicator control');
};

SPECIAL_CARD_HANDLERS.plug_smart_set_power_on = async (args) => {
  if (typeof args.device.setPowerOnBehavior === 'function') {
    await args.device.setPowerOnBehavior(args.behavior);
    return true;
  }
  throw new Error('Device does not support power-on behavior control');
};

// -- OTA check (registered separately in app.js, but include as fallback) --------

SPECIAL_CARD_HANDLERS.ota_check_updates = null; // skip -- app.js registers this directly

class FlowCardManager {
  constructor(homey) {
    this.homey = homey;
    this.actions = {};
    this._registeredCount = 0;
    this._skippedCount = 0;
    this._errorCount = 0;
  }

  /** Safe app getter to prevent "app instance has been destroyed" crash */
  get safeApp() {
    try { if (!this.homey || this.homey.isDestroyed) return null; return this.homey.app; } catch (e) { return null; }
  }

  /**
   * v5.5.342: Safe device handler wrapper
   * Prevents "cant get device by id" errors when device was deleted/re-paired
   */
  _safeDeviceHandler(handler, cardName, defaultReturn = false) {
    return async (args, state) => {
      try {
        if (!args || !args.device) {
          this.safeApp?.error?.(`[FLOW] ${cardName}: No device in args`);
          return defaultReturn;
        }
        if (typeof args.device.getCapabilityValue !== 'function' &&
          typeof args.device.setCapabilityValue !== 'function' &&
          typeof args.device.getAvailable !== 'function') {
          this.safeApp?.error?.(`[FLOW] ${cardName}: Invalid device reference`);
          return defaultReturn;
        }
        return await handler(args, state);
      } catch (err) {
        if (err.message?.includes('device') || err.message?.includes('Device')) {
          this.safeApp?.error?.(`[FLOW] ${cardName}: ${err.message}`);
          return defaultReturn;
        }
        throw err;
      }
    };
  }

  /**
   * v5.9.0: Derive a capability name from a card ID.
   * Examples:
   *   air_purifier_turn_on         -> turn_on (simple action)
   *   switch_1gang_set_backlight   -> set_backlight
   *   plug_smart_set_indicator     -> set_indicator
   * Returns the suffix after the first underscore-delimited driver prefix,
   * or null if no reasonable derivation is possible.
   */
  _deriveCapabilityFromCardId(cardId) {
    // Pattern: <driver_prefix>_set_<capability>  or  <driver_prefix>_<action>
    // The capability is typically everything after the driver prefix.
    // We try common suffixes: turn_on, turn_off, toggle, set_*
    const parts = cardId.split('_');

    // Look for known action keywords in the card id
    const actionKeywords = ['turn_on', 'turn_off', 'toggle'];
    for (const kw of actionKeywords) {
      if (cardId.endsWith(`_${kw}`)) {
        return kw;
      }
    }

    // For set_* cards, extract the capability after set_
    const setMatch = cardId.match(/_set_(.+)$/);
    if (setMatch) {
      return `set_${setMatch[1]}`;
    }

    // Fallback: return the last two segments joined by underscore
    if (parts.length >= 2) {
      return parts.slice(-2).join('_');
    }

    return null;
  }

  /**
   * v5.9.0: Generic run-listener for manifest-declared action cards.
   * Attempts to trigger the capability on the device.
   */
  _genericManifestHandler(cardDef) {
    return async (args) => {
      if (!args.device) return false;

      const cardId = cardDef.id;

      // Try to find a value argument from the card definition
      const valueArg = (cardDef.args || []).find(a => a.name === 'value' || a.name === 'brightness' || a.name === 'mode' || a.name === 'level' || a.name === 'temperature' || a.name === 'color' || a.name === 'speed');
      const argValue = valueArg ? args[valueArg.name] : args.value;

      // 1. Try triggerCapabilityListener with derived capability
      const derivedCap = this._deriveCapabilityFromCardId(cardId);
      if (derivedCap && args.device.hasCapability && args.device.hasCapability(derivedCap)) {
        try {
          await args.device.triggerCapabilityListener(derivedCap, argValue !== undefined ? argValue : true);
          return true;
        } catch (e) {
          this.safeApp?.warn?.(`[FLOW] ${cardId}: triggerCapabilityListener('${derivedCap}') failed: ${e.message}`);
        }
      }

      // 2. Try the card-specific method patterns on the device
      // e.g. set_backlight -> try setBacklightMode, set_indicator -> try setIndicatorMode
      const methodPatterns = [
        derivedCap,                                    // raw: set_backlight
        derivedCap?.replace(/^set_/, 'set'),          // set_backlight -> set_backlight
        derivedCap?.replace(/^set_/, ''),              // set_backlight -> backlight
      ].filter(Boolean);

      for (const pattern of methodPatterns) {
        // camelCase: set_backlight -> setBacklight, turn_on -> turnOn
        const camel = pattern.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        const candidates = [
          camel,
          `set${camel.charAt(0).toUpperCase()}${camel.slice(1)}`,
          camel.startsWith('set') ? camel : `set${camel.charAt(0).toUpperCase()}${camel.slice(1)}`,
        ];
        for (const method of [...new Set(candidates)]) {
          if (typeof args.device[method] === 'function') {
            try {
              await args.device[method](argValue);
              return true;
            } catch (e) {
              this.safeApp?.warn?.(`[FLOW] ${cardId}: device.${method}() failed: ${e.message}`);
            }
          }
        }
      }

      // 3. Last resort: try triggerCapabilityListener with any common capability
      if (args.device.hasCapability && typeof args.device.triggerCapabilityListener === 'function') {
        const allCaps = ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature',
          'target_temperature', 'thermostat_mode', 'fan_mode', 'air_purifier_mode',
          'air_purifier_fan_mode', 'windowcoverings_set', 'alarm_motion', 'measure_temperature'];
        for (const cap of allCaps) {
          if (args.device.hasCapability(cap) && cardId.includes(cap.split('_')[0])) {
            try {
              await args.device.triggerCapabilityListener(cap, argValue !== undefined ? argValue : true);
              return true;
            } catch (e) {
              // continue to next
            }
          }
        }
      }

      this.safeApp?.warn?.(`[FLOW] ${cardId}: No matching capability/method found on device`);
      return false;
    };
  }

  /**
   * v5.9.0: Register ALL action cards declared in the app.json manifest.
   * This is the primary registration method. It scans this.homey.manifest.flow.actions
   * and registers a run listener for every declared card.
   */
  registerAll() {
    const actions = this.homey.manifest?.flow?.actions || [];
    const log = this.safeApp?.log || console.log.bind(console);
    const error = this.safeApp?.error || console.error.bind(console);

    log(`[FLOW] registerAll: ${actions.length} action cards declared in manifest`);

    for (const cardDef of actions) {
      const cardId = cardDef.id;

      // Skip cards managed by UniversalFlowCardLoader
      if (LOADER_MANAGED_IDS.has(cardId)) {
        this._skippedCount++;
        continue;
      }

      // Skip cards registered by app.js directly
      if (SPECIAL_CARD_HANDLERS[cardId] === null) {
        this._skippedCount++;
        continue;
      }

      // Use special handler if defined, otherwise use generic manifest handler
      const handler = SPECIAL_CARD_HANDLERS[cardId] || this._genericManifestHandler(cardDef);

      this._registerActionCard(cardId, handler);
    }

    log(`[FLOW] registerAll complete: ${this._registeredCount} registered, ${this._skippedCount} skipped, ${this._errorCount} errors`);
  }

  /**
   * Helper to safely register an action card.
   * Logs errors instead of silently swallowing them.
   */
  _registerActionCard(cardId, handler) {
    if (!global._registeredFlowCardListeners) {
      global._registeredFlowCardListeners = new Set();
    }
    if (global._registeredFlowCardListeners.has(cardId)) {
      return;
    }
    try {
      const card = this.homey.flow.getActionCard(cardId);
      if (card) {
        card.registerRunListener(this._safeDeviceHandler(handler, cardId, true));
        global._registeredFlowCardListeners.add(cardId);
        this.actions[cardId] = card;
        this._registeredCount++;
      } else {
        this.safeApp?.warn?.(`[FLOW] ${cardId}: getActionCard returned null (card not in manifest?)`);
        this._errorCount++;
      }
    } catch (err) {
      this.safeApp?.warn?.(`[FLOW] ${cardId}: Failed to register - ${err.message}`);
      this._errorCount++;
    }
  }
}

module.exports = FlowCardManager;
