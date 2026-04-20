'use strict';
const { safeMultiply } = require('../utils/tuyaUtils.js');
// v5.12.8: TuyaZigbeeBridge - Local control of Zigbee sub-devices via Tuya gateway
// Pattern from: tuya-local (HA) config_flow.py, LocalTuya, tuyapi cid support
// Tuya Zigbee gateways (TYGWZ-01, SGW003, etc) are WiFi devices that bridge
// Zigbee sub-devices over local TCP using tuyapi's cid (child ID) parameter.
// Sub-devices use gateway's IP + local_key + child's node_id/uuid as device_cid.
const { EventEmitter } = require('events');

class TuyaZigbeeBridge extends EventEmitter {
  constructor({ gatewayId, gatewayKey, gatewayIp, protocolVersion = '3.3', log } = {}) {
    super();
    this.gatewayId = gatewayId;
    this.gatewayKey = gatewayKey;
    this.gatewayIp = gatewayIp;
    this.protocolVersion = protocolVersion;
    this.log = log || console;
    this._gateway = null;
    this._subDevices = new Map();
    this._connected = false;
    this._reconnectTimer = null;
    this._reconnectDelay = 5000;
  }

  // Connect to the Zigbee gateway over local TCP
  async connect() {
    if (!this.gatewayId || !this.gatewayKey) {
      throw new Error('Gateway ID and Key required');
    }
    try {
      const TuyAPI = require('tuyapi');
      this._gateway = new TuyAPI({
        id: this.gatewayId,
        key: this.gatewayKey,
        ip: this.gatewayIp || undefined,
        version: this.protocolVersion,
        issueRefreshOnConnect: true,
      });
      this._gateway.on('connected', () => {
        this._connected = true;
        this._reconnectDelay = 5000;
        this.log.log('Zigbee bridge connected to gateway:', this.gatewayId);
        this.emit('connected');
      });
      this._gateway.on('disconnected', () => {
        this._connected = false;
        this.log.log('Zigbee bridge disconnected');
        this.emit('disconnected');
        this._scheduleReconnect();
      });
      this._gateway.on('error', (err) => {
        this.log.error('Gateway error:', err.message || err);
        this.emit('error', err);
      });
      this._gateway.on('data', (data) => this._handleGatewayData(data));
      this._gateway.on('dp-refresh', (data) => this._handleGatewayData(data));
      await this._gateway.find();
      await this._gateway.connect();
    } catch (err) {
      this.log.error('Gateway connect failed:', err.message);
      this._scheduleReconnect();
      throw err;
    }
  }

  _scheduleReconnect() {
    if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
    this._reconnectTimer = setTimeout(async () => {
      this._reconnectDelay =safeMultiply(Math.min(this._reconnectDelay, 1).5, 300000);
      try { await this.connect(); } catch (e) { /* retry scheduled */ }
    }, this._reconnectDelay);
  }

  // Register a Zigbee sub-device for monitoring
  // deviceCid = node_id or uuid from cloud device list
  registerSubDevice(deviceCid, { name, category, productId, dpMap } = {}) {
    const sub = {
      cid: deviceCid,
      name: name || deviceCid,
      category: category || '',
      productId: productId || '',
      dpMap: dpMap || {},
      lastDps: {},
    };
    this._subDevices.set(deviceCid, sub);
    this.log.log('Registered sub-device:', deviceCid, name || '');
    return sub;
  }

  // Send command to a Zigbee sub-device through the gateway
  async setSubDeviceDP(deviceCid, dp, value) {
    if (!this._connected || !this._gateway) {
      throw new Error('Gateway not connected');
    }
    this.log.log('Set sub-device', deviceCid, 'DP', dp, '=', value);
    // tuyapi supports cid parameter for sub-device addressing
    await this._gateway.set({
      dps: parseInt(dp, 10),
      set: value,
      cid: deviceCid,
    });
  }

  // Send multiple DPs to a sub-device
  async setSubDeviceMultipleDPs(deviceCid, dpsObj) {
    if (!this._connected || !this._gateway) {
      throw new Error('Gateway not connected');
    }
    await this._gateway.set({
      multiple: true,
      data: dpsObj,
      cid: deviceCid,
    });
  }

  // Request refresh of sub-device DPs
  async refreshSubDevice(deviceCid) {
    if (!this._connected || !this._gateway) return;
    try {
      await this._gateway.refresh({ cid: deviceCid });
    } catch (err) {
      this.log.error('Refresh sub-device failed:', err.message);
    }
  }

  // Handle incoming data from gateway (may contain sub-device updates)
  _handleGatewayData(data) {
    if (!data) return;
    const cid = data.cid || null;
    const dps = data.dps || {};
    if (cid && this._subDevices.has(cid)) {
      const sub = this._subDevices.get(cid);
      Object.assign(sub.lastDps, dps);
      this.emit('sub-device-data', { cid, dps, device: sub });
    } else if (!cid) {
      // Gateway's own data
      this.emit('gateway-data', { dps });
    } else {
      // Unknown sub-device
      this.emit('unknown-sub-device', { cid, dps });
    }
  }

  // Get all registered sub-devices
  getSubDevices() {
    return Array.from(this._subDevices.values());
  }

  // Identify sub-devices from cloud device list
  // cloudDevices: array from TuyaSmartLifeAuth.getDevicesWithLocalKeys()
  static identifySubDevices(cloudDevices, gatewayId) {
    const gateway = cloudDevices.find(d => d.id === gatewayId);
    if (!gateway) return { gateway: null, subDevices: [] };
    // Sub-devices have no IP and have a node_id linking to the gateway
    const subDevices = cloudDevices.filter(d => {
      if (d.id === gatewayId) return false;
      if (d.ip) return false;
      return d.node_id || d.uuid;
    });
    return {
      gateway: {
        id: gateway.id,
        name: gateway.name,
        local_key: gateway.local_key,
        ip: gateway.ip,
      },
      subDevices: subDevices.map(d => ({
        id: d.id,
        name: d.name,
        cid: d.node_id || d.uuid,
        category: d.category,
        product_id: d.product_id,
        local_key: d.local_key || gateway.local_key,
      })),
    };
  }

  // Identify all gateways from cloud device list
  static identifyGateways(cloudDevices) {
    return cloudDevices.filter(d => {
      if (!d.ip) return false;
      // Gateways typically have category 'wg' or 'zgwz' or have sub-devices
      const gwCategories = ['wg', 'zgwz', 'wkg', 'wkggw', 'zigbee_gw'];
      if (gwCategories.includes(d.category)) return true;
      // Check if any other device references this one as gateway
      return cloudDevices.some(sub => !sub.ip && (sub.node_id || sub.uuid));
    });
  }

  disconnect() {
    if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
    if (this._gateway) {
      try {
        this._gateway.removeAllListeners();
        if (this._gateway.isConnected()) this._gateway.disconnect();
      } catch (e) { /* ignore */ }
      this._gateway = null;
    }
    this._connected = false;
    this._subDevices.clear();
  }
}

module.exports = TuyaZigbeeBridge;
