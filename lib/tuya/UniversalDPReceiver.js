'use strict';

/**
 * UniversalDPReceiver v5.7.26 - Native Homey Methods + All Data Formats
 * 
 * MODES:
 * 1. TUYA_DP: Listen to cluster 0xEF00 (dataReport, response, report)
 * 2. ZCL: Listen to standard cluster attribute reports (attr.onOff, etc.)
 * 3. FRAME: Parse raw frames for custom protocols
 * 
 * Handles: bool, value (1-4 bytes), enum, bitmap (1-4 bytes), string, raw
 * Output formats: number, boolean, string, Buffer, hex string, array
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
   * Parse DP frame - supports ALL formats:
   * - Standard: [seq:2][dp:1][type:1][len:2][data:n]
   * - No-seq:   [dp:1][type:1][len:2][data:n]
   * - Raw DP:   { dp, datatype, data } object
   * - Array:    [dp, type, ...data]
   * - Hex:      hex string
   */
  parseFrame(data) {
    // Handle various input formats
    if (!data) return [];
    
    // Object format: { dp, datatype, data } or { dpId, type, value }
    if (typeof data === 'object' && !Buffer.isBuffer(data) && !Array.isArray(data)) {
      if (data.data && Buffer.isBuffer(data.data)) {
        // Nested data buffer
        data = data.data;
      } else if (data.dp !== undefined || data.dpId !== undefined) {
        // Direct DP object
        const dpId = data.dp ?? data.dpId;
        const dpType = data.datatype ?? data.type ?? 2;
        const rawData = data.data ?? data.value;
        const buf = Buffer.isBuffer(rawData) ? rawData : 
                    Array.isArray(rawData) ? Buffer.from(rawData) :
                    typeof rawData === 'number' ? Buffer.from([rawData]) :
                    Buffer.from([]);
        return [{ dp: dpId, type: DP_TYPES[dpType] || 'raw', raw: buf, value: this._parseValue(dpType, buf) }];
      } else {
        return [];
      }
    }
    
    // Hex string
    if (typeof data === 'string' && /^(0x)?[0-9a-fA-F]+$/.test(data)) {
      data = Buffer.from(data.replace(/^0x/i, ''), 'hex');
    }
    
    // Array of bytes
    if (Array.isArray(data)) {
      data = Buffer.from(data);
    }
    
    if (!Buffer.isBuffer(data)) return [];
    if (data.length < 4) return [];

    const results = [];
    
    // Detect frame format: with or without sequence number
    // Standard frame: seq(2) + dp(1) + type(1) + len(2) + data(n) = min 6 bytes
    // No-seq frame:   dp(1) + type(1) + len(2) + data(n) = min 4 bytes
    // Heuristic: if byte[0] is a valid DP (1-255) and byte[1] is valid type (0-5), probably no-seq
    let offset = 0;
    const firstByte = data[0];
    const secondByte = data[1];
    
    // Check if this looks like a DP frame with sequence (bytes 0-1 are seq number)
    // or without sequence (byte 0 is DP ID, byte 1 is type)
    if (data.length >= 6 && secondByte <= 5 && firstByte >= 1 && firstByte <= 128) {
      // Likely no-seq format (DP ID 1-128, type 0-5)
      offset = 0;
    } else if (data.length >= 6) {
      // Likely has sequence number
      offset = 2;
    } else {
      offset = 0; // Short frame, no seq
    }

    while (offset + 4 <= data.length) {
      const dpId = data[offset];
      const dpType = data[offset + 1];
      
      // Validate DP type (0-5)
      if (dpType > 5) {
        // Invalid type - might be wrong offset, try skipping
        offset++;
        continue;
      }
      
      const dpLen = data.readUInt16BE(offset + 2);
      
      if (offset + 4 + dpLen > data.length) break;
      
      const dpData = data.slice(offset + 4, offset + 4 + dpLen);
      const value = this._parseValue(dpType, dpData);
      
      results.push({ 
        dp: dpId, 
        type: DP_TYPES[dpType] || 'raw', 
        raw: dpData, 
        value,
        hex: dpData.toString('hex'),
        bytes: [...dpData]
      });
      offset += 4 + dpLen;
    }
    return results;
  }

  /**
   * Parse value from buffer based on DP type
   * Handles all byte sizes: 1, 2, 3, 4+ bytes
   */
  _parseValue(type, data) {
    if (!data || data.length === 0) return null;
    
    switch (type) {
      case 1: // bool
        return data[0] === 1;
        
      case 2: // value (integer) - auto-detect size
        switch (data.length) {
          case 1: return data.readUInt8(0);
          case 2: return data.readInt16BE(0);
          case 3: return (data[0] << 16) | (data[1] << 8) | data[2]; // 3-byte value
          case 4: return data.readInt32BE(0);
          default: return data.readInt32BE(0); // Take first 4 bytes
        }
        
      case 3: // string
        return data.toString('utf8').replace(/\0+$/, ''); // Remove null terminators
        
      case 4: // enum
        return data[0];
        
      case 5: // bitmap - auto-detect size
        switch (data.length) {
          case 1: return data[0];
          case 2: return data.readUInt16BE(0);
          case 4: return data.readUInt32BE(0);
          default: return data.readUInt32BE(0);
        }
        
      case 0: // raw
      default:
        // Return buffer for raw, but also provide convenience properties
        return data;
    }
  }
  
  /**
   * Convert parsed value to specific format
   */
  convertValue(value, format = 'auto') {
    if (value === null || value === undefined) return null;
    
    switch (format) {
      case 'number':
        if (Buffer.isBuffer(value)) {
          return value.length === 1 ? value[0] : value.readInt32BE(0);
        }
        return Number(value);
        
      case 'boolean':
        if (Buffer.isBuffer(value)) return value[0] === 1;
        return Boolean(value);
        
      case 'string':
        if (Buffer.isBuffer(value)) return value.toString('utf8');
        return String(value);
        
      case 'hex':
        if (Buffer.isBuffer(value)) return value.toString('hex');
        if (typeof value === 'number') return value.toString(16);
        return String(value);
        
      case 'buffer':
        if (Buffer.isBuffer(value)) return value;
        if (typeof value === 'number') return Buffer.from([value]);
        return Buffer.from(String(value));
        
      case 'array':
        if (Buffer.isBuffer(value)) return [...value];
        if (Array.isArray(value)) return value;
        return [value];
        
      case 'auto':
      default:
        return value;
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

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE 1: TUYA DP LISTENER (cluster 0xEF00)
  // ═══════════════════════════════════════════════════════════════════════════
  setupTuyaListener(zclNode, endpoint = 1) {
    const ep = zclNode?.endpoints?.[endpoint];
    const cluster = ep?.clusters?.tuya || ep?.clusters?.manuSpecificTuya || 
                    ep?.clusters?.[0xEF00] || ep?.clusters?.[61184];
    
    if (!cluster) {
      this._log('⚠️ No Tuya cluster found');
      return false;
    }

    const events = ['dataReport', 'response', 'report', 'datapoint'];
    let bound = 0;
    
    for (const evt of events) {
      if (typeof cluster.on === 'function') {
        cluster.on(evt, (data) => this.handleReport(data));
        bound++;
      }
    }

    if (bound > 0) {
      this._log(`✅ Tuya listener: ${bound} events`);
      return true;
    }

    // Fallback: wrap reportHandler
    if (typeof cluster.reportHandler === 'function') {
      const orig = cluster.reportHandler.bind(cluster);
      cluster.reportHandler = async (...args) => {
        await this.handleReport(args[0]);
        return orig(...args);
      };
      this._log('✅ Tuya reportHandler wrapped');
      return true;
    }

    return false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE 2: ZCL ATTRIBUTE LISTENER (standard clusters)
  // ═══════════════════════════════════════════════════════════════════════════
  setupZclListener(zclNode, clusterId, attributes, endpoint = 1) {
    const ep = zclNode?.endpoints?.[endpoint];
    const cluster = ep?.clusters?.[clusterId] || ep?.clusters?.[String(clusterId)];
    
    if (!cluster) {
      this._log(`⚠️ No cluster ${clusterId} found`);
      return false;
    }

    const attrs = Array.isArray(attributes) ? attributes : [attributes];
    let bound = 0;

    for (const attr of attrs) {
      const eventName = `attr.${attr}`;
      if (typeof cluster.on === 'function') {
        cluster.on(eventName, (value) => {
          this._handleZclAttr(clusterId, attr, value);
        });
        bound++;
      }
    }

    if (bound > 0) {
      this._log(`✅ ZCL listener ${clusterId}: ${attrs.join(',')}`);
      return true;
    }

    return false;
  }

  _handleZclAttr(clusterId, attr, value) {
    const key = `zcl_${clusterId}_${attr}`;
    if (this._isDuplicate(key, value)) return;
    
    // Check for ZCL mapping
    const mapping = this.zclMappings?.[clusterId]?.[attr];
    if (mapping) {
      this._applyMapping(key, value, mapping);
    } else {
      this._log(`ZCL ${clusterId}.${attr}=${value} - no mapping`);
    }

    // Emit event for custom handlers
    this._handlers.get(key)?.(value, { cluster: clusterId, attr });
  }

  // Convenience: Setup onOff listener
  setupOnOffListener(zclNode, endpoint = 1) {
    return this.setupZclListener(zclNode, 6, 'onOff', endpoint);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE 3: RAW FRAME LISTENER (custom protocols)
  // ═══════════════════════════════════════════════════════════════════════════
  setupFrameListener(zclNode, clusterId, endpoint = 1) {
    const ep = zclNode?.endpoints?.[endpoint];
    const cluster = ep?.clusters?.[clusterId];
    if (!cluster) return false;

    // Hook into handleFrame for raw frame capture
    if (ep.handleFrame) {
      const orig = ep.handleFrame.bind(ep);
      ep.handleFrame = async (cId, frame, meta) => {
        if (cId === clusterId) {
          this.handleFrame(frame, { cluster: cId, meta });
        }
        return orig(cId, frame, meta);
      };
      this._log(`✅ Frame listener ${clusterId}`);
      return true;
    }

    return false;
  }

  handleFrame(frame, context = {}) {
    const buf = Buffer.isBuffer(frame) ? frame : Buffer.from(frame);
    this._log(`Frame: ${buf.toString('hex')}`);
    this._handlers.get('frame')?.(buf, context);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UNIFIED SETUP: Auto-detect and setup all listeners
  // ═══════════════════════════════════════════════════════════════════════════
  setupListener(zclNode, endpoint = 1) {
    let success = false;
    
    // Try Tuya first
    if (this.setupTuyaListener(zclNode, endpoint)) success = true;
    
    // Setup common ZCL listeners if mappings exist
    if (this.zclMappings) {
      for (const [clusterId, attrs] of Object.entries(this.zclMappings)) {
        const attrNames = Object.keys(attrs);
        if (this.setupZclListener(zclNode, Number(clusterId), attrNames, endpoint)) {
          success = true;
        }
      }
    }
    
    return success;
  }

  // Set ZCL mappings: { clusterId: { attrName: { capability, transform, ... } } }
  setZclMappings(mappings) {
    this.zclMappings = mappings;
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
