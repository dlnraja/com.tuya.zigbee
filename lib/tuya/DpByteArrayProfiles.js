'use strict';

/**
 * DpByteArrayProfiles — parse Tuya DP type 0 (RAW / byte_array) per locked couple.
 *
 * WHY: DP6 alone means countdown, humidity, exported energy, or electricity composite
 *      depending on (mfr, pid). Never infer from DP number globally.
 * HOW: Explicit profile lookup → layout decode → capability updates.
 */

function toBuffer(raw) {
  if (Buffer.isBuffer(raw)) return raw;
  if (raw && raw.type === 'Buffer' && Array.isArray(raw.data)) return Buffer.from(raw.data);
  if (Array.isArray(raw)) return Buffer.from(raw);
  if (typeof raw === 'string' && raw.includes(',')) {
    const parts = raw.split(',').map((x) => parseInt(x.trim(), 10)).filter(Number.isFinite);
    if (parts.length) return Buffer.from(parts);
  }
  return null;
}

function u16be(buf, offset) {
  return offset + 1 < buf.length ? buf.readUInt16BE(offset) : null;
}

/**
 * Tongou TO-Q-SYS-JZT (_TZE284_6ocnqlhn + TS0601)
 * Z2M: composite raw electricity burst (datatype 0). NOT humidity.
 *
 * Layout (heuristic, BE u16 fields — validate against live hex):
 *   [0]     header / flags (ignore)
 *   [1-2]   voltage ×10 → V
 *   [3-4]   current ×1000 → A
 *   [5-6]   power ×10 → W
 *
 * Sources: Gmail 3a1f196d/31e654a4, Z2M TO-Q-SYS-JZT, din_rail_meter P2207.
 * Prefer DP125 (test5) for power when stable; DP6 is burst composite.
 */
function parseTongouToqSysJztDp6(raw) {
  const buf = toBuffer(raw);
  if (!buf || buf.length < 7) {
    return { ok: false, reason: 'too_short', length: buf?.length || 0 };
  }

  const fields = [
    { cap: 'measure_voltage', raw: u16be(buf, 1), scale: 10, min: 80, max: 300 },
    { cap: 'measure_current', raw: u16be(buf, 3), scale: 1000, min: 0, max: 100 },
    { cap: 'measure_power', raw: u16be(buf, 5), scale: 10, min: 0, max: 260000 },
  ];

  const decoded = {};
  for (const row of fields) {
    if (row.raw === null) continue;
    const val = row.raw / row.scale;
    if (val >= row.min && val <= row.max) {
      decoded[row.cap] = parseFloat(val.toFixed(3));
    }
  }

  return {
    ok: Object.keys(decoded).length > 0,
    profile: 'tongou-to-q-sys-jzt-dp6',
    hex: buf.toString('hex'),
    length: buf.length,
    decoded,
  };
}

const PROFILES = {
  'tongou-to-q-sys-jzt-dp6': {
    couple: { mfr: '_TZE284_6ocnqlhn', pid: 'TS0601' },
    dpId: 6,
    tuyaType: 0,
    direction: 'rx',
    parse: parseTongouToqSysJztDp6,
  },
};

function parseByProfile(profileId, raw) {
  const p = PROFILES[profileId];
  if (!p?.parse) return { ok: false, reason: 'unknown_profile' };
  return p.parse(raw);
}

function profileForCouple(mfr, pid, dpId) {
  const ml = String(mfr || '').toLowerCase();
  const np = String(pid || '').toUpperCase();
  for (const row of Object.values(PROFILES)) {
    if (row.dpId !== dpId) continue;
    if (ml.includes(String(row.couple.mfr).toLowerCase()) && np === row.couple.pid) return row;
  }
  return null;
}

module.exports = {
  toBuffer,
  parseTongouToqSysJztDp6,
  parseByProfile,
  profileForCouple,
  PROFILES,
};
