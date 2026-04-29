'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');

const { Cluster, BoundCluster } = require('zigbee-clusters');
// A8: NaN Safety - use safeDivide/safeMultiply
require('../../lib/tuya/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/tuya/TuyaSpecificClusterDevice');

Cluster.addCluster(TuyaSpecificCluster);

const dataPoints = {
  POWER_MODE: 0x65,
  MELODY: 0x66,
  DURATION: 0x67,
  ALARM: 0x68,
  TEMPERATURE: 0x69,
  HUMIDITY: 0x6A,
  TEMP_MIN: 0x6B,
  TEMP_MAX: 0x6C,
  HUM_MIN: 0x6D,
  HUM_MAX: 0x6E,
  TEMP_UNIT: 0x70,
  TEMP_ALARM: 0x71,
  HUM_ALARM: 0x72,
  VOLUME: 0x74,
};

const dataTypes = {
  raw: 0,
  bool: 1,
  value: 2,
  string: 3,
  enum: 4,
  bitmap: 5,
};

const melodiesMapping = new Map();
melodiesMapping.set(0, 'Doorbell 1');
melodiesMapping.set(1, 'For Elise');
melodiesMapping.set(2, 'Westminster');
melodiesMapping.set(3, '4 Key Chime');
melodiesMapping.set(4, 'William Tell');
melodiesMapping.set(5, 'Mozart Piano');
melodiesMapping.set(6, 'Space Alarm');
melodiesMapping.set(7, 'Klaxon');
melodiesMapping.set(8, 'Meep meep');
melodiesMapping.set(9, 'Wheep');
melodiesMapping.set(10, 'Barking dog');
melodiesMapping.set(11, 'Alarm Siren');
melodiesMapping.set(12, 'Doorbell 2');
melodiesMapping.set(13, 'Old Phone');
melodiesMapping.set(14, 'Police Siren');
melodiesMapping.set(15, 'Evacuation bell');
melodiesMapping.set(16, 'Clock alarm');
melodiesMapping.set(17, 'Fire alarm');

const ZIGBEE_EPOCH_MS = Date.UTC(2000, 0, 1, 0, 0, 0);
const ZCL_STATUS_SUCCESS = 0x00;
const ZCL_STATUS_UNSUPPORTED_ATTRIBUTE = 0x86;
const ZCL_TYPE_UTC_TIME = 0xE2;
const ZCL_TYPE_BITMAP8 = 0x18;
const ZCL_TYPE_INT32 = 0x2B;

const convertMultiByteNumberPayloadToSingleDecimalNumber = chunks => {
  let value = 0;
  for (let i = 0; i < chunks.length; i++) {
    value <<= 8;
    value += chunks[i];
  }
  return value;
};

const getDataValue = dpValue => {
  if (!dpValue || !dpValue.data) return null;
  switch (dpValue.datatype) {
  case dataTypes.raw: return dpValue.data;
  case dataTypes.bool: return dpValue.data[0] === 1;
  case dataTypes.value: return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
  case dataTypes.string: {
    let dataString = '';
    for (let i = 0; i < dpValue.data.length; ++i) dataString += String.fromCharCode(dpValue.data[i]);
    return dataString;
  }
  case dataTypes.enum: return dpValue.data[0];
  case dataTypes.bitmap: return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
  default: return null;
  }
};

class SirenTimeBoundCluster extends BoundCluster {
  async readAttributes({ attributes }) {
    const chunks = [];
    for (const attributeId of attributes) {
      switch (attributeId) {
      case 0x0007: {
        const localTime = Math.floor((Date.now() - ZIGBEE_EPOCH_MS) / 1000) + (-new Date().getTimezoneOffset() * 60);
        const buf = Buffer.alloc(8);
        buf.writeUInt16LE(0x0007, 0);
        buf.writeUInt8(ZCL_STATUS_SUCCESS, 2);
        buf.writeUInt8(ZCL_TYPE_UTC_TIME, 3);
        buf.writeUInt32LE(localTime >>> 0, 4);
        chunks.push(buf);
        break;
      }
      case 0x0000: {
        const utcTime = Math.floor((Date.now() - ZIGBEE_EPOCH_MS) / 1000);
        const buf = Buffer.alloc(8);
        buf.writeUInt16LE(0x0000, 0);
        buf.writeUInt8(ZCL_STATUS_SUCCESS, 2);
        buf.writeUInt8(ZCL_TYPE_UTC_TIME, 3);
        buf.writeUInt32LE(utcTime >>> 0, 4);
        chunks.push(buf);
        break;
      }
      case 0x0001: {
        const buf = Buffer.alloc(5);
        buf.writeUInt16LE(0x0001, 0);
        buf.writeUInt8(ZCL_STATUS_SUCCESS, 2);
        buf.writeUInt8(ZCL_TYPE_BITMAP8, 3);
        buf.writeUInt8(0x02, 4);
        chunks.push(buf);
        break;
      }
      case 0x0002: {
        const timeZone = -new Date().getTimezoneOffset() * 60;
        const buf = Buffer.alloc(8);
        buf.writeUInt16LE(0x0002, 0);
        buf.writeUInt8(ZCL_STATUS_SUCCESS, 2);
        buf.writeUInt8(ZCL_TYPE_INT32, 3);
        safeMultiply(buf.writeInt32LE(timeZone, 4));
        chunks.push(buf);
        break;
      }
      default: {
        const buf = Buffer.alloc(3);
        buf.writeUInt16LE(attributeId, 0);
        buf.writeUInt8(ZCL_STATUS_UNSUPPORTED_ATTRIBUTE, 2);
        chunks.push(buf);
        break;
      }
      }
    }
    return { attributes: Buffer.concat(chunks) };
  }
}

class sensortemphumidsensor extends TuyaSpecificClusterDevice {
  async onNodeInit({ zclNode }) {
    try {
      await this.configureAttributeReporting([
        { cluster: 'msTemperatureMeasurement', attributeName: 'measuredValue', minInterval: 30, maxInterval: 600, minChange: 50 },
        { cluster: 'msRelativeHumidity', attributeName: 'measuredValue', minInterval: 30, maxInterval: 600, minChange: 100 }
      ]);
    } catch (err) { this.log('Attribute reporting config failed:', err.message); }

    await this.ensureCapability('measure_temperature');
    await this.ensureCapability('measure_humidity');
    await this.ensureCapability('alarm_battery');
    await this.ensureCapability('alarm_siren');

    this._registerTimeBoundCluster(zclNode);
    this._registerTuyaListeners(zclNode);

    this.registerCapabilityListener('onoff', async value => {
      await this.writeBool(dataPoints.ALARM, value);
      this.homey.setTimeout(() => this.queryAll().catch(this.error), 1200);
    });

    this.homey.setTimeout(() => this.bootstrap().catch(this.error), 5000);
  }

  _registerTimeBoundCluster(zclNode) {
    try {
      if (typeof zclNode?.endpoints?.[1]?.bind === 'function') {
        this._timeBoundCluster = new SirenTimeBoundCluster();
        zclNode.endpoints[1].bind('time', this._timeBoundCluster);
      }
    } catch (err) { this.error('Failed to register Time bound cluster', err); }
  }

  _registerTuyaListeners(zclNode) {
    const tuyaCluster = zclNode?.endpoints?.[1]?.clusters?.tuya;
    if (!tuyaCluster) return;
    tuyaCluster.on('response', data => this.processTuyaMessage('response', data).catch(this.error));
    tuyaCluster.on('reporting', data => this.processTuyaMessage('reporting', data).catch(this.error));
    tuyaCluster.on('datapoint', data => this.processTuyaMessage('datapoint', data).catch(this.error));
    tuyaCluster.on('timeSync', data => this.onTuyaTimeSync(data).catch(this.error));
    tuyaCluster.on('mcuVersionResponse', data => this.onMcuVersionResponse(data).catch(this.error));
  }

  async ensureCapability(capabilityId) {
    if (!this.hasCapability(capabilityId)) await this.addCapability(capabilityId);
  }

  async bootstrap() {
    await this.bootstrapBasicRead();
    await this.forceCelsiusMode();
    await this.sendMcuVersionRequest();
    await this.queryAll();
  }

  async bootstrapBasicRead() {
    try {
      const basicCluster = this.zclNode?.endpoints?.[1]?.clusters?.basic;
      if (basicCluster) await basicCluster.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource']);
    } catch (error) { this.error('Bootstrap read failed', error); }
  }

  async forceCelsiusMode() {
    try { await this.writeBool(dataPoints.TEMP_UNIT, true); } catch (error) { this.error('Failed to set Celsius mode', error); }
  }

  async sendMcuVersionRequest() {
    try {
      const tuyaCluster = this.zclNode?.endpoints?.[1]?.clusters?.tuya;
      if (!tuyaCluster || typeof tuyaCluster.mcuVersionRequest !== 'function') return;
      const payload = Buffer.from([0x00, 0x00]);
      await tuyaCluster.mcuVersionRequest({ payload });
    } catch (error) { this.error('Failed to send Tuya mcuVersionRequest', error); }
  }

  async queryAll() {
    try {
      const tuyaCluster = this.zclNode?.endpoints?.[1]?.clusters?.tuya;
      if (tuyaCluster && typeof tuyaCluster.dataQuery === 'function') await tuyaCluster.dataQuery({});
    } catch (error) { this.error('Failed to send Tuya dataQuery', error); }
  }

  async onTuyaTimeSync(data) {
    try {
      const utcSeconds = Math.floor(Date.now() / 1000);
      const localSeconds = utcSeconds - (new Date().getTimezoneOffset() * 60);
      const payload = Buffer.alloc(8);
      payload.writeUInt32BE(utcSeconds >>> 0, 0);
      payload.writeUInt32BE(localSeconds >>> 0, 4);
      await this.zclNode.endpoints[1].clusters.tuya.timeSync({ payload });
      this.homey.setTimeout(() => this.queryAll().catch(this.error), 500);
    } catch (error) { this.error('Failed to respond to Tuya timeSync request', error); }
  }

  async onMcuVersionResponse(data) {
    this.homey.setTimeout(() => this.queryAll().catch(this.error), 500);
  }

  async processTuyaMessage(source, data) {
    const dp = data?.dp;
    const measuredValue = getDataValue(data);
    switch (dp) {
    case dataPoints.ALARM:
      await this.setCapabilityValue('onoff', !!measuredValue).catch(() => {});
      await this.setCapabilityValue('alarm_siren', !!measuredValue).catch(() => {});
      break;
    case dataPoints.TEMPERATURE: this.reportTemperatureCapacity(measuredValue); break;
    case dataPoints.HUMIDITY: this.reportHumidityCapacity(measuredValue); break;
    case dataPoints.POWER_MODE: this.handlePowerMode(measuredValue); break;
    case dataPoints.VOLUME: await this.setSettings({ alarmvolume: String(measuredValue) }).catch(() => {}); break;
    case dataPoints.DURATION: await this.setSettings({ alarmsoundtime: measuredValue }).catch(() => {}); break;
    case dataPoints.MELODY: await this.setSettings({ alarmtune: String(measuredValue) }).catch(() => {}); break;
    }
  }

  handlePowerMode(measuredValue) {
    this.setCapabilityValue('alarm_battery', measuredValue === 0 || measuredValue === 1).catch(() => {});
  }

  reportHumidityCapacity(measuredValue) {
    const humidityOffset = Number(this.getSetting('humidity_offset') || 0);
    this.setCapabilityValue('measure_humidity', Number(measuredValue) + humidityOffset).catch(() => {});
  }

  reportTemperatureCapacity(measuredValue) {
    const temperatureOffset = Number(this.getSetting('temperature_offset') || 0);
    this.setCapabilityValue('measure_temperature', (Number(measuredValue) / 10) + temperatureOffset).catch(() => {});
  }

  async onEndDeviceAnnounce() {
    if (typeof this._updateLastSeen === 'function') this._updateLastSeen();
    if (this._dataRecoveryManager) this._dataRecoveryManager.triggerRecovery();
  }
}

module.exports = sensortemphumidsensor;
