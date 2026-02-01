'use strict';

/**
 * UniversalDPSender v5.7.27 - Complete Type Support
 * Types: bool, enum, bitmap(1-8bytes), value(1-4bytes), string, raw, frame, class
 */

const DP_TYPES = { raw: 0, bool: 1, value: 2, string: 3, enum: 4, bitmap: 5 };

class UniversalDPSender {
  constructor(device) {
    this.device = device;
    this._workingMethod = null;
  }

  _log(msg) { this.device.log?.(`[DP-TX] ${msg}`); }
  async _try(fn) { try { await fn(); return true; } catch { return false; } }

  _buildBuffer(value, type = 'value', opts = {}) {
    const { size, signed = false, le = false } = opts;
    if (Buffer.isBuffer(value)) return value;
    if (value?.toBuffer) return value.toBuffer();
    if (value?.buffer) return Buffer.from(value.buffer);
    if (value?.data) return Buffer.from(value.data);
    if (value?.bytes) return Buffer.from(value.bytes);
    if (value?.hex) return Buffer.from(String(value.hex).replace(/^0x/i, ''), 'hex');
    if (Array.isArray(value)) return Buffer.from(value);
    if (typeof value === 'string' && type !== 'string') {
      const m = value.match(/^(0x)?([0-9a-fA-F]+)$/);
      if (m && m[2].length % 2 === 0) return Buffer.from(m[2], 'hex');
    }
    
    switch (type) {
      case 'bool': return Buffer.from([value ? 1 : 0]);
      case 'enum': return Buffer.from([Number(value) & 0xFF]);
      case 'bitmap': return this._buildBitmap(value, size, le);
      case 'string': return Buffer.from(String(value), 'utf8');
      case 'raw': case 'frame':
        return typeof value === 'number' ? Buffer.from([value & 0xFF]) : Buffer.from(String(value));
      default: return this._buildValue(value, size, signed, le);
    }
  }

  _buildBitmap(value, sz, le) {
    if (typeof value === 'bigint') {
      const b = []; let v = value;
      while (v > 0n) { b.unshift(Number(v & 0xFFn)); v >>= 8n; }
      if (!b.length) b.push(0);
      while (sz && b.length < sz) b.unshift(0);
      return Buffer.from(le ? b.reverse() : b);
    }
    const v = Number(value) >>> 0;
    const n = sz || (v <= 0xFF ? 1 : v <= 0xFFFF ? 2 : v <= 0xFFFFFF ? 3 : 4);
    const buf = Buffer.alloc(n);
    for (let i = 0; i < n; i++) buf[le ? i : n-1-i] = (v >> (i*8)) & 0xFF;
    return buf;
  }

  _buildValue(value, sz, signed, le) {
    const v = Number(value);
    const n = sz || (signed ? (v >= -128 && v <= 127 ? 1 : v >= -32768 && v <= 32767 ? 2 : 4)
                            : (v >= 0 && v <= 255 ? 1 : v >= 0 && v <= 65535 ? 2 : 4));
    const buf = Buffer.alloc(n);
    if (n === 1) buf.writeUInt8(v & 0xFF, 0);
    else if (n === 2) le ? (signed ? buf.writeInt16LE(v) : buf.writeUInt16LE(v)) : (signed ? buf.writeInt16BE(v) : buf.writeUInt16BE(v));
    else le ? (signed ? buf.writeInt32LE(v) : buf.writeUInt32LE(v>>>0)) : (signed ? buf.writeInt32BE(v) : buf.writeUInt32BE(v>>>0));
    return buf;
  }

  _buildFrame(dpId, type, dataBuf) {
    const f = Buffer.alloc(6 + dataBuf.length);
    f.writeUInt16BE(Math.floor(Math.random() * 65535), 0);
    f[2] = dpId; f[3] = DP_TYPES[type] ?? 2;
    f.writeUInt16BE(dataBuf.length, 4);
    dataBuf.copy(f, 6);
    return f;
  }

  _getTuyaCluster(ep = 1) {
    const e = this.device.zclNode?.endpoints?.[ep];
    return e?.clusters?.tuya || e?.clusters?.manuSpecificTuya || e?.clusters?.[0xEF00] || e?.clusters?.[61184];
  }

  _getZclCluster(id, ep = 1) {
    const e = this.device.zclNode?.endpoints?.[ep];
    return e?.clusters?.[id] || e?.clusters?.[String(id)];
  }

  async sendTuyaDP(dpId, value, dataType = 'value', opts = {}) {
    const buf = this._buildBuffer(value, dataType, opts), dt = DP_TYPES[dataType] ?? 2;
    const c = this._getTuyaCluster(opts.endpoint || 1);
    if (this.device.tuyaEF00Manager?.sendDP && await this._try(() => this.device.tuyaEF00Manager.sendDP(dpId, value, dataType))) {
      this._log(`✅ DP${dpId}=${value} Manager`); return true;
    }
    if (c?.datapoint && await this._try(() => c.datapoint({ dp: dpId, datatype: dt, data: buf }))) {
      this._log(`✅ DP${dpId}=${value} OLD`); return true;
    }
    if (c?.datapoint && await this._try(() => c.datapoint({ data: this._buildFrame(dpId, dataType, buf) }))) {
      this._log(`✅ DP${dpId}=${value} NEW`); return true;
    }
    if (c?.setDataValue && await this._try(() => c.setDataValue({ dp: dpId, datatype: dt, data: buf }))) {
      this._log(`✅ DP${dpId}=${value} SDV`); return true;
    }
    if (c?.command && await this._try(() => c.command('datapoint', { data: this._buildFrame(dpId, dataType, buf) }))) {
      this._log(`✅ DP${dpId}=${value} CMD`); return true;
    }
    return false;
  }

  async sendZCL(clusterId, action, data, opts = {}) {
    const c = this._getZclCluster(clusterId, opts.endpoint || 1);
    if (!c) return false;
    if (action === 'write' && c.writeAttributes && await this._try(() => c.writeAttributes(data))) return true;
    if (c[action] && await this._try(() => c[action](data))) return true;
    if (c.command && await this._try(() => c.command(action, data))) return true;
    return false;
  }

  async sendFrame(clusterId, frame, opts = {}) {
    const c = this._getZclCluster(clusterId, opts.endpoint || 1);
    const buf = Buffer.isBuffer(frame) ? frame : Array.isArray(frame) ? Buffer.from(frame) :
                typeof frame === 'string' ? Buffer.from(frame.replace(/^0x/i, ''), 'hex') : Buffer.from([frame]);
    if (c?.datapoint && await this._try(() => c.datapoint({ data: buf }))) return true;
    if (c?.command && await this._try(() => c.command('datapoint', { data: buf }))) return true;
    return false;
  }

  async sendDP(dpId, value, dataType = 'value', opts = {}) {
    if (opts.mode === 'zcl') return this.sendZCL(opts.cluster || 6, opts.action || 'write', { [dpId]: value }, opts);
    if (opts.mode === 'frame') return this.sendFrame(opts.cluster || 0xEF00, this._buildFrame(dpId, dataType, this._buildBuffer(value, dataType, opts)), opts);
    return this.sendTuyaDP(dpId, value, dataType, opts);
  }

  async sendOnOff(v, opts = {}) { return this.sendZCL(6, v ? 'setOn' : 'setOff', {}, opts); }
  async sendLevel(l, opts = {}) { return this.sendZCL(8, 'moveToLevel', { level: l, transitionTime: 0 }, opts); }
  async sendCoverPos(p, opts = {}) { return this.sendZCL(258, 'goToLiftPercentage', { percentageLiftValue: p }, opts); }
}

const UniversalDPMixin = Base => class extends Base {
  get dpSender() { return this._dpSender || (this._dpSender = new UniversalDPSender(this)); }
  async sendDP(dpId, v, t, o) { return this.dpSender.sendDP(dpId, v, t, o); }
  async sendTuyaDP(dpId, v, t, o) { return this.dpSender.sendTuyaDP(dpId, v, t, o); }
  async sendZCL(c, a, d, o) { return this.dpSender.sendZCL(c, a, d, o); }
  async sendFrame(c, f, o) { return this.dpSender.sendFrame(c, f, o); }
};

module.exports = { UniversalDPSender, UniversalDPMixin, DP_TYPES };
