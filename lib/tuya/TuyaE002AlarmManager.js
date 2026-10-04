'use strict';

/**
 * TuyaE002AlarmManager — write climate/LCD alarm thresholds on 0xE002
 *
 * WHY P2267: Google/Z2M/ZHA/HA — E002 is alarm config only (not live temp/hum).
 * HOW: named writeAttributes on tuyaE002; soft-fail when cluster absent.
 * Contre quoi: endless beeper / wrong humidity-max ID / blocked settings save.
 */

const TuyaE002Cluster = require('../clusters/TuyaE002Cluster');

const ALARM_KEYS = {
  alarm_temperature_max: 'alarmTemperatureMax',
  alarm_temperature_min: 'alarmTemperatureMin',
  alarm_humidity_max: 'alarmHumidityMax',
  alarm_humidity_min: 'alarmHumidityMin',
  temperature_alarm_mode: 'alarmTemperature',
  humidity_alarm_mode: 'alarmHumidity',
  silence_alarm_beep: 'beepSilence',
};

const MODE_MAP = {
  off: TuyaE002Cluster.ALARM_TYPE.OFF,
  min: TuyaE002Cluster.ALARM_TYPE.MIN,
  max: TuyaE002Cluster.ALARM_TYPE.MAX,
  '0': TuyaE002Cluster.ALARM_TYPE.MIN,
  '1': TuyaE002Cluster.ALARM_TYPE.MAX,
  '2': TuyaE002Cluster.ALARM_TYPE.OFF,
};

/**
 * @param {object} device Homey ZigBeeDevice
 * @param {object} zclNode
 * @param {object} changedSettings settings that changed
 * @param {{ tempScale?: 'celsius'|'centi' }} [opts]
 * @returns {Promise<{ok:boolean, written:string[], error?:string}>}
 */
async function applyE002AlarmSettings(device, zclNode, changedSettings, opts = {}) {
  const written = [];
  if (!changedSettings || typeof changedSettings !== 'object') {
    return { ok: true, written };
  }

  const ep = zclNode?.endpoints?.[1];
  const cluster = ep?.clusters?.tuyaE002
    || ep?.clusters?.manuSpecificTuya2
    || ep?.clusters?.[0xE002]
    || ep?.clusters?.[57346];
  if (!cluster || typeof cluster.writeAttributes !== 'function') {
    return { ok: false, written, error: 'tuyaE002 cluster unavailable' };
  }

  const attrs = {};
  const tempScale = opts.tempScale === 'centi' ? 'centi' : 'celsius';

  for (const [settingId, attrName] of Object.entries(ALARM_KEYS)) {
    if (!Object.prototype.hasOwnProperty.call(changedSettings, settingId)) { continue; }
    const raw = changedSettings[settingId];

    if (settingId === 'silence_alarm_beep') {
      attrs.beepSilence = raw ? TuyaE002Cluster.BEEP_SILENCE_ON : TuyaE002Cluster.BEEP_SILENCE_OFF;
      written.push(settingId);
      continue;
    }

    if (settingId === 'temperature_alarm_mode' || settingId === 'humidity_alarm_mode') {
      const mode = MODE_MAP[String(raw).toLowerCase()];
      if (mode === undefined) { continue; }
      attrs[attrName] = mode;
      written.push(settingId);
      continue;
    }

    const num = Number(raw);
    if (!Number.isFinite(num)) { continue; }

    if (settingId.startsWith('alarm_temperature')) {
      attrs[attrName] = tempScale === 'centi' ? Math.round(num * 100) : Math.round(num);
    } else {
      // humidity whole percent 0–100 (HA/Z2M)
      attrs[attrName] = Math.round(num);
    }
    written.push(settingId);
  }

  if (Object.keys(attrs).length === 0) {
    return { ok: true, written };
  }

  try {
    await cluster.writeAttributes(attrs);
    try { device.log('[E002-ALARM] wrote', JSON.stringify(attrs)); } catch (_e) { /* noop */ }
    return { ok: true, written };
  } catch (err) {
    try { device.log('[E002-ALARM] write failed:', err.message); } catch (_e) { /* noop */ }
    return { ok: false, written, error: err.message };
  }
}

module.exports = {
  applyE002AlarmSettings,
  ALARM_KEYS,
  MODE_MAP,
};
