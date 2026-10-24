'use strict';

/**
 * P3013 — Moes MG-BJQ002 plug-in siren with RGB night light (`_TZE20C_tjz9ad5g` / TS0601).
 * Source: Koenkk/zigbee-herdsman-converters PR #13201 (Paap, 2026-09-16).
 * DP1 is an alarm-mode ENUM (0 sound, 1 light, 2 sound+light, 3 off), not the TS0216 bool,
 * so the siren runtime is reused with its own RX table and TX encoders.
 */
const SirenDevice = require('../siren/device');
const { SIREN_MG_BJQ002: P, rxTable, sendEncoded } = require('../../lib/tuya/profiles/P3013DedicatedZ2MProfiles');

class SirenMoesMGBJQ002Device extends SirenDevice {
  get mainsPowered() { return true; }

  get plugCapabilities() { return ['onoff', 'volume_set', 'onoff.night_light']; }

  get dpMappings() { return rxTable(P); }

  async onNodeInit(args) {
    await super.onNodeInit(args);
    this._isPureTuyaDP = true;
    this.registerCapabilityListener('onoff', async (v) => this._setOnOff(v));
    this.registerCapabilityListener('volume_set', async (v) => sendEncoded(this, P.encodeVolume(v)));
    if (this.hasCapability('onoff.night_light')) {
      this.registerCapabilityListener('onoff.night_light', async (v) => sendEncoded(this, P.encodeNightLight(v)));
    }
    this.log('[P3013] MG-BJQ002 siren profile active (DP1 enum/5/7/21/22/23)');
  }

  async _setOnOff(value) {
    const mode = this.getSetting?.('mg_alarm_mode') || 'sound_light';
    return sendEncoded(this, P.encodeAlarm(!!value, mode));
  }

  _handleDP(dpId, rawValue) {
    const m = P.rx[dpId];
    if (m && !m.capability) {
      this.setStoreValue?.(`p3013_${m.internal}`, rawValue)?.catch?.(() => {});
      return;
    }
    return super._handleDP(dpId, rawValue);
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (typeof super.onSettings === 'function') {
      await super.onSettings({ oldSettings, newSettings, changedKeys });
    }
    for (const key of changedKeys || []) {
      if (key === 'mg_duration') {await sendEncoded(this, P.encodeDuration(newSettings[key]));}
      if (key === 'mg_ringtone') {await sendEncoded(this, P.encodeRingtone(newSettings[key]));}
      if (key === 'mg_light_mode') {await sendEncoded(this, P.encodeLightMode(newSettings[key]));}
    }
  }
}

module.exports = SirenMoesMGBJQ002Device;
