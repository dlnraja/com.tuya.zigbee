#!/usr/bin/env node
'use strict';

/**
 * ensure-next-changelog.js (P196)
 *
 * Homey CLI `app publish` in headless mode auto-bumps the patch when the
 * current version already exists on Athom, then refuses if that next
 * version has no `.homeychangelog.json` entry (stable 5.12.83 miss).
 *
 * Seeds current + next patch. Does not bump app.json.
 */

const fs = require('fs');

const TEXT = String(process.env.HOMEY_CHANGELOG || 'Reliability improvements.').trim();

function nextPatch(version) {
  const match = String(version || '').match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) {throw new Error(`Invalid version: ${version}`);}
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}

function main() {
  const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
  const current = app.version;
  const next = nextPatch(current);
  const file = '.homeychangelog.json';
  const changelog = JSON.parse(fs.readFileSync(file, 'utf8'));
  const added = [];
  for (const version of [current, next]) {
    if (!changelog[version] || !String(changelog[version].en || '').trim()) {
      changelog[version] = { en: TEXT };
      added.push(version);
    }
  }
  if (added.length) {
    fs.writeFileSync(file, `${JSON.stringify(changelog, null, 2)}\n`);
  }
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `next=${next}\nadded=${added.join(',')}\n`);
  }
  console.log(`ensure-changelog current=${current} next=${next} added=${added.join(',') || 'none'}`);
}

main();
