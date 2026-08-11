#!/usr/bin/env node
'use strict';

/**
 * apply-forum-silent-multi.js (P109)
 *
 * Dry-run by default. Reads multi-silent digests and reinforces high-confidence
 * sacred couples into typed drivers (never generic_tuya). Never posts to Discourse.
 *
 * Usage:
 *   node tools/ci/apply-forum-silent-multi.js
 *   node tools/ci/apply-forum-silent-multi.js --apply
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const STATE = path.join(ROOT, '.github', 'state', 'forum');
const DIGEST = path.join(STATE, 'multi-silent-digest.json');
const NEW_FPS = path.join(STATE, 'multi-silent-new-fps.json');
const REPORT = path.join(STATE, 'multi-silent-apply-report.json');
const APPLY = process.argv.includes('--apply');

/** High-confidence typed routes only (sacred couple). */
const KNOWN_ROUTES = [
  {
    id: 'm1cvyneb-wall-dimmer',
    mfrs: ['_TZE284_m1cvyneb', '_TZE204_m1cvyneb', '_TZE200_m1cvyneb'],
    pids: ['TS0601'],
    driver: 'wall_dimmer_tuya',
  },
  {
    id: 'jtbgusdc-dimmer2',
    mfrs: ['_TZE204_jtbgusdc', '_TZE284_jtbgusdc', '_TZE200_jtbgusdc', '_TZE28C1000000_jtbgusdc'],
    pids: ['TS0601'],
    driver: 'dimmer_2_gang_tuya',
  },
  {
    id: 'clrdrnya-presence',
    mfrs: ['_TZE204_clrdrnya', '_TZE200_clrdrnya', '_TZE284_clrdrnya'],
    pids: ['TS0601'],
    driver: 'presence_sensor_radar',
  },
  {
    id: 'wkr3jqmr-switch4',
    mfrs: ['_TZ3000_wkr3jqmr'],
    pids: ['TS0004'],
    driver: 'switch_4gang',
  },
  {
    id: 'imaccztn-relay4',
    mfrs: ['_TZ3210_imaccztn', '_TZ3000_imaccztn'],
    pids: ['TS0004'],
    driver: 'relay_board_4_channel',
  },
  {
    id: 'w5xztuy7-switch2',
    mfrs: ['_TZ3000_w5xztuy7'],
    pids: ['TS0002'],
    driver: 'switch_2gang',
  },
];

function loadJson(fp) {
  if (!fs.existsSync(fp)) {return null;}
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function caseVariants(mfr) {
  const upper = String(mfr);
  const lower = upper.toLowerCase();
  return upper === lower ? [upper] : [upper, lower];
}

function ensureCouple(driver, mfr, pid) {
  const fp = path.join(ROOT, 'drivers', driver, 'driver.compose.json');
  if (!fs.existsSync(fp)) {return { ok: false, reason: 'missing-driver' };}
  const json = JSON.parse(fs.readFileSync(fp, 'utf8'));
  if (!json.zigbee) {json.zigbee = {};}
  json.zigbee.manufacturerName = Array.isArray(json.zigbee.manufacturerName)
    ? json.zigbee.manufacturerName
    : (json.zigbee.manufacturerName ? [json.zigbee.manufacturerName] : []);
  json.zigbee.productId = Array.isArray(json.zigbee.productId)
    ? json.zigbee.productId
    : (json.zigbee.productId ? [json.zigbee.productId] : []);

  const changes = [];
  for (const v of caseVariants(mfr)) {
    if (!json.zigbee.manufacturerName.some((x) => String(x).toLowerCase() === v.toLowerCase())) {
      json.zigbee.manufacturerName.push(v);
      changes.push(`mfr:${v}`);
    }
  }
  if (pid && !json.zigbee.productId.some((x) => String(x).toLowerCase() === String(pid).toLowerCase())) {
    json.zigbee.productId.push(pid);
    changes.push(`pid:${pid}`);
  }
  if (changes.length && APPLY) {
    fs.writeFileSync(fp, `${JSON.stringify(json, null, 2)}\n`);
  }
  return { ok: true, driver, changes, applied: APPLY && changes.length > 0 };
}

function main() {
  const digest = loadJson(DIGEST);
  const newFps = loadJson(NEW_FPS);
  const report = {
    generatedAt: new Date().toISOString(),
    mode: APPLY ? 'APPLY' : 'DRY-RUN',
    policy: 'REPLY_TOPICS=140352 only; never generic_tuya; silent enrichment',
    digestPresent: !!digest,
    newFpCount: newFps?.count || 0,
    reinforced: [],
    skippedNew: [],
  };

  for (const route of KNOWN_ROUTES) {
    for (const mfr of route.mfrs) {
      for (const pid of (route.pids || [null])) {
        const r = ensureCouple(route.driver, mfr, pid);
        report.reinforced.push({ id: route.id, mfr, pid, ...r });
      }
    }
  }

  // New FPs from digest: report-only unless already in KNOWN_ROUTES (no blind apply)
  for (const item of (newFps?.items || [])) {
    const mfr = item.mfr;
    const known = KNOWN_ROUTES.some((r) => r.mfrs.some((m) => m.toLowerCase() === String(mfr).toLowerCase()));
    if (!known) {
      report.skippedNew.push({
        mfr,
        pids: item.pids || [],
        topicId: item.topicId,
        reason: 'not-in-KNOWN_ROUTES — review manually',
      });
    }
  }

  if (!fs.existsSync(STATE)) {fs.mkdirSync(STATE, { recursive: true });}
  fs.writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`);

  const applied = report.reinforced.filter((x) => x.changes && x.changes.length).length;
  console.log('=== apply-forum-silent-multi ===');
  console.log('Mode:', report.mode);
  console.log('Routes checked:', report.reinforced.length, 'with changes:', applied);
  console.log('Skipped new FPs (manual review):', report.skippedNew.length);
  console.log('Report:', REPORT);
}

main();
