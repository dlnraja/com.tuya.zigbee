'use strict';

const TuyaDpProfileDevice = require('../../lib/devices/TuyaDpProfileDevice');
const { sendEf00DpMaxFallback } = require('../../lib/zigbee/Ef00OnlyInterview');

// DP layout from zigbee-herdsman-converters daewoo.ts WKE502Z (_TZE200_rt5dklro) (Koen Kanters and contributors); own implementation, credited in CREDITS.md.
// Nothing is written to the Tuya cluster (0xEF00) at pairing; the endpoint declares only Basic/Groups/Scenes.
// DP23 armed (bool), DP26 disarm / DP27 arm away / DP28 arm home / DP29 SOS are keypad actions. DP101 (hub mode) is
// written once after the first report from the keypad (it is awake then), never during pairing.
const ACTIONS = { 26: 'disarmed', 27: 'armed', 28: 'partially_armed' };

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
    this._ensureHubMode();
    if (ACTIONS[dp] && this.hasCapability('homealarm_state')) {
      this.safeSetCapabilityValue('homealarm_state', ACTIONS[dp]);
      if (dp === 26 && this.hasCapability('alarm_generic')) { this.safeSetCapabilityValue('alarm_generic', false); }
    } else if (dp === 29 && this.hasCapability('alarm_generic')) {
      this.safeSetCapabilityValue('alarm_generic', true);
    } else if (dp === 23 && this.hasCapability('homealarm_state')) {
      const armed = raw === true || raw === 1 || (Buffer.isBuffer(raw) && raw[0] === 1);
      if (!armed) { this.safeSetCapabilityValue('homealarm_state', 'disarmed'); } else if (this.getCapabilityValue('homealarm_state') === 'disarmed') { this.safeSetCapabilityValue('homealarm_state', 'armed'); }
    }
  }

  _ensureHubMode() {
    if (this._hubModeSent || this.getStoreValue?.('wke502z_hub_mode')) { return; }
    this._hubModeSent = true;
    sendEf00DpMaxFallback(this, 101, true, 'bool')
      .then((r) => { if (r !== false) { return this.setStoreValue('wke502z_hub_mode', true); } this._hubModeSent = false; return null; })
      .catch(() => { this._hubModeSent = false; });
  }
}

module.exports = KeypadAlarmWke502zDevice;
