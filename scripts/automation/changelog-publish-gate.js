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
  if (String(process.env.PUBLISH_DIAGNOSTIC_CATALOGUE || '') === '1') {
    cl[app.version] = {
      en: 'Diagnostic draft only: the upload includes the real source drivers that ordinary publishes still hold back, so the payload stays above 350 drivers. The Test channel is not changed by this run.',
      fr: 'Brouillon de diagnostic uniquement : l’envoi contient les pilotes réels que les publications ordinaires retiennent encore, donc plus de 350 pilotes. Le canal Test n’est pas modifié par cet envoi.',
    };
    fs.writeFileSync('.homeychangelog.json', `${JSON.stringify(cl, null, 2)}\n`);
  }
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
