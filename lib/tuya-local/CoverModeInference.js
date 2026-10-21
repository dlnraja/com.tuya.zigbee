'use strict';
/**
 * P2950 — Roller-shutter switch that only shows DP1.
 * Credit: Homey forum topic 154077 post #527 (id 790578) by Stijn_Van_Heeswijk,
 * https://community.homey.app/t/154077/527 — curtain switch added, only DP1, no controls.
 * Our own approach: on Tuya "cl" (curtain) category the motor command is an enum
 * (Tuya developer docs "control" open/stop/close/continue; tuya-local make-all cover
 * configs). Many switch firmwares put it on DP1, so a DP1 string value is a cover
 * command rather than an on/off. Position DPs (int 0-100) are optional.
 */
const TOKEN_SETS = [
  { open: 'open', close: 'close', stop: 'stop' },
  { open: 'on', close: 'off', stop: 'stop' },
  { open: 'ZZ', close: 'FZ', stop: 'STOP' },
];

function normaliseRange(range) {
  return Array.isArray(range) ? range.map(String) : [];
}

/**
 * @param {object} dps current dps map
 * @param {object} [schema] optional {dpId: {type:'enum', range:[...]}} from cloud spec
 * @returns {null | { controlDp:number, tokens:{open,close,stop}, positionDp:number|null, confidence:'high'|'low' }}
 */
function inferCover(dps, schema = {}) {
  const map = dps && typeof dps === 'object' ? dps : {};
  const candidates = [1, 101, 2];
  for (const dp of candidates) {
    const key = String(dp);
    const spec = schema[key] || schema[dp];
    const range = spec && spec.type === 'enum' ? normaliseRange(spec.range) : [];
    const val = map[key];
    for (const set of TOKEN_SETS) {
      const toks = [set.open, set.close, set.stop];
      const fromRange = range.length && toks.every((t) => range.includes(t));
      const fromValue = typeof val === 'string' && toks.includes(val) && set.open !== 'on';
      if (fromRange || fromValue) {
        return { controlDp: dp, tokens: { ...set }, positionDp: findPosition(map, dp), confidence: fromRange ? 'high' : 'low' };
      }
    }
  }
  return null;
}

function findPosition(map, controlDp) {
  for (const dp of [2, 3, 102, 8]) {
    if (dp === controlDp) {continue;}
    const v = map[String(dp)];
    if (Number.isInteger(v) && v >= 0 && v <= 100) {return dp;}
  }
  return null;
}

module.exports = { inferCover, TOKEN_SETS };
