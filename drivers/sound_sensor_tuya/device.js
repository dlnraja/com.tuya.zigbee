'use strict';

const TuyaDpProfileDevice = require('../../lib/devices/TuyaDpProfileDevice');
const { sendEf00DpMaxFallback } = require('../../lib/zigbee/Ef00OnlyInterview');

// DP layout from zigbee-herdsman-converters tuya.ts "ZY-N1" (Koen Kanters and contributors); own implementation.
// DP1 sound level (dB, raw), DP101 debounced state enum: 0 noise, 2 noise 2 min, 3 noise 5 min count as "noise detected".
// The firmware only pushes DP1 when DP102 (report threshold) is not "no_report", so the chosen threshold is written once.
const THRESHOLDS = { '1_db': 0, '3_db': 1, '5_db': 2, '10_db': 3, '20_db': 4, no_report: 5 };
const NUMERIC_SETTINGS = { noise_upper_limit: 20, noise_hold_time: 22, noise_delay: 103 };

class SoundSensorTuyaDevice extends TuyaDpProfileDevice {
  get mainsPowered() { return true; }

  profileFor() {
    return {
      capabilities: ['measure_noise', 'alarm_generic'],
      dps: {
        1: { cap: 'measure_noise', kind: 'value', readOnly: true },
        101: { cap: 'alarm_generic', kind: 'inSet', set: [0, 2, 3] },
      },
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    if (!this.getStoreValue('zyn1_threshold_applied')) {
      const key = this.getSetting('report_threshold') || '3_db';
      const ok = await sendEf00DpMaxFallback(this, 102, THRESHOLDS[key] ?? 1, 'enum').catch(() => false);
      if (ok !== false) { await this.setStoreValue('zyn1_threshold_applied', true).catch(() => {}); }
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (typeof super.onSettings === 'function') { await super.onSettings({ oldSettings, newSettings, changedKeys }); }
    for (const key of changedKeys || []) {
      if (key === 'report_threshold' && THRESHOLDS[newSettings[key]] !== undefined) {
        await sendEf00DpMaxFallback(this, 102, THRESHOLDS[newSettings[key]], 'enum');
      } else if (NUMERIC_SETTINGS[key]) {
        await sendEf00DpMaxFallback(this, NUMERIC_SETTINGS[key], Math.round(Number(newSettings[key])), 'value');
      } else if (key === 'indicator') {
        await sendEf00DpMaxFallback(this, 23, Boolean(newSettings[key]), 'bool');
      }
    }
  }
}

module.exports = SoundSensorTuyaDevice;
