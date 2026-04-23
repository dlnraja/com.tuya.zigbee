'use strict';
const { safeMultiply, safeParse } = require('./utils/tuyaUtils.js');
const { CLUSTERS } = require('./constants/ZigbeeConstants.js');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

const IAS_ZONE_TYPES = {
  STANDARD_CIE: 0x0000,
  MOTION_SENSOR: 0x000D,
  CONTACT_SWITCH: 0x0015,
  FIRE_SENSOR: 0x0028,
  WATER_SENSOR: 0x002A,
  CO_SENSOR: 0x002B,
  PERSONAL_EMERGENCY: 0x002C,
  VIBRATION_SENSOR: 0x002D,
  REMOTE_CONTROL: 0x010F,
  KEY_FOB: 0x0115,
  KEYPAD: 0x021D,
  STANDARD_WARNING: 0x0225,
  GLASS_BREAK: 0x0226,
  SECURITY_REPEATER: 0x0229
};

const IAS_ZONE_STATUS = {
  ALARM1: 0x0001,
  ALARM2: 0x0002,
  TAMPER: 0x0004,
  BATTERY_LOW: 0x0008,
  SUPERVISION: 0x0010,
  RESTORE: 0x0020,
  TROUBLE: 0x0040,
  AC_MAINS: 0x0080,
  TEST: 0x0100,
  BATTERY_DEFECT: 0x0200
};

const IAS_WD_WARNING_MODE = {
  STOP: 0,
  BURGLAR: 1,
  FIRE: 2,
  EMERGENCY: 3,
  POLICE_PANIC: 4,
  FIRE_PANIC: 5,
  EMERGENCY_PANIC: 6
};

const IAS_WD_STROBE = {
  NO_STROBE: 0,
  USE_STROBE: 1
};

const IAS_WD_SIREN_LEVEL = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  VERY_HIGH: 3
};

const IAS_WD_SQUAWK_MODE = {
  ARMED: 0,
  DISARMED: 1
};

const TUYA_DP_TYPE = {
  RAW: 0x00,
  BOOL: 0x01,
  VALUE: 0x02,
  STRING: 0x03,
  ENUM: 0x04,
  BITMAP: 0x05
};

const TUYA_DP = {
  SIREN_SWITCH: 13,
  SIREN_VOLUME: 5,
  SIREN_DURATION: 7,
  SIREN_MELODY: 21,
  TEMPERATURE: 1,
  HUMIDITY: 2,
  BATTERY_PERCENT: 4,
  TEMP_UNIT: 9,
  OCCUPANCY: 1,
  SENSITIVITY: 2,
  KEEP_TIME: 102,
  CONTACT_STATE: 1,
  BATTERY_STATE: 3,
  WATER_LEAK: 1,
  SWITCH_1: 1,
  SWITCH_2: 2,
  SWITCH_3: 3,
  SWITCH_4: 4,
  DIMMER_SWITCH: 1,
  DIMMER_LEVEL: 2,
  DIMMER_MIN: 3,
  DIMMER_MAX: 4,
  CURTAIN_SWITCH: 1,
  CURTAIN_POSITION: 2,
  CURTAIN_ARRIVED: 3,
  CURTAIN_MODE: 4
};

class ZigbeeClusterManager {
  constructor(device) {
    this.device = device;
    this.log = device.log.bind(device);
    this.error = device.error.bind(device);
    this._listeners = new Map();
  }

  async registerIasZone(options = {}) {
    const { endpoint = 1, onAlarm = null, onTamper = null, onBatteryLow = null, autoEnroll = true } = options;
    try {
      const iasZoneCluster = this.device.zclNode.endpoints[endpoint]?.clusters.iasZone;
      if (!iasZoneCluster) return false;
      if (autoEnroll) await this._enrollIasZone(iasZoneCluster);
      iasZoneCluster.on('zoneStatusChangeNotification', (payload) => this._handleIasZoneStatus(payload, { onAlarm, onTamper, onBatteryLow }));
      iasZoneCluster.on('attr.zoneStatus', (value) => this._handleIasZoneStatus({ zoneStatus: value }, { onAlarm, onTamper, onBatteryLow }));
      return true;
    } catch (err) {
      this.error('Failed to register IAS Zone:', err);
      return false;
    }
  }

  async _enrollIasZone(cluster) {
    try {
      const ieeeAddress = this.device.driver.homey.zigbee.address;
      if (ieeeAddress) await cluster.writeAttributes({ iasCieAddr: ieeeAddress });
      await cluster.zoneEnrollResponse({ enrollResponseCode: 0, zoneId: 0x01 });
    } catch (err) {}
  }

  _handleIasZoneStatus(payload, callbacks) {
    const status = payload.zoneStatus || 0;
    const alarm1 = !!(status & IAS_ZONE_STATUS.ALARM1);
    const alarm2 = !!(status & IAS_ZONE_STATUS.ALARM2);
    const tamper = !!(status & IAS_ZONE_STATUS.TAMPER);
    const batteryLow = !!(status & IAS_ZONE_STATUS.BATTERY_LOW);
    if (callbacks.onAlarm && (alarm1 || alarm2)) callbacks.onAlarm(alarm1, alarm2, status);
    if (callbacks.onTamper && tamper) callbacks.onTamper(tamper, status);
    if (callbacks.onBatteryLow && batteryLow) callbacks.onBatteryLow(batteryLow, status);
  }

  async registerIasWd(options = {}) {
    const { endpoint = 1 } = options;
    try {
      this._iasWdCluster = this.device.zclNode.endpoints[endpoint]?.clusters.iasWd;
      return !!this._iasWdCluster;
    } catch (err) { return false; }
  }

  async startWarning(options = {}) {
    const { mode = IAS_WD_WARNING_MODE.BURGLAR, strobe = IAS_WD_STROBE.USE_STROBE, sirenLevel = IAS_WD_SIREN_LEVEL.HIGH, duration = 30, strobeDutyCycle = 50, strobeLevel = 1 } = options;
    if (!this._iasWdCluster) return false;
    try {
      const warningInfo = (mode & 0x0F) | ((strobe & 0x03) << 4) | ((sirenLevel & 0x03) << 6);
      await this._iasWdCluster.startWarning({ warningInfo, warningDuration: duration, strobeDutyCycle, strobeLevel });
      return true;
    } catch (err) { return false; }
  }

  async stopWarning() {
    return this.startWarning({ mode: IAS_WD_WARNING_MODE.STOP, strobe: IAS_WD_STROBE.NO_STROBE, sirenLevel: IAS_WD_SIREN_LEVEL.LOW, duration: 0 });
  }

  async registerTuyaCluster(options = {}) {
    const { endpoint = 1, onDatapoint = null } = options;
    try {
      const ep = this.device.zclNode.endpoints[endpoint];
      this._tuyaCluster = ep?.clusters['tuya'] || ep?.clusters[CLUSTERS.TUYA_EF00] || ep?.clusters['manuSpecificTuya'];
      if (!this._tuyaCluster) return false;
      this._onDatapoint = onDatapoint;
      this._tuyaCluster.on('response', (data) => this._handleTuyaResponse(data));
      this._tuyaCluster.on('reporting', (data) => this._handleTuyaResponse(data));
      return true;
    } catch (err) { return false; }
  }

  _handleTuyaResponse(data) {
    try {
      const datapoints = this._parseTuyaDatapoints(data);
      for (const dp of datapoints) {
        if (this._onDatapoint) this._onDatapoint(dp.id, dp.value, dp.type);
      }
    } catch (err) {}
  }

  _parseTuyaDatapoints(data) {
    const datapoints = [];
    if (!data || !Buffer.isBuffer(data)) {
      if (data && data.data) data = Buffer.from(data.data);
      else return datapoints;
    }
    let offset = 0;
    if (data.length > 4 && data[0] === 0x00) offset = 4;
    while (offset < data.length - 4) {
      const dpId = data[offset];
      const dpType = data[offset + 1];
      const dpLen = (data[offset + 2] << 8) | data[offset + 3];
      if (offset + 4 + dpLen > data.length) break;
      const dpData = data.slice(offset + 4, offset + 4 + dpLen);
      let value;
      switch (dpType) {
        case TUYA_DP_TYPE.BOOL: value = dpData[0] === 1; break;
        case TUYA_DP_TYPE.VALUE: value = dpData.readInt32BE(0); break;
        case TUYA_DP_TYPE.ENUM: value = dpData[0]; break;
        case TUYA_DP_TYPE.STRING: value = dpData.toString('utf8'); break;
        case TUYA_DP_TYPE.BITMAP: value = dpLen === 1 ? dpData[0] : dpLen === 2 ? dpData.readUInt16BE(0) : dpData.readUInt32BE(0); break;
        default: value = dpData;
      }
      datapoints.push({ id: dpId, type: dpType, value, raw: dpData });
      offset += 4 + dpLen;
    }
    return datapoints;
  }

  async sendTuyaDatapoint(dpId, dpType, value) {
    if (!this._tuyaCluster) return false;
    try {
      let dpData, dpLen;
      switch (dpType) {
        case TUYA_DP_TYPE.BOOL: dpData = Buffer.from([value ? 1 : 0]); dpLen = 1; break;
        case TUYA_DP_TYPE.VALUE: dpData = Buffer.alloc(4); dpData.writeInt32BE(value, 0); dpLen = 4; break;
        case TUYA_DP_TYPE.ENUM: dpData = Buffer.from([value]); dpLen = 1; break;
        case TUYA_DP_TYPE.STRING: dpData = Buffer.from(value, 'utf8'); dpLen = dpData.length; break;
        default: dpData = Buffer.isBuffer(value) ? value : Buffer.from([value]); dpLen = dpData.length;
      }
      const seq = Math.floor(Math.random() * 65535);
      const cmd = Buffer.alloc(6 + dpLen);
      cmd.writeUInt16BE(seq, 0);
      cmd[2] = dpId; cmd[3] = dpType;
      cmd.writeUInt16BE(dpLen, 4);
      dpData.copy(cmd, 6);
      await this._tuyaCluster.datapoint({ data: cmd });
      return true;
    } catch (err) { return false; }
  }

  async registerBattery(options = {}) {
    const { endpoint = 1, useTuyaDP = false } = options;
    try {
      if (useTuyaDP) return true;
      const ep = this.device.zclNode.endpoints[endpoint];
      const powerCfg = ep?.clusters.genPowerCfg || ep?.clusters.powerConfiguration;
      if (!powerCfg) return false;
      powerCfg.on('attr.batteryPercentageRemaining', (value) => {
        const percent = Math.round(safeParse(value));
        this.device.setCapabilityValue('measure_battery', percent).catch(() => {});
        this.device.setCapabilityValue('alarm_battery', percent < 20).catch(() => {});
      });
      return true;
    } catch (err) { return false; }
  }

  getCluster(clusterId, endpointId = 1) {
    const ep = this.device.zclNode?.endpoints[endpointId];
    if (!ep) return null;
    let cluster = ep.clusters[clusterId];
    if (!cluster && typeof clusterId === 'string' && CLUSTERS[clusterId.toUpperCase()]) {
      cluster = ep.clusters[CLUSTERS[clusterId.toUpperCase()]];
    }
    return cluster || null;
  }
}

module.exports = {
  ZigbeeClusterManager,
  CLUSTERS,
  IAS_ZONE_TYPES,
  IAS_ZONE_STATUS,
  IAS_WD_WARNING_MODE,
  IAS_WD_STROBE,
  IAS_WD_SIREN_LEVEL,
  IAS_WD_SQUAWK_MODE,
  TUYA_DP_TYPE,
  TUYA_DP
};
