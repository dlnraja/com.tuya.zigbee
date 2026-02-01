'use strict';
/**
 * UniversalDPSender v5.7.42 - Curtain Motor Fix
 * v5.7.42: FIX - Tuya 'value' type ALWAYS uses 4 bytes (GitHub #122 elgato7)
 * Types: bool, enum, bitmap(1-8bytes+BigInt), value(4bytes fixed), string, raw
 */
const DP_TYPES = { raw: 0, bool: 1, value: 2, string: 3, enum: 4, bitmap: 5 };

class UniversalDPSender {
  constructor(device) { this.device = device; this._cache = {}; }
  _log(m) { this.device.log?.(`[DP-TX] ${m}`); }
  async _try(fn) { try { await fn(); return true; } catch { return false; } }

  _buildBuffer(v, t = 'value', o = {}) {
    if (Buffer.isBuffer(v)) return v;
    if (v?.toBuffer) try { return v.toBuffer(); } catch {}
    if (v?.buffer) try { return Buffer.from(v.buffer); } catch {}
    if (v?.data) try { return Buffer.from(v.data); } catch {}
    if (v?.bytes) try { return Buffer.from(v.bytes); } catch {}
    if (v?.hex) try { return Buffer.from(String(v.hex).replace(/^0x/i,''),'hex'); } catch {}
    if (Array.isArray(v)) return Buffer.from(v);
    if (typeof v === 'string' && t !== 'string') {
      const m = v.match(/^(0x)?([0-9a-fA-F]+)$/);
      if (m && m[2].length % 2 === 0) return Buffer.from(m[2], 'hex');
    }
    const { size: sz, signed: s, le } = o;
    if (t === 'bool') return Buffer.from([v ? 1 : 0]);
    if (t === 'enum') return Buffer.from([Number(v) & 0xFF]);
    if (t === 'bitmap') {
      // BigInt support for >32bit
      if (typeof v === 'bigint') {
        const bytes = []; let n = v;
        while (n > 0n) { bytes.unshift(Number(n & 0xFFn)); n >>= 8n; }
        if (!bytes.length) bytes.push(0);
        while (sz && bytes.length < sz) bytes.unshift(0);
        return Buffer.from(le ? bytes.reverse() : bytes);
      }
      const n = Number(v) >>> 0, len = sz || (n <= 0xFF ? 1 : n <= 0xFFFF ? 2 : n <= 0xFFFFFF ? 3 : 4);
      const b = Buffer.alloc(len);
      for (let i = 0; i < len; i++) b[le ? i : len-1-i] = (n >> (i*8)) & 0xFF;
      return b;
    }
    if (t === 'string') return Buffer.from(String(v ?? ''), 'utf8');
    if (t === 'raw' || t === 'frame') return typeof v === 'number' ? Buffer.from([v & 0xFF]) : Buffer.from(String(v ?? ''));
    const n = Number(v) || 0;
    // v5.7.42: FIX - Tuya 'value' type (datatype 2) ALWAYS uses 4 bytes big-endian
    // GitHub #122 elgato7: DP2 position wasn't working because we sent 1 byte instead of 4
    // Tuya protocol spec: datatype 2 = 32-bit unsigned integer, always 4 bytes
    const len = sz || (t === 'value' ? 4 : (s ? (n >= -128 && n <= 127 ? 1 : n >= -32768 && n <= 32767 ? 2 : 4)
                         : (n >= 0 && n <= 255 ? 1 : n >= 0 && n <= 65535 ? 2 : 4)));
    const b = Buffer.alloc(len);
    if (len === 1) b[0] = n & 0xFF;
    else if (len === 2) le ? (s ? b.writeInt16LE(n) : b.writeUInt16LE(n)) : (s ? b.writeInt16BE(n) : b.writeUInt16BE(n));
    else if (len === 3) {
      const u = n < 0 ? n + 0x1000000 : n;
      if (le) { b[0] = u & 0xFF; b[1] = (u >> 8) & 0xFF; b[2] = (u >> 16) & 0xFF; }
      else { b[0] = (u >> 16) & 0xFF; b[1] = (u >> 8) & 0xFF; b[2] = u & 0xFF; }
    }
    else le ? (s ? b.writeInt32LE(n) : b.writeUInt32LE(n >>> 0)) : (s ? b.writeInt32BE(n) : b.writeUInt32BE(n >>> 0));
    return b;
  }

  _buildFrame(dp, t, buf) {
    const f = Buffer.alloc(6 + buf.length);
    f.writeUInt16BE(Math.floor(Math.random() * 65535), 0);
    f[2] = dp; f[3] = DP_TYPES[t] ?? 2; f.writeUInt16BE(buf.length, 4);
    buf.copy(f, 6); return f;
  }

  _getC(id, ep = 1) {
    const e = this.device.zclNode?.endpoints?.[ep]?.clusters;
    if (!e) return null;
    if (id === 'tuya') return e.tuya || e.manuSpecificTuya || e[0xEF00] || e[61184] || e['61184'];
    return e[id] || e[String(id)] || e[`0x${id.toString(16)}`];
  }

  async sendTuyaDP(dp, v, t = 'value', o = {}) {
    const buf = this._buildBuffer(v, t, o), dt = DP_TYPES[t] ?? 2, fr = this._buildFrame(dp, t, buf);
    const ep = o.endpoint || 1, c = this._getC('tuya', ep), mgr = this.device.tuyaEF00Manager;
    // 1. Manager.sendDP
    if (mgr?.sendDP && await this._try(() => mgr.sendDP(dp, v, t))) { this._log(`✅DP${dp} mgr`); return true; }
    // 2. Manager.writeDP
    if (mgr?.writeDP && await this._try(() => mgr.writeDP(dp, v, t))) { this._log(`✅DP${dp} mgr.write`); return true; }
    // 3. Manager.setDatapoint
    if (mgr?.setDatapoint && await this._try(() => mgr.setDatapoint(dp, v, dt))) { this._log(`✅DP${dp} mgr.set`); return true; }
    if (c) {
      // 4. datapoint OLD
      if (c.datapoint && await this._try(() => c.datapoint({ dp, datatype: dt, data: buf }))) { this._log(`✅DP${dp} OLD`); return true; }
      // 5. datapoint NEW
      if (c.datapoint && await this._try(() => c.datapoint({ data: fr }))) { this._log(`✅DP${dp} NEW`); return true; }
      // 6. setDataValue
      if (c.setDataValue && await this._try(() => c.setDataValue({ dp, datatype: dt, data: buf }))) { this._log(`✅DP${dp} SDV`); return true; }
      // 7. sendData
      if (c.sendData && await this._try(() => c.sendData({ dp, value: v, dataType: dt }))) { this._log(`✅DP${dp} SD`); return true; }
      // 8. writeData
      if (c.writeData && await this._try(() => c.writeData({ dp, datatype: dt, data: buf }))) { this._log(`✅DP${dp} WD`); return true; }
      // 9. command datapoint
      if (c.command && await this._try(() => c.command('datapoint', { data: fr }))) { this._log(`✅DP${dp} CMD`); return true; }
      // 10. command setDatapoint
      if (c.command && await this._try(() => c.command('setDatapoint', { dp, datatype: dt, data: buf }))) { this._log(`✅DP${dp} CMD2`); return true; }
      // 11. writeAttributes
      if (c.writeAttributes && await this._try(() => c.writeAttributes({ [dp]: buf }))) { this._log(`✅DP${dp} WA`); return true; }
      // 12. write
      if (c.write && await this._try(() => c.write({ [dp]: buf }))) { this._log(`✅DP${dp} W`); return true; }
    }
    // 13-15. Try other endpoints
    for (const e of [1,2,3,11,242]) {
      if (e === ep) continue;
      const c2 = this._getC('tuya', e);
      if (c2?.datapoint && await this._try(() => c2.datapoint({ dp, datatype: dt, data: buf }))) { this._log(`✅DP${dp} EP${e}`); return true; }
    }
    this._log(`❌DP${dp} all failed`); return false;
  }

  async sendZCL(cid, act, data, o = {}) {
    const c = this._getC(cid, o.endpoint || 1);
    if (!c) return false;
    // 1. writeAttributes
    if (act === 'write' && c.writeAttributes && await this._try(() => c.writeAttributes(data))) return true;
    // 2. Direct method
    if (c[act] && await this._try(() => c[act](data))) return true;
    // 3. command
    if (c.command && await this._try(() => c.command(act, data))) return true;
    // 4. write
    if (c.write && await this._try(() => c.write(data))) return true;
    // 5. sendCommand
    if (c.sendCommand && await this._try(() => c.sendCommand(act, data))) return true;
    return false;
  }

  async sendFrame(cid, fr, o = {}) {
    const buf = Buffer.isBuffer(fr) ? fr : Array.isArray(fr) ? Buffer.from(fr) : 
                typeof fr === 'string' ? Buffer.from(fr.replace(/^0x/i,''),'hex') : Buffer.from([fr]);
    const c = this._getC(cid, o.endpoint || 1);
    if (c?.datapoint && await this._try(() => c.datapoint({ data: buf }))) return true;
    if (c?.command && await this._try(() => c.command('datapoint', { data: buf }))) return true;
    if (c?.sendFrame && await this._try(() => c.sendFrame(buf))) return true;
    if (c?.write && await this._try(() => c.write({ data: buf }))) return true;
    return false;
  }

  async sendDP(dp, v, t = 'value', o = {}) {
    if (o.mode === 'zcl') return this.sendZCL(o.cluster || 6, o.action || 'write', { [dp]: v }, o);
    if (o.mode === 'frame') return this.sendFrame(o.cluster || 0xEF00, this._buildFrame(dp, t, this._buildBuffer(v, t, o)), o);
    return this.sendTuyaDP(dp, v, t, o);
  }

  async sendOnOff(v, o = {}) { return this.sendZCL(6, v ? 'setOn' : 'setOff', {}, o); }
  async sendLevel(l, o = {}) { return this.sendZCL(8, 'moveToLevel', { level: l, transitionTime: 0 }, o); }
  async sendCoverPos(p, o = {}) { return this.sendZCL(258, 'goToLiftPercentage', { percentageLiftValue: p }, o); }
}

const UniversalDPMixin = Base => class extends Base {
  get dpSender() { return this._dpSender || (this._dpSender = new UniversalDPSender(this)); }
  async sendDP(dp,v,t,o) { return this.dpSender.sendDP(dp,v,t,o); }
  async sendTuyaDP(dp,v,t,o) { return this.dpSender.sendTuyaDP(dp,v,t,o); }
  async sendZCL(c,a,d,o) { return this.dpSender.sendZCL(c,a,d,o); }
  async sendFrame(c,f,o) { return this.dpSender.sendFrame(c,f,o); }
};

module.exports = { UniversalDPSender, UniversalDPMixin, DP_TYPES };
