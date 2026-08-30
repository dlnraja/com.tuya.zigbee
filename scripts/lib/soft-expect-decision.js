'use strict';

/**
 * Soft-expect Athom publish race helper (P2286 / P139 / P2323).
 * Pure — safe to unit-test without loading Homey CLI.
 *
 * WHY(P2323): tip emails + developer tools show `processing_failed` /
 * `socket hang up` while Test still holds a healthy build. Soft-alert must
 * not treat that as a hard CI failure (no bump-loop).
 */

const IN_FLIGHT_STATES = new Set([
  'processing',
  'pending',
  'waiting_for_files',
  'uploading',
  'building',
]);

const FAILED_STATES = new Set(['processing_failed', 'error', 'failed', 'revoked']);

/** Athom processor / network flakes — not fixed by patch bumps. */
const TRANSIENT_ATHOM_RE = /socket hang up|econnreset|econnaborted|etimedout|timeout after|fetch failed|network|too many requests|\b429\b|502|503|504|temporar/i;

function normalizeDetail(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message;
  if (typeof value !== 'object') return String(value);
  for (const key of ['message', 'error', 'reason', 'detail', 'details', 'description', 'statusText', 'stateMeta', 'failureDetail']) {
    if (value[key]) return normalizeDetail(value[key]);
  }
  try {
    const json = JSON.stringify(value);
    return json === '{}' ? '' : json;
  } catch {
    return String(value);
  }
}

function buildFailureDetail(build) {
  if (!build) return '';
  return normalizeDetail(
    build.failureDetail
    || build.stateMeta
    || build.state_meta
    || build.error
    || build.errorMessage
    || build.feedback
    || build.message
    || '',
  );
}

function isTransientAthomFailure(build) {
  return TRANSIENT_ATHOM_RE.test(buildFailureDetail(build));
}

function findHealthyTest(builds) {
  return (builds || []).find((b) => b.state === 'test' || b.channel === 'test') || null;
}

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

/**
 * Dashboard --alert decision (P2323).
 * Soft-skip when latest Athom build failed with a transient hang but any
 * healthy Test build still exists (tip email / developer tools noise).
 *
 * @param {Array<object>} builds newest-first preferred
 * @param {{soft?:boolean}} [opts]
 * @returns {{alert:boolean, reason?:string, latest?:object, healthy?:object}}
 */
function softAlertDecision(builds, opts = {}) {
  const list = builds || [];
  const latest = list[0] || null;
  if (!latest) return { alert: false, reason: 'no-builds' };
  const state = String(latest.state || '');
  if (!FAILED_STATES.has(state)) {
    return { alert: false, reason: 'latest-healthy', latest };
  }
  const healthy = findHealthyTest(list);
  if (opts.soft && isTransientAthomFailure(latest) && healthy) {
    return {
      alert: false,
      reason: 'transient-hang-healthy-test',
      latest,
      healthy,
    };
  }
  return { alert: true, reason: 'latest-failed', latest, healthy: healthy || undefined };
}

module.exports = {
  softExpectDecision,
  softAlertDecision,
  isTransientAthomFailure,
  buildFailureDetail,
  findHealthyTest,
  IN_FLIGHT_STATES,
  FAILED_STATES,
  TRANSIENT_ATHOM_RE,
};
