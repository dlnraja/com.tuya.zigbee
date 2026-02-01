'use strict';

/**
 * UniversalDPSender v5.7.26 - Native Homey Methods + All Data Formats
 * MODES: TUYA_DP, ZCL, FRAME
 */

const DP_TYPES = { raw: 0, bool: 1, value: 2, string: 3, enum: 4, bitmap: 5 };

class UniversalDPSender {
  constructor(device) {
    this.device = device;
    this._workingMethod = null;
  }

  _log(msg) { this.device.log?.(`[DP-TX] ${msg}`); }
  async _try(fn) { try { await fn(); return true; } catch { return false; } }

  _buildBuffer(value, type, opts = {}) {
    if (Buffer.isBuffer(value)) return value;
    if (typeof value === 'string' && /^(0x)?[0-9a-fA-F]+$/.test(value) && type !== 'string') {
      const hex = value.replace(/^0x/i, '');
      if (hex.length % 2 === 0) return Buffer.from(hex, 'hex');
    }
    if (Array.isArray(value)) return Buffer.from(value);
    if (value?.buffer) return Buffer.from(value.buffer);
    if (value?.data) return Buffer.from(value.data);
    
    switch (type) {
      case 'bool': return Buffer.from([value ? 1 : 0]);
      case 'enum': return Buffer.from([Number(value) & 0xFF]);
      case 'bitmap': {
        const v = Number(value) >>> 0;
        if (v <= 0xFF) return Buffer.from([v]);
        if (v <= 0xFFFF) { const b = Buffer.alloc(2); b.writeUInt16BE(v); return b; }
        const b = Buffer.alloc(4); b.writeUInt32BE(v); return b;
      }
      case 'string': return Buffer.from(String(value), 'utf8');
      case 'raw': return typeof value === 'number' ? Buffer.from([value & 0xFF]) : Buffer.from(String(value));
      default: {
        const v = Number(value), sz = opts.size;
        if (sz === 1 || (!sz && v >= -128 && v <= 255)) return Buffer.from([v & 0xFF]);
        if (sz === 2 || (!sz && v >= -32768 && v <= 65535)) {
          const b = Buffer.alloc(2); v < 0 ? b.writeInt16BE(v) : b.writeUInt16BE(v); return b;
        }
        const buf = Buffer.alloc(4); v < 0 ? buf.writeInt32BE(v) : buf.writeUInt32BE(v >>> 0); return buf;
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

  _getTuyaCluster(ep = 1) {
    const e = this.device.zclNode?.endpoints?.[ep];
    return e?.clusters?.tuya || e?.clusters?.manuSpecificTuya || e?.clusters?.[0xEF00] || e?.clusters?.[61184];
  }

  _getZclCluster(id, ep = 1) {
    const e = this.device.zclNode?.endpoints?.[ep];
    return e?.clusters?.[id] || e?.clusters?.[String(id)];
  }

  // MODE 1: TUYA DP
  async sendTuyaDP(dpId, value, dataType = 'value', opts = {}) {
    const dataBuf = this._buildBuffer(value, dataType, opts);
    const dt = DP_TYPES[dataType] ?? 2;
    const cluster = this._getTuyaCluster(opts.endpoint || 1);

    if (this.device.tuyaEF00Manager?.sendDP) {
      if (await this._try(() => this.device.tuyaEF00Manager.sendDP(dpId, value, dataType))) {
        this._log(`✅ DP${dpId}=${value} via Manager`); return true;
      }
    }
    if (cluster?.datapoint) {
      if (await this._try(() => cluster.datapoint({ dp: dpId, datatype: dt, data: dataBuf }))) {
        this._log(`✅ DP${dpId}=${value} via OLD`); return true;
      }
      if (await this._try(() => cluster.datapoint({ data: this._buildFrame(dpId, dataType, dataBuf) }))) {
        this._log(`✅ DP${dpId}=${value} via NEW`); return true;
      }
    }
    if (cluster?.setDataValue && await this._try(() => cluster.setDataValue({ dp: dpId, datatype: dt, data: dataBuf }))) {
      this._log(`✅ DP${dpId}=${value} via SDV`); return true;
    }
    if (cluster?.command && await this._try(() => cluster.command('datapoint', { data: this._buildFrame(dpId, dataType, dataBuf) }))) {
      this._log(`✅ DP${dpId}=${value} via CMD`); return true;
    }
    return false;
  }

  // MODE 2: ZCL NATIVE
  async sendZCL(clusterId, action, data, opts = {}) {
    const cluster = this._getZclCluster(clusterId, opts.endpoint || 1);
    if (!cluster) return false;
    if (action === 'write' && cluster.writeAttributes && await this._try(() => cluster.writeAttributes(data))) {
      this._log(`✅ ZCL write ${clusterId}`); return true;
    }
    if (cluster[action] && await this._try(() => cluster[action](data))) {
      this._log(`✅ ZCL ${action} ${clusterId}`); return true;
    }
    if (cluster.command && await this._try(() => cluster.command(action, data))) {
      this._log(`✅ ZCL cmd ${clusterId}.${action}`); return true;
    }
    return false;
  }

  async sendOnOff(value, opts = {}) { return this.sendZCL(6, value ? 'setOn' : 'setOff', {}, opts); }
  async sendLevel(level, opts = {}) { return this.sendZCL(8, 'moveToLevel', { level, transitionTime: 0 }, opts); }
  async sendCoverPos(pos, opts = {}) { return this.sendZCL(258, 'goToLiftPercentage', { percentageLiftValue: pos }, opts); }

  // MODE 3: RAW FRAME
  async sendFrame(clusterId, frame, opts = {}) {
    const cluster = this._getZclCluster(clusterId, opts.endpoint || 1);
    const buf = Buffer.isBuffer(frame) ? frame : Array.isArray(frame) ? Buffer.from(frame) :
                typeof frame === 'string' ? Buffer.from(frame.replace(/^0x/i, ''), 'hex') : Buffer.from([frame]);
    if (cluster?.datapoint && await this._try(() => cluster.datapoint({ data: buf }))) {
      this._log(`✅ Frame ${clusterId}: ${buf.toString('hex')}`); return true;
    }
    if (cluster?.command && await this._try(() => cluster.command('datapoint', { data: buf }))) {
      this._log(`✅ Frame cmd ${clusterId}`); return true;
    }
    return false;
  }

  // UNIFIED: Auto-detect mode
  async sendDP(dpId, value, dataType = 'value', opts = {}) {
    const { mode = 'auto' } = opts;
    if (mode === 'zcl') return this.sendZCL(opts.cluster || 6, opts.action || 'write', { [dpId]: value }, opts);
    if (mode === 'frame') return this.sendFrame(opts.cluster || 0xEF00, this._buildFrame(dpId, dataType, this._buildBuffer(value, dataType, opts)), opts);
    return this.sendTuyaDP(dpId, value, dataType, opts);
  }
}

const UniversalDPMixin = Base => class extends Base {
  get dpSender() { return this._dpSender || (this._dpSender = new UniversalDPSender(this)); }
  async sendDP(dpId, value, dataType, opts) { return this.dpSender.sendDP(dpId, value, dataType, opts); }
  async sendTuyaDP(dpId, value, dataType, opts) { return this.dpSender.sendTuyaDP(dpId, value, dataType, opts); }
  async sendZCL(clusterId, action, data, opts) { return this.dpSender.sendZCL(clusterId, action, data, opts); }
  async sendFrame(clusterId, frame, opts) { return this.dpSender.sendFrame(clusterId, frame, opts); }
};

module.exports = { UniversalDPSender, UniversalDPMixin, DP_TYPES };
