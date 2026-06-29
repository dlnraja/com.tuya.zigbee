#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const APP_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_MANIFEST_PATH = path.join(APP_ROOT, '.homeybuild', 'app.json');
const MANIFEST_PATHS = process.argv
  .slice(2)
  .filter(arg => arg && !arg.startsWith('--'))
  .map(arg => path.resolve(APP_ROOT, arg));

const DUP_SUFFIX = /_dup_[a-z0-9]+$/;
const GENERATED_DUP_PREFIXES = [
  'button_wireless_1_',
  'button_wireless_4_',
  'button_wireless_4_ts0041_',
];

function log(...args) {
  console.log('[sanitize-manifest]', ...args);
}

function warn(...args) {
  console.warn('[sanitize-manifest] WARN:', ...args);
}

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

function stripDuplicateFlowCards(manifest) {
  let stripped = 0;
  const flow = manifest.flow || {};
  for (const type of ['triggers', 'conditions', 'actions']) {
    const cards = flow[type];
    if (!Array.isArray(cards)) continue;

    const ids = new Set(cards.map(card => card && card.id).filter(Boolean));
    const cleanCards = [];
    for (const card of cards) {
      const id = card && card.id;
      if (typeof id === 'string' && DUP_SUFFIX.test(id)) {
        const baseId = id.replace(DUP_SUFFIX, '');
        const isGeneratedButtonDuplicate = GENERATED_DUP_PREFIXES.some(prefix => id.startsWith(prefix));
        if (isGeneratedButtonDuplicate && ids.has(baseId)) {
          stripped++;
          continue;
        }
      }
      cleanCards.push(card);
    }
    flow[type] = cleanCards;
  }
  return stripped;
}

function sanitizeManifestFile(manifestPath) {
  const label = path.relative(APP_ROOT, manifestPath).replace(/\\/g, '/') || manifestPath;
  if (!fs.existsSync(manifestPath)) {
    log(`No ${label} found - nothing to sanitize.`);
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

  if (manifest.sdkVersion !== undefined && manifest.sdk === undefined) {
    manifest.sdk = manifest.sdkVersion;
    delete manifest.sdkVersion;
    changes++;
    log(`${label}: normalized sdkVersion -> sdk.`);
  }

  const duplicateFlowCards = stripDuplicateFlowCards(manifest);
  if (duplicateFlowCards > 0) {
    changes += duplicateFlowCards;
    log(`${label}: stripped ${duplicateFlowCards} duplicate-suffixed flow card(s).`);
  }

  const isTrackedRootManifest = path.resolve(manifestPath) === path.join(APP_ROOT, 'app.json');
  if (!isTrackedRootManifest) {
    const buttonOptions = stripGeneratedButtonOptions(manifest);
    if (buttonOptions > 0) {
      changes += buttonOptions;
      log(`${label}: stripped ${buttonOptions} generated button.* option flag(s).`);
    }
  }

  if (!isTrackedRootManifest && manifest._comment !== undefined) {
    delete manifest._comment;
    changes++;
    log(`${label}: removed _comment field.`);
  }

  if (changes > 0) {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    log(`${label}: wrote ${changes} change(s).`);
  } else {
    log(`${label}: manifest already clean - no changes.`);
  }

  const missingMfr = getDrivers(manifest).filter(
    driver => driver.zigbee && (!driver.zigbee.manufacturerName || (Array.isArray(driver.zigbee.manufacturerName) && driver.zigbee.manufacturerName.length === 0))
  );
  if (missingMfr.length > 0) {
    log(`${label}: ${missingMfr.length} zigbee driver(s) have no manufacturerName or an empty manufacturerName array.`);
  }

  return 0;
}

if (require.main === module) {
  const targets = MANIFEST_PATHS.length > 0 ? MANIFEST_PATHS : [DEFAULT_MANIFEST_PATH];
  let failures = 0;
  for (const manifestPath of targets) failures += sanitizeManifestFile(manifestPath);
  process.exit(failures > 0 ? 1 : 0);
}

module.exports = { sanitizeManifestFile, stripDuplicateFlowCards, stripGeneratedButtonOptions };
