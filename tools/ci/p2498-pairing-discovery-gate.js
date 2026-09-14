#!/usr/bin/env node
'use strict';

/**
 * P2498 — Pairing / discovery Contre quoi gate
 */
const fs = require('fs');
const path = require('path');
const { buildLearnmode, resolveTemplateKey } = require('../../lib/pairing/LearnmodeTemplates');

const ROOT = path.join(__dirname, '..', '..');

function fail(msg) {
  console.error(`P2498 FAIL: ${msg}`);
  process.exitCode = 1;
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function main() {
  const ssotPath = 'config/architecture/pairing-discovery-ssot.json';
  const humanPath = 'docs/architecture/PAIRING_DISCOVERY_SSOT.md';
  if (!fs.existsSync(path.join(ROOT, ssotPath))) fail(`missing ${ssotPath}`);
  if (!fs.existsSync(path.join(ROOT, humanPath))) fail(`missing ${humanPath}`);

  const ssot = readJson(ssotPath);
  if (!ssot.athomOfficial?.zigbee?.pairingOwnedByHomey) fail('SSOT must lock Homey-owned Zigbee pairing');
  if (!ssot.athomOfficial.zigbee.customPairViewsForbidden) fail('SSOT must forbid Zigbee custom pair views');
  if (!ssot.athomOfficial.zigbee.identityKeys?.includes('productId')) fail('SSOT identityKeys must include productId');
  if (!Array.isArray(ssot.alternativeApps?.tuyaLocalHomey?.discovery)) fail('SSOT must document Tuya Local discovery');
  if (!ssot.ourApp?.wifiPath?.discoveryCompose?.length) fail('SSOT wifi discovery compose paths');

  const human = fs.readFileSync(path.join(ROOT, humanPath), 'utf8');
  if (!/customPairViewsForbidden|not possible to implement your own pairing/i.test(human)
    && !/Homey core only/i.test(human)) {
    fail('human doc must state Homey owns Zigbee pair UI');
  }

  // Discovery strategies on disk
  for (const rel of ssot.ourApp.wifiPath.discoveryCompose) {
    if (!fs.existsSync(path.join(ROOT, rel))) fail(`missing discovery ${rel}`);
  }
  const styleCss = ssot.ourApp.wifiPath.styleCss;
  if (styleCss && !fs.existsSync(path.join(ROOT, styleCss))) {
    fail(`missing Homey pair style ${styleCss}`);
  }

  // Learnmode helper sanity
  const lm = buildLearnmode('climate_sensor', 'sensor');
  if (!lm.instruction?.en || !lm.image) fail('LearnmodeTemplates.buildLearnmode broken');
  if (resolveTemplateKey('scene_switch_4', 'button') !== 'button') fail('scene_switch template key');

  // Priority drivers must have learnmode
  const prefixes = ssot.priorityDriverPrefixes || [];
  const missing = [];
  for (const id of fs.readdirSync(path.join(ROOT, 'drivers'))) {
    if (!prefixes.some((p) => id.startsWith(p))) continue;
    const composePath = path.join(ROOT, 'drivers', id, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;
    let j;
    try {
      j = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    } catch (_e) {
      continue;
    }
    if (!j.zigbee) continue;
    if (!j.zigbee.learnmode?.instruction) missing.push(id);
  }
  if (missing.length) {
    fail(`priority Zigbee drivers missing learnmode: ${missing.slice(0, 12).join(', ')}${missing.length > 12 ? '…' : ''}`);
  }

  // Soft: count legacy zigbee custom pair HTML (must not grow unchecked — baseline warn)
  let zigbeePairHtml = 0;
  for (const id of fs.readdirSync(path.join(ROOT, 'drivers'))) {
    const composePath = path.join(ROOT, 'drivers', id, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;
    let j;
    try {
      j = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    } catch (_e) {
      continue;
    }
    if (!j.zigbee) continue;
    if (fs.existsSync(path.join(ROOT, 'drivers', id, 'pair'))) zigbeePairHtml++;
  }
  if (zigbeePairHtml > 200) {
    fail(`zigbee custom pair/ HTML count ${zigbeePairHtml} > 200 — stop adding select_driver on Zigbee`);
  }

  // Smart-map pointer
  const map = readJson('config/architecture/project-smart-map.json');
  if (!JSON.stringify(map).includes('pairing-discovery-ssot')) {
    fail('project-smart-map must point at pairing-discovery-ssot');
  }

  if (process.exitCode) {
    console.error('P2498 pairing-discovery gate FAILED');
    process.exit(1);
  }
  console.log('P2498 pairing-discovery gate PASS');
  console.log(`  priority learnmode OK; legacy zigbee pair/ dirs: ${zigbeePairHtml}`);
}

if (require.main === module) main();
module.exports = { main };
