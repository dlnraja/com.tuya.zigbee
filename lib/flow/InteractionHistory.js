'use strict';

/**
 * P2687 — Interaction history helpers (pure + ring prune).
 * WHY: FeatureFlowCards stays thin; Contre quoi unit-tested without Homey.
 */

const ACTION_EXACT = new Set([
  'onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode',
  'windowcoverings_set', 'windowcoverings_state', 'windowcoverings_tilt_set',
  'target_temperature', 'thermostat_mode', 'locked', 'garagedoor_closed',
  'speaker_playing', 'speaker_next', 'speaker_prev', 'volume_set', 'volume_mute',
]);

/**
 * @param {string} capability
 * @param {{ setable?: boolean }|null} [opts]
 * @returns {'action'|'sensor'}
 */
function classifyInteractionKind(capability, opts = null) {
  const cap = String(capability || '');
  const base = cap.split('.')[0];
  if (opts && opts.setable === true) return 'action';
  if (/^button(\.|$)/i.test(cap)) return 'action';
  if (ACTION_EXACT.has(base) || ACTION_EXACT.has(cap)) return 'action';
  if (/^(windowcoverings_|target_|thermostat_|volume_|speaker_)/i.test(cap)) return 'action';
  return 'sensor';
}

/**
 * @param {Array<{ts:number,deviceName?:string,capability:string,value:*,kind?:string}>} entries
 * @param {number} [limit]
 * @returns {{ list: string, count: number }}
 */
function formatInteractionList(entries, limit = 10) {
  const max = Math.max(1, Math.min(50, Number(limit) || 10));
  const slice = Array.isArray(entries) ? entries.slice(-max) : [];
  const lines = slice.map((e) => {
    const t = e.ts ? new Date(e.ts).toISOString().slice(11, 19) : '--:--:--';
    const name = e.deviceName ? `${e.deviceName}: ` : '';
    return `${t} ${name}${e.capability}=${String(e.value ?? '')}`;
  });
  return { list: lines.join('; '), count: lines.length };
}

/**
 * @param {Array} ring
 * @param {object} entry
 * @param {{ maxAgeMs?: number, maxEntries?: number }} [opts]
 */
function pushInteraction(ring, entry, opts = {}) {
  if (!Array.isArray(ring) || !entry) return ring;
  const maxAge = opts.maxAgeMs != null ? opts.maxAgeMs : 24 * 60 * 60 * 1000;
  const maxEntries = opts.maxEntries != null ? opts.maxEntries : 200;
  ring.push(entry);
  const now = entry.ts || Date.now();
  while (ring.length > 0 && (now - ring[0].ts > maxAge || ring.length > maxEntries)) {
    ring.shift();
  }
  return ring;
}

/**
 * @param {Array<{ts:number,deviceId?:string}>} ring
 * @param {string} deviceId
 * @param {number} minutes
 */
function interactedRecently(ring, deviceId, minutes) {
  if (!Array.isArray(ring) || !deviceId) return false;
  const win = Math.max(1, Number(minutes) || 5) * 60 * 1000;
  const cutoff = Date.now() - win;
  return ring.some((e) => e && e.deviceId === deviceId && e.ts >= cutoff);
}

/**
 * List setable / action-like caps from a Homey-like device stub.
 * @param {{ getCapabilities?: Function, getCapabilityOptions?: Function }} device
 * @returns {string[]}
 */
function listActionableCapabilities(device) {
  if (!device || typeof device.getCapabilities !== 'function') return [];
  const caps = device.getCapabilities() || [];
  return caps.filter((c) => {
    let setable = false;
    try {
      const o = typeof device.getCapabilityOptions === 'function'
        ? device.getCapabilityOptions(c) : null;
      if (o && o.setable === true) setable = true;
    } catch (_e) { /* soft */ }
    return classifyInteractionKind(c, { setable }) === 'action';
  });
}

module.exports = {
  classifyInteractionKind,
  formatInteractionList,
  pushInteraction,
  interactedRecently,
  listActionableCapabilities,
  ACTION_EXACT,
};
