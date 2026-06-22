#!/usr/bin/env node
/**
 * sanitize-manifest.cjs — post-build manifest sanitizer
 * ---------------------------------------------------------------
 * The `homey app build` process regenerates .homeybuild/app.json from
 * .homeycompose/, and in doing so re-injects empty `manufacturerName: []`
 * arrays on certain zigbee drivers (~25-44 of them). An empty array
 * triggers an AggregateError during Athom's Zigbee init on the build
 * server → processing_failed.
 *
 * This script runs as an npm `postbuild` step to strip those arrays
 * deterministically, so the manifest is always clean before publish.
 * It also reports any other suspicious manifest issues.
 *
 * Idempotent: safe to run multiple times.
 * ---------------------------------------------------------------
 */
'use strict';

const fs = require('fs');
const path = require('path');

const APP_ROOT = path.resolve(__dirname, '..', '..');
const MANIFEST_PATH = path.join(APP_ROOT, '.homeybuild', 'app.json');

function log(...args) { console.log('[sanitize-manifest]', ...args); }
function warn(...args) { console.warn('[sanitize-manifest] WARN:', ...args); }

if (!fs.existsSync(MANIFEST_PATH)) {
  log('No .homeybuild/app.json found — nothing to sanitize (run build first).');
  process.exit(0);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
} catch (e) {
  warn('Could not parse .homeybuild/app.json:', e.message);
  process.exit(1);
}

let changes = 0;

// 1) Strip empty manufacturerName arrays (root cause of Zigbee AggregateError).
let strippedMfr = 0;
for (const d of (manifest.drivers || [])) {
  if (d.zigbee && Array.isArray(d.zigbee.manufacturerName) && d.zigbee.manufacturerName.length === 0) {
    delete d.zigbee.manufacturerName;
    strippedMfr++;
    changes++;
  }
}
if (strippedMfr > 0) log(`stripped ${strippedMfr} empty manufacturerName[] array(s).`);

// 2) Normalize sdkVersion → sdk if the build emitted the legacy field name.
//    Athom SDK3 manifest spec uses `sdk` (number), not `sdkVersion`.
if (manifest.sdkVersion !== undefined && manifest.sdk === undefined) {
  manifest.sdk = manifest.sdkVersion;
  delete manifest.sdkVersion;
  changes++;
  log('normalized sdkVersion → sdk.');
}

// 3) Drop the generator comment if present (cosmetic; reduces noise).
if (manifest._comment !== undefined) {
  delete manifest._comment;
  changes++;
  log('removed _comment field.');
}

if (changes > 0) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  log(`wrote ${changes} change(s) to .homeybuild/app.json.`);
} else {
  log('manifest already clean — no changes.');
}

// 4) Report suspicious drivers (informational, non-blocking).
const suspicious = (manifest.drivers || []).filter(
  d => d.zigbee && (!d.zigbee.manufacturerName || (Array.isArray(d.zigbee.manufacturerName) && d.zigbee.manufacturerName.length === 0))
);
if (suspicious.length > 0) {
  log(`${suspicious.length} zigbee driver(s) have no manufacturerName (acceptable for wifi/hybrid fallback, but worth reviewing).`);
}

process.exit(0);
