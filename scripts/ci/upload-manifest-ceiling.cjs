#!/usr/bin/env node
'use strict';

/**
 * P3342: block growth of the upload app.json above config/upload-manifest-ceiling.json (raw file bytes, as
 * uploaded). Used by prepare-publish (FATAL) and the Platform Budget workflow (blocking step).
 * CLI: node scripts/ci/upload-manifest-ceiling.cjs [app.json]  (default: the prepared publish dir).
 * A missing prepared app.json is reported and skipped (prepare-publish failed for another reason).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const POLICY = path.join(ROOT, 'config', 'upload-manifest-ceiling.json');

function policy(file = POLICY) {
  const p = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Number.isInteger(p.ceilingBytes) || p.ceilingBytes <= 0) { throw new Error('ceilingBytes missing'); }
  return p;
}

function checkUploadManifest(appJson, pol = policy()) {
  const bytes = fs.statSync(appJson).size;
  return { bytes, ceiling: pol.ceilingBytes, goal: pol.goalBytes, ok: bytes <= pol.ceilingBytes };
}

function describe(r) {
  return `upload app.json ${r.bytes} B (ceiling ${r.ceiling} B, goal ${r.goal} B, ${r.ok ? 'under' : 'OVER'} by ${Math.abs(r.ceiling - r.bytes)} B)`;
}

if (require.main === module) {
  const file = process.argv[2] || path.join(require('./publish-dir.cjs').preparedDir(), 'app.json');
  if (!fs.existsSync(file)) {
    console.log(`::notice title=P3342 upload ceiling::${file} missing, skipped`);
    process.exit(0);
  }
  const r = checkUploadManifest(file);
  if (!r.ok) {
    console.error(`::error title=P3342 upload ceiling::${describe(r)}. Shrink the manifest before adding (docs/knowledge/athom-driver-ceiling.md).`);
    process.exit(1);
  }
  console.log(`[P3342] ${describe(r)}`);
}

module.exports = { checkUploadManifest, policy, describe, POLICY };
