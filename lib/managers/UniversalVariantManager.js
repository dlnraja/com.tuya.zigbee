'use strict';

/**
 * UniversalVariantManager - v5.5.927
 * 
 * Dynamic capability detection for manufacturer variants
 * Same manufacturerName can have different capabilities
 * Adds capabilities when device reports new DPs (post-pairing)
 */

const DP_CAP_MAP = {
  // Sensors
  1: { caps: ['alarm_motion', 'alarm_contact', 'onoff'], type: 'bool' },
  // Temperature (÷10)
  3: { caps: ['measure_temperature'], type: 'value', div: 10, valid: v => v >= -400 && v <= 800 },
  // Humidity
  4: { caps: ['measure_humidity', 'measure_battery'], type: 'value', valid: v => v >= 0 && v <= 100 },
  // Illuminance
  9: { caps: ['measure_luminance', 'measure_distance'], type: 'value' },
  12: { caps: ['measure_luminance'], type: 'value' },
  // Battery
  10: { caps: ['measure_battery'], type: 'value', valid: v => v >= 0 && v <= 100 },
  13: { caps: ['measure_battery'], type: 'value', valid: v => v >= 0 && v <= 100 },
  // Power/Energy
  19: { caps: ['measure_power'], type: 'value', div: 10 },
  20: { caps: ['measure_voltage'], type: 'value', div: 10 },
  // Radar distance (÷100 = cm to m)
  103: { caps: ['measure_distance', 'measure_luminance'], type: 'value', div: 100 },
  109: { caps: ['measure_distance'], type: 'value', div: 100 },
  119: { caps: ['measure_distance'], type: 'value', div: 100 },
  // Temperature alt
  101: { caps: ['measure_humidity', 'measure_temperature'], type: 'value' },
  111: { caps: ['measure_temperature'], type: 'value', div: 10 },
};

class UniversalVariantManager {
  constructor(device) {
    this.device = device;
    this.discovered = new Map();
    this.added = new Set();
  }

  async init() {
    try {
      const stored = await this.device.getStoreValue('_variantCaps') || [];
      stored.forEach(c => this.added.add(c));
      this.device.log?.(`[VARIANT] Init: ${this.added.size} dynamic caps`);
    } catch (e) { /* ignore */ }
  }

  async processDP(dpId, value, dpType) {
    const mapping = DP_CAP_MAP[dpId];
    if (!mapping) return null;

    // Validate
    if (mapping.valid && !mapping.valid(value)) return null;

    // Find best capability match
    let cap = null;
    for (const c of mapping.caps) {
      if (this.device.hasCapability(c)) {
        cap = c;
        break;
      }
    }

    // If no existing cap, try to add first one
    if (!cap && mapping.caps.length > 0) {
      cap = await this._tryAddCap(mapping.caps[0], dpId, value);
    }

    if (!cap) return null;

    // Convert value
    let converted = value;
    if (mapping.type === 'bool') {
      converted = Boolean(value);
    } else if (mapping.div) {
      converted = value / mapping.div;
    }

    // Set value
    try {
      await this.device.setCapabilityValue(cap, converted);
      this.device.log?.(`[VARIANT] DP${dpId}→${cap}=${converted}`);
    } catch (e) { /* ignore */ }

    return { capability: cap, value: converted };
  }

  async _tryAddCap(cap, dpId, value) {
    if (this.device.hasCapability(cap)) return cap;
    if (this.added.has(cap)) return null; // Already tried

    try {
      await this.device.addCapability(cap);
      this.added.add(cap);
      await this._saveAdded();
      this.device.log?.(`[VARIANT] 🆕 Added ${cap} from DP${dpId}`);
      return cap;
    } catch (e) {
      this.device.error?.(`[VARIANT] Add ${cap} failed:`, e.message);
      return null;
    }
  }

  async _saveAdded() {
    try {
      await this.device.setStoreValue('_variantCaps', [...this.added]);
    } catch (e) { /* ignore */ }
  }

  async removeCap(cap) {
    if (!this.device.hasCapability(cap)) return;
    try {
      await this.device.removeCapability(cap);
      this.added.delete(cap);
      await this._saveAdded();
      this.device.log?.(`[VARIANT] ❌ Removed ${cap}`);
    } catch (e) { /* ignore */ }
  }
}

module.exports = UniversalVariantManager;
