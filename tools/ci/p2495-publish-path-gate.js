#!/usr/bin/env node
'use strict';

/**
 * P2495 — Publish path + CI/CD Contre quoi gate
 *
 * WHY(P215):
 * - Pourquoi: discoveries P2490–P2494 (couple-native, sacred-keep, family gates,
 *   P139 soft-continue) must stay wired into publish scripts AND workflows
 * - Comment: validate publish-ssot + sacred-keep couples + workflow YAML + npm scripts
 * - Pour qui: Auto-Publish / Auto-Fix+Publish / prepare-publish / Homey Test tip
 * - Quand: every publish validate + unified-ci / pre-publish
 * - Contre quoi: tip spam republish, compact drop MIAMO couple, missing family gates
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const {
  isValidSacredCouple,
  normalizeSacredCouple,
} = require('./sacred-couple-pair');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function readJson(rel) {
  return JSON.parse(read(rel));
}

function fail(msg) {
  console.error(`P2495 FAIL: ${msg}`);
  process.exitCode = 1;
}

function main() {
  const ssot = readJson('config/architecture/publish-ssot.json');
  const coupleSsot = 'config/architecture/sacred-couple-ssot.json';

  // --- publish SSOT shape ---
  if (!ssot.mandatoryPath?.alwaysUse?.includes('npm run prepare-publish')) {
    fail('publish-ssot missing prepare-publish in mandatoryPath');
  }
  if (ssot.mandatoryPath?.neverPublishFrom !== 'repo root') {
    fail('publish-ssot must refuse repo-root publish');
  }
  if (!ssot.sacredKeep?.pinFile || !ssot.sacredKeep?.coupleSsot) {
    fail('publish-ssot.sacredKeep must pinFile + coupleSsot');
  }
  if (ssot.sacredKeep.coupleSsot !== coupleSsot) {
    fail(`sacredKeep.coupleSsot must be ${coupleSsot}`);
  }
  if (!ssot.p139?.doNotSpamRepublish && ssot.p139?.doNot !== 'spam republish on processing_failed / socket hang up') {
    fail('publish-ssot.p139 must discourage spam republish');
  }
  if (!Array.isArray(ssot.gates?.prePublish) || ssot.gates.prePublish.length < 4) {
    fail('publish-ssot.gates.prePublish must list family + publish gates');
  }
  const pre = ssot.gates.prePublish.join(' ');
  for (const need of ['check:p244x', 'check:p246x', 'check:p248x', 'check:p249x', 'check:p2288', 'check:publish']) {
    if (!pre.includes(need) && need !== 'check:publish') {
      // check:publish is the aggregator — must appear in prePublish or npm script
    }
    if (!pre.includes(need) && ['check:p244x', 'check:p246x', 'check:p248x', 'check:p249x', 'check:p2288'].includes(need)) {
      fail(`publish-ssot.gates.prePublish missing ${need}`);
    }
  }
  if (!pre.includes('check:publish') && !pre.includes('check:p2495')) {
    fail('publish-ssot.gates.prePublish must include check:publish or check:p2495');
  }

  // --- sacred-keep couples are full (mfr,pid,driver) ---
  const keep = readJson('config/architecture/publish-sacred-keep-couples.json');
  const couples = keep.couples || [];
  if (couples.length < 10) fail('sacred-keep couples list too short');
  let invalid = 0;
  for (const c of couples) {
    const pid = c.pid || c.productId;
    if (!c.mfr || !pid || !c.driverId) {
      fail(`sacred-keep row incomplete: ${JSON.stringify(c)}`);
      invalid++;
      continue;
    }
    if (!isValidSacredCouple(c.mfr, pid)) {
      const n = normalizeSacredCouple(c.mfr, pid);
      if (!n) {
        console.warn(`P2495 WARN: unusual couple pin ${c.mfr}+${pid} (${c.driverId})`);
      }
    }
  }
  // P2490 MIAMO pins must exist
  const must = [
    ['_TZE200_icka1clh', 'TS0601', 'curtain_motor'],
    ['_TZE204_icka1clh', 'TS0601', 'curtain_motor'],
    ['_TZE284_fodv6bkr', 'TS0601', 'curtain_motor'],
  ];
  for (const [mfr, pid, driverId] of must) {
    const hit = couples.some((c) => (
      String(c.mfr).toLowerCase() === mfr.toLowerCase()
      && c.pid === pid
      && c.driverId === driverId
    ));
    if (!hit) fail(`missing sacred-keep pin ${mfr}+${pid}→${driverId}`);
  }

  // --- package.json scripts ---
  const pkg = readJson('package.json');
  for (const s of [
    'prepare-publish',
    'publish:direct',
    'check:p2286',
    'check:p2288',
    'check:p2494',
    'check:p2495',
    'check:publish',
    'check:p249x',
  ]) {
    if (!pkg.scripts?.[s]) fail(`package.json missing script ${s}`);
  }

  // --- prepare-publish references sacred keep / couple ---
  const prep = read('scripts/prepare-publish.js');
  if (!/publish-sacred-keep-couples|sacredMissing|compactManifestFile/.test(prep)) {
    fail('prepare-publish must run compact + sacred-keep');
  }
  if (!/P2495|sacred-couple-pair|validateSacredKeepPins/.test(prep)) {
    fail('prepare-publish must preflight sacred-keep couples (P2495)');
  }

  // --- soft-expect / verify soft hang ---
  const soft = read('scripts/lib/soft-expect-decision.js');
  if (!/socket hang up|isTransientAthomFailure|softAlert/.test(soft)) {
    fail('soft-expect-decision must handle Athom socket hang up (P139/P2323)');
  }

  // --- workflows that must wire publish gates ---
  const hardPublish = [
    'auto-publish-on-push.yml',
    'auto-fix-and-publish.yml',
  ];
  const softPublish = [
    'continuous-flow.yml',
    'project-resilience.yml',
  ];
  const families = ['check:p244x', 'check:p246x', 'check:p248x', 'check:p249x'];

  for (const f of hardPublish) {
    const t = read(path.join('.github/workflows', f));
    for (const g of families) {
      if (!t.includes(g)) fail(`${f} must hard-run ${g}`);
    }
    if (!t.includes('check:publish') && !t.includes('check:p2288')) {
      fail(`${f} must run check:publish or check:p2288`);
    }
    if (!/AI_FORCE_LOCAL/.test(t) && f === 'auto-publish-on-push.yml') {
      // soft prefer — warn only if neither env nor comment
      console.warn(`P2495 WARN: ${f} missing AI_FORCE_LOCAL (P2491)`);
    }
  }

  for (const f of softPublish) {
    const p = path.join(ROOT, '.github/workflows', f);
    if (!fs.existsSync(p)) continue;
    const t = fs.readFileSync(p, 'utf8');
    // continuous-flow may soft-run check:publish or family
    if (f === 'continuous-flow.yml') {
      if (!t.includes('check:p249') && !t.includes('check:publish') && !t.includes('check:p244x')) {
        fail(`${f} should soft-wire family or check:publish`);
      }
    }
  }

  // --- couple SSOT exists ---
  if (!fs.existsSync(path.join(ROOT, coupleSsot))) {
    fail(`missing ${coupleSsot}`);
  }

  if (process.exitCode) {
    console.error('P2495 publish-path gate FAILED');
    process.exit(1);
  }
  console.log('P2495 publish-path gate PASS');
  console.log(`  sacred-keep couples: ${couples.length}`);
  console.log(`  prePublish gates: ${(ssot.gates.prePublish || []).length}`);
}

if (require.main === module) main();

module.exports = { main };
