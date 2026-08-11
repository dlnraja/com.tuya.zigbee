/**
 * 🌉 LocalWiFiTuyaBridge - v2.0.0
 *
 * Inspired by LocalTuya, this bridge allows the Universal Tuya Engine
 * to manage WiFi devices via local network communication.
 *
 * v2.0.0: Replaces the v1 stub with a functional local-first facade over the
 * proven building blocks (TuyaUDPDiscovery + TuyaLocalClient), with verbose
 * transport decision logging via lib/wifi/LocalFirstResolver:
 *   1. LAN (Tuya local protocol) - always preferred
 *   2. Cloud - only when LAN is impossible AND policy opted in
 *
 * Features:
 * - Local discovery (UDP 6666/6667/6668 via TuyaUDPDiscovery)
 * - Session management (TuyaLocalClient: protocol auto-detect, heartbeat, backoff)
 * - Local-first transport resolution with explicit decision logs
 * - Command path with queue/rate-limit (delegated to TuyaLocalClient)
 */

'use strict';

const EventEmitter = require('events');
const TuyaUDPDiscovery = require('../tuya-local/TuyaUDPDiscovery');
const TuyaLocalClient = require('../tuya-local/TuyaLocalClient');
const { resolveWiFiTransport, TRANSPORT_LAN } = require('../wifi/LocalFirstResolver');
const { normalizeWiFiConnectionPolicy } = require('../wifi/WiFiConnectionPolicy');

class LocalWiFiTuyaBridge extends EventEmitter {
  constructor(homey) {
    super();
    this.homey = homey;
    this.devices = new Map(); // id -> { key, ip, version, policy }
    this.sessions = new Map(); // id -> TuyaLocalClient
    this._discovery = null;
    this._destroyed = false;
  }

  /**
   * Start local discovery (UDP broadcast listener)
   */
  async startDiscovery() {
    if (this._discovery) {return this._discovery;}
    this.homey.log('[WIFI-BRIDGE] 📡 Starting Local Tuya discovery...');
    this._discovery = new TuyaUDPDiscovery({
      log: (...args) => this.homey.log('[WIFI-BRIDGE]', ...args),
    });
    this._discovery.on('device-found', (info) => this.emit('device-found', info));
    this._discovery.on('device-updated', (info) => this.emit('device-updated', info));
    this._discovery.on('device-lost', (info) => this.emit('device-lost', info));
    await this._discovery.start();
    return this._discovery;
  }

  /**
   * Resolve the transport for a device with verbose decision logging.
   * @returns {{transport: string, ip: string|null, ipSource: string|null, reason: string}}
   */
  resolveTransport(id, overrides = {}) {
    const entry = this.devices.get(id) || {};
    const cloudHealth = (() => {
      try { return require('../wifi/CloudHealthState').getCloudHealthSnapshot(); }
      catch (_) { return {}; }
    })();
    const opts = {
      policy: normalizeWiFiConnectionPolicy(overrides.policy || entry.policy),
      deviceId: id,
      localKey: overrides.key || entry.key,
      ip: overrides.ip || entry.ip,
      discoveredIp: this._discovery?.getDevice?.(id)?.ip || null,
      hasCloudCredentials: overrides.hasCloudCredentials,
      cloudRateLimited: overrides.cloudRateLimited === true || cloudHealth.cloudRateLimited === true,
      cloudUnhealthy: overrides.cloudUnhealthy === true || cloudHealth.cloudUnhealthy === true,
    };
    const decision = resolveWiFiTransport(opts);
    this.homey.log(`[WIFI-BRIDGE] [LOCAL-FIRST] Transport decision for ${id}: ${decision.transport.toUpperCase()} — ${decision.reason}`);
    return decision;
  }

  /**
   * Register a new WiFi device (local-first)
   * @returns {string} resolved transport ('lan' | 'cloud' | 'none')
   */
  async registerDevice(id, key, ip, version = '3.3', policy = undefined) {
    this.devices.set(id, { key, ip, version, policy });
    const decision = this.resolveTransport(id);
    if (decision.transport !== TRANSPORT_LAN) {
      this.homey.log(`[WIFI-BRIDGE] ⚠️ Device ${id} registered without local session (transport=${decision.transport})`);
      return decision.transport;
    }
    this.homey.log(`[WIFI-BRIDGE] 🔌 Registering WiFi device ${id} at ${decision.ip || 'auto-discover'} (v${version})`);
    const client = new TuyaLocalClient({
      id,
      key,
      ip: decision.ip || undefined,
      version,
      resolveIP: (deviceId) => this._discovery?.getDevice?.(deviceId)?.ip || null,
      log: (...args) => this.homey.log('[WIFI-BRIDGE]', ...args),
    });
    client.on('dp-update', (dps) => this._onData(id, dps));
    client.on('error', (err) => this.emit('error', { id, error: err }));
    this.sessions.set(id, client);
    return decision.transport;
  }

  /**
   * Connect a registered device's local session
   */
  async connectDevice(id) {
    const client = this.sessions.get(id);
    if (!client) {
      throw new Error(`[WIFI-BRIDGE] No local session for ${id} (registerDevice first)`);
    }
    await client.connect();
    return client;
  }

  /**
   * Send a command to a WiFi device (queued + rate-limited by TuyaLocalClient)
   */
  async sendCommand(id, dps) {
    this.homey.log(`[WIFI-BRIDGE] 📤 Command to ${id}:`, dps);
    const client = this.sessions.get(id);
    if (!client) {
      throw new Error(`[WIFI-BRIDGE] No local session for ${id} — cannot send command`);
    }
    await client.setDPs(dps);
  }

  /**
   * Handle incoming data from WiFi device
   */
  _onData(id, data) {
    if (this._destroyed) {return;}
    this.emit('data', { id, data });
  }

  /**
   * Tear down all sessions and discovery
   */
  async destroy() {
    this._destroyed = true;
    for (const client of this.sessions.values()) {
      try { await client.destroy(); } catch (e) { /* ignore */ }
    }
    this.sessions.clear();
    this.devices.clear();
    if (this._discovery) {
      try { await this._discovery.stop?.(); } catch (e) { /* ignore */ }
      this._discovery = null;
    }
    this.removeAllListeners();
  }
}

module.exports = LocalWiFiTuyaBridge;
