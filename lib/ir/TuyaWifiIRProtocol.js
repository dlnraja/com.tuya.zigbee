'use strict';

/**
 * P3063 — Tuya Wi-Fi IR blaster local DP protocol (pure, testable).
 *
 * WHY: the wifi_ir_remote driver wrote the bare code to DP201 and armed learning with
 * DP202=true — real Tuya Wi-Fi blasters expect a JSON command on DP201 (type 1) or a
 * control word on DP1 (type 2). Behaviour reimplemented from the public descriptions in:
 *   - tinytuya IRRemoteControlDevice (jasonacox/tinytuya, MIT) — control types 1/2,
 *     send_ir / study / study_exit / study_key, learned code on DP202 or DP2.
 *   - make-all/tuya-local (MIT) remote entity — single-DP JSON {"control":"send_ir",
 *     "head":"","key1":"1"+code,"type":0,"delay":n}, split of long gaps.
 * No code copied; see CREDITS.md.
 */

const Tuya = require('./ZosungIRProtocol');

const CONTROL_SINGLE_DP = 1; // DP201 send (JSON) / DP202 learned
const CONTROL_MULTI_DP = 2; // DP1 mode, DP2 learned, DP7 code, DP13 code type

const DP = Object.freeze({
  SEND_IR: '201',
  LEARNED_ID: '202',
  MODE: '1',
  LEARNED_REPORT: '2',
  KEY_STUDY: '7',
  CODE_TYPE: '13',
});

const MAX_WIFI_CODE_CHARS = 16384;

/**
 * Detect control type from a DPS snapshot (tinytuya detect_control_type semantics).
 * @returns {1|2|0}
 */
function detectControlType(dps) {
  if (!dps || typeof dps !== 'object') {return 0;}
  if (Object.prototype.hasOwnProperty.call(dps, DP.SEND_IR) || Object.prototype.hasOwnProperty.call(dps, DP.LEARNED_ID)) {
    return CONTROL_SINGLE_DP;
  }
  const mode = dps[DP.MODE];
  if (typeof mode === 'string' || Object.prototype.hasOwnProperty.call(dps, DP.KEY_STUDY)
    || Object.prototype.hasOwnProperty.call(dps, DP.CODE_TYPE)) {
    return CONTROL_MULTI_DP;
  }
  return 0;
}

/** Strip the "1" (raw) prefix some firmwares/apps keep on learned codes. */
function cleanCode(code) {
  let s = String(code || '').trim();
  if (s.length % 4 === 1 && (s[0] === '1' || s[0] === '0')) {s = s.slice(1);}
  return s;
}

/** True when the string is already a full Tuya JSON command (pass-through). */
function isJsonCommand(code) {
  const s = String(code || '').trim();
  if (!s.startsWith('{')) {return false;}
  try {
    const o = JSON.parse(s);
    return !!o && typeof o === 'object' && typeof o.control === 'string';
  } catch (_) {
    return false;
  }
}

/**
 * Build the DPS object for sending one learned (raw base64) code.
 * @param {string} code
 * @param {{ controlType?: number, delay?: number }} [opts]
 * @returns {Record<string, any>}
 */
function buildSendDps(code, opts = {}) {
  const raw = String(code || '').trim();
  if (!raw) {throw new Error('empty IR code');}
  if (raw.length > MAX_WIFI_CODE_CHARS) {throw new Error(`IR code too long (${raw.length})`);}
  const type = opts.controlType === CONTROL_MULTI_DP ? CONTROL_MULTI_DP : CONTROL_SINGLE_DP;
  if (type === CONTROL_SINGLE_DP && isJsonCommand(raw)) {return { [DP.SEND_IR]: raw };}
  const c = cleanCode(raw);
  if (type === CONTROL_MULTI_DP) {
    return { [DP.MODE]: 'study_key', [DP.KEY_STUDY]: c, [DP.CODE_TYPE]: 0 };
  }
  const cmd = { control: 'send_ir', head: '', key1: `1${c}`, type: 0 };
  const delay = Number(opts.delay);
  if (Number.isFinite(delay) && delay >= 0) {cmd.delay = Math.round(delay);}
  return { [DP.SEND_IR]: JSON.stringify(cmd) };
}

/** DPS object to enter (study) or leave (study_exit) learn mode. */
function buildStudyDps(start, opts = {}) {
  const word = start ? 'study' : 'study_exit';
  if (opts.controlType === CONTROL_MULTI_DP) {return { [DP.MODE]: word };}
  return { [DP.SEND_IR]: JSON.stringify({ control: word }) };
}

/**
 * Extract a learned code from a DPS update, or null.
 * Ignores echoes of our own JSON commands on DP201 and mode words on DP1.
 */
function parseLearnedCode(dps, opts = {}) {
  if (!dps || typeof dps !== 'object') {return null;}
  const pick = (v) => {
    if (v == null || typeof v === 'boolean' || typeof v === 'number') {return null;}
    const s = String(v).trim();
    if (s.length < 8 || isJsonCommand(s)) {return null;}
    return cleanCode(s);
  };
  const order = opts.controlType === CONTROL_MULTI_DP
    ? [DP.LEARNED_REPORT, DP.LEARNED_ID]
    : [DP.LEARNED_ID, DP.LEARNED_REPORT];
  for (const dp of order) {
    const c = pick(dps[dp]);
    if (c) {return c;}
  }
  if (opts.allowEcho) {return pick(dps[DP.SEND_IR]);}
  return null;
}

/**
 * Split pulses at gaps > maxGap µs into separate sends (tuya-local behaviour, so a
 * repeat frame is not merged into one over-long code); each part padded to even count.
 * @returns {string[]} Wi-Fi base64 codes
 */
function splitTimingsForWifi(timings, maxGap = 50000) {
  const parts = [];
  let cur = [];
  for (let i = 0; i < timings.length; i++) {
    const v = Math.max(1, Math.round(Math.abs(Number(timings[i]) || 0)));
    if (i % 2 === 1 && v > maxGap) {
      parts.push(cur);
      cur = [];
      continue;
    }
    cur.push(Math.min(0xffff, v));
  }
  if (cur.length) {parts.push(cur);}
  return parts.filter((p) => p.length).map((p) => {
    const q = p.length % 2 ? [...p, 5000] : p;
    return Tuya.timingsToWifiBase64(q);
  });
}

module.exports = {
  CONTROL_SINGLE_DP,
  CONTROL_MULTI_DP,
  DP,
  MAX_WIFI_CODE_CHARS,
  detectControlType,
  cleanCode,
  isJsonCommand,
  buildSendDps,
  buildStudyDps,
  parseLearnedCode,
  splitTimingsForWifi,
};
