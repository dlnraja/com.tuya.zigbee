'use strict';

const { safeSetTimeout, safeClearTimeout, safeSetInterval, safeClearInterval } = require('../utils/safe-timers');
const dgram = require('dgram');
const { EventEmitter } = require('events');
const {
  decryptUdpDiscoveryMessage,
  packDiscoverySolicitation,
  buildActiveProbePayload,
  listLanBroadcastTargets,
  guessProtocolFromDiscovery,
} = require('./UdpDiscoveryKeys');

/**
 * Persistent Homey-app UDP discovery (P2408 / P2410).
 * Listens 6666/6667/6668/7000; solicits silent 3.5 devices on UDP/7000 (TinyTuya).
 * P2410: listAdvertising + burstProbe for autonomous advertising discover.
 */
class TuyaUDPDiscovery extends EventEmitter {
  constructor(opts = {}) {
    super();
    this._devices = new Map();
    this._sockets = [];
    this._running = false;
    this._cleanupInterval = null;
    this._log = opts.log || (() => {});
    this._deviceTTL = opts.deviceTTL || 120000;
    this._destroyed = false;
    this._probeInterval = opts.probeInterval || 300000;
    this._probeTimer = null;
    this._probeSeq = 1;
    this._burstTimer = null;
    this._burstStopAt = 0;
  }

  get devices() {
    const now = Date.now();
    const result = [];
    for (const [, entry] of this._devices) {
      if (now - entry.lastSeen < this._deviceTTL) {
        result.push({
          ...entry.info,
          lastSeen: entry.lastSeen,
          advertising: (now - entry.lastSeen) < this._deviceTTL,
        });
      }
    }
    return result;
  }

  /** Devices actively advertising within maxAgeMs (default = device TTL). */
  listAdvertising({ maxAgeMs } = {}) {
    const now = Date.now();
    const maxAge = maxAgeMs || this._deviceTTL;
    const result = [];
    for (const [, entry] of this._devices) {
      if (now - entry.lastSeen <= maxAge) {
        result.push({
          ...entry.info,
          lastSeen: entry.lastSeen,
          advertising: true,
          ageMs: now - entry.lastSeen,
        });
      }
    }
    return result.sort((a, b) => a.ageMs - b.ageMs);
  }

  async start() {
    if (this._running) { return; }
    this._running = true;
    this._destroyed = false;
    this._log('[UDP-DISC] Starting Tuya UDP discovery on ports 6666/6667/6668/7000...');
    try {
      await this._bindSocket(6666);
      await this._bindSocket(6667);
      await this._bindSocket(6668);
      await this._bindSocket(7000);
    } catch (err) {
      this._log('[UDP-DISC] Bind error (non-fatal):', err.message);
    }
    this._cleanupInterval = safeSetInterval(() => {
      if (this._destroyed) { return; }
      this._cleanup();
    }, 60000);
    if (this._cleanupInterval && typeof this._cleanupInterval.unref === 'function') {
      this._cleanupInterval.unref();
    }
    this._startActiveProbe();
    this._log('[UDP-DISC] Discovery active (cascade decrypt + 3.5 solicitation)');
  }

  _startActiveProbe() {
    if (this._probeTimer) { return; }
    const run = () => {
      if (this._destroyed || !this._running) { return; }
      this._sendActiveProbe().catch(() => {});
    };
    run();
    this._probeTimer = safeSetInterval(run, this._probeInterval);
    if (this._probeTimer && typeof this._probeTimer.unref === 'function') {
      this._probeTimer.unref();
    }
  }

  async _sendActiveProbe() {
    const targets = listLanBroadcastTargets();
    for (const sock of this._sockets) {
      for (const t of targets) {
        try {
          // 3.1 plaintext wake (TinyTuya legacy)
          const plain = Buffer.from(buildActiveProbePayload(t.ip));
          sock.send(plain, 6666, t.broadcast);
          sock.send(plain, 6667, t.broadcast);
          // 3.5 GCM solicitation — silent devices only answer UDP/7000
          const gcmPkt = packDiscoverySolicitation(t.ip, { seq: this._probeSeq++ });
          sock.send(gcmPkt, 7000, t.broadcast);
          sock.send(gcmPkt, 6667, t.broadcast);
        } catch { /* non-fatal */ }
      }
    }
  }

  _bindSocket(port) {
    return new Promise((resolve) => {
      let timer = null;
      let settled = false;
      const done = () => {
        if (settled) { return; }
        settled = true;
        if (timer) { safeClearTimeout(timer); }
        resolve();
      };
      const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      sock.on('error', (err) => {
        this._log(`[UDP-DISC] Socket error port ${port}:`, err.message);
        try { sock.close(); } catch (_e) { /* ignore */ }
        done();
      });
      sock.on('message', (msg, rinfo) => {
        try { this._handleMessage(msg, rinfo); }
        catch (_e) { /* ignore malformed */ }
      });
      sock.bind(port, () => {
        try { sock.setBroadcast(true); } catch (_e) { /* ignore */ }
        this._sockets.push(sock);
        this._log(`[UDP-DISC] Listening on port ${port} (cascade)`);
        done();
      });
      timer = safeSetTimeout(done, 3000);
      timer.unref?.();
    });
  }

  _handleMessage(msg, rinfo) {
    if (msg.length < 8 || msg.length > 4096) { return; }
    const decoded = decryptUdpDiscoveryMessage(msg);
    if (!decoded?.payload) { return; }
    let info;
    try { info = JSON.parse(decoded.payload); } catch { return; }
    const deviceId = info.gwId || info.id;
    if (!deviceId) { return; }
    const existing = this._devices.get(deviceId);
    const version = guessProtocolFromDiscovery({
      version: info.version,
      frame: decoded.frame,
      encrypted: !!info.encrypt || decoded.frame.includes('ecb') || decoded.frame === '6699',
      gcm: decoded.frame === '6699' || decoded.frame === 'raw-gcm',
    });
    const deviceInfo = {
      deviceId,
      ip: info.ip || rinfo.address,
      version,
      productKey: info.productKey || '',
      uuid: info.uuid || info.uid || '',
      gwId: info.gwId || deviceId,
      encrypted: !!info.encrypt || decoded.frame !== 'plaintext',
      frame: decoded.frame,
      active: info.active,
      ablilty: info.ablilty,
      advertising: true,
    };
    this._devices.set(deviceId, { info: deviceInfo, lastSeen: Date.now() });
    if (!existing) {
      this._log(`[UDP-DISC] Advertising: ${deviceId} @ ${deviceInfo.ip} v${deviceInfo.version} (${decoded.frame})`);
      this.emit('device-found', deviceInfo);
      this.emit('device-advertising', deviceInfo);
    } else if (existing.info.ip !== deviceInfo.ip || existing.info.version !== deviceInfo.version) {
      this._log(`[UDP-DISC] Updated: ${deviceId} ${existing.info.ip}→${deviceInfo.ip} v${deviceInfo.version}`);
      this.emit('device-updated', deviceInfo);
      this.emit('device-advertising', deviceInfo);
    } else {
      this.emit('device-advertising', deviceInfo);
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

  /** Force an immediate multi-NIC probe (pairing / repair). */
  async probeNow() {
    return this._sendActiveProbe();
  }

  /**
   * Rapid multi-NIC solicitation so silent advertisers wake during pairing.
   * WHY: 3.5 devices often stay quiet until cmd 0x25 on UDP/7000 (TinyTuya).
   */
  async burstProbe({ durationMs = 8000, intervalMs = 1500 } = {}) {
    if (this._burstTimer) {
      safeClearInterval(this._burstTimer);
      this._burstTimer = null;
    }
    this._burstStopAt = Date.now() + Math.max(1000, durationMs);
    let probes = 0;
    const tick = async () => {
      if (this._destroyed || !this._running || Date.now() > this._burstStopAt) {
        if (this._burstTimer) {
          safeClearInterval(this._burstTimer);
          this._burstTimer = null;
        }
        return;
      }
      probes += 1;
      await this._sendActiveProbe().catch(() => {});
    };
    await tick();
    this._burstTimer = safeSetInterval(() => { tick().catch(() => {}); }, Math.max(500, intervalMs));
    if (this._burstTimer && typeof this._burstTimer.unref === 'function') {
      this._burstTimer.unref();
    }
    return { probes: Math.max(1, probes), durationMs, intervalMs };
  }

  async stop() {
    this._running = false;
    this._destroyed = true;
    if (this._burstTimer) { safeClearInterval(this._burstTimer); this._burstTimer = null; }
    if (this._probeTimer) { safeClearInterval(this._probeTimer); this._probeTimer = null; }
    if (this._cleanupInterval) { safeClearInterval(this._cleanupInterval); this._cleanupInterval = null; }
    for (const sock of this._sockets) {
      try { sock.close(); } catch (_e) { /* ignore */ }
    }
    this._sockets = [];
    this._log('[UDP-DISC] Stopped');
  }
}

module.exports = TuyaUDPDiscovery;
