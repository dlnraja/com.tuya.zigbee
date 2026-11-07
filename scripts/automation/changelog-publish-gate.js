#!/usr/bin/env node
'use strict';
/**
 * Fail a publish when the note about to be uploaded is missing, stock filler,
 * or a copy of the previous version's note. Does not rewrite older versions.
 * No network and no model call.
 */
const fs = require('fs');
const ce = require('./changelog-entry');

function main() {
  const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
  const cl = JSON.parse(fs.readFileSync('.homeychangelog.json', 'utf8'));
  const entry = cl[app.version];
  const en = entry && (typeof entry === 'object' ? entry.en : entry);
  if (!en || ce.isPlaceholder(en)) {
    console.error(`changelog-publish-gate: ${app.id} ${app.version} refused (${en || 'missing'})`);
    process.exit(1);
  }
  const prev = Object.keys(cl).filter((k) => k !== app.version && /^\d+\.\d+\.\d+$/.test(k) && ce.cmpVer(k, app.version) < 0).sort(ce.cmpVer).pop();
  const prevEn = prev && cl[prev] && (typeof cl[prev] === 'object' ? cl[prev].en : cl[prev]);
  if (prevEn && prevEn === en) {
    console.error(`changelog-publish-gate: ${app.version} repeats ${prev}`);
    process.exit(1);
  }
  console.log(`changelog-publish-gate: ${app.id} ${app.version} ok — ${en}`);
}

if (require.main === module) {main();}
module.exports = { main };
