#!/usr/bin/env node
'use strict';

/**
 * P2830h: lossless upload-manifest shrink.
 *
 * WHY: homey compose merges ~6k driver Flow cards into the build app.json
 * (4.75 MB raw, 3.92 MB after Zigbee compact: 98% of Athom's 4 MB limit).
 * titleFormatted only exists to render arguments inline. homey-lib
 * (App._validateFlowCard) ignores it when a card has no argument other than the
 * first driver-filtered device argument and no droptoken. For such a card the
 * Flow UI shows exactly the title, so a titleFormatted with no [[arg]] carries
 * no information. Removing it saves ~0.46 MB on master without changing any
 * card id, argument, token or visible text.
 *
 * Used on the publish copy only (prepare-publish). Source compose files are untouched.
 */

const fs = require('fs');

function visibleArgs(card) {
  const args = Array.isArray(card.args) ? card.args : [];
  const firstDriverDevice = args.find((a) => {
    if (!a || a.type !== 'device') return false;
    const f = new URLSearchParams(typeof a.filter === 'string' ? a.filter : '');
    return f.has('driver_id') || f.has('driverId');
  });
  return args.filter((a) => a !== firstDriverDevice);
}

function hasPlaceholder(tf) {
  return /\[\[/.test(typeof tf === 'string' ? tf : JSON.stringify(tf));
}

function isRedundant(card) {
  if (!card || card.titleFormatted === undefined) return false;
  if (card.droptoken) return false;
  if (visibleArgs(card).length > 0) return false;
  return !hasPlaceholder(card.titleFormatted);
}

function stripRedundantTitleFormatted(manifest) {
  let removed = 0;
  let bytes = 0;
  const visit = (cards) => {
    for (const card of Array.isArray(cards) ? cards : []) {
      if (!isRedundant(card)) continue;
      bytes += Buffer.byteLength(JSON.stringify(card.titleFormatted)) + '"titleFormatted":,'.length;
      delete card.titleFormatted;
      removed++;
    }
  };
  const flowGroups = [manifest && manifest.flow];
  for (const d of (manifest && manifest.drivers) || []) flowGroups.push(d && d.flow);
  for (const flow of flowGroups) {
    if (!flow || typeof flow !== 'object') continue;
    for (const type of ['triggers', 'conditions', 'actions']) visit(flow[type]);
  }
  return { removed, bytes };
}

function stripFile(file) {
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  const result = stripRedundantTitleFormatted(manifest);
  if (result.removed > 0) fs.writeFileSync(file, JSON.stringify(manifest), 'utf8');
  return result;
}

if (require.main === module) {
  for (const file of process.argv.slice(2)) {
    const r = stripFile(file);
    console.log(`[strip-title-formatted] ${file}: removed ${r.removed} redundant titleFormatted (${(r.bytes / 1048576).toFixed(3)} MB)`);
  }
}

module.exports = { stripRedundantTitleFormatted, stripFile, isRedundant, visibleArgs };
