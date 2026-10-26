'use strict';
/**
 * P3072c: what the repair screen shows for a Tuya Wi-Fi device, and a one-shot re-probe.
 *
 * Idea (credited in CREDITS.md, written in our own words): tuya-local, localtuya and tinytuya
 * all tell users the same thing first — "is it reachable, at which IP, which protocol, and what
 * was the last error?" — before asking for a new key. We surface that, nothing secret.
 *
 * Bounded: one burst probe per call, wait capped at 15 s, polling capped, no timers left behind.
 */
const { effectiveIp, mirrorIpPatch } = require('./LocalIpSettings');
const { isUsableIpv4 } = require('../wifi/LanRebindRouter');
const { safeSetTimeout } = require('../utils/safe-timers');

const MAX_WAIT_MS = 15000;

function lastErrorOf(device) {
  try {
    const ev = device && device._connRecorder && device._connRecorder.toJSON ? device._connRecorder.toJSON() : [];
    for (let i = ev.length - 1; i >= 0; i--) {
      if (ev[i] && ev[i].event === 'error') {return { at: ev[i].t, message: String(ev[i].message || '').slice(0, 160) };}
    }
  } catch (_e) { /* advisory */ }
  return null;
}

/** Plain, secret-free snapshot. `discovery` may be null (UDP not started). */
function buildRepairStatus(device, discovery, now = Date.now()) {
  const settings = (device && typeof device.getSettings === 'function' && device.getSettings()) || {};
  const id = settings.device_id || '';
  const client = device && device._client;
  const ip = effectiveIp(settings) || '';
  let udp = null;
  try {
    const seen = id && discovery && typeof discovery.getDevice === 'function' ? discovery.getDevice(id) : null;
    if (seen) {
      udp = { ip: seen.ip || '', version: seen.version || '', ageSec: seen.lastSeen ? Math.max(0, Math.round((now - seen.lastSeen) / 1000)) : null };
    }
  } catch (_e) { udp = null; }
  return {
    connected: !!(device && device._connected),
    ip,
    protocol: (client && client.version) || settings.protocol_version || '',
    udp,
    udpRunning: !!discovery,
    ipMismatch: !!(udp && udp.ip && ip && udp.ip !== ip),
    lastError: lastErrorOf(device),
    hasKey: !!settings.local_key,
  };
}

const defaultSleep = (ms) => new Promise((r) => { const t = safeSetTimeout(r, ms); if (t && t.unref) {t.unref();} });

/**
 * Wake silent devices with a burst probe, wait for this device's announcement, adopt a new IP.
 * @returns {Promise<{ok:boolean, reason?:string, ip?:string, changed?:boolean}>}
 */
async function reprobe(device, discovery, { waitMs = 8000, pollMs = 500, sleep = defaultSleep } = {}) {
  try {
    const settings = (device && device.getSettings && device.getSettings()) || {};
    const id = settings.device_id;
    if (!id) {return { ok: false, reason: 'no_device_id' };}
    if (!discovery || typeof discovery.getDevice !== 'function') {return { ok: false, reason: 'udp_unavailable' };}
    const wait = Math.min(MAX_WAIT_MS, Math.max(1000, Number(waitMs) || 8000));
    const step = Math.max(100, Number(pollMs) || 500);
    const before = discovery.getDevice(id);
    const since = before && before.lastSeen ? before.lastSeen : 0;
    if (typeof discovery.burstProbe === 'function') {await discovery.burstProbe({ durationMs: wait }).catch(() => {});}
    let found = null;
    for (let spent = 0; spent <= wait; spent += step) {
      const seen = discovery.getDevice(id);
      if (seen && seen.ip && (!since || (seen.lastSeen || 0) > since || spent >= wait)) { found = seen; break; }
      await sleep(step);
    }
    if (!found || !isUsableIpv4(found.ip)) {return { ok: false, reason: 'not_heard' };}
    const current = effectiveIp(settings);
    if (found.ip === current) {return { ok: true, ip: found.ip, changed: false };}
    await device.setSettings(mirrorIpPatch(settings, { ip: found.ip }));
    if (typeof device.onLanIpChanged === 'function') {await device.onLanIpChanged(found.ip);} else if (device._client && typeof device._client.updateIP === 'function') {device._client.updateIP(found.ip);}
    return { ok: true, ip: found.ip, changed: true };
  } catch (e) {
    return { ok: false, reason: String((e && e.message) || e).slice(0, 120) };
  }
}

module.exports = { buildRepairStatus, reprobe, MAX_WAIT_MS };
