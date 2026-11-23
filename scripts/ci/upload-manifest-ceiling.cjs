#!/usr/bin/env node
'use strict';

/**
 * P3342: block growth of the upload app.json above config/upload-manifest-ceiling.json (raw file bytes, as
 * uploaded). Used by prepare-publish (FATAL) and the Platform Budget workflow (blocking step).
 * CLI: node scripts/ci/upload-manifest-ceiling.cjs [app.json]  (default: the prepared publish dir).
 * The CLI measures only a finished upload package: the file must exist in the prepared publish
 * directory and the ready marker (written at the end of a successful prepare-publish) must be
 * present. A missing file, a source-tree app.json, or a mid-prepare leftover is a hard FAIL
 * (never skipped, never measured as the upload copy).
 */

const fs = require('fs');
const path = require('path');
const { preparedDir, isPreparedPublishPath } = require('./publish-dir.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const POLICY = path.join(ROOT, 'config', 'upload-manifest-ceiling.json');
const READY_SUFFIX = '.upload-package-ready';

function policy(file = POLICY) {
  const p = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Number.isInteger(p.ceilingBytes) || p.ceilingBytes <= 0) { throw new Error('ceilingBytes missing'); }
  return p;
}

function readyMarkerPath(appJson) {
  return `${path.resolve(path.dirname(appJson))}${READY_SUFFIX}`;
}

function clearReadyMarker(destDir) {
  const marker = `${path.resolve(destDir)}${READY_SUFFIX}`;
  fs.rmSync(marker, { force: true });
  return marker;
}

function writeReadyMarker(appJson, extra = {}) {
  const marker = readyMarkerPath(appJson);
  const bytes = fs.existsSync(appJson) ? fs.statSync(appJson).size : 0;
  fs.writeFileSync(marker, `${JSON.stringify({ bytes, ...extra })}\n`);
  return marker;
}

function assertFinishedUploadPackage(appJson) {
  if (!appJson || !fs.existsSync(appJson)) {
    return { ok: false, reason: `upload package missing: ${appJson || '(no path)'} is absent. Run prepare-publish to build the upload copy; never measure the source-tree app.json.` };
  }
  const dir = path.resolve(path.dirname(appJson));
  if (!isPreparedPublishPath(dir)) {
    return { ok: false, reason: `refusing to measure ${appJson}: it is not in the prepared publish directory (source-tree or other fallback). Pass the upload package path or run prepare-publish first.` };
  }
  const marker = readyMarkerPath(appJson);
  if (!fs.existsSync(marker)) {
    return { ok: false, reason: `upload package not ready: ${appJson} is an incomplete leftover (prepare-publish did not finish; ready marker ${marker} missing). The ceiling check must not measure this file.` };
  }
  return { ok: true, marker };
}

function checkUploadManifest(appJson, pol = policy()) {
  const bytes = fs.statSync(appJson).size;
  return { bytes, ceiling: pol.ceilingBytes, goal: pol.goalBytes, ok: bytes <= pol.ceilingBytes };
}

function describe(r) {
  return `upload app.json ${r.bytes} B (ceiling ${r.ceiling} B, goal ${r.goal} B, ${r.ok ? 'under' : 'OVER'} by ${Math.abs(r.ceiling - r.bytes)} B)`;
}

if (require.main === module) {
  const file = process.argv[2] || path.join(preparedDir(), 'app.json');
  const gate = assertFinishedUploadPackage(file);
  if (!gate.ok) {
    console.error(`::error title=P3342 upload ceiling::${gate.reason}`);
    process.exit(1);
  }
  const r = checkUploadManifest(file);
  if (!r.ok) {
    console.error(`::error title=P3342 upload ceiling::${describe(r)}. Shrink the manifest before adding (docs/knowledge/athom-driver-ceiling.md).`);
    process.exit(1);
  }
  console.log(`[P3342] ${describe(r)}`);
}

module.exports = {
  checkUploadManifest,
  policy,
  describe,
  POLICY,
  readyMarkerPath,
  clearReadyMarker,
  writeReadyMarker,
  assertFinishedUploadPackage,
  READY_SUFFIX,
};
