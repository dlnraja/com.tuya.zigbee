'use strict';

const TuyaDpProfileDevice = require('../../lib/devices/TuyaDpProfileDevice');
const { sendEf00DpMaxFallback } = require('../../lib/zigbee/Ef00OnlyInterview');

// DP layout from zigbee-herdsman-converters tuya.ts ZG-103V (Excellux, modelId Excellux / manufacturer VABRATE)
// (Koen Kanters and contributors); own implementation, credited in CREDITS.md.
// Nothing is written to the Tuya cluster (0xEF00) at pairing. The sensitivity (DP6) is sent only after the user
// changes the setting; the sensor sleeps, so a value that does not go through is retried at its next report.

class VibrationSensorExcelluxZg103vDevice extends TuyaDpProfileDevice {
  profileFor() {
    return {
      capabilities: ['alarm_vibration', 'measure_battery'],
      dps: {
        3: { cap: 'alarm_vibration', kind: 'bool', readOnly: true },
        4: { cap: 'measure_battery', kind: 'value', readOnly: true },
      },
    };
  }

  onProfileValue() { this._flushSensitivity(); }

  _flushSensitivity() {
    if (this._sendingSensitivity || this._destroyed) { return; }
    const v = this.getStoreValue?.('zg103v_pending_sensitivity');
    if (!Number.isFinite(v)) { return; }
    this._sendingSensitivity = true;
    sendEf00DpMaxFallback(this, 6, v, 'value')
      .then((r) => {
        if (r !== false && this.getStoreValue?.('zg103v_pending_sensitivity') === v) {
          return this.unsetStoreValue?.('zg103v_pending_sensitivity');
        }
        return null;
      })
      .catch(() => {})
      .finally(() => { this._sendingSensitivity = false; });
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (typeof super.onSettings === 'function') { await super.onSettings({ oldSettings, newSettings, changedKeys }); }
    if (!(changedKeys || []).includes('zg103v_sensitivity')) { return; }
    const v = Math.max(0, Math.min(50, Math.round(Number(newSettings.zg103v_sensitivity) || 0)));
    await this.setStoreValue?.('zg103v_pending_sensitivity', v)?.catch?.(() => {});
    // Non-blocking: the settings dialog must not wait for a sleeping sensor.
    this._flushSensitivity();
  }
}

module.exports = VibrationSensorExcelluxZg103vDevice;
