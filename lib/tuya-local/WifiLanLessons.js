'use strict';
/**
 * P2953 — Further lessons from the Tuya Local Homey thread (topic 154077, author Andi),
 * rewritten in our own words. All helpers are pure / bounded and advisory.
 *  - #171 https://community.homey.app/t/154077/171 : after a mode change many thermostats
 *    switch their setpoint internally without pushing it -> re-read state shortly after.
 *  - #483 https://community.homey.app/t/154077/483 : state readable but every command
 *    ignored -> often a sub-device behind a hub, or a device id that is not the real one.
 *  - #491 https://community.homey.app/t/154077/491 : the words a motor expects on its
 *    control DP differ per model; read them from the cloud DP table when available.
 *  - #520 https://community.homey.app/t/154077/520 : record what happens at connection
 *    start so a support bundle can show it.
 */
const MODE_REFRESH_DELAY_MS = 1500;

/** #171: returns a delay in ms when a refresh should follow, else null. */
function refreshDelayAfterChange(changedDps, modeDp = 4) {
  if (!changedDps || typeof changedDps !== 'object') {return null;}
  return Object.prototype.hasOwnProperty.call(changedDps, String(modeDp)) ? MODE_REFRESH_DELAY_MS : null;
}

/** #483: classify "reads fine, writes ignored". Returns null when no issue is visible. */
function diagnoseIgnoredCommands({ sent = 0, acknowledged = 0, deviceId = '', virtualId = '', cid = '', parentId = '' } = {}) {
  if (sent < 3 || acknowledged > 0) {return null;}
  const reasons = [];
  if (parentId || cid) {reasons.push('sub_device_needs_gateway_cid');}
  if (virtualId && deviceId && String(virtualId) !== String(deviceId)) {reasons.push('device_id_differs_from_virtual_id');}
  if (!reasons.length) {reasons.push('unknown_check_virtual_id_and_hub');}
  return { sent, acknowledged, reasons };
}

/**
 * #491: derive open/close/stop words from a cloud enum range for the control DP.
 * Known words only; returns { tokens, status } where status is 'confirmed' or 'lead'.
 */
const OPEN = ['open', 'on', 'zz', 'up', 'forward'];
const CLOSE = ['close', 'off', 'fz', 'down', 'back'];
const STOP = ['stop', 'pause'];
function coverTokensFromRange(range) {
  if (!Array.isArray(range) || !range.length) {return null;}
  const find = (words) => range.find((r) => words.includes(String(r).toLowerCase()));
  const tokens = { open: find(OPEN), close: find(CLOSE), stop: find(STOP) };
  if (tokens.open === undefined || tokens.close === undefined) {return { tokens: null, status: 'lead', range: range.map(String) };}
  return { tokens, status: tokens.stop === undefined ? 'lead' : 'confirmed' };
}

/** #520: bounded ring buffer of connection-start events (no secrets stored). */
class ConnectionStartRecorder {
  constructor(max = 50) { this.max = max; this.events = []; }
  record(event, detail = {}, now = Date.now()) {
    const safe = {};
    for (const [k, v] of Object.entries(detail || {})) {
      if (/key|token|secret|password/i.test(k)) {continue;}
      safe[k] = typeof v === 'object' ? JSON.stringify(v).slice(0, 200) : v;
    }
    this.events.push({ t: new Date(now).toISOString(), event: String(event), ...safe });
    if (this.events.length > this.max) {this.events.splice(0, this.events.length - this.max);}
  }
  toJSON() { return this.events.slice(); }
}

module.exports = { refreshDelayAfterChange, diagnoseIgnoredCommands, coverTokensFromRange, ConnectionStartRecorder, MODE_REFRESH_DELAY_MS };
