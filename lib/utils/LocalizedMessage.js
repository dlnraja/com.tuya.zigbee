'use strict';

/**
 * P3070 — localized device-status messages with a safe English fallback.
 *
 * WHY: setUnavailable() messages were hard-coded in English (and one in French only), so users
 * saw a mixed-language status. This looks up `errors.<key>` in locales/*.json through homey.__(),
 * and falls back to the given English text when the key, the locale or homey is missing.
 * No cache, no timers: one pure lookup per call.
 *
 * @param {object} ctx     a Homey Device/App/Driver (anything with .homey) or a homey object
 * @param {string} key     key under "errors" in locales/*.json
 * @param {string} fallback English text (may contain __name__ tokens)
 * @param {object} [vars]  token values, e.g. { reason: 'timeout' }
 * @returns {string}
 */
function localMsg(ctx, key, fallback, vars) {
  const path = `errors.${key}`;
  let s;
  try {
    const h = ctx && (ctx.homey || ctx);
    if (h && typeof h.__ === 'function') {s = h.__(path, vars);}
  } catch (_) { s = undefined; }
  if (typeof s !== 'string' || !s.trim() || s === path) {s = String(fallback || '');}
  if (vars && typeof vars === 'object') {
    s = s.replace(/__(\w+)__/g, (m, k) => Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m);
  }
  return s;
}

module.exports = { localMsg };
