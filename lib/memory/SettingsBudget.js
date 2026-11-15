'use strict';

/**
 * P3312: a boot-time size budget for app settings.
 *
 * WHY: Homey hands every app setting to the app process as JSON text before onInit runs.
 * One oversized value (an old cache, a runaway log, a learned map) is parsed again on
 * every start, and with a char above U+00FF the whole text is a two-byte string. On a
 * Homey whose app heap aborts near 62 MB that can turn into a restart loop (Bastien
 * OOM in JsonParser<unsigned short>, ~19 s after start). The writers in this app are
 * capped well below the limit used here; a value above it is not ours to keep.
 *
 * The oversized key is removed so the next start does not parse it again, and one line
 * names the key and its size (never the content). Normal-sized keys are not touched.
 */

const MAX_KEY_CHARS = 512 * 1024;

function sizeOf(value) {
  if (value === null || value === undefined) {return 0;}
  if (typeof value === 'string') {return value.length;}
  try {
    const s = JSON.stringify(value);
    return typeof s === 'string' ? s.length : 0;
  } catch (_e) {
    return Infinity; // circular or not serialisable: Homey cannot persist it either
  }
}

function safeKeyName(key) {
  return String(key).replace(/[^\w.:-]/g, '_').slice(0, 64);
}

/**
 * @param {object} homey Homey instance (needs settings.getKeys/get/unset)
 * @param {{ maxKeyChars?: number, log?: Function }} [opts]
 * @returns {{ checked: number, removed: Array<{ key: string, chars: number }>, failed: Array<{ key: string, error: string }> }}
 */
function enforceSettingsBudget(homey, opts = {}) {
  const max = Number.isFinite(opts.maxKeyChars) && opts.maxKeyChars > 0 ? opts.maxKeyChars : MAX_KEY_CHARS;
  const log = typeof opts.log === 'function' ? opts.log : () => {};
  const out = { checked: 0, removed: [], failed: [] };
  const settings = homey && homey.settings;
  if (!settings || typeof settings.getKeys !== 'function' || typeof settings.get !== 'function') {return out;}
  let keys = [];
  try { keys = settings.getKeys() || []; } catch (e) {
    out.failed.push({ key: '*', error: String(e && e.message || e).slice(0, 120) });
    log(`[SETTINGS-BUDGET] could not list settings: ${out.failed[0].error}`);
    return out;
  }
  for (const key of keys) {
    out.checked += 1;
    let chars = 0;
    try { chars = sizeOf(settings.get(key)); } catch (e) { chars = Infinity; }
    if (chars <= max) {continue;}
    try {
      const r = settings.unset(key);
      if (r && typeof r.catch === 'function') {r.catch(() => {});}
      out.removed.push({ key: safeKeyName(key), chars });
    } catch (e) {
      out.failed.push({ key: safeKeyName(key), error: String(e && e.message || e).slice(0, 120) });
    }
  }
  if (out.removed.length) {
    log(`[SETTINGS-BUDGET] removed ${out.removed.length} oversized setting(s) (> ${max} chars): ${out.removed.map((r) => `${r.key}=${r.chars === Infinity ? 'unserialisable' : r.chars}`).join(', ')}`);
  }
  if (out.failed.length) {
    log(`[SETTINGS-BUDGET] could not remove: ${out.failed.map((f) => `${f.key} (${f.error})`).join(', ')}`);
  }
  return out;
}

module.exports = { enforceSettingsBudget, sizeOf, MAX_KEY_CHARS };
