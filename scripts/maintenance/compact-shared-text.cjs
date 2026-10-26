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
    const c = s.id && CANON.settingHints[s.id];
    if (!c || !s.hint || s.hint.en !== c.from) {continue;}
    const before = Buffer.byteLength(JSON.stringify(s.hint));
    s.hint = { ...c.to };
    stats.hintBytes += before - Buffer.byteLength(JSON.stringify(s.hint));
    stats.hintsCanon += 1;
  }
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

function compactSharedText(manifest) {
  const stats = { localeDropped: 0, localeBytes: 0, hintsCanon: 0, titlesCanon: 0, hintBytes: 0 };
  if (!manifest || typeof manifest !== 'object') {return stats;}
  for (const d of Array.isArray(manifest.drivers) ? manifest.drivers : []) {
    if (!d || typeof d !== 'object') {continue;}
    canonSettings(d.settings, stats);
    canonMaintenance(d.maintenanceActions, stats);
    dedupeLocales(d, stats);
  }
  if (manifest.flow) {dedupeLocales(manifest.flow, stats);}
  if (manifest.capabilities) {dedupeLocales(manifest.capabilities, stats);}
  stats.bytes = stats.localeBytes + stats.hintBytes;
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

module.exports = { compactSharedText, compactFile, dedupeLocales, isLocaleObj, CANON };
