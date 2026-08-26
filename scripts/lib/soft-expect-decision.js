'use strict';

/**
 * Soft-expect Athom publish race helper (P2286 / P139).
 * Pure — safe to unit-test without loading Homey CLI.
 */

const IN_FLIGHT_STATES = new Set([
  'processing',
  'pending',
  'waiting_for_files',
  'uploading',
  'building',
]);

/**
 * @param {Array<{id?:string|number,version?:string,state?:string,channel?:string}>} builds
 * @param {string} version
 * @param {{force?:boolean, excludeBuildId?:string|number|null}} [opts]
 * @returns {{skip:boolean, reason?:string, build?:object, failed?:object[], failedCount?:number}}
 */
function softExpectDecision(builds, version, opts = {}) {
  if (opts.force) return { skip: false };
  const exclude = opts.excludeBuildId != null ? String(opts.excludeBuildId) : null;
  const same = (builds || []).filter((b) => {
    if (String(b.version) !== String(version)) return false;
    if (exclude && String(b.id) === exclude) return false;
    return true;
  });
  const onTest = same.find((b) => b.state === 'test' || b.channel === 'test');
  if (onTest) return { skip: true, reason: 'already-test', build: onTest };
  const inFlight = same.find((b) => IN_FLIGHT_STATES.has(String(b.state)));
  if (inFlight) return { skip: true, reason: 'in-flight', build: inFlight };
  const failed = same.filter((b) => String(b.state) === 'processing_failed');
  if (failed.length) {
    const peerTest = (builds || []).find((b) =>
      String(b.version) === String(version)
      && (b.state === 'test' || b.channel === 'test')
      && (!exclude || String(b.id) !== exclude));
    if (peerTest) {
      return { skip: true, reason: 'peer-test-after-failed', build: peerTest, failed };
    }
  }
  return { skip: false, failedCount: failed.length };
}

module.exports = {
  softExpectDecision,
  IN_FLIGHT_STATES,
};
