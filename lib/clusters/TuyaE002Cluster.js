'use strict';

const { Cluster, ZCLDataTypes } = require('zigbee-clusters');

/**
 * TuyaE002Cluster — 0xE002 (57346) = Z2M `manuSpecificTuya2`
 *
 * Sources (Google 0xE002 Tuya sweep P2267):
 * - Z2M zigbee-herdsman-converters addManuSpecificTuya2Cluster (INT16 thresholds, humidity max 0xD00D)
 * - ZHA ts0201.py / Abysim Neo (alarm-only; readings on ZCL 0x0402/0x0405)
 * - zigpy #823 ValueAlarm: 0=MIN, 1=MAX, 2=OFF
 * - HA community: write 0xD010=1 silences beeper on some TS0201 LCD
 * - Zigbee-Peek-and-Poke: E002 = alarm/threshold (scannable ZCL attrs, not EF00 DP)
 *
 * Dual-use (Homey one-ID registration):
 * - Climate/LCD alarm thresholds (0xD00*)
 * - Linptech/Moes ES1ZZ radar attrs (0xE00*) — interview often lists 57346
 *
 * Contre quoi: wrong humidity-max ID (0xD00C), uint16 vs int16, silent beeper with no setting.
 */
class TuyaE002Cluster extends Cluster {
  static get ID() { return 0xE002; }
  static get NAME() { return 'tuyaE002'; }

  static get ATTRIBUTES() {
    return {
      // ── Z2M ManuSpecificTuya2 / climate LCD alarms ──
      alarmTemperatureMax: { id: 0xD00A, type: ZCLDataTypes.int16 },
      alarmTemperatureMin: { id: 0xD00B, type: ZCLDataTypes.int16 },
      // Canonical humidity max = 0xD00D (Z2M + Abysim). Legacy upstream ZHA used 0xD00C.
      alarmHumidityMax: { id: 0xD00D, type: ZCLDataTypes.int16 },
      alarmHumidityMaxLegacy: { id: 0xD00C, type: ZCLDataTypes.int16 },
      alarmHumidityMin: { id: 0xD00E, type: ZCLDataTypes.int16 },
      alarmHumidity: { id: 0xD00F, type: ZCLDataTypes.enum8 },
      // Z2M name alarmTemperature; keep legacy alias temperatureHumidityAlarm
      alarmTemperature: { id: 0xD006, type: ZCLDataTypes.enum8 },
      temperatureHumidityAlarm: { id: 0xD006, type: ZCLDataTypes.enum8 },
      // HA: write 1 to mute beeper (display alarm may remain)
      unknown: { id: 0xD010, type: ZCLDataTypes.uint8 },
      beepSilence: { id: 0xD010, type: ZCLDataTypes.uint8 },

      // ── Linptech ES1ZZ / Moes TS0225 mmWave (OEM attrs on same cluster ID) ──
      presenceKeepTime: { id: 0xE001, type: ZCLDataTypes.uint16 },
      motionSensitivity: { id: 0xE004, type: ZCLDataTypes.uint8 },
      staticSensitivity: { id: 0xE005, type: ZCLDataTypes.uint8 },
      ledIndicator: { id: 0xE009, type: ZCLDataTypes.uint8 },
      targetDistance: { id: 0xE00A, type: ZCLDataTypes.uint16 },
      motionDetectionDistance: { id: 0xE00B, type: ZCLDataTypes.uint16 },
    };
  }

  static get COMMANDS() { return {}; }
}

/** ValueAlarm enum (zigpy #823 / ZHA) */
TuyaE002Cluster.ALARM_TYPE = { MIN: 0, MAX: 1, OFF: 2 };
TuyaE002Cluster.ALARM_STATUS = TuyaE002Cluster.ALARM_TYPE;
TuyaE002Cluster.BEEP_SILENCE_ON = 1;
TuyaE002Cluster.BEEP_SILENCE_OFF = 0;

module.exports = TuyaE002Cluster;
