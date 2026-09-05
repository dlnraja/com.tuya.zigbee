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

SPECIAL_CARD_HANDLERS.resetenergymeter_c3c03 = async (args) => {
  if (typeof args.device.resetenergymeter_c3c03 === 'function') {
    await args.device.resetenergymeter_c3c03();
    return true;
  } else if (args.device.hasCapability('meter_power')) {
    await args.device.setCapabilityValue('meter_power', 0).catch(() => {});
    await args.device.setStoreValue('energy_start', Date.now());
    return true;
  }
  throw new Error('Device does not support energy reset');
};

// Compose id is resetenergymeter (legacy alias) — same behaviour
SPECIAL_CARD_HANDLERS.resetenergymeter = SPECIAL_CARD_HANDLERS.resetenergymeter_c3c03;

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

// -- Battery health calibration card (v1.0) ------------------------------------

SPECIAL_CARD_HANDLERS.calibrate_battery_reading = async (args) => {
  if (typeof args.device.batteryHealthIntelligence?.calibrate === 'function') {
    args.device.batteryHealthIntelligence.calibrate(args.reference_voltage, args.reference_percentage);
    args.device.log(`[BATTERY-HEALTH-FLOW] Calibrated via flow: ${args.reference_voltage}V -> ${args.reference_percentage}%`);
    return true;
  }
  throw new Error('Device does not support battery calibration');
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
      // Flow schema drift:
      // - switch_wall_* uses dropdown arg name `locked` with ids "true"/"false"
      // - switch_1gang_* uses checkbox arg name `enabled` with boolean true/false
      const lockedRaw = (typeof args.locked !== 'undefined') ? args.locked : args.enabled;
      const locked =
        lockedRaw === true
        || lockedRaw === 'true'
        || lockedRaw === 1;
      await args.device.setChildLock(locked);
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
    try { if (!this.homey || this.homey.isDestroyed) {return null;} return this.homey.app; } catch (e) { return null; }
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
  _resolveCardActionAndCapability(cardId) {
    const id = String(cardId || '').toLowerCase().trim();
    let action = 'set';
    let targetCap = null;
    let targetValue = undefined;

    // Detect gang sub-index if present (e.g. gang1, gang_1, gang2, gang_2, etc.)
    // Note: 1gang is driver type (e.g. switch_1gang), not a sub-gang index.
    const subGangMatch = id.match(/_gang_?(\d+)/);
    const multiGangType = id.match(/_([2-9]|\d{2,})gang/);
    const gangNum = subGangMatch ? subGangMatch[1] : null;
    const gangSuffix = gangNum && Number(gangNum) > 1 ? `.${gangNum}` : (subGangMatch && subGangMatch[1] === '1' && multiGangType ? '.1' : '');

    if (id.endsWith('_turn_on') || id.endsWith('_on')) {
      action = 'turn_on';
      targetCap = gangSuffix ? `onoff${gangSuffix}` : 'onoff';
      targetValue = true;
    } else if (id.endsWith('_turn_off') || id.endsWith('_off')) {
      action = 'turn_off';
      targetCap = gangSuffix ? `onoff${gangSuffix}` : 'onoff';
      targetValue = false;
    } else if (id.endsWith('_toggle')) {
      action = 'toggle';
      targetCap = gangSuffix ? `onoff${gangSuffix}` : 'onoff';
    } else {
      const setMatch = id.match(/_set_(.+)$/);
      if (setMatch) {
        targetCap = setMatch[1];
      } else {
        const parts = id.split('_');
        if (parts.length >= 2) {
          targetCap = parts.slice(-2).join('_');
        }
      }
    }
    return { action, targetCap, targetValue, gangSuffix };
  }

  /**
   * v5.9.0: Derive a capability name from a card ID.
   */
  _deriveCapabilityFromCardId(cardId) {
    const res = this._resolveCardActionAndCapability(cardId);
    return res.targetCap || null;
  }

  /**
   * v5.9.0: Generic run-listener for manifest-declared action cards.
   * Attempts to trigger the capability on the device with case-insensitivity and multi-tier fallbacks.
   */
  _genericManifestHandler(cardDef) {
    return async (args) => {
      if (!args || !args.device) {return false;}
      const device = args.device;
      const cardId = cardDef.id;

      // Extract value argument case-insensitively
      const valueArgNames = [
        'value', 'state', 'brightness', 'mode', 'level', 'temperature',
        'target_temperature', 'color', 'speed', 'position', 'percentage',
        'locked', 'enabled', 'power', 'behavior', 'status', 'action', 'command'
      ];
      let argValue = undefined;
      const declaredArg = (cardDef.args || []).find(a => 
        a && a.name && valueArgNames.includes(String(a.name).toLowerCase())
      );
      if (declaredArg && args[declaredArg.name] !== undefined) {
        argValue = args[declaredArg.name];
      } else {
        for (const name of valueArgNames) {
          if (args[name] !== undefined) {
            argValue = args[name];
            break;
          }
        }
      }

      // Unwrap object arguments (e.g. { id: '...' })
      if (argValue && typeof argValue === 'object' && argValue.id !== undefined) {
        argValue = argValue.id;
      }

      const { action, targetCap, targetValue, gangSuffix } = this._resolveCardActionAndCapability(cardId);

      // Determine final value to send
      let finalVal = targetValue !== undefined ? targetValue : (argValue !== undefined ? argValue : true);
      if (typeof finalVal === 'string') {
        if (finalVal.toLowerCase() === 'true') {finalVal = true;}
        else if (finalVal.toLowerCase() === 'false') {finalVal = false;}
      }

      // Find capability on device case-insensitively
      const deviceCaps = typeof device.getCapabilities === 'function' ? device.getCapabilities() : [];
      const matchCap = (capToFind) => {
        if (!capToFind) {return null;}
        if (typeof device.hasCapability === 'function' && device.hasCapability(capToFind)) {
          return capToFind;
        }
        const lower = capToFind.toLowerCase().trim();
        return deviceCaps.find(c => c.toLowerCase().trim() === lower) || null;
      };

      // 1. Try target capability from card derivation
      let effectiveCap = matchCap(targetCap);
      if (!effectiveCap && gangSuffix && targetCap?.startsWith('onoff')) {
        // Fallback to base onoff if multi-gang capability doesn't exist
        effectiveCap = matchCap('onoff');
      }

      if (effectiveCap) {
        try {
          if (action === 'toggle') {
            const curVal = typeof device.getCapabilityValue === 'function' ? device.getCapabilityValue(effectiveCap) : false;
            finalVal = !curVal;
          }
          if (typeof device.triggerCapabilityListener === 'function') {
            await device.triggerCapabilityListener(effectiveCap, finalVal);
            return true;
          } else if (typeof device.setCapabilityValue === 'function') {
            await device.setCapabilityValue(effectiveCap, finalVal);
            return true;
          }
        } catch (e) {
          this.safeApp?.warn?.(`[FLOW] ${cardId}: capability execution failed for '${effectiveCap}': ${e.message}`);
        }
      }

      // 2. Try method patterns on the device
      const methodPatterns = [
        targetCap,
        targetCap?.replace(/^set_/, ''),
        action === 'turn_on' ? 'turnOn' : null,
        action === 'turn_off' ? 'turnOff' : null,
      ].filter(Boolean);

      for (const pattern of methodPatterns) {
        const camel = pattern.replace(/_([a-z0-9])/gi, (_, c) => c.toUpperCase());
        const candidates = [
          pattern,
          camel,
          `set${camel.charAt(0).toUpperCase()}${camel.slice(1)}`,
        ];
        for (const method of [...new Set(candidates)]) {
          if (typeof device[method] === 'function') {
            try {
              await device[method](finalVal);
              return true;
            } catch (e) {
              this.safeApp?.warn?.(`[FLOW] ${cardId}: device.${method}() failed: ${e.message}`);
            }
          }
        }
      }

      // 3. Fallback to ProtocolRxTxChain or DeviceIOFacade transmit
      if (effectiveCap || targetCap) {
        const cap = effectiveCap || targetCap;
        if (typeof device.tx === 'function') {
          const r = await device.tx({ capability: cap, value: finalVal });
          if (r?.ok) {return true;}
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

    // v1.0: Register battery health flow cards (triggers, conditions, actions)
    try {
      const BatteryHealthFlowHandler = require('./BatteryHealthFlowHandler');
      const healthFlowHandler = new BatteryHealthFlowHandler(this.homey);
      healthFlowHandler.registerAll();
      log('[FLOW] Battery health flow cards registered');
    } catch (err) {
      error('[FLOW] Battery health flow handler registration failed (non-critical):', err.message);
    }
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
