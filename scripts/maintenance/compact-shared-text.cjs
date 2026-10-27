#!/usr/bin/env node
'use strict';

/**
 * P3068 size headroom: upload-manifest text compaction (publish copy only; source compose files untouched).
 *
 * WHY: the projected upload app.json reached 3.91 / 4 MB on master (Athom hard limit 4 MB).
 *  1. Locale dedupe (lossless): a non-en string identical to its `en` sibling carries nothing — Homey falls
 *     back to `en` for a missing language. Applied to drivers (settings, names, capabilitiesOptions, …),
 *     flow cards and custom capabilities; never to top-level app name/description (store listing).
 *  2. Shared driver settings / maintenance actions copied into hundreds of driver.compose.json files carry the
 *     same long hint each time. When (and only when) a setting's `en` hint is exactly the known shared text,
 *     it is replaced by a concise canonical hint with the same meaning (also repairs mojibake copies such as
 *     "S├®lectionnez"). Device-specific variants (different `en`) are left alone.
 *  3. P3075 D26: driver keys that are maintainer notes, not Homey manifest fields, are dropped from the upload
 *     copy: `metadata` (source citations), per-driver `version`, `_`-prefixed notes and empty `subDevices`.
 *     Neither Homey nor app code reads them from the manifest (grep: no driver.manifest.metadata/version/
 *     subDevices reads); the compose files keep them, so nothing is lost for maintainers.
 */

const fs = require('fs');
const path = require('path');

const CANON = require('./shared-text-canon.json');

const isLocaleObj = (o) => {
  if (!o || typeof o !== 'object' || Array.isArray(o) || typeof o.en !== 'string') {return false;}
  const ks = Object.keys(o);
  return ks.length > 1 && ks.every((k) => /^[a-z]{2}$/.test(k) && typeof o[k] === 'string');
};

function dedupeLocales(node, stats) {
  if (Array.isArray(node)) { for (const x of node) {dedupeLocales(x, stats);} return; }
  if (!node || typeof node !== 'object') {return;}
  if (isLocaleObj(node)) {
    for (const k of Object.keys(node)) {
      if (k !== 'en' && node[k] === node.en) {
        stats.localeBytes += Buffer.byteLength(JSON.stringify(node[k])) + k.length + 4;
        stats.localeDropped += 1;
        delete node[k];
      }
    }
    return;
  }
  for (const k of Object.keys(node)) {dedupeLocales(node[k], stats);}
}

function canonSettings(list, stats) {
  for (const s of Array.isArray(list) ? list : []) {
    if (!s || typeof s !== 'object') {continue;}
    if (Array.isArray(s.children)) { canonSettings(s.children, stats); continue; }
    canonValues(s, stats);
    const c = s.id && CANON.settingHints[s.id];
    if (!c || !s.hint || s.hint.en !== c.from) {continue;}
    const before = Buffer.byteLength(JSON.stringify(s.hint));
    s.hint = { ...c.to };
    stats.hintBytes += before - Buffer.byteLength(JSON.stringify(s.hint));
    stats.hintsCanon += 1;
  }
}

// P3071b: shared dropdown labels (ids untouched, so stored values and device logic are unchanged).
function canonValues(s, stats) {
  const c = CANON.settingValues && CANON.settingValues[s.id];
  if (!c || !Array.isArray(s.values) || s.values.length !== c.to.length) {return;}
  const same = s.values.every((o, i) => o && o.id === c.to[i].id && o.label && o.label.en === c.from[i]);
  if (!same) {return;}
  const before = Buffer.byteLength(JSON.stringify(s.values));
  s.values = c.to.map((o) => ({ id: o.id, label: { ...o.label } }));
  stats.hintBytes += before - Buffer.byteLength(JSON.stringify(s.values));
  stats.valuesCanon = (stats.valuesCanon || 0) + 1;
}

function canonMaintenance(list, stats) {
  for (const a of Array.isArray(list) ? list : []) {
    const c = a && a.id && CANON.maintenanceTitles[a.id];
    if (!c || !a.title || a.title.en !== c.from) {continue;}
    const before = Buffer.byteLength(JSON.stringify(a.title));
    a.title = { ...c.to };
    stats.hintBytes += before - Buffer.byteLength(JSON.stringify(a.title));
    stats.titlesCanon += 1;
  }
}

const DOC_KEYS = ['metadata', 'version'];
function stripDriverDocKeys(d, stats) {
  for (const k of Object.keys(d)) {
    const drop = DOC_KEYS.includes(k) || k.startsWith('_') || (k === 'subDevices' && Array.isArray(d[k]) && d[k].length === 0);
    if (!drop) {continue;}
    stats.docBytes += Buffer.byteLength(JSON.stringify(d[k])) + k.length + 4;
    stats.docDropped += 1;
    delete d[k];
  }
}

function compactSharedText(manifest, opts = {}) {
  const stats = { localeDropped: 0, localeBytes: 0, hintsCanon: 0, titlesCanon: 0, hintBytes: 0, docDropped: 0, docBytes: 0 };
  if (!manifest || typeof manifest !== 'object') {return stats;}
  for (const d of Array.isArray(manifest.drivers) ? manifest.drivers : []) {
    if (!d || typeof d !== 'object') {continue;}
    if (!opts.keepDocKeys) {stripDriverDocKeys(d, stats);}
    canonSettings(d.settings, stats);
    canonMaintenance(d.maintenanceActions, stats);
    dedupeLocales(d, stats);
  }
  if (manifest.flow) {dedupeLocales(manifest.flow, stats);}
  if (manifest.capabilities) {dedupeLocales(manifest.capabilities, stats);}
  stats.bytes = stats.localeBytes + stats.hintBytes + stats.docBytes;
  return stats;
}

function compactFile(file) {
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  const r = compactSharedText(manifest);
  if (r.bytes > 0) {fs.writeFileSync(file, JSON.stringify(manifest), 'utf8');}
  return r;
}

if (require.main === module) {
  for (const file of process.argv.slice(2)) {
    const r = compactFile(path.resolve(file));
    console.log(`[P3068 compact-shared-text] ${file}: -${(r.bytes / 1024).toFixed(1)} KB (locales ${r.localeDropped}, hints ${r.hintsCanon}, titles ${r.titlesCanon})`);
  }
}

module.exports = { compactSharedText, compactFile, stripDriverDocKeys, DOC_KEYS, dedupeLocales, isLocaleObj, CANON };
