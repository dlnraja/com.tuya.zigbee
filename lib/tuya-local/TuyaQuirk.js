'use strict';
// v9.0.40: TuyaQuirk - ZHA-inspired quirk class for WiFi Tuya devices
// Pattern from zhaquirks/tuya/__init__.py
// Provides device-specific overrides for firmware quirks

/**
 * TuyaQuirk - Base class for Tuya device quirks
 * Quirks handle firmware-specific behaviors that differ from the standard protocol
 */
class TuyaQuirk {
  constructor(device, config = {}) {
    this.device = device;
    this.config = config;
    this._applied = false;
  }

  /** Unique quirk identifier */
  static get id() { return 'base'; }

  /** Manufacturer names this quirk applies to */
  static get manufacturers() { return []; }

  /** Product IDs this quirk applies to */
  static get productIds() { return []; }

  /** Whether this quirk matches a device */
  static matches(deviceSettings) {
    const mfr = (deviceSettings.zb_manufacturer_name || '').toLowerCase();
    const pid = (deviceSettings.zb_model_id || '').toLowerCase();
    return this.manufacturers.some(m => mfr.includes(m.toLowerCase())) ||
           this.productIds.some(p => pid === p.toLowerCase());
  }

  /** Apply the quirk to the device */
  async apply() {
    if (this._applied) return;
    this._applied = true;
    await this._apply();
  }

  /** Override in subclasses */
  async _apply() {}

  /** Remove the quirk */
  async remove() {
    this._applied = false;
  }
}

/**
 * CurtainPositionInvertQuirk
 * Some curtains report 0=open, 100=closed (inverted)
 * Example: Quoya M515EGBZTN (_TZE200_gubdgai2)
 */
class CurtainPositionInvertQuirk extends TuyaQuirk {
  static get id() { return 'curtain_position_invert'; }
  static get manufacturers() { return ['_TZE200_gubdgai2', '_TZE204_gubdgai2']; }

  async _apply() {
    if (this.device.dpMappings) {
      const posDp = Object.entries(this.device.dpMappings).find(([, cfg]) =>
        cfg && cfg.capability === 'windowcoverings_set');
      if (posDp) {
        posDp[1].positionInvert = true;
        this.device.log('[Quirk] Position invert applied for curtain');
      }
    }
  }
}

/**
 * SmartPlugPowerQuirk
 * Some smart plugs report power in different units
 */
class SmartPlugPowerQuirk extends TuyaQuirk {
  static get id() { return 'smartplug_power_scale'; }
  static get manufacturers() { return ['_TZ3000_okaz9tbl']; }

  async _apply() {
    if (this.device.dpMappings) {
      for (const [, cfg] of Object.entries(this.device.dpMappings)) {
        if (cfg && cfg.capability === 'measure_power' && !cfg.divisor) {
          cfg.divisor = 10;
          this.device.log('[Quirk] Power divisor=10 applied');
        }
      }
    }
  }
}

/**
 * ThermostatDeadzoneQuirk
 * Some thermostats report temperature with a deadzone offset
 */
class ThermostatDeadzoneQuirk extends TuyaQuirk {
  static get id() { return 'thermostat_deadzone'; }
  static get manufacturers() { return ['_TZE200_5toc8eks', '_TZE204_5toc8eks']; }

  async _apply() {
    if (this.device.dpMappings) {
      const tempDp = Object.entries(this.device.dpMappings).find(([, cfg]) =>
        cfg && cfg.capability === 'measure_temperature');
      if (tempDp && !tempDp[1].transform) {
        tempDp[1].transform = (v) => v / 10;
        this.device.log('[Quirk] Temperature /10 transform applied');
      }
    }
  }
}

/**
 * QuirkRegistry - Manages all known quirks
 */
class QuirkRegistry {
  static _quirks = [
    CurtainPositionInvertQuirk,
    SmartPlugPowerQuirk,
    ThermostatDeadzoneQuirk,
  ];

  static register(quirkClass) {
    this._quirks.push(quirkClass);
  }

  static findMatching(deviceSettings) {
    return this._quirks.filter(Q => Q.matches(deviceSettings));
  }

  static async applyAll(device) {
    const settings = device.getSettings();
    const matching = this.findMatching(settings);
    for (const Q of matching) {
      try {
        const quirk = new Q(device);
        await quirk.apply();
        device.log(`[Quirk] Applied: ${Q.id}`);
      } catch (err) {
        device.error(`[Quirk] Failed to apply ${Q.id}:`, err.message);
      }
    }
    return matching.length;
  }
}

module.exports = { TuyaQuirk, CurtainPositionInvertQuirk, SmartPlugPowerQuirk, ThermostatDeadzoneQuirk, QuirkRegistry };
