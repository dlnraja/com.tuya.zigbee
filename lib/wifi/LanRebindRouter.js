'use strict';

/**
 * P3072 step B — follow a Wi-Fi Tuya device to its new IP (DHCP lease change, router reboot).
 *
 * The UDP broadcast listener (TuyaUDPDiscovery) already notices when a device announces itself
 * from another address. Before, the app wrote `ip`/`ip_address` into every matching device but
 * the open LAN client kept knocking on the old address until its own retry gave up, and
 * nothing limited how often a flapping announcement could rewrite settings.
 *
 * This router does one small thing per announcement:
 *   - ignore anything that is not a plain IPv4 address, and announcements for unknown devices;
 *   - ignore it when the device already uses that IP;
 *   - per device, at most one rebind per `minIntervalMs` (a device bouncing between two
 *     addresses cannot hammer the settings store);
 *   - write the IP through the device's own setSettings (which mirrors every IP key, step A),
 *     then hand the new IP to the live client so the reconnect happens now, not at the next retry.
 * Its memory is a bounded Map (oldest entry evicted), no timers.
 *
 * Idea, in our own words: tuya-local and localtuya both treat the address seen in discovery as
 * the truth for a device and update the stored host in place; tinytuya's scanner does the same
 * matching by device id. Credits in CREDITS.md (Wi-Fi section).
 */

const { mirrorIpPatch, effectiveIp } = require('../tuya-local/LocalIpSettings');

const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

function isUsableIpv4(ip) {
  if (typeof ip !== 'string' || !IPV4.test(ip)) {return false;}
  return !(ip.startsWith('0.') || ip.startsWith('127.') || ip.startsWith('255.') || ip.startsWith('169.254.') || ip === '0.0.0.0');
}

class LanRebindRouter {
  /**
   * @param {object} opts
   * @param {() => Array} opts.listDevices  returns every Homey device to consider
   * @param {Function} [opts.log]
   * @param {() => number} [opts.now]
   * @param {number} [opts.minIntervalMs=60000]
   * @param {number} [opts.maxEntries=256]
   */
  constructor(opts = {}) {
    this._listDevices = typeof opts.listDevices === 'function' ? opts.listDevices : () => [];
    this._log = typeof opts.log === 'function' ? opts.log : () => {};
    this._now = typeof opts.now === 'function' ? opts.now : Date.now;
    this._minIntervalMs = Number.isFinite(opts.minIntervalMs) ? opts.minIntervalMs : 60000;
    this._maxEntries = Number.isFinite(opts.maxEntries) && opts.maxEntries > 0 ? opts.maxEntries : 256;
    this._last = new Map(); // deviceId -> { ip, at }
    this.stats = { rebound: 0, same: 0, cooldown: 0, ignored: 0, failed: 0 };
  }

  _remember(id, ip) {
    if (this._last.has(id)) {this._last.delete(id);}
    else if (this._last.size >= this._maxEntries) {this._last.delete(this._last.keys().next().value);}
    this._last.set(id, { ip, at: this._now() });
  }

  _matches(device, id) {
    try {
      const s = (typeof device.getSettings === 'function' && device.getSettings()) || {};
      // same match as the historical SMART-HEAL loop: the device_id setting only
      if (s.device_id && s.device_id === id) {return s;}
    } catch (_e) { /* device being deleted */ }
    return null;
  }

  /**
   * Handle one discovery announcement. Resolves to a short verdict string (for logs and tests).
   * Never throws.
   */
  async handle(info) {
    const id = info && (info.deviceId || info.gwId);
    const ip = info && typeof info.ip === 'string' ? info.ip.trim() : '';
    if (!id || !isUsableIpv4(ip)) {this.stats.ignored++; return 'ignored';}
    let devices = [];
    try { devices = this._listDevices() || []; } catch (_e) { devices = []; }
    let verdict = 'unknown';
    for (const device of devices) {
      if (!device || device._destroyed) {continue;}
      const settings = this._matches(device, id);
      if (!settings) {continue;}
      const current = effectiveIp(settings);
      if (current === ip) {this.stats.same++; verdict = 'same'; continue;}
      const last = this._last.get(id);
      if (last && this._now() - last.at < this._minIntervalMs) {this.stats.cooldown++; verdict = 'cooldown'; continue;}
      this._remember(id, ip);
      try {
        await device.setSettings(mirrorIpPatch(settings, { ip }));
        if (typeof device.onLanIpChanged === 'function') {await device.onLanIpChanged(ip);}
        else if (device._client && typeof device._client.updateIP === 'function') {device._client.updateIP(ip);}
        this.stats.rebound++;
        verdict = 'rebound';
        this._log(`[LAN-REBIND] ${String(id).slice(0, 6)}… ${current || '—'} -> ${ip}`);
      } catch (e) {
        this.stats.failed++;
        verdict = 'failed';
        this._log('[LAN-REBIND] update failed:', e && e.message);
      }
    }
    if (verdict === 'unknown') {this.stats.ignored++; return 'ignored';}
    return verdict;
  }

  size() { return this._last.size; }
}

module.exports = { LanRebindRouter, isUsableIpv4 };
