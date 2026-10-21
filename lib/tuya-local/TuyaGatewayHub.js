'use strict';
/**
 * P2932 — One shared LAN client per Tuya WiFi gateway; each sub-device gets a channel that
 * filters by cid. Respects the single-connection rule (LocalConnectionGate) instead of
 * opening one socket per sub-device. Pattern studied in localtuya / xZetsubou (gateway +
 * cid), tinytuya (Device(..., cid=..., parent=...)) and tuyapi options.cid; own code.
 */
const { EventEmitter } = require('events');

const hubs = new Map(); // gatewayId -> { client, refs }

class SubDeviceChannel extends EventEmitter {
  constructor(gatewayId, cid, entry) {
    super();
    this.gatewayId = gatewayId; this.cid = String(cid); this._entry = entry; this._closed = false;
    const c = entry.client;
    this._h = {
      connected: () => this.emit('connected'),
      disconnected: () => this.emit('disconnected'),
      error: (e) => this.emit('error', e),
      cid: (cid2, dps) => { if (cid2 === this.cid) {Object.assign(this.lastDps, dps); this.emit('dp-update', dps);} },
    };
    this.lastDps = {};
    c.on('connected', this._h.connected); c.on('disconnected', this._h.disconnected);
    c.on('error', this._h.error); c.on('dp-update-cid', this._h.cid);
    this.setMaxListeners(20);
  }
  get connected() { return !!this._entry.client.connected || !!this._entry.client._connected; }
  get ip() { return this._entry.client.ip; }
  get version() { return this._entry.client.version; }
  async connect() { if (!this._entry.connecting) { this._entry.connecting = true; try { await this._entry.client.connect(); } finally { this._entry.connecting = false; } } }
  setDP(dp, value) { return this._entry.client.setSubDP(this.cid, dp, value); }
  setDPs(dps) { return this._entry.client.setSubDPs(this.cid, dps); }
  refresh() { return this._entry.client.refreshSub(this.cid); }
  async detectAvailableDps() { await this.refresh(); return { ...this.lastDps }; }
  updateIP(ip) { this._entry.client.updateIP?.(ip); }
  updateKey(k) { this._entry.client.updateKey?.(k); }
  setCommandGap() {} setFireAndForget() {} setDataTimeout() {} // owned by the gateway client
  async destroy() {
    if (this._closed) {return;}
    this._closed = true;
    const c = this._entry.client;
    c.removeListener('connected', this._h.connected); c.removeListener('disconnected', this._h.disconnected);
    c.removeListener('error', this._h.error); c.removeListener('dp-update-cid', this._h.cid);
    this.removeAllListeners();
    await release(this.gatewayId);
  }
  disconnect() { return this.destroy(); }
}

/**
 * @param {object} gw { id, key, ip, version, ... } gateway credentials
 * @param {string} cid sub-device node id
 * @param {Function} [factory] (opts) => client, defaults to TuyaLocalClient
 */
function openChannel(gw, cid, factory) {
  if (!gw || !gw.id || !cid) {throw new Error('gateway id and cid required');}
  let entry = hubs.get(gw.id);
  if (!entry) {
    const make = factory || ((o) => new (require('./TuyaLocalClient'))(o));
    entry = { client: make(gw), refs: 0, connecting: false };
    if (typeof entry.client.setMaxListeners === 'function') {entry.client.setMaxListeners(100);}
    hubs.set(gw.id, entry);
  }
  entry.refs++;
  return new SubDeviceChannel(gw.id, cid, entry);
}

async function release(gatewayId) {
  const e = hubs.get(gatewayId);
  if (!e) {return;}
  e.refs--;
  if (e.refs <= 0) {
    hubs.delete(gatewayId);
    try { await e.client.destroy(); } catch (_e) { /* best effort */ }
  }
}

function stats() { return [...hubs.entries()].map(([id, e]) => ({ id, refs: e.refs })); }
function _reset() { hubs.clear(); }

module.exports = { openChannel, release, stats, _reset, SubDeviceChannel };
