'use strict';
/**
 * GangCountAdapter — P2794 runtime gang detection for switches (additive, non-blocking).
 *
 * Some couples (manufacturerName + productId) stay listed on two switch drivers with different gang
 * counts because the evidence does not pick one (typically TS0601). After pairing, the device itself
 * tells us its gang count:
 *   - Tuya DP devices: boolean DPs 1..N reported by the device (DP1 alone = 1 gang, DP1+DP2 = 2, …);
 *   - ZCL devices: endpoints 1..N carrying the onOff cluster.
 * What the adapter does:
 *   - always: logs a one-time hint and stores it (store key "gang_adapter_hint") when the observed gang
 *     count differs from the driver's gang count, naming the driver that matches it;
 *   - only for couples listed in lib/data/dual-couple-adapt.json: adds the missing onoff.gangN
 *     capabilities (and their listeners) when more gangs are observed than the driver has, and removes
 *     again only capabilities it added itself if later evidence shows fewer gangs. Capabilities from the
 *     driver manifest are never removed, so existing flows keep working.
 * Every step is wrapped; a failure never blocks the device.
 */
const MAX_GANGS = 6;
const EVAL_DELAY_MS = 15000;
let ADAPT = null;

function adaptList() {
  if (ADAPT === null) {
    try { ADAPT = require('../data/dual-couple-adapt.json').couples || {}; } catch (_e) { ADAPT = {}; }
  }
  return ADAPT;
}

const isBoolLike = (v) => typeof v === 'boolean' || v === 0 || v === 1;

/** Pure: contiguous boolean DPs from 1 → gang count (0 when DP1 was never seen). */
function gangsFromDps(dpSet) {
  let n = 0;
  while (n < MAX_GANGS && dpSet.has(n + 1)) {n++;}
  return n;
}

/** Pure: endpoints 1..N with an onOff cluster. */
function gangsFromEndpoints(zclNode) {
  let n = 0;
  try {
    for (let ep = 1; ep <= MAX_GANGS; ep++) {
      const e = zclNode && zclNode.endpoints && zclNode.endpoints[ep];
      if (e && e.clusters && (e.clusters.onOff || e.clusters.genOnOff)) {n = ep;} else {break;}
    }
  } catch (_e) { /* ignore */ }
  return n;
}

class GangCountAdapter {
  constructor(device) {
    this.device = device;
    this.dps = new Set();
    this.epGangs = 0;
    this.timer = null;
    this.hinted = false;
    const mfr = String(device.getSetting?.('zb_manufacturer_name') || device.getData?.()?.manufacturerName || '').toLowerCase();
    const pid = String(device.getSetting?.('zb_model_id') || device.getData?.()?.productId || '').toUpperCase();
    this.key = `${mfr}|${pid}`;
    this.adaptive = Object.prototype.hasOwnProperty.call(adaptList(), this.key);
  }

  get driverGangs() { return Math.max(1, Number(this.device.gangCount) || 1); }

  added() {
    try { return (this.device.getStoreValue?.('gang_adapter_added') || []).filter((n) => Number.isInteger(n)); } catch (_e) { return []; }
  }

  /** Re-register listeners for capabilities the adapter added in an earlier session. */
  init(zclNode) {
    try {
      this.epGangs = gangsFromEndpoints(zclNode);
      for (const g of this.added()) {this._listen(g);}
      if (this.epGangs > 1) {this._schedule();}
    } catch (e) { this.device.log?.(`[GANG-ADAPTER] init skipped: ${e.message}`); }
  }

  observeDp(dpId, value) {
    try {
      const dp = Number(dpId);
      if (!Number.isInteger(dp) || dp < 1 || dp > MAX_GANGS || !isBoolLike(value)) {return;}
      if (this.dps.has(dp)) {return;}
      this.dps.add(dp);
      this._schedule();
    } catch (_e) { /* never block DP handling */ }
  }

  detected() { return Math.max(gangsFromDps(this.dps), this.epGangs > 1 ? this.epGangs : 0); }

  _schedule() {
    if (this.timer) {return;}
    const set = this.device.homey?.setTimeout ? this.device.homey.setTimeout.bind(this.device.homey) : setTimeout;
    this.timer = set(() => { this.timer = null; this.evaluate().catch(() => {}); }, EVAL_DELAY_MS);
  }

  _listen(g) {
    const cap = `onoff.gang${g}`;
    if (!this.device.hasCapability?.(cap) || typeof this.device._setGangOnOff !== 'function') {return;}
    try { this.device.registerCapabilityListener(cap, async (v) => this.device._setGangOnOff(g, v)); } catch (_e) { /* already registered */ }
  }

  async evaluate() {
    const n = this.detected();
    const g = this.driverGangs;
    if (!n || n === g) {return;}
    if (!this.hinted) {
      this.hinted = true;
      const better = `switch_${n}gang`;
      this.device.log?.(`[GANG-ADAPTER] device reports ${n} gang(s), driver has ${g}; a closer match is ${better} (${this.key})`);
      await this.device.setStoreValue?.('gang_adapter_hint', { observed: n, driver: g, suggest: better, key: this.key, at: Date.now() }).catch?.(() => {});
    }
    if (!this.adaptive) {return;}
    const added = new Set(this.added());
    if (n > g) {
      for (let k = Math.max(2, g + 1); k <= n; k++) {
        const cap = `onoff.gang${k}`;
        if (this.device.hasCapability(cap)) {continue;}
        try {
          await this.device.addCapability(cap);
          added.add(k);
          this._listen(k);
          this.device.log?.(`[GANG-ADAPTER] added ${cap}`);
        } catch (e) { this.device.log?.(`[GANG-ADAPTER] could not add ${cap}: ${e.message}`); }
      }
    } else {
      for (const k of [...added]) {
        if (k <= n) {continue;}
        try { await this.device.removeCapability(`onoff.gang${k}`); added.delete(k); } catch (_e) { /* keep */ }
      }
    }
    await this.device.setStoreValue?.('gang_adapter_added', [...added].sort())?.catch?.(() => {});
  }

  destroy() {
    try {
      if (this.timer && this.device.homey && typeof this.device.homey.clearTimeout === 'function') {this.device.homey.clearTimeout(this.timer);}
      else if (this.timer) {clearTimeout(this.timer);}
    } catch (_e) { /* ignore */ }
    this.timer = null;
  }
}

module.exports = { GangCountAdapter, gangsFromDps, gangsFromEndpoints };
