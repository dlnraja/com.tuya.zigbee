'use strict';

const { Cluster, ZCLDataTypes } = require('zigbee-clusters');

/**
 * TuyaE002Cluster — 0xE002 (57346)
 *
 * WHY P2262: One Cluster ID can only be registered once. Merge:
 * - Climate sensor alarm thresholds (legacy tuyaE002)
 * - Linptech/Moes ES1ZZ radar attrs (Homesuite ManuSpecificTuya3Cluster pattern)
 * Contre quoi: settings-save rejects when attrs are unknown / cluster not registered.
 */
class TuyaE002Cluster extends Cluster {
  static get ID() { return 0xE002; }
  static get NAME() { return 'tuyaE002'; }

  static get ATTRIBUTES() {
    return {
      // ── Climate / LCD sensor alarm thresholds ──
      // WHY P2265: Abysim/ZHA Neo live data — humidity max is 0xD00D (upstream
      // zhaquirks wrongly used 0xD00C). Keep 0xD00C as legacy alias for RX only.
      alarmTemperatureMax: { id: 0xD00A, type: ZCLDataTypes.uint16 },
      alarmTemperatureMin: { id: 0xD00B, type: ZCLDataTypes.uint16 },
      alarmHumidityMax: { id: 0xD00D, type: ZCLDataTypes.uint16 },
      alarmHumidityMaxLegacy: { id: 0xD00C, type: ZCLDataTypes.uint16 },
      alarmHumidityMin: { id: 0xD00E, type: ZCLDataTypes.uint16 },
      alarmHumidity: { id: 0xD00F, type: ZCLDataTypes.enum8 },
      temperatureHumidityAlarm: { id: 0xD006, type: ZCLDataTypes.enum8 },
      unknown0xD010: { id: 0xD010, type: ZCLDataTypes.uint8 },

      // ── Linptech ES1ZZ / Moes TS0225 mmWave (manuSpecificTuya3 pattern) ──
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

TuyaE002Cluster.ALARM_TYPE = { MIN: 0, MAX: 1, OFF: 2 };
TuyaE002Cluster.ALARM_STATUS = TuyaE002Cluster.ALARM_TYPE;

module.exports = TuyaE002Cluster;
