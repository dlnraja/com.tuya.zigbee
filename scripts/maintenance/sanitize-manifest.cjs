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
const DEFAULT_MANIFEST_PATH = path.join(APP_ROOT, '.homeybuild', 'app.json');
const MANIFEST_PATHS = process.argv
  .slice(2)
  .filter(arg => arg && !arg.startsWith('--'))
  .map(arg => path.resolve(APP_ROOT, arg));

function log(...args) { console.log('[sanitize-manifest]', ...args); }
function warn(...args) { console.warn('[sanitize-manifest] WARN:', ...args); }

function getDrivers(manifest) {
  if (Array.isArray(manifest.drivers)) return manifest.drivers;
  if (manifest.drivers && typeof manifest.drivers === 'object') return Object.values(manifest.drivers);
  return [];
}

function stripGeneratedButtonOptions(manifest) {
  let stripped = 0;
  for (const driver of getDrivers(manifest)) {
    const options = driver && driver.capabilitiesOptions;
    if (!options || typeof options !== 'object' || Array.isArray(options)) continue;

    for (const [capabilityId, capabilityOptions] of Object.entries(options)) {
      if (!capabilityId.startsWith('button.')) continue;
      if (!capabilityOptions || typeof capabilityOptions !== 'object' || Array.isArray(capabilityOptions)) continue;

      for (const key of ['setable', 'getable', 'maintenanceAction']) {
        if (Object.prototype.hasOwnProperty.call(capabilityOptions, key)) {
          delete capabilityOptions[key];
          stripped++;
        }
      }
      if (Object.keys(capabilityOptions).length === 0) {
        delete options[capabilityId];
      }
    }

    if (Object.keys(options).length === 0) {
      delete driver.capabilitiesOptions;
    }
  }
  return stripped;
}

function dedupeFlowArgs(manifest) {
  let stripped = 0;
  const flow = manifest.flow || {};
  for (const type of ['triggers', 'conditions', 'actions']) {
    const cards = flow[type];
    if (!Array.isArray(cards)) continue;

    for (const card of cards) {
      if (!card || !Array.isArray(card.args)) continue;
      const seen = new Set();
      const args = [];
      for (const arg of card.args) {
        const name = arg && arg.name;
        if (name && seen.has(name)) {
          stripped++;
          continue;
        }
        if (name) seen.add(name);
        args.push(arg);
      }
      card.args = args;
    }
  }
  return stripped;
}

function sanitizeManifestFile(manifestPath) {
  const label = path.relative(APP_ROOT, manifestPath).replace(/\\/g, '/') || manifestPath;
  if (!fs.existsSync(manifestPath)) {
    log(`No ${label} found — nothing to sanitize.`);
    return 0;
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    warn(`Could not parse ${label}:`, e.message);
    return 1;
  }

  let changes = 0;

  // 1) Report empty manufacturerName arrays (informational, NOT stripped).
  // NOTE: deleting the manufacturerName property breaks `homey app validate
  // --level publish` (the schema requires manufacturerName when zigbee is
  // present). The empty array is accepted by the validator; only the Athom
  // build server's processing_failed error has been linked to it — and the
  // A/B test proved that error is external. So we REPORT but do NOT strip.
  let emptyMfr = 0;
  for (const d of getDrivers(manifest)) {
    if (d.zigbee && Array.isArray(d.zigbee.manufacturerName) && d.zigbee.manufacturerName.length === 0) {
      emptyMfr++;
    }
  }
  if (emptyMfr > 0) log(`${label}: found ${emptyMfr} empty manufacturerName[] array(s) — reported only.`);

  // 2) Normalize sdkVersion → sdk if the build emitted the legacy field name.
  //    Athom SDK3 manifest spec uses `sdk` (number), not `sdkVersion`.
  if (manifest.sdkVersion !== undefined && manifest.sdk === undefined) {
    manifest.sdk = manifest.sdkVersion;
    delete manifest.sdkVersion;
    changes++;
    log(`${label}: normalized sdkVersion → sdk.`);
  }

  // 3) Drop Homey-generated button option flags from compiled manifests.
  //    The Homey CLI can re-inject setable/getable/maintenanceAction on
  //    button.* capabilities during build/validate. Those flags are noisy
  //    in the compiled app.json and correlate with Athom processing_failed
  //    builds where the dashboard shows sdk=undefined.
  const buttonStripped = stripGeneratedButtonOptions(manifest);
  if (buttonStripped > 0) {
    changes += buttonStripped;
    log(`${label}: stripped ${buttonStripped} generated button.* option flag(s).`);
  }

  // 4) De-duplicate generated Flow args by name. Homey Compose can inject
  //    a second device arg after validation when titleFormatted references
  //    [[device]]. Keeping one arg preserves validation and Flow runtime.
  const duplicateArgs = dedupeFlowArgs(manifest);
  if (duplicateArgs > 0) {
    changes += duplicateArgs;
    log(`${label}: stripped ${duplicateArgs} duplicate generated Flow arg(s).`);
  }

  // 5) Drop the generator comment from build/publish manifests only
  //    (keep the tracked root app.json stable).
  const isTrackedRootManifest = path.resolve(manifestPath) === path.join(APP_ROOT, 'app.json');
  if (!isTrackedRootManifest && manifest._comment !== undefined) {
    delete manifest._comment;
    changes++;
    log(`${label}: removed _comment field.`);
  }

  if (changes > 0) {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    log(`${label}: wrote ${changes} change(s).`);
  } else {
    log(`${label}: manifest already clean — no changes.`);
  }

  // 6) Report suspicious drivers (informational, non-blocking).
  const suspicious = getDrivers(manifest).filter(
    d => d.zigbee && (!d.zigbee.manufacturerName || (Array.isArray(d.zigbee.manufacturerName) && d.zigbee.manufacturerName.length === 0))
  );
  if (suspicious.length > 0) {
    log(`${label}: ${suspicious.length} zigbee driver(s) have no manufacturerName (acceptable for wifi/hybrid fallback, but worth reviewing).`);
  }
  return 0;
}

if (require.main === module) {
  const targets = MANIFEST_PATHS.length > 0 ? MANIFEST_PATHS : [DEFAULT_MANIFEST_PATH];
  let failures = 0;
  for (const manifestPath of targets) failures += sanitizeManifestFile(manifestPath);
  process.exit(failures > 0 ? 1 : 0);
}

module.exports = { sanitizeManifestFile, stripGeneratedButtonOptions, dedupeFlowArgs };
