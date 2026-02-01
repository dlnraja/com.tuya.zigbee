'use strict';

/**
 * UniversalDPSender v5.7.22 - Intelligent Fallback Chain
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

  _buildBuffer(value, type) {
    if (type === 'bool') return Buffer.from([value ? 1 : 0]);
    if (type === 'enum' || type === 'bitmap') return Buffer.from([value & 0xFF]);
    if (type === 'string') return Buffer.from(String(value), 'utf8');
    if (type === 'raw') return Buffer.isBuffer(value) ? value : Buffer.from([value]);
    const buf = Buffer.alloc(4); buf.writeInt32BE(value, 0); return buf;
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
      const ok = await this._tryMethod(this._workingMethod, dpId, dt, dataBuf, cluster);
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

  async _tryMethod(method, dpId, dt, dataBuf, cluster) {
    if (method === 'manager' && this.device.tuyaEF00Manager?.sendDP) {
      return this._try(() => this.device.tuyaEF00Manager.sendDP(dpId, dataBuf[0], 'value'));
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
