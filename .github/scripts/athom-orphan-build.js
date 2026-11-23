#!/usr/bin/env node
'use strict';
/**
 * P3293 (15/11/2026 Paris): orphan Athom builds left in `waiting_for_files`.
 *
 * Why: `homey app publish` creates the build, then uploads the files. Stable run 43710885652 (build #425,
 * v5.12.549) and 31/10 (#404, v5.12.521) failed with "Submitting... Timeout after 10000ms" between the two:
 * Athom kept a build with no files, forever in waiting_for_files. The direct-API fallback correctly stopped
 * at its SAME-VERSION GUARD (a version already sent is never re-sent), and the resubmit step then waited
 * 7 minutes, saw no processing_failed and called the orphan "ready". Test never moved.
 *
 * Rule (all three apps): an orphan waiting_for_files is a transient failure, never ready. It gets exactly
 * ONE version bump plus ONE re-upload (a strictly higher version, so the same-version guard stays intact),
 * after the usual P3036 backoff (>= 5 min) and Athom idle wait. A second orphan blocks. Every other state
 * keeps its current handling: unknown states still block, nothing else becomes retryable here.
 *
 * This file is byte-identical on master, stable-v5 and bastien-home.
 * CLI: node athom-orphan-build.js decide <orphan:true|false> <reuploadsDone>
 *      -> "REUPLOAD orphan_waiting_for_files" | "BLOCK orphan_waiting_for_files" | "NONE"
 *      node athom-orphan-build.js recorded-orphan <version>  (stdin: scripts/ci/homey-build-status.js JSON rows)
 *      -> "ORPHAN <buildId>" when the version already written back on the branch never received its files
 *         (its content never reached Athom, so an "identical payload" skip would strand it), else "NO".
 */

const ORPHAN_STATE = 'waiting_for_files';
const MAX_ORPHAN_REUPLOADS = 1;
// Same threshold as wait-athom-idle.js STUCK_MS: the CLI sends files seconds after createBuild.
const DEFAULT_MIN_AGE_MS = 5 * 60 * 1000;

function minAgeMs(env = process.env) {
  const n = Number(env.ATHOM_ORPHAN_MIN_AGE_MS);
  return Number.isFinite(n) && n >= 0 && String(env.ATHOM_ORPHAN_MIN_AGE_MS || '') !== '' ? n : DEFAULT_MIN_AGE_MS;
}

function buildTimeMs(b) {
  const t = Date.parse((b && (b.stateChangedAt || b.createdAt || b.created_at || b.created || b.date || b.at)) || '');
  return Number.isFinite(t) ? t : null;
}

/**
 * @param {{state?:string, createdAt?:string}} build
 * @param {{nowMs?:number, minAge?:number, waitedMs?:number, confirmed?:boolean}} [opts]
 *   confirmed: the caller already waited a full window on this version (or saw the CLI submit timeout).
 *   waitedMs : used as the age when the row has no timestamp.
 */
function isOrphanWaitingForFiles(build, { nowMs = Date.now(), minAge = minAgeMs(), waitedMs = 0, confirmed = false } = {}) {
  if (!build || String(build.state || '').toLowerCase() !== ORPHAN_STATE) return false;
  if (confirmed) return true;
  const t = buildTimeMs(build);
  const age = t === null ? Number(waitedMs) || 0 : nowMs - t;
  return age >= minAge;
}

/** @returns {{action:'none'|'reupload'|'block', kind?:string, reason:string}} */
function decideOrphanReupload({ orphan, reuploadsDone = 0 } = {}) {
  if (!orphan) return { action: 'none', reason: 'not an orphan waiting_for_files build' };
  const done = Number(reuploadsDone) || 0;
  if (done >= MAX_ORPHAN_REUPLOADS) {
    return { action: 'block', kind: 'orphan_waiting_for_files', reason: `orphan waiting_for_files again after ${done} re-upload(s): budget ${MAX_ORPHAN_REUPLOADS} used, blocking` };
  }
  return { action: 'reupload', kind: 'orphan_waiting_for_files', reason: `orphan waiting_for_files (files never uploaded): one bumped re-upload (${done + 1}/${MAX_ORPHAN_REUPLOADS})` };
}

/** Rows from homey-build-status.js (one JSON object per line); other lines are ignored. */
function recordedVersionOrphan(rowsText, version, opts = {}) {
  const want = String(version || '').replace(/^v/i, '');
  const rows = String(rowsText || '').split('\n').map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter((r) => r && typeof r === 'object' && String(r.version || '') === want);
  if (!rows.length) return null;
  // Any build of this version that got further than waiting_for_files means the content did reach Athom.
  if (rows.some((r) => String(r.state || '').toLowerCase() !== ORPHAN_STATE)) return null;
  return rows.find((r) => isOrphanWaitingForFiles(r, opts)) || null;
}

module.exports = { recordedVersionOrphan, ORPHAN_STATE, MAX_ORPHAN_REUPLOADS, DEFAULT_MIN_AGE_MS, minAgeMs, buildTimeMs, isOrphanWaitingForFiles, decideOrphanReupload };

if (require.main === module) {
  const [cmd, a, b] = process.argv.slice(2);
  if (cmd === 'decide') {
    const d = decideOrphanReupload({ orphan: String(a) === 'true', reuploadsDone: b });
    console.log(d.action === 'none' ? 'NONE' : `${d.action.toUpperCase()} ${d.kind}`);
    console.error(`[orphan] ${d.reason}`);
  } else if (cmd === 'recorded-orphan') {
    const o = recordedVersionOrphan(require('fs').readFileSync(0, 'utf8'), a);
    console.log(o ? `ORPHAN ${o.id}` : 'NO');
  } else {
    console.error('usage: athom-orphan-build.js decide <orphan:true|false> <reuploadsDone>');
    process.exit(2);
  }
}
