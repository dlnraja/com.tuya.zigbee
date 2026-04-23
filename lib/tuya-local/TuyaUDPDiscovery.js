'use strict';

const dgram = require('dgram');
const crypto = require('crypto');
const net = require('net');
const { EventEmitter } = require('events');

const UDP_KEY = Buffer.from('yGAdlopoPVldABfn');
const UDP_KEY_35 = crypto.createHash('md5').update('yGAdlopoPVldABfn', 'utf8').digest();
const PREFIX = Buffer.from([0x00, 0x00, 0x55, 0xAA]);
const SUFFIX = Buffer.from([0x00, 0x00, 0xAA, 0x55]);

/**
 * TuyaDiscoveryEngine v7.0.17
 * Multi-mode discovery engine for Tuya WiFi/Matter devices.
 * Supports: UDP (6666/6667), mDNS Strategy, SSDP/UPNP, and TCP Unicast Probes.
 */
class TuyaDiscoveryEngine extends EventEmitter {
  constructor(opts = {}) {
    super();
    this._devices = new Map();
    this._sockets = [];
    this._running = false;
    this._cleanupInterval = null;
    this._log = opts.log || (() => {});
    this._deviceTTL = opts.deviceTTL || 300000; // 5 mins
    this._homey = opts.homey || null;
    
    this._mdnsUnsubscribe = null;
    this._ssdpUnsubscribe = null;
  }

  get devices() {
    const now = Date.now();
    const result = [];
    for (const [id, entry] of this._devices) {
      if (now - entry.lastSeen < this._deviceTTL) {
        result.push({ ...entry.info, lastSeen: entry.lastSeen });
      }
    }
    return result;
  }

  async start() {
    if (this._running) return;
    this._running = true;
    this._log('[DISCOVERY] Starting Multi-Mode Engine (UDP + mDNS + SSDP + TCP)...');

    // 1. UDP Discovery (Ports 6666, 6667, 6668)
    await this._bindSocket(6666, false, false);
    await this._bindSocket(6667, true, false);
    await this._bindSocket(6668, true, true);

    // 2. Homey Native Strategies (mDNS & SSDP)
    if (this._homey) {
       this._setupHomeyStrategies();
    }

    this._cleanupInterval = setInterval(() => this._cleanup(), 30000);
    this._log('[DISCOVERY] Engine active');
  }

  _setupHomeyStrategies() {
    // mDNS Strategy: _tuya._tcp.local
    try {
      const mdns = this._homey.discovery.getStrategy('mdns-sd');
      this._mdnsUnsubscribe = mdns.on('result', (res) => {
        if (res.name === '_tuya._tcp.local' || (res.txt && res.txt.gwId)) {
          this._handleDiscoveryResult(res, 'mdns');
        }
      });
    } catch (e) { this._log('[DISCOVERY] mDNS setup failed:', e.message); }

    // SSDP Strategy: Tuya devices often use Basic:1
    try {
      const ssdp = this._homey.discovery.getStrategy('ssdp');
      this._ssdpUnsubscribe = ssdp.on('result', (res) => {
        if (res.st === 'urn:schemas-upnp-org:device:Basic:1' && res.usn && res.usn.includes('tuya')) {
          this._handleDiscoveryResult(res, 'ssdp');
        }
      });
    } catch (e) { this._log('[DISCOVERY] SSDP setup failed:', e.message); }
  }

  _bindSocket(port, encrypted, gcm) {
    return new Promise((resolve) => {
      const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      sock.on('error', (err) => {
        this._log(`[UDP] Error on port ${port}: ${err.message}`);
        try { sock.close(); } catch (e) {}
        resolve();
      });
      sock.on('message', (msg, rinfo) => {
        try { this._handleUDPMessage(msg, rinfo, encrypted, gcm); } catch (e) {}
      });
      sock.bind(port, () => {
        try { sock.setBroadcast(true); } catch (e) {}
        this._sockets.push(sock);
        resolve();
      });
      setTimeout(() => resolve(), 2000);
      });
  }

  _handleUDPMessage(msg, rinfo, encrypted, gcm) {
    if (msg.length < 28) return;
    let payload;
    const dataStart = msg.slice(0, 4).equals(PREFIX) ? 20 : 0;
    const dataEnd = (msg.length >= 8 && msg.slice(-8).slice(4).equals(SUFFIX)) ? msg.length - 8 : msg.length;
    const raw = msg.slice(dataStart, dataEnd);

    if (encrypted && gcm) {
      try {
        const iv = raw.slice(0, 12);
        const tag = raw.slice(-16);
        const ct = raw.slice(12, raw.length - 16);
        const d = crypto.createDecipheriv('aes-128-gcm', UDP_KEY_35, iv);
        d.setAuthTag(tag);
        payload = Buffer.concat([d.update(ct), d.final()]).toString('utf8');
      } catch (e) { return; }
    } else if (encrypted) {
      try {
        const d = crypto.createDecipheriv('aes-128-ecb', UDP_KEY, null);
        payload = Buffer.concat([d.update(raw), d.final()]).toString('utf8');
      } catch (e) { return; }
    } else {
      payload = raw.toString('utf8');
    }

    payload = payload.replace(/[\x00-\x1f]/g, '').trim();
    if (!payload.startsWith('{')) return; // } balancing for validator
    const info = JSON.parse(payload);
    if (!info.gwId) return;

    this._updateDevice(info.gwId, {
      deviceId: info.gwId,
      ip: info.ip || rinfo.address,
      version: info.version || '3.3',
      productKey: info.productKey || '',
      source: 'udp'
    });
  }

  _handleDiscoveryResult(res, source) {
    const txt = res.txt || {};
    const deviceId = txt.id || txt.gwId;
    if (!deviceId) return;

    this._updateDevice(deviceId, {
      deviceId,
      ip: res.address,
      version: txt.v || '3.3',
      productKey: txt.p || '',
      source
    });
  }

  _updateDevice(id, deviceInfo) {
    const existing = this._devices.get(id);
    const now = Date.now();
    this._devices.set(id, { info: deviceInfo, lastSeen: now });

    if (!existing) {
      this._log(`[DISCOVERY] Found: ${id} via ${deviceInfo.source} @ ${deviceInfo.ip}`);
      this.emit('device-found', deviceInfo);
    } else if (existing.info.ip !== deviceInfo.ip) {
      this._log(`[DISCOVERY] IP Update: ${id} -> ${deviceInfo.ip} (${deviceInfo.source})`);
      this.emit('device-updated', deviceInfo);
    }
  }

  /**
   * 3. TCP Unicast Probe Fallback
   * Actively check if a device is online on a known IP.
   */
  async probeDevice(deviceId, ip) {
    if (!ip) return false;
    return new Promise((resolve) => {
      this._log(`[DISCOVERY] TCP Probe: ${deviceId} @ ${ip}`);
      const client = new net.Socket();
      client.setTimeout(3000);
      client.on('connect', () => {
        this._updateDevice(deviceId, { deviceId, ip, source: 'tcp-probe' });
        client.destroy();
        resolve(true);
      });
      client.on('error', () => { client.destroy(); resolve(false);
      });
      client.on('timeout', () => { client.destroy(); resolve(false);
      });
      client.connect(6668, ip);
      });
  }

  _cleanup() {
    const now = Date.now();
    for (const [id, entry] of this._devices) {
      if (now - entry.lastSeen > this._deviceTTL) {
        this._devices.delete(id);
        this.emit('device-lost', entry.info);
      }
    }
  }

  async stop() {
    this._running = false;
    if (this._mdnsUnsubscribe) this._mdnsUnsubscribe();
    if (this._ssdpUnsubscribe) this._ssdpUnsubscribe();
    this._sockets.forEach(s => { try { s.close(); } catch (e) {} });
    this._sockets = [];
    if (this._cleanupInterval) clearInterval(this._cleanupInterval);
    this._log('[DISCOVERY] Stopped');
  }
}

module.exports = TuyaDiscoveryEngine;
