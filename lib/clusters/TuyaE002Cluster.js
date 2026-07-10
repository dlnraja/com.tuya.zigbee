'use strict';

const { Cluster, ZCLDataTypes } = require('zigbee-clusters');

/**
 * TuyaE002Cluster - v5.8.22 Sensor Alarm Cluster
 * Cluster 0xE002 (57346) - Temperature/humidity alarm thresholds
 */
class TuyaE002Cluster extends Cluster {
  static get ID() { return 0xE002; }
  static get NAME() { return 'tuyaE002'; }

  static get ATTRIBUTES() {
    return {
      alarmTemperatureMax: { id: 0xD00A, type: ZCLDataTypes.uint16 },
      alarmTemperatureMin: { id: 0xD00B, type: ZCLDataTypes.uint16 },
      alarmHumidityMax: { id: 0xD00C, type: ZCLDataTypes.uint16 },
      alarmHumidityMin: { id: 0xD00E, type: ZCLDataTypes.uint16 },
      alarmHumidity: { id: 0xD00F, type: ZCLDataTypes.enum8 },
      temperatureHumidityAlarm: { id: 0xD006, type: ZCLDataTypes.enum8 },
      unknown0xD010: { id: 0xD010, type: ZCLDataTypes.uint8 },
    };
  }
  static get COMMANDS() { return {}; }
}

TuyaE002Cluster.ALARM_TYPE = { MIN: 0, MAX: 1, OFF: 2 };
TuyaE002Cluster.ALARM_STATUS = TuyaE002Cluster.ALARM_TYPE;

module.exports = TuyaE002Cluster;
