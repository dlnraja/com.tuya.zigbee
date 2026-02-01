'use strict';

/**
 * UniversalDPSender v5.7.25 - Complete Data Format Support
 * Handles: bool, value (1-4 bytes), enum, bitmap (1-4 bytes), string, raw, hex, array
 * Smart logging: Only logs success or final failure (no spam)
 * Caches working method per device for faster subsequent calls
 */

const DP_TYPES = { raw: 0, bool: 1, value: 2, string: 3, enum: 4, bitmap: 5 };

class UniversalDPSender {
  constructor(device) {
    this.device = device;
    this._commFailures = 0;
    this._lastCommSuccess = 0;
    this._workingMethod = null;
    this._lastLog = { key: '', time: 0, count: 0 };
  }

  // Throttled logging - no spam
  _log(msg, force = false) {
    const now = Date.now();
    const key = msg.slice(0, 20);
    if (!force && this._lastLog.key === key && now - this._lastLog.time < 2000) {
      this._lastLog.count++;
      return;
    }
    if (this._lastLog.count > 0) this._lastLog.count = 0;
    this._lastLog = { key, time: now, count: 0 };
    this.device.log?.(`[DP] ${msg}`);
  }

  /**
   * Build data buffer from ANY input format
   * Supports: bool, value (auto-size 1-4 bytes), enum, bitmap (1-4 bytes),
   *           string, raw Buffer, hex string, array, object
   */
  _buildBuffer(value, type, opts = {}) {
    // Already a Buffer - return as-is
    if (Buffer.isBuffer(value)) return value;
    
    // Hex string: "0x1234" or "1234" (even length)
    if (typeof value === 'string' && /^(0x)?[0-9a-fA-F]+$/.test(value) && type !== 'string') {
      const hex = value.replace(/^0x/i, '');
      if (hex.length % 2 === 0) return Buffer.from(hex, 'hex');
    }
    
    // Array of bytes
    if (Array.isArray(value)) return Buffer.from(value);
    
    // Object with buffer/data property
    if (value && typeof value === 'object') {
      if (value.buffer) return Buffer.isBuffer(value.buffer) ? value.buffer : Buffer.from(value.buffer);
      if (value.data) return Buffer.isBuffer(value.data) ? value.data : Buffer.from(value.data);
    }
    
    // Type-specific handling
    switch (type) {
      case 'bool':
        return Buffer.from([value ? 1 : 0]);
        
      case 'enum':
        return Buffer.from([Number(value) & 0xFF]);
        
      case 'bitmap': {
        // Auto-size: 1, 2, or 4 bytes based on value magnitude
        const v = Number(value) >>> 0; // Force unsigned 32-bit
        if (v <= 0xFF) return Buffer.from([v]);
        if (v <= 0xFFFF) { const b = Buffer.alloc(2); b.writeUInt16BE(v); return b; }
        const b = Buffer.alloc(4); b.writeUInt32BE(v); return b;
      }
        
      case 'string':
        return Buffer.from(String(value), 'utf8');
        
      case 'raw':
        if (typeof value === 'number') return Buffer.from([value & 0xFF]);
        return Buffer.from(String(value), 'utf8');
        
      case 'value':
      default: {
        // Auto-size integer: 1, 2, or 4 bytes based on value
        const v = Number(value);
        const forceSize = opts.size;
        if (forceSize === 1 || (!forceSize && v >= -128 && v <= 255)) {
          return Buffer.from([v & 0xFF]);
        }
        if (forceSize === 2 || (!forceSize && v >= -32768 && v <= 65535)) {
          const b = Buffer.alloc(2);
          v < 0 ? b.writeInt16BE(v) : b.writeUInt16BE(v);
          return b;
        }
        // Default 4 bytes
        const buf = Buffer.alloc(4);
        v < 0 ? buf.writeInt32BE(v) : buf.writeUInt32BE(v >>> 0);
        return buf;
      }
    }
  }

  _buildFrame(dpId, type, dataBuf) {
    const dt = DP_TYPES[type] ?? 2;
    const cmd = Buffer.alloc(6 + dataBuf.length);
    cmd.writeUInt16BE(Math.floor(Math.random() * 65535), 0);
    cmd[2] = dpId; cmd[3] = dt;
    cmd.writeUInt16BE(dataBuf.length, 4);
    dataBuf.copy(cmd, 6);
    return cmd;
  }

  _getCluster(ep = 1) {
    const e = this.device.zclNode?.endpoints?.[ep];
    return e?.clusters?.tuya || e?.clusters?.manuSpecificTuya || 
           e?.clusters?.[0xEF00] || e?.clusters?.[61184] || e?.clusters?.['61184'];
  }

  // Silent try - no logging on failure
  async _try(fn) {
    try { await fn(); return true; } catch { return false; }
  }

  /**
   * Send DP with intelligent 7-level fallback (silent until success/final fail)
   */
  async sendDP(dpId, value, dataType = 'value', opts = {}) {
    const { endpoint = 1, retries = 2 } = opts;
    const dataBuf = this._buildBuffer(value, dataType);
    const dt = DP_TYPES[dataType] ?? 2;
    const cluster = this._getCluster(endpoint);

    // Try cached working method first (fast path)
    if (this._workingMethod) {
      const ok = await this._tryMethod(this._workingMethod, dpId, dt, dataBuf, cluster, value, dataType);
      if (ok) {
        this._recordSuccess();
        return true;
      }
      this._workingMethod = null; // Cache miss, try all
    }

    // Full fallback chain (silent)
    for (let attempt = 0; attempt <= retries; attempt++) {
      // 1. TuyaEF00Manager
      if (this.device.tuyaEF00Manager?.sendDP) {
        if (await this._try(() => this.device.tuyaEF00Manager.sendDP(dpId, value, dataType))) {
          this._workingMethod = 'manager';
          this._log(`✅ DP${dpId}=${value} via manager`, true);
          this._recordSuccess();
          return true;
        }
      }

      if (cluster) {
        // 2. OLD format { dp, datatype, data }
        if (typeof cluster.datapoint === 'function') {
          if (await this._try(() => cluster.datapoint({ dp: dpId, datatype: dt, data: dataBuf }))) {
            this._workingMethod = 'old';
            this._log(`✅ DP${dpId}=${value} via OLD format`, true);
            this._recordSuccess();
            return true;
          }
          // 3. NEW format { data: frame }
          if (await this._try(() => cluster.datapoint({ data: this._buildFrame(dpId, dataType, dataBuf) }))) {
            this._workingMethod = 'new';
            this._log(`✅ DP${dpId}=${value} via NEW format`, true);
            this._recordSuccess();
            return true;
          }
        }

        // 4. setDataValue
        if (typeof cluster.setDataValue === 'function') {
          if (await this._try(() => cluster.setDataValue({ dp: dpId, datatype: dt, data: dataBuf }))) {
            this._workingMethod = 'sdv';
            this._log(`✅ DP${dpId}=${value} via setDataValue`, true);
            this._recordSuccess();
            return true;
          }
        }

        // 5. sendData
        if (typeof cluster.sendData === 'function') {
          if (await this._try(() => cluster.sendData({ dp: dpId, value, dataType: dt }))) {
            this._workingMethod = 'sd';
            this._log(`✅ DP${dpId}=${value} via sendData`, true);
            this._recordSuccess();
            return true;
          }
        }

        // 6. writeAttributes (some devices)
        if (typeof cluster.writeAttributes === 'function') {
          if (await this._try(() => cluster.writeAttributes({ [dpId]: value }))) {
            this._workingMethod = 'wa';
            this._log(`✅ DP${dpId}=${value} via writeAttributes`, true);
            this._recordSuccess();
            return true;
          }
        }

        // 7. Raw command
        if (typeof cluster.command === 'function') {
          const frame = this._buildFrame(dpId, dataType, dataBuf);
          if (await this._try(() => cluster.command('datapoint', { data: frame }))) {
            this._workingMethod = 'cmd';
            this._log(`✅ DP${dpId}=${value} via command`, true);
            this._recordSuccess();
            return true;
          }
        }
      }

      // Wait before retry (exponential backoff)
      if (attempt < retries) await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
    }

    // All methods failed - log once
    this._commFailures++;
    this._log(`❌ DP${dpId}=${value} failed (all methods)`, true);
    return false;
  }

  async _tryMethod(method, dpId, dt, dataBuf, cluster, originalValue, dataType) {
    if (method === 'manager' && this.device.tuyaEF00Manager?.sendDP) {
      // Pass original value and type to manager, not truncated buffer
      return this._try(() => this.device.tuyaEF00Manager.sendDP(dpId, originalValue, dataType));
    }
    if (!cluster) return false;
    if (method === 'old') return this._try(() => cluster.datapoint({ dp: dpId, datatype: dt, data: dataBuf }));
    if (method === 'new') return this._try(() => cluster.datapoint({ data: this._buildFrame(dpId, 'value', dataBuf) }));
    if (method === 'sdv') return this._try(() => cluster.setDataValue({ dp: dpId, datatype: dt, data: dataBuf }));
    if (method === 'sd') return this._try(() => cluster.sendData({ dp: dpId, value: dataBuf[0], dataType: dt }));
    if (method === 'wa') return this._try(() => cluster.writeAttributes({ [dpId]: dataBuf[0] }));
    if (method === 'cmd') return this._try(() => cluster.command('datapoint', { data: this._buildFrame(dpId, 'value', dataBuf) }));
    return false;
  }

  _recordSuccess() {
    this._commFailures = 0;
    this._lastCommSuccess = Date.now();
  }

  get isHealthy() { return this._commFailures < 5; }
}

function UniversalDPMixin(Base) {
  return class extends Base {
    _getDPSender() {
      if (!this._universalDPSender) this._universalDPSender = new UniversalDPSender(this);
      return this._universalDPSender;
    }
    async _sendTuyaDPUniversal(dpId, value, dataType = 'value', opts = {}) {
      return this._getDPSender().sendDP(dpId, value, dataType, opts);
    }
  };
}

module.exports = { UniversalDPSender, UniversalDPMixin, DP_TYPES };
