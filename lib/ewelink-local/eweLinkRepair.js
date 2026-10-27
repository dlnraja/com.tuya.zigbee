'use strict';

/**
 * P3072 — one Repair "configure" handler for every eWeLink/Sonoff LAN device.
 *
 * Before: EweLinkLocalDriver had it, but the eleven generated wifi_sonoff_* drivers extend
 * Homey.Driver directly, so their Repair view could not save anything. Both now call this.
 * The values are saved, then the device reconnects with them right away (setSettings from code
 * does not call onSettings, so without this the new IP/key only applied after a restart).
 */

function _clean(v) {
  return typeof v === 'string' ? v.trim() : v;
}

function buildEweLinkRepairPatch(data) {
  const d = data || {};
  const s = {};
  if (d.api_key) {s.api_key = _clean(d.api_key);}
  if (d.ip) {s.ip = _clean(d.ip);}
  if (d.encrypt !== undefined) {s.encrypt = d.encrypt;}
  return s;
}

function registerEweLinkRepairHandlers(session, device, opts = {}) {
  const log = typeof opts.log === 'function' ? opts.log : () => {};
  session.setHandler('configure', async (data) => {
    const s = buildEweLinkRepairPatch(data);
    if (!Object.keys(s).length) {return { success: true, changed: false };}
    await device.setSettings(s);
    if (typeof device.reconnectWithSettings === 'function') {
      try { await device.reconnectWithSettings(s); } catch (e) { log('[EWE-REPAIR] reconnect:', e && e.message); }
    }
    return { success: true, changed: true };
  });
}

module.exports = { registerEweLinkRepairHandlers, buildEweLinkRepairPatch };
