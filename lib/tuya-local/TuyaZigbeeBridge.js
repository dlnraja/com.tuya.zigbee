'use strict';
// WHY(P2656): Local control of Zigbee sub-devices via Tuya WiFi gateway (cid).
// Complementary patterns: make-all/tuya-local, xZetsubou/hass-localtuya, lehanspb/tuya-mqtt,
// tuyapi/codetheweb (gwID+cid), TinyTuya node_id / LAN_EXT_STREAM, tuyadump cid sniff —
// UNION heuristics only, never invent Zigbee productId.
// Sub-devices use gateway IP + local_key + child's node_id/uuid as device_cid.
const { safeSetTimeout, safeClearTimeout } = require('../utils/safe-timers');
const { EventEmitter } = require('events');

/**
 * Tuya hubs often allow only 1–3 concurrent LAN TCP sessions (HA tuya-local).
 * Soft warn only — do not hard-fail registration.
 */
const TYPICAL_HUB_LAN_CONNECTION_LIMIT = 3;

/**
 * Path doctrine (Z2M/ZHA + TinyTuya/tuyapi/localtuya) — prefer Homey Zigbee for end-devices.
 * Contre quoi: forcing every Zigbee SKU through a Tuya WiFi hub LAN path.
 */
const CONTROL_PATH_DOCTRINE = Object.freeze({
  zigbeeEndDeviceHomey:
    'Pair Tuya Zigbee to Homey coordinator — no local_key (Z2M/ZHA pattern). Primary.',
  wifiLan:
    'WiFi Tuya — tuyapi + device local_key + TCP 6668 (UDP 6666/6667/7000 discovery).',
  zigbeeBehindTuyaHub:
    'Fallback only — hub IP/key as gwID + child cid/node_id; ~1–3 LAN sessions (HA/make-all).',
});

/** Category codes seen across TinyTuya / make-all / tuyalocal for WiFi Zigbee gateways */
const GATEWAY_CATEGORIES = Object.freeze([
  'wg',
  'wg2',
  'zgwz',
  'wkg',
  'wkggw',
  'zigbee_gw',
  'wfcon',
  'gyd',
  'sgw',
  'tygwz',
  'gateway',
]);

function normalizeCid(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  return s || null;
}

/**
 * Prefer node_id (hub child) then uuid then id — TinyTuya / make-all / tuya-mqtt parity.
 * Contre quoi: dropping node_id and using cloud device id that the hub ignores.
 */
function resolveSubDeviceCid(device = {}) {
  return (
    normalizeCid(device.node_id)
    || normalizeCid(device.cid)
    || normalizeCid(device.uuid)
    || normalizeCid(device.id)
  );
}

/**
 * Build tuyapi options for the WiFi hub parent.
 * WHY: localtuya PR#318 / tuyapi — hub children need gateway as id+gwID and cid on set/get.
 * Contre quoi: omitting gwID so hub routes set() to the wrong device identity.
 */
function buildGatewayTuyApiOptions({
  gatewayId,
  gatewayKey,
  gatewayIp,
  protocolVersion = '3.3',
} = {}) {
  if (!gatewayId || !gatewayKey) {
    throw new Error('Gateway ID and Key required');
  }
  return {
    id: gatewayId,
    key: gatewayKey,
    ip: gatewayIp || undefined,
    version: protocolVersion,
    gwID: gatewayId,
    issueRefreshOnConnect: true,
  };
}

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
    try {
      const TuyAPI = require('tuyapi');
      // WHY(P2656): tuyapi + localtuya hub pattern — id and gwID both = gateway
      this._gateway = new TuyAPI(buildGatewayTuyApiOptions({
        gatewayId: this.gatewayId,
        gatewayKey: this.gatewayKey,
        gatewayIp: this.gatewayIp,
        protocolVersion: this.protocolVersion,
      }));
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
    if (this._reconnectTimer) {
      safeClearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    this._reconnectTimer = safeSetTimeout(async () => {
      this._reconnectDelay = Math.min(this._reconnectDelay * 1.5, 300000);
      try { await this.connect(); } catch (e) { /* retry scheduled */ }
    }, this._reconnectDelay);
  }

  // Register a Zigbee sub-device for monitoring
  // deviceCid = node_id or uuid from cloud device list
  registerSubDevice(deviceCid, { name, category, productId, dpMap } = {}) {
    const cid = normalizeCid(deviceCid);
    if (!cid) {
      throw new Error('Sub-device cid required (node_id / uuid)');
    }
    if (this._subDevices.size >= TYPICAL_HUB_LAN_CONNECTION_LIMIT) {
      this.log.log?.(
        `[P2656] Hub may only allow ~${TYPICAL_HUB_LAN_CONNECTION_LIMIT} concurrent LAN sessions `
        + `(make-all/tuya-local). Prefer Homey Zigbee coordinator over Tuya hub for large fleets.`,
      );
    }
    const sub = {
      cid,
      name: name || cid,
      category: category || '',
      productId: productId || '',
      dpMap: dpMap || {},
      lastDps: {},
    };
    this._subDevices.set(cid, sub);
    this.log.log('Registered sub-device:', cid, name || '');
    return sub;
  }

  // Send command to a Zigbee sub-device through the gateway
  async setSubDeviceDP(deviceCid, dp, value) {
    if (!this._connected || !this._gateway) {
      throw new Error('Gateway not connected');
    }
    const cid = normalizeCid(deviceCid);
    this.log.log('Set sub-device', cid, 'DP', dp, '=', value);
    await this._gateway.set({
      dps: parseInt(dp, 10),
      set: value,
      cid,
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
      cid: normalizeCid(deviceCid),
    });
  }

  // Request refresh of sub-device DPs
  async refreshSubDevice(deviceCid) {
    if (!this._connected || !this._gateway) {return;}
    try {
      await this._gateway.refresh({ cid: normalizeCid(deviceCid) });
    } catch (err) {
      this.log.error('Refresh sub-device failed:', err.message);
    }
  }

  // Handle incoming data from gateway (may contain sub-device updates)
  _handleGatewayData(data) {
    if (!data) {return;}
    const cid = normalizeCid(data.cid);
    const dps = data.dps || {};
    if (cid && this._subDevices.has(cid)) {
      const sub = this._subDevices.get(cid);
      Object.assign(sub.lastDps, dps);
      this.emit('sub-device-data', { cid, dps, device: sub });
    } else if (!cid) {
      this.emit('gateway-data', { dps });
    } else {
      this.emit('unknown-sub-device', { cid, dps });
    }
  }

  getSubDevices() {
    return Array.from(this._subDevices.values());
  }

  // Identify sub-devices from cloud device list
  static identifySubDevices(cloudDevices, gatewayId) {
    const list = Array.isArray(cloudDevices) ? cloudDevices : [];
    const gateway = list.find((d) => d && d.id === gatewayId);
    if (!gateway) {return { gateway: null, subDevices: [] };}
    const subDevices = list.filter((d) => {
      if (!d || d.id === gatewayId) {return false;}
      if (d.ip) {return false;}
      if (d.parent_id && d.parent_id === gatewayId) {return true;}
      if (d.gateway_id && d.gateway_id === gatewayId) {return true;}
      return !!(d.node_id || d.uuid || d.cid);
    });
    return {
      gateway: {
        id: gateway.id,
        name: gateway.name,
        local_key: gateway.local_key,
        ip: gateway.ip,
      },
      subDevices: subDevices.map((d) => ({
        id: d.id,
        name: d.name,
        cid: resolveSubDeviceCid(d),
        category: d.category,
        product_id: d.product_id,
        local_key: d.local_key || gateway.local_key,
      })),
    };
  }

  // Identify all gateways from cloud device list
  static identifyGateways(cloudDevices) {
    const list = Array.isArray(cloudDevices) ? cloudDevices : [];
    return list.filter((d) => {
      if (!d || !d.ip) {return false;}
      const cat = String(d.category || '').toLowerCase();
      if (GATEWAY_CATEGORIES.includes(cat)) {return true;}
      const name = String(d.name || '').toLowerCase();
      if (/\b(gateway|zigbee\s*hub|tygwz|sgw)\b/i.test(name)) {return true;}
      return list.some((sub) => {
        if (!sub || sub.ip) {return false;}
        if (sub.parent_id === d.id || sub.gateway_id === d.id) {return true;}
        return !!(sub.node_id || sub.uuid);
      });
    });
  }

  disconnect() {
    if (this._reconnectTimer) {
      safeClearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    if (this._gateway) {
      try {
        this._gateway.removeAllListeners();
        if (this._gateway.isConnected()) {this._gateway.disconnect();}
      } catch (e) { /* ignore */ }
      this._gateway = null;
    }
    this._connected = false;
    this._subDevices.clear();
  }
}

TuyaZigbeeBridge.TYPICAL_HUB_LAN_CONNECTION_LIMIT = TYPICAL_HUB_LAN_CONNECTION_LIMIT;
TuyaZigbeeBridge.GATEWAY_CATEGORIES = GATEWAY_CATEGORIES;
TuyaZigbeeBridge.CONTROL_PATH_DOCTRINE = CONTROL_PATH_DOCTRINE;
TuyaZigbeeBridge.resolveSubDeviceCid = resolveSubDeviceCid;
TuyaZigbeeBridge.normalizeCid = normalizeCid;
TuyaZigbeeBridge.buildGatewayTuyApiOptions = buildGatewayTuyApiOptions;

module.exports = TuyaZigbeeBridge;
