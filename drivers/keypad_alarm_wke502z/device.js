'use strict';

const TuyaDpProfileDevice = require('../../lib/devices/TuyaDpProfileDevice');
const { sendEf00DpMaxFallback } = require('../../lib/zigbee/Ef00OnlyInterview');

// DP layout from zigbee-herdsman-converters daewoo.ts WKE502Z (_TZE200_rt5dklro) (Koen Kanters and contributors); own implementation, credited in CREDITS.md.
// Nothing is written to the Tuya cluster (0xEF00) at pairing; the endpoint declares only Basic/Groups/Scenes.
// DP23 armed (bool), DP26 disarm / DP27 arm away / DP28 arm home / DP29 SOS are keypad actions. DP101 (hub mode) is
// written once after the first report from the keypad (it is awake then), never during pairing.
const ACTIONS = { 26: 'disarmed', 27: 'armed', 28: 'partially_armed' };
// WHY(P3067 family 7, Z2M daewoo.ts WKE502Z): keypad options. DP103 arm delay 0-180 s, DP111 arm-delay beep;
// DP104 key beep, DP105 quick arm home, DP106 quick disarm, DP107 quick arm away, DP110 quick SOS are volatile
// (lost at every power cycle). Written only when the user changes them, queued until the keypad is awake
// (next report), and the volatile ones the user changed are re-sent after the startup report (DP25).
const OPTION_DPS = {
  wke502z_arm_delay: { dp: 103, type: 'value', volatile: false },
  wke502z_arm_delay_beep: { dp: 111, type: 'bool', volatile: false },
  wke502z_key_beep: { dp: 104, type: 'bool', volatile: true },
  wke502z_quick_home: { dp: 105, type: 'bool', volatile: true },
  wke502z_quick_disarm: { dp: 106, type: 'bool', volatile: true },
  wke502z_quick_arm: { dp: 107, type: 'bool', volatile: true },
  wke502z_quick_sos: { dp: 110, type: 'bool', volatile: true },
};
const asBool = (raw) => raw === true || raw === 1 || (Buffer.isBuffer(raw) && raw[0] === 1);
const asNum = (raw) => Buffer.isBuffer(raw) ? raw.readUIntBE(0, Math.min(raw.length, 4)) : Number(raw);

class KeypadAlarmWke502zDevice extends TuyaDpProfileDevice {
  profileFor() {
    return {
      capabilities: ['measure_battery', 'alarm_tamper', 'homealarm_state', 'alarm_generic'],
      dps: {
        3: { cap: 'measure_battery', kind: 'value', readOnly: true },
        24: { cap: 'alarm_tamper', kind: 'bool', readOnly: true },
      },
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    if (this.hasCapability('homealarm_state')) {
      this.registerCapabilityListener('homealarm_state', async (v) => {
        const r = await sendEf00DpMaxFallback(this, 23, v !== 'disarmed', 'bool');
        if (r === false) { throw new Error('dp_23_not_sent'); }
      });
    }
  }

  _onProfileDP(dp, raw) {
    super._onProfileDP(dp, raw);
    if (this._destroyed) { return; }
    this._onKeypadSession(dp, raw);
    if (ACTIONS[dp] && this.hasCapability('homealarm_state')) {
      this.safeSetCapabilityValue('homealarm_state', ACTIONS[dp]);
      if (dp === 26 && this.hasCapability('alarm_generic')) { this.safeSetCapabilityValue('alarm_generic', false); }
    } else if (dp === 29 && this.hasCapability('alarm_generic')) {
      this.safeSetCapabilityValue('alarm_generic', true);
    } else if (dp === 23 && this.hasCapability('homealarm_state')) {
      const armed = asBool(raw);
      if (!armed) { this.safeSetCapabilityValue('homealarm_state', 'disarmed'); } else if (this.getCapabilityValue('homealarm_state') === 'disarmed') { this.safeSetCapabilityValue('homealarm_state', 'armed'); }
    }
  }

  _onKeypadSession(dp, raw) {
    // WHY(P3067, Z2M daewoo.ts): DP25 is sent only at keypad start-up — the hub-mode flag (DP101) and the
    // volatile options were reset by the power cycle, so send them again.
    if (dp === 25) {
      this._hubModeSent = false;
      this._requeueVolatileOptions();
      if (this.hasCapability('homealarm_state')) {
        this.safeSetCapabilityValue('homealarm_state', asNum(raw) === 2 ? 'armed' : 'disarmed');
      }
    }
    this._ensureHubMode();
    this._flushOptions();
    // WHY(P3067, Z2M daewoo.ts fzAck): the keypad repeats arm away / arm home until the hub writes DP23 = true.
    if (dp === 27 || dp === 28) { this._ackArm(); }
    if (dp === 112) { this._noteUser(asNum(raw)); }
  }

  _ackArm() {
    const now = Date.now();
    if (this._lastAck && now - this._lastAck < 1500) { return; }
    this._lastAck = now;
    sendEf00DpMaxFallback(this, 23, true, 'bool').catch(() => {});
  }

  _noteUser(id) {
    if (!Number.isFinite(id)) { return; }
    this.setStoreValue?.('wke502z_last_user', id)?.catch?.(() => {});
    // WHY: never block the Zigbee receive path on the settings UI
    Promise.resolve().then(() => {
      if (this._destroyed) { return null; }
      return this.setSettings?.({ wke502z_last_user: `${id} (${new Date().toISOString()})` });
    }).catch(() => {});
  }

  _requeueVolatileOptions() {
    const changed = this.getStoreValue?.('wke502z_user_options') || [];
    for (const key of changed) {
      const def = OPTION_DPS[key];
      if (def?.volatile) { this._queueOption(key, this.getSetting?.(key)); }
    }
  }

  _queueOption(key, value) {
    const def = OPTION_DPS[key];
    if (!def || value === undefined || value === null) { return; }
    if (!this._pendingOptions) { this._pendingOptions = new Map(); }
    this._pendingOptions.set(key, def.type === 'bool' ? Boolean(value) : Math.max(0, Math.min(180, Math.round(Number(value) || 0))));
  }

  _flushOptions() {
    if (!this._pendingOptions?.size || this._flushingOptions) { return; }
    this._flushingOptions = true;
    const items = [...this._pendingOptions.entries()];
    (async () => {
      for (const [key, value] of items) {
        const def = OPTION_DPS[key];
        const r = await sendEf00DpMaxFallback(this, def.dp, value, def.type).catch(() => false);
        if (r !== false && this._pendingOptions.get(key) === value) { this._pendingOptions.delete(key); }
      }
    })().catch(() => {}).finally(() => { this._flushingOptions = false; });
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (typeof super.onSettings === 'function') { await super.onSettings({ oldSettings, newSettings, changedKeys }); }
    const mine = (changedKeys || []).filter((k) => OPTION_DPS[k]);
    if (!mine.length) { return; }
    const known = new Set(this.getStoreValue?.('wke502z_user_options') || []);
    for (const k of mine) { known.add(k); this._queueOption(k, newSettings[k]); }
    this.setStoreValue?.('wke502z_user_options', [...known])?.catch?.(() => {});
    // Non-blocking: the keypad sleeps; anything not delivered now goes out with its next report.
    this._flushOptions();
  }

  _ensureHubMode() {
    // WHY(P3067, Z2M daewoo.ts): DP101 resets at every power cycle — send once per app session and after
    // each start-up report (DP25), not once forever.
    if (this._hubModeSent) { return; }
    this._hubModeSent = true;
    sendEf00DpMaxFallback(this, 101, true, 'bool')
      .then((r) => { if (r !== false) { return this.setStoreValue('wke502z_hub_mode', true); } this._hubModeSent = false; return null; })
      .catch(() => { this._hubModeSent = false; });
  }
}

module.exports = KeypadAlarmWke502zDevice;
