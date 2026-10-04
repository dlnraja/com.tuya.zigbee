'use strict';

const BaseUnifiedDevice = require('./BaseUnifiedDevice');
const { forcePureTuyaDp, sendEf00DpMaxFallback } = require('../zigbee/Ef00OnlyInterview');
const { decode, encode } = require('../tuya/TuyaDpProfileCodec');

/**
 * Small base for exact-pair TS0601 drivers whose datapoints are described by a profile
 * (R22: one shared engine, per-driver data only).
 *
 * A driver subclass implements `profileFor(manufacturerName)` and returns
 *   { capabilities: [...], dps: { <dp>: { cap, kind, type, divisor, invert } } }
 * kind: 'bool' (on/off), 'value' (number, optional divisor), 'presence' (enum 1 = present),
 *       'coverState' (Tuya enum open 0 / stop 1 / close 2 <-> windowcoverings_state up/idle/down),
 *       'coverPos' (0-100 <-> windowcoverings_set 0-1, optional invert).
 * Capabilities that the profile does not list are removed at init (additive for the listed ones).
 */

class TuyaDpProfileDevice extends BaseUnifiedDevice {
  // eslint-disable-next-line no-unused-vars
  profileFor(manufacturerName) { return null; }

  get _mfr() {
    return String(this.getSetting?.('zb_manufacturer_name') || this.getData?.()?.manufacturerName || '');
  }

  get dpProfile() {
    if (!this._dpProfileCache) { this._dpProfileCache = this.profileFor(this._mfr.toLowerCase()) || { capabilities: [], dps: {} }; }
    return this._dpProfileCache;
  }

  async onNodeInit({ zclNode }) {
    forcePureTuyaDp(this, { force: true });
    await super.onNodeInit({ zclNode });
    const profile = this.dpProfile;

    for (const cap of profile.capabilities) {
      if (!this.hasCapability(cap)) { await this.addCapability(cap).catch((e) => this.log('[DP-PROFILE] add', cap, e.message)); }
    }
    for (const cap of [...this.getCapabilities()]) {
      if (!profile.capabilities.includes(cap) && this.driver?.manifest?.capabilities?.includes(cap)) {
        await this.removeCapability(cap).catch(() => {});
      }
    }

    if (this.tuyaEF00Manager?.on && !this._dpProfileListener) {
      this._dpProfileListener = ({ dpId, value }) => {
        try { this._onProfileDP(Number(dpId), value); } catch (e) { this.log('[DP-PROFILE] rx', dpId, e.message); }
      };
      this.tuyaEF00Manager.on('dpReport', this._dpProfileListener);
    }

    for (const [dp, def] of Object.entries(profile.dps)) {
      if (!def.cap || def.kind === 'presence' || def.readOnly) { continue; }
      if (!this.hasCapability(def.cap)) { continue; }
      this.registerCapabilityListener(def.cap, async (v) => this._sendProfileDP(Number(dp), def, v));
    }
  }

  _onProfileDP(dp, raw) {
    if (this._destroyed) { return; }
    const def = this.dpProfile.dps[dp];
    if (!def || !def.cap || !this.hasCapability(def.cap)) { return; }
    const v = decode(def, raw);
    if (v === null) { return; }
    this.safeSetCapabilityValue(def.cap, v);
    this.onProfileValue?.(def.cap, v);
  }

  async _sendProfileDP(dp, def, v) {
    const { value, type } = encode(def, v);
    const r = await sendEf00DpMaxFallback(this, dp, value, type);
    if (r === false) { throw new Error(`dp_${dp}_not_sent`); }
    return true;
  }

  async onDeleted() {
    if (this.tuyaEF00Manager && this._dpProfileListener) {
      this.tuyaEF00Manager.removeListener('dpReport', this._dpProfileListener);
      this._dpProfileListener = null;
    }
    await super.onDeleted?.();
  }
}

module.exports = TuyaDpProfileDevice;
