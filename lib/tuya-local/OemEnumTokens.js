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

/**
 * P2703 (forum 154077 #433/#446/#453, Andi): numbered enums need two lists in one —
 * what Homey shows ("cool") and what the device takes ("1"). Format: `auto=0,cool=1`.
 * Plain entries (`cool`) map to themselves, so existing CSVs keep working.
 * @param {string|string[]} csv
 * @returns {{label: string, raw: string}[]}
 */
function parseEnumValueMap(csv) {
  return parseOemEnumCsv(Array.isArray(csv) ? csv.join(',') : csv).map((tok) => {
    const i = tok.indexOf('=');
    if (i <= 0 || i === tok.length - 1) return { label: tok, raw: tok };
    return { label: tok.slice(0, i).trim(), raw: tok.slice(i + 1).trim() };
  });
}

/** Homey label → device token (exact, then unique case-insensitive). null when unknown. */
function enumLabelToDevice(label, csv) {
  const map = parseEnumValueMap(csv);
  if (!map.length) return label == null ? null : String(label);
  const hit = resolveOemEnumToken(label, map.map((e) => e.label));
  if (hit == null) {
    // #446: a value that is already a raw device token stays valid
    const raw = map.find((e) => e.raw === String(label));
    return raw ? raw.raw : null;
  }
  return map.find((e) => e.label === hit).raw;
}

/** Device token (string or number) → Homey label; unknown raw passes through as string. */
function enumDeviceToLabel(raw, csv) {
  const want = String(raw == null ? '' : raw);
  const hit = parseEnumValueMap(csv).find((e) => e.raw === want);
  return hit ? hit.label : want;
}

/**
 * #453: flow dropdown entries must use the label as id (what capability listeners expect),
 * never the raw `label=value` string.
 */
function enumFlowOptions(csv) {
  return parseEnumValueMap(csv).map((e) => ({ id: e.label, name: e.label }));
}

module.exports = {
  resolveOemEnumToken,
  parseOemEnumCsv,
  parseEnumValueMap,
  enumLabelToDevice,
  enumDeviceToLabel,
  enumFlowOptions,
};
