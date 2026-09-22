'use strict';

/**
 * P2678 — Fingerprint shard id (shared builder + runtime)
 *
 * WHY: Homey Pro ~64MB — never JSON.parse the full ~0.9MB broad catalog at once.
 * HOW: Bucket manufacturerName into small shard files (~tens of KB).
 * WHO: DeviceFingerprintDB runtime + tools/ci/build-fingerprint-shards.js
 * WHEN: on-demand getFingerprint(mfr) / prepare-publish / CI refresh
 * AGAINST: Full lib/tuya/fingerprints.json parse during device-storm boot
 */

/**
 * @param {string} manufacturerName
 * @returns {string} shard file stem (no .json)
 */
function fingerprintShardId(manufacturerName) {
  const raw = String(manufacturerName || '').trim();
  const s = raw.replace(/^_/, '');
  const m = s.match(/^(TZE[0-9]{3}|TZ[0-9]{4}|TZ[0-9]{3}|HOBEIAN)/i);
  if (m) {
    const prefix = m[1].toUpperCase();
    // Large families → sub-bucket by first char of OEM suffix
    if (
      prefix === 'TZ3000'
      || prefix === 'TZE200'
      || prefix === 'TZE204'
      || prefix === 'TZE284'
      || prefix === 'TZ3210'
    ) {
      const rest = s.slice(m[1].length).replace(/^_/, '');
      const c = (rest[0] || '0').toLowerCase();
      const safe = /[a-z0-9]/.test(c) ? c : 'x';
      return `${prefix}_${safe}`;
    }
    return prefix;
  }
  const c = (s[0] || 'x').toUpperCase();
  const safe = /[A-Z0-9]/.test(c) ? c : 'X';
  return `OTHER_${safe}`;
}

module.exports = {
  fingerprintShardId,
};
