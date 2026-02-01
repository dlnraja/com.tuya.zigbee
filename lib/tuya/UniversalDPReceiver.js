'use strict';

/**
 * UniversalDPReceiver v5.7.23 - Intelligent DP Report Handler
 * - Parses all DP frame formats (old, new, raw)
 * - Deduplicates rapid reports (no spam)
 * - Auto-maps DPs to Homey capabilities
 * - Caches last values to detect changes
 */

const DP_TYPES = { 0: 'raw', 1: 'bool', 2: 'value', 3: 'string', 4: 'enum', 5: 'bitmap' };

class UniversalDPReceiver {
  constructor(device, dpMappings = {}) {
    this.device = device;
    this.dpMappings = dpMappings;
    this._lastValues = new Map();
    this._lastReport = { time: 0, hash: '' };
    this._handlers = new Map();
  }

  // Throttled logging
  _log(msg) {
    const now = Date.now();
    if (now - (this._lastLogTime || 0) > 500 || msg.includes('✅') || msg.includes('❌')) {
      this.device.log?.(`[DP-RX] ${msg}`);
      this._lastLogTime = now;
    }
  }

  /**
   * Parse DP frame - supports multiple formats
   */
  parseFrame(data) {
    if (!data || !Buffer.isBuffer(data)) {
      if (data?.data) data = data.data;
      else return [];
    }
    if (!Buffer.isBuffer(data)) data = Buffer.from(data);
    if (data.length < 5) return [];

    const results = [];
    let offset = 2; // Skip sequence number

    while (offset + 4 <= data.length) {
      const dpId = data[offset];
      const dpType = data[offset + 1];
      const dpLen = data.readUInt16BE(offset + 2);
      
      if (offset + 4 + dpLen > data.length) break;
      
      const dpData = data.slice(offset + 4, offset + 4 + dpLen);
      const value = this._parseValue(dpType, dpData);
      
      results.push({ dp: dpId, type: DP_TYPES[dpType] || 'raw', raw: dpData, value });
      offset += 4 + dpLen;
    }
    return results;
  }

  _parseValue(type, data) {
    if (!data || data.length === 0) return null;
    switch (type) {
      case 1: return data[0] === 1; // bool
      case 2: return data.length === 4 ? data.readInt32BE(0) : data.readUInt8(0); // value
      case 3: return data.toString('utf8'); // string
      case 4: return data[0]; // enum
      case 5: return data.length === 1 ? data[0] : data.readUInt32BE(0); // bitmap
      default: return data; // raw
    }
  }

  /**
   * Check if this report is a duplicate (within 300ms, same data)
   */
  _isDuplicate(dpId, value) {
    const now = Date.now();
    const key = `${dpId}_${JSON.stringify(value)}`;
    const last = this._lastValues.get(dpId);
    
    if (last && last.hash === key && now - last.time < 300) {
      return true;
    }
    this._lastValues.set(dpId, { hash: key, time: now, value });
    return false;
  }

  /**
   * Register a handler for a specific DP
   */
  onDP(dpId, handler) {
    this._handlers.set(dpId, handler);
    return this;
  }

  /**
   * Process incoming DP report - main entry point
   */
  async handleReport(data) {
    const dps = this.parseFrame(data);
    if (dps.length === 0) return;

    for (const { dp, type, value, raw } of dps) {
      // Skip duplicates
      if (this._isDuplicate(dp, value)) continue;

      // Custom handler?
      const handler = this._handlers.get(dp);
      if (handler) {
        try {
          await handler(value, { dp, type, raw });
        } catch (e) {
          this.device.error?.(`[DP-RX] Handler DP${dp} error: ${e.message}`);
        }
        continue;
      }

      // Auto-map to capability
      const mapping = this.dpMappings[dp];
      if (mapping) {
        await this._applyMapping(dp, value, mapping);
      } else {
        this._log(`DP${dp}=${JSON.stringify(value)} (${type}) - no mapping`);
      }
    }
  }

  async _applyMapping(dp, value, mapping) {
    const { capability, transform, divisor, invert, min, max } = mapping;
    if (!capability) return;

    let finalValue = value;

    // Apply transform function
    if (typeof transform === 'function') {
      finalValue = transform(value);
    } else if (divisor) {
      finalValue = value / divisor;
    }

    // Apply invert
    if (invert && typeof finalValue === 'boolean') {
      finalValue = !finalValue;
    } else if (invert && typeof finalValue === 'number') {
      finalValue = (max || 100) - finalValue;
    }

    // Clamp to range
    if (typeof finalValue === 'number') {
      if (min !== undefined) finalValue = Math.max(min, finalValue);
      if (max !== undefined) finalValue = Math.min(max, finalValue);
    }

    // Apply to capability
    try {
      if (this.device.hasCapability?.(capability)) {
        const current = this.device.getCapabilityValue?.(capability);
        if (current !== finalValue) {
          await this.device.setCapabilityValue(capability, finalValue);
          this._log(`✅ DP${dp}→${capability}=${finalValue}`);
        }
      }
    } catch (e) {
      this.device.error?.(`[DP-RX] Set ${capability} error: ${e.message}`);
    }
  }

  /**
   * Setup cluster listener for Tuya reports
   */
  setupListener(zclNode, endpoint = 1) {
    const ep = zclNode?.endpoints?.[endpoint];
    const cluster = ep?.clusters?.tuya || ep?.clusters?.manuSpecificTuya || 
                    ep?.clusters?.[0xEF00] || ep?.clusters?.[61184];
    
    if (!cluster) {
      this._log('⚠️ No Tuya cluster found for listener');
      return false;
    }

    // Listen for datapoint reports
    if (cluster.on) {
      cluster.on('report', (data) => this.handleReport(data));
      cluster.on('response', (data) => this.handleReport(data));
      this._log('✅ Tuya cluster listener setup');
      return true;
    }

    // Alternative: bind to reportHandler
    if (typeof cluster.reportHandler === 'function') {
      const original = cluster.reportHandler.bind(cluster);
      cluster.reportHandler = async (...args) => {
        await this.handleReport(args[0]);
        return original(...args);
      };
      this._log('✅ Report handler wrapped');
      return true;
    }

    return false;
  }

  /**
   * Get last known value for a DP
   */
  getLastValue(dpId) {
    return this._lastValues.get(dpId)?.value;
  }

  /**
   * Update DP mappings dynamically
   */
  setMappings(mappings) {
    this.dpMappings = { ...this.dpMappings, ...mappings };
  }
}

/**
 * Mixin to add DP receiving to any device
 */
function UniversalDPReceiverMixin(Base) {
  return class extends Base {
    _getDPReceiver() {
      if (!this._universalDPReceiver) {
        this._universalDPReceiver = new UniversalDPReceiver(this, this.dpMappings || {});
      }
      return this._universalDPReceiver;
    }

    setupUniversalDPListener(zclNode, endpoint = 1) {
      return this._getDPReceiver().setupListener(zclNode, endpoint);
    }

    onDPReport(dpId, handler) {
      return this._getDPReceiver().onDP(dpId, handler);
    }
  };
}

module.exports = { UniversalDPReceiver, UniversalDPReceiverMixin, DP_TYPES };
