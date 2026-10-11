'use strict';

/**
 * P2647 — OEM enum tokens (com.tuyalocal Cloud Lookup lesson).
 * WHY: Devices reject mode/fan SETs when case differs (Heat vs heat) — snap-back symptom.
 * HOW: Literal string compare including case; never lowerCase-normalize OEM tokens.
 * WHO: MASTER_ONLY WiFi LAN.
 * WHEN: TX mode / fan_speed from settings mode_values / fan_speed_values.
 * AGAINST: Silent toLowerCase() that makes SET look OK then device reverts.
 */

/**
 * @param {string} desired - token Homey wants to send
 * @param {string|string[]} allowed - CSV or list from Cloud Lookup / settings
 * @returns {string|null} exact token to SET, or null if no match
 */
function resolveOemEnumToken(desired, allowed) {
  const want = String(desired == null ? '' : desired).trim();
  if (!want) return null;
  const list = Array.isArray(allowed)
    ? allowed.map((s) => String(s).trim()).filter(Boolean)
    : String(allowed || '')
      .split(/[,;|]/)
      .map((s) => s.trim())
      .filter(Boolean);
  if (!list.length) return want; // no whitelist → pass through
  const hit = list.find((t) => t === want);
  if (hit) return hit;
  // Soft: exact case-insensitive only when unique
  const lower = want.toLowerCase();
  const soft = list.filter((t) => t.toLowerCase() === lower);
  if (soft.length === 1) return soft[0];
  return null;
}

/**
 * Parse settings CSV into tokens (preserve case).
 * @param {string} csv
 * @returns {string[]}
 */
function parseOemEnumCsv(csv) {
  return String(csv || '')
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

module.exports = {
  resolveOemEnumToken,
  parseOemEnumCsv,
};
