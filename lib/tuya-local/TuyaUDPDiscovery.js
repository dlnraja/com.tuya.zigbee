'use strict';

const dgram = require('dgram');
const crypto = require('crypto');
const { EventEmitter } = require('events');

const UDP_KEY = Buffer.from('yGAdlopoPVldABfn');
const PREFIX = Buffer.from([0x00, 0x00, 0x55, 0xAA]);
const SUFFIX = Buffer.from([0x00, 0x00, 0xAA, 0x55]);

class TuyaUDPDiscovery extends EventEmitter {
  constructor(opts = {}) {
    super();
    this._devices = new Map();
    this._sockets = [];
    this._running = false;
    this._cleanupInterval = null;
    this._log = opts.log || (() => {});
    this._deviceTTL = opts.deviceTTL || 120000;
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
    this._log('[UDP-DISC] Starting Tuya UDP discovery on ports 6666/6667...');
    try {
      await this._bindSocket(6666, false);
      await this._bindSocket(6667, true);
    } catch (err) {
      this._log('[UDP-DISC] Bind error (non-fatal):', err.message);
    }
    this._cleanupInterval = setInterval(() => this._cleanup(), 60000);
    this._log('[UDP-DISC] Discovery active');
  }

  _bindSocket(port, encrypted) {
    return new Promise((resolve, reject) => {
      const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      sock.on('error', (err) => {
        this._log('[UDP-DISC] Socket error port ' + port + ':', err.message);
        try { sock.close(); } catch (e) {}
        resolve();
      });
      sock.on('message', (msg, rinfo) => {
        try { this._handleMessage(msg, rinfo, encrypted); }
        catch (e) { /* ignore malformed */ }
      });
      sock.bind(port, () => {
        try { sock.setBroadcast(true); } catch (e) {}
        this._sockets.push(sock);
        this._log('[UDP-DISC] Listening on port ' + port + (encrypted ? ' (encrypted)' : ' (plaintext)'));
        resolve();
      });
      setTimeout(() => resolve(), 3000);
    });
  }

  _handleMessage(msg, rinfo, encrypted) {
    if (msg.length < 28) return;
    let payload;
    const hasPfx = msg.slice(0, 4).equals(PREFIX);
    const dataStart = hasPfx ? 20 : 0;
    const dataEnd = msg.slice(-8).slice(4).equals(SUFFIX) ? msg.length - 8 : msg.length;
    const raw = msg.slice(dataStart, dataEnd);
    if (encrypted) {
      try {
        const decipher = crypto.createDecipheriv('aes-128-ecb', UDP_KEY, null);
        payload = Buffer.concat([decipher.update(raw), decipher.final()]).toString('utf8');
      } catch (e) { return; }
    } else {
      payload = raw.toString('utf8');
    }
    payload = payload.replace(/[\x00-\x1f]/g, '').trim();
    if (!payload.startsWith('{')) return;
    const info = JSON.parse(payload);
    if (!info.gwId) return;
    const deviceId = info.gwId;
    const existing = this._devices.get(deviceId);
    const deviceInfo = {
      deviceId: deviceId,
      ip: info.ip || rinfo.address,
      version: info.version || '3.3',
      productKey: info.productKey || '',
      encrypted: !!info.encrypt,
      active: info.active,
    };
    this._devices.set(deviceId, { info: deviceInfo, lastSeen: Date.now() });
    if (!existing) {
      this._log('[UDP-DISC] New device: ' + deviceId + ' @ ' + deviceInfo.ip + ' v' + deviceInfo.version);
      this.emit('device-found', deviceInfo);
    } else if (existing.info.ip !== deviceInfo.ip) {
      this._log('[UDP-DISC] IP changed: ' + deviceId + ' ' + existing.info.ip + ' -> ' + deviceInfo.ip);
      this.emit('device-updated', deviceInfo);
    }
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

  getDevice(deviceId) {
    const entry = this._devices.get(deviceId);
    return entry ? { ...entry.info, lastSeen: entry.lastSeen } : null;
  }

  async stop() {
    this._running = false;
    if (this._cleanupInterval) { clearInterval(this._cleanupInterval); this._cleanupInterval = null; }
    for (const sock of this._sockets) {
      try { sock.close(); } catch (e) {}
    }
    this._sockets = [];
    this._log('[UDP-DISC] Stopped');
  }
}

module.exports = TuyaUDPDiscovery;
