#!/usr/bin/env node
'use strict';

/**
 * P3342: lossless shrink of the UPLOAD app.json (publish copy only; source compose files untouched).
 *
 * WHY: P3340 (docs/knowledge/ATHOM_AGGREGATEERROR_P3340.md) ties Athom's processing failures to the work per
 * build, which grows with the manifest. stable at 2.85 MB has never been refused; master was 3.39 MB.
 *  1. Driver keys Homey does not know and the app never reads from the manifest:
 *     - `maintenanceActions`: not in the homey-lib app schema and not an SDK feature. Homey's maintenance
 *       actions are `button.*` capabilities with `capabilitiesOptions[x].maintenanceAction = true`
 *       (apps.developer.homey.app/the-basics/devices/capabilities#maintenance-actions), which stay untouched.
 *       No code reads `manifest.maintenanceActions` (grep app.js, lib/, drivers/).
 *     - `capabilityOptions`: a typo of `capabilitiesOptions`; Homey ignores it and no code reads it.
 *  2. Locales outside en/fr/nl/de inside drivers, flow cards and custom capabilities. Homey only requires
 *     `en` and falls back to it for a missing language; app name/description (store listing) untouched.
 * Nothing here touches a driver id, flow card id, capability, setting id or zigbee couple.
 */

const fs = require('fs');
const path = require('path');

const INERT_DRIVER_KEYS = Object.freeze(['maintenanceActions', 'capabilityOptions']);
const CORE_LOCALES = Object.freeze(['en', 'fr', 'nl', 'de']);
// Homey UI languages (+pt seen in the source); only these keys are treated as locales.
const EXTRA_LOCALES = Object.freeze(['it', 'es', 'sv', 'no', 'da', 'pl', 'ru', 'ko', 'pt']);
const LOCALE_KEYS = new Set([...CORE_LOCALES, ...EXTRA_LOCALES]);

const bytesOf = (k, v) => Buffer.byteLength(JSON.stringify(v)) + Buffer.byteLength(k) + 4;

function isLocaleObj(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o) || typeof o.en !== 'string') { return false; }
  return Object.keys(o).every((k) => LOCALE_KEYS.has(k) && typeof o[k] === 'string');
}

function stripExtraLocales(node, stats) {
  if (Array.isArray(node)) { for (const x of node) { stripExtraLocales(x, stats); } return; }
  if (!node || typeof node !== 'object') { return; }
  if (isLocaleObj(node)) {
    for (const k of Object.keys(node)) {
      if (CORE_LOCALES.includes(k)) { continue; }
      stats.localeBytes += bytesOf(k, node[k]);
      stats.localeDropped += 1;
      delete node[k];
    }
    return;
  }
  for (const v of Object.values(node)) { stripExtraLocales(v, stats); }
}

function stripInertManifest(manifest) {
  const stats = { inertDropped: 0, inertBytes: 0, localeDropped: 0, localeBytes: 0, bytes: 0 };
  if (!manifest || typeof manifest !== 'object') { return stats; }
  for (const d of Array.isArray(manifest.drivers) ? manifest.drivers : []) {
    if (!d || typeof d !== 'object') { continue; }
    for (const k of INERT_DRIVER_KEYS) {
      if (!(k in d)) { continue; }
      stats.inertBytes += bytesOf(k, d[k]);
      stats.inertDropped += 1;
      delete d[k];
    }
    stripExtraLocales(d, stats);
  }
  if (manifest.flow) { stripExtraLocales(manifest.flow, stats); }
  if (manifest.capabilities) { stripExtraLocales(manifest.capabilities, stats); }
  stats.bytes = stats.inertBytes + stats.localeBytes;
  return stats;
}

function stripFile(file) {
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  const r = stripInertManifest(manifest);
  if (r.bytes > 0) { fs.writeFileSync(file, JSON.stringify(manifest), 'utf8'); }
  return r;
}

if (require.main === module) {
  for (const file of process.argv.slice(2)) {
    const r = stripFile(path.resolve(file));
    console.log(`[P3342 strip-inert] ${file}: -${(r.bytes / 1024).toFixed(1)} KB (inert keys ${r.inertDropped}, locales ${r.localeDropped})`);
  }
}

module.exports = { stripInertManifest, stripFile, INERT_DRIVER_KEYS, CORE_LOCALES, EXTRA_LOCALES, isLocaleObj };
