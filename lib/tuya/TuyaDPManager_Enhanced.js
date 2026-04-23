'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../utils/tuyaUtils.js');

/**
 * TuyaDPManager_Enhanced - Gestion optimale des DataPoints Tuya
 */

class TuyaDPManager_Enhanced {

  constructor(device) {
    this.device = device;
    this.dpCache = new Map();
    this.dpTimestamps = new Map();
    this.dpTypes = new Map();
    this.retryAttempts = new Map();
    this.maxRetries = 3;

    this.criticalDPs = {
      battery: [4, 14, 15, 33, 35],
      temperature: [1, 16, 18, 104],
      humidity: [2, 17, 19, 105],
      motion: [1, 101, 102, 103],
      illuminance: [3, 103, 104],
      contact: [1, 101],
      onoff: [1, 2, 3, 4, 7, 8, 9, 10],
      power: [18, 19, 20],
      soil_moisture: [5],
      vibration: [1, 101],
      co: [1, 2],
      gas: [1, 2],
      smoke: [1, 2],
      water_leak: [1, 15],
    };
  }

  async initialize(tuyaCluster, deviceCapabilities = []) {
    if (!tuyaCluster) {
      this.device.log('[DP_MGR] No Tuya cluster provided');
      return false;
    }

    this.tuyaCluster = tuyaCluster;
    this.device.log('[DP_MGR]  Initializing Enhanced DP Manager...');

    const deviceType = this._detectDeviceType(deviceCapabilities);
    this.device.log(`[DP_MGR]  Device type detected: ${deviceType}`);

    await this._setupDPListener();
    await this._requestCriticalDPs(deviceType);

    this.device.log('[DP_MGR]  Enhanced DP Manager initialized');
    return true;
  }

  _detectDeviceType(capabilities) {
    const caps = Array.isArray(capabilities) ? capabilities : [];
    if (caps.includes('measure_temperature') && caps.includes('measure_humidity')) {
      if (caps.includes('measure_moisture')) return 'soil_sensor';
      return 'climate_sensor';
    }
    if (caps.includes('alarm_motion')) return 'motion_sensor';
    if (caps.includes('alarm_contact')) return 'contact_sensor';
    if (caps.includes('onoff') && caps.includes('measure_power')) return 'smart_plug';
    if (caps.includes('onoff') && !caps.includes('measure_power')) return 'switch';
    if (caps.includes('alarm_co')) return 'co_detector';
    if (caps.includes('alarm_smoke')) return 'smoke_detector';
    if (caps.includes('alarm_water')) return 'water_leak_sensor';
    if (caps.includes('measure_battery')) return 'battery_device';
    return 'generic';
  }

  async _setupDPListener() {
    try {
      if (this.tuyaCluster.onDataReport) {
        this.tuyaCluster.onDataReport = (data) => this._handleDPReport(data);
      }
      if (this.tuyaCluster.onDatapoint) {
        this.tuyaCluster.onDatapoint = (dp) => this._handleDPReport(dp);
      }
      if (this.tuyaCluster.on) {
        this.tuyaCluster.on('dataReport', (data) => this._handleDPReport(data));
        this.tuyaCluster.on('datapoint', (dp) => this._handleDPReport(dp));
      }
      this.device.log('[DP_MGR]  DP listeners configured');
      return true;
    } catch (err) {
      this.device.error('[DP_MGR]  Failed to setup DP listener:', err);
      return false;
    }
  }

  _handleDPReport(data) {
    try {
      this.device.log('[DP_MGR]  DP Report received:', JSON.stringify(data));
      const dpId = data.dp || data.dpid || data.id;
      const dpValue = data.value !== undefined ? data.value : data.data;
      const dpType = data.type || data.datatype || this._detectDPType(dpValue);

      if (dpId === undefined || dpValue === undefined) {
        this.device.log('[DP_MGR]  Invalid DP report format');
        return;
      }

      this.dpCache.set(dpId, dpValue);
      this.dpTimestamps.set(dpId, Date.now());
      this.dpTypes.set(dpId, dpType);

      this.device.log(`[DP_MGR] DP${dpId} = ${dpValue} (type: ${dpType})`);
      this.device.emit('tuyaDP', { dpId, value: dpValue, type: dpType });
      this._autoProcessDP(dpId, dpValue, dpType);
    } catch (err) {
      this.device.error('[DP_MGR]  Error handling DP report:', err);
    }
  }

  _autoProcessDP(dpId, value, type) {
    if (this.criticalDPs.battery.includes(dpId)) {
      this.device.log(`[DP_MGR]  Battery DP${dpId} = ${value}%`);
      if (this.device.hasCapability('measure_battery')) {
        this.device.setCapabilityValue('measure_battery', parseFloat(value)).catch(err => {
          this.device.error('[DP_MGR] Failed to set battery:', err);
        });
      }
    }

    if (this.criticalDPs.temperature.includes(dpId)) {
      const tempCelsius = typeof value === 'number' ? value / 10 : parseFloat(value) / 10;
      this.device.log(`[DP_MGR]  Temperature DP${dpId} = ${tempCelsius}°C`);
      if (this.device.hasCapability('measure_temperature')) {
        this.device.setCapabilityValue('measure_temperature', tempCelsius).catch(err => {
          this.device.error('[DP_MGR] Failed to set temperature:', err);
        });
      }
    }

    if (this.criticalDPs.humidity.includes(dpId)) {
      this.device.log(`[DP_MGR]  Humidity DP${dpId} = ${value}%`);
      if (this.device.hasCapability('measure_humidity')) {
        this.device.setCapabilityValue('measure_humidity', parseFloat(value)).catch(err => {
          this.device.error('[DP_MGR] Failed to set humidity:', err);
        });
      }
    }

    if (this.criticalDPs.motion.includes(dpId) && type === 'bool') {
      this.device.log(`[DP_MGR]  Motion DP${dpId} = ${value}`);
      if (this.device.hasCapability('alarm_motion')) {
        this.device.setCapabilityValue('alarm_motion', !!value).catch(err => {
          this.device.error('[DP_MGR] Failed to set motion:', err);
        });
      }
    }

    if (this.criticalDPs.onoff.includes(dpId) && type === 'bool') {
      this.device.log(`[DP_MGR]  OnOff DP${dpId} = ${value}`);
      const capabilityId = dpId === 1 ? 'onoff' : `onoff.switch${dpId}`;
      if (this.device.hasCapability(capabilityId)) {
        this.device.setCapabilityValue(capabilityId, !!value).catch(err => {
          this.device.error(`[DP_MGR] Failed to set ${capabilityId}:`, err);
        });
      }
    }
  }

  _detectDPType(value) {
    if (typeof value === 'boolean') return 'bool';
    if (typeof value === 'number') return 'value';
    if (typeof value === 'string') return 'string';
    if (Buffer.isBuffer(value)) return 'raw';
    return 'unknown';
  }

  async _requestCriticalDPs(deviceType) {
    this.device.log(`[DP_MGR]  Requesting critical DPs for ${deviceType}...`);
    const dpsToRequest = new Set();
    this.criticalDPs.battery.forEach(dp => dpsToRequest.add(dp));

    switch (deviceType) {
      case 'climate_sensor':
        this.criticalDPs.temperature.forEach(dp => dpsToRequest.add(dp));
        this.criticalDPs.humidity.forEach(dp => dpsToRequest.add(dp));
        break;
      case 'soil_sensor':
        this.criticalDPs.temperature.forEach(dp => dpsToRequest.add(dp));
        this.criticalDPs.humidity.forEach(dp => dpsToRequest.add(dp));
        this.criticalDPs.soil_moisture.forEach(dp => dpsToRequest.add(dp));
        break;
      case 'motion_sensor':
        this.criticalDPs.motion.forEach(dp => dpsToRequest.add(dp));
        this.criticalDPs.illuminance.forEach(dp => dpsToRequest.add(dp));
        break;
      case 'contact_sensor':
        this.criticalDPs.contact.forEach(dp => dpsToRequest.add(dp));
        break;
      case 'smart_plug':
      case 'switch':
        this.criticalDPs.onoff.forEach(dp => dpsToRequest.add(dp));
        this.criticalDPs.power.forEach(dp => dpsToRequest.add(dp));
        break;
      case 'co_detector':
        this.criticalDPs.co.forEach(dp => dpsToRequest.add(dp));
        break;
    }

    for (const dpId of dpsToRequest) {
      await this.requestDP(dpId);
      await this._wait(200);
    }
    this.device.log(`[DP_MGR]  Requested ${dpsToRequest.size} critical DPs`);
  }

  async requestDP(dpId, retryCount = 0) {
    try {
      this.device.log(`[DP_MGR]  Requesting DP${dpId}...`);
      if (typeof this.tuyaCluster?.dataRequest === 'function') {
        await this.tuyaCluster.dataRequest({ dp: dpId });
        return true;
      }
      if (this.tuyaCluster.getData) {
        const dpBuffer = Buffer.from([dpId]);
        const seq = Math.floor(Math.random() * 0xFFFF);
        await this.tuyaCluster.getData({ seq, datapoints: dpBuffer });
        return true;
      }
      return false;
    } catch (err) {
      this.device.log(`[DP_MGR]  Failed to request DP${dpId}:`, err.message);
      if (retryCount < this.maxRetries) {
        await this._wait(1000 * (retryCount + 1));
        return await this.requestDP(dpId, retryCount + 1);
      }
      return false;
    }
  }

  async writeDP(dpId, value, type = 'auto') {
    try {
      if (type === 'auto') {
        type = this.dpTypes.get(dpId) || this._detectDPType(value);
      }
      this.device.log(`[DP_MGR]  Writing DP${dpId} = ${value} (type: ${type})`);
      const dpData = { dp: dpId, value: value, type: type };

      if (this.tuyaCluster.sendData) {
        await this.tuyaCluster.sendData({ command: 'dataReport', ...dpData });
        this.dpCache.set(dpId, value);
        this.dpTimestamps.set(dpId, Date.now());
        return true;
      }
      if (this.tuyaCluster.command) {
        await this.tuyaCluster.command('dataReport', dpData);
        this.dpCache.set(dpId, value);
        this.dpTimestamps.set(dpId, Date.now());
        return true;
      }
      return false;
    } catch (err) {
      this.device.error(`[DP_MGR]  Failed to write DP${dpId}:`, err);
      return false;
    }
  }

  getDP(dpId) {
    return this.dpCache.get(dpId);
  }

  isDPFresh(dpId, maxAgeMs = 300000) {
    const timestamp = this.dpTimestamps.get(dpId);
    if (!timestamp) return false;
    return (Date.now() - timestamp) < maxAgeMs;
  }

  getAllDPs() {
    const dps = {};
    for (const [dpId, value] of this.dpCache.entries()) {
      dps[dpId] = {
        value,
        type: this.dpTypes.get(dpId),
        timestamp: this.dpTimestamps.get(dpId),
        fresh: this.isDPFresh(dpId)
      };
    }
    return dps;
  }

  logDPStatus() {
    const dps = this.getAllDPs();
    this.device.log('[DP_MGR]  DP Status:');
    for (const [dpId, data] of Object.entries(dps)) {
      const age = Math.floor((Date.now() - data.timestamp) / 1000);
      this.device.log(`  DP${dpId}: ${data.value} (${data.type}) - ${age}s ago ${data.fresh ? '(fresh)' : '(stale)'}`);
    }
  }

  _wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  destroy() {
    this.dpCache.clear();
    this.dpTimestamps.clear();
    this.dpTypes.clear();
    this.retryAttempts.clear();
    this.device.log('[DP_MGR]  DP Manager destroyed');
  }
}

module.exports = TuyaDPManager_Enhanced;
