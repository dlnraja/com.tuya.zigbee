#!/usr/bin/env node
'use strict';

/**
 * sync-external-sources.js
 * Auto-downloads Z2M converters, ZHA quirks, deCONZ device DBs, and runs the
 * ExternalDeviceAdapter pipeline to enrich the Homey app with new fingerprints.
 * Designed to run in GitHub Actions on a schedule (weekly/daily).
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { fetchWithRetry } = require('./retry-helper');

const ROOT = path.join(__dirname, '..', '..');
const CACHE = path.join(ROOT, '.github', 'cache');
const TOKEN = process.env.GH_PAT || process.env.GITHUB_TOKEN;
const DRY_RUN = (process.env.DRY_RUN || 'true') === 'true';
const hdrs = t => ({ Accept: 'application/vnd.github+json', 'User-Agent': 'tuya-sync', ...(t ? { Authorization: 'Bearer ' + t } : {}) });
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchText(url, headers) {
  try {
    const r = await fetchWithRetry(url, { headers: headers || { 'User-Agent': 'tuya-sync' } }, { retries: 3, label: 'sync' });
    if (!r.ok) { console.log('  WARN: ' + url + ' → ' + r.status); return null; }
    return r.text();
  } catch (e) { console.log('  ERR: ' + url + ': ' + e.message); return null; }
}

async function fetchJSON(url, headers) {
  try {
    const r = await fetchWithRetry(url, { headers: headers || { 'User-Agent': 'tuya-sync' } }, { retries: 3, label: 'syncJSON' });
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }

// =============================================================================
// DOWNLOAD: Z2M Converters
// =============================================================================
async function downloadZ2M() {
  console.log('\n== Downloading Z2M Converters ==');
  const dir = path.join(CACHE, 'z2m');
  ensureDir(dir);

  // Main Tuya converter file (TypeScript)
  const mainFiles = [
    { url: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts', name: 'tuya.ts' },
    { url: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/sonoff.ts', name: 'sonoff.ts' }
  ];
  for (const f of mainFiles) {
    const src = await fetchText(f.url);
    if (src) {
      fs.writeFileSync(path.join(dir, f.name), src);
      console.log('  Saved ' + f.name + ' (' + Math.round(src.length / 1024) + 'KB)');
    }
    await sleep(500);
  }

  // Also grab other relevant converter files
  const otherFiles = ['_TZE200.ts', 'lidl.ts', 'nous.ts', 'zemismart.ts', 'moes.ts'];
  for (const f of otherFiles) {
    const src = await fetchText('https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/' + f);
    if (src && src.includes('_T')) {
      fs.writeFileSync(path.join(dir, f), src);
      console.log('  Saved ' + f + ' (' + Math.round(src.length / 1024) + 'KB)');
    }
    await sleep(500);
  }

  // Grab supported devices JSON from Z2M docs
  const devicesJSON = await fetchText('https://raw.githubusercontent.com/Koenkk/zigbee2mqtt.io/master/supported-devices.json');
  if (devicesJSON) {
    fs.writeFileSync(path.join(dir, 'supported-devices.json'), devicesJSON);
    console.log('  Saved supported-devices.json (' + Math.round(devicesJSON.length / 1024) + 'KB)');
  }

  return true;
}

// =============================================================================
// DOWNLOAD: ZHA Quirks
// =============================================================================
async function downloadZHA() {
  console.log('\n== Downloading ZHA Quirks ==');
  const dir = path.join(CACHE, 'zha');
  ensureDir(dir);

  // Main tuya __init__.py
  const initSrc = await fetchText('https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/__init__.py');
  if (initSrc) {
    fs.writeFileSync(path.join(dir, '__init__.py'), initSrc);
    console.log('  Saved __init__.py (' + Math.round(initSrc.length / 1024) + 'KB)');
  }

  // List all Tuya quirk files
  const tree = await fetchJSON('https://api.github.com/repos/zigpy/zha-device-handlers/git/trees/dev?recursive=1', hdrs(TOKEN));
  if (tree && tree.tree) {
    const tuyaFiles = tree.tree
      .filter(f => (f.path.startsWith('zhaquirks/tuya/') || f.path.startsWith('zhaquirks/sonoff/') || f.path.startsWith('zhaquirks/xiaomi/aqara/')) && f.path.endsWith('.py') && !f.path.endsWith('__init__.py'))
      .slice(0, 100);
    console.log('  Found ' + tuyaFiles.length + ' Tuya / SONOFF / Aqara quirk files');

    for (const f of tuyaFiles) {
      const src = await fetchText('https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/' + f.path);
      if (src && (src.includes('_T') || src.includes('SONOFF') || src.includes('Aqara'))) {
        const basename = f.path.split('/').pop();
        fs.writeFileSync(path.join(dir, basename), src);
      }
      await sleep(200);
    }
    console.log('  Downloaded ' + tuyaFiles.length + ' quirk files');
  }

  return true;
}

// =============================================================================
// DOWNLOAD: CSA (Connectivity Standards Alliance) / Zigbee Alliance Certified
// =============================================================================
async function downloadCSA() {
  console.log('\n== Downloading CSA / Zigbee Certified Data ==');
  const dir = path.join(CACHE, 'csa');
  ensureDir(dir);

  // Since CSA doesn't have a public JSON API, we use a known mirror of certified products
  // or community maintained lists from Hubitat/HA
  const csaFiles = [
    { url: 'https://raw.githubusercontent.com/HubitatCommunity/Hubitat-Zigbee-Certified/master/fingerprints.json', name: 'hubitat-certified.json' },
    { url: 'https://raw.githubusercontent.com/zigpy/zigpy/master/zigpy/profiles/zcl/clusters/__init__.py', name: 'zcl-init.py' }
  ];

  for (const f of csaFiles) {
    const src = await fetchText(f.url);
    if (src) {
      fs.writeFileSync(path.join(dir, f.name), src);
      console.log('  Saved ' + f.name + ' (' + Math.round(src.length / 1024) + 'KB)');
    }
    await sleep(500);
  }
  return true;
}

// =============================================================================
// DOWNLOAD: deCONZ Device DB
// =============================================================================
async function downloadDeCONZ() {
  console.log('\n== Downloading deCONZ Devices ==');
  const dir = path.join(CACHE, 'deconz');
  ensureDir(dir);

  const tree = await fetchJSON('https://api.github.com/repos/dresden-elektronik/deconz-rest-plugin/git/trees/master?recursive=1', hdrs(TOKEN));
  if (!tree || !tree.tree) return false;

  const jsonFiles = tree.tree
    .filter(f => f.path.startsWith('devices/') && f.path.endsWith('.json') && /tuya|_T[A-Z]|sonoff|ewelink|SNZB/i.test(f.path))
    .slice(0, 100);
  console.log('  Found ' + jsonFiles.length + ' Tuya + SONOFF device files');

  for (const f of jsonFiles) {
    const src = await fetchText('https://raw.githubusercontent.com/dresden-elektronik/deconz-rest-plugin/master/' + f.path);
    if (src) {
      const basename = f.path.split('/').pop();
      fs.writeFileSync(path.join(dir, basename), src);
    }
    await sleep(200);
  }
  console.log('  Downloaded ' + jsonFiles.length + ' device files');
  return true;
}

// =============================================================================
// DOWNLOAD: zigbee-herdsman definition files (cluster/device type info)
// =============================================================================
async function downloadHerdsmanDefs() {
  console.log('\n== Downloading Herdsman Definitions ==');
  const dir = path.join(CACHE, 'herdsman');
  ensureDir(dir);

  const files = [
    { url: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman/master/src/zcl/definition/cluster.ts', name: 'clusters.ts' },
    { url: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman/master/src/zcl/definition/status.ts', name: 'status.ts' },
    { url: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/lib/tuya.ts', name: 'tuya-lib.ts' },
    { url: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/lib/exposes.ts', name: 'exposes.ts' },
    { url: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/lib/modernExtend.ts', name: 'modernExtend.ts' }
  ];

  for (const f of files) {
    const src = await fetchText(f.url);
    if (src) {
      fs.writeFileSync(path.join(dir, f.name), src);
      console.log('  Saved ' + f.name + ' (' + Math.round(src.length / 1024) + 'KB)');
    }
    await sleep(500);
  }
  return true;
}

// =============================================================================
// RUN ENRICHMENT PIPELINE
// =============================================================================
async function runEnrichment() {
  console.log('\n== Running Enrichment Pipeline ==');
  try {
    const { runFullPipeline } = require('../../lib/adapters/ExternalDeviceAdapter');
    const report = await runFullPipeline({ dryRun: DRY_RUN });
    return report;
  } catch (err) {
    console.error('Pipeline error:', err.message);
    return null;
  }
}

// =============================================================================
// MAIN
// =============================================================================
async function main() {
  console.log('=== External Sources Sync ===');
  console.log('Dry run:', DRY_RUN, '| Token:', TOKEN ? 'present' : 'MISSING');
  const startTime = Date.now();

  await downloadZ2M();
  await downloadZHA();
  await downloadDeCONZ();
  await downloadHerdsmanDefs();
  await downloadCSA();

  // Count cached files
  let totalFiles = 0;
  for (const sub of ['z2m', 'zha', 'deconz', 'herdsman']) {
    const dir = path.join(CACHE, sub);
    if (fs.existsSync(dir)) {
      const count = fs.readdirSync(dir).length;
      totalFiles += count;
      console.log(sub + ': ' + count + ' cached files');
    }
  }

  const report = await runEnrichment();
  const elapsed = Math.round((Date.now() - startTime) / 1000);

  console.log('\n=== Sync Complete (' + elapsed + 's) ===');
  console.log('Total cached files:', totalFiles);
  if (report) {
    console.log('Cross-ref:', report.crossRef?.total, '| New:', report.crossRef?.unsupported);
    console.log('Enrichments applied:', report.enrichments?.applied, '| Proposed:', report.enrichments?.proposed);
  }

  // GitHub Step Summary
  if (process.env.GITHUB_STEP_SUMMARY) {
    let md = '## External Sources Sync\n';
    md += '| Source | Cached Files |\n|---|---|\n';
    for (const sub of ['z2m', 'zha', 'deconz', 'herdsman']) {
      const dir = path.join(CACHE, sub);
      const count = fs.existsSync(dir) ? fs.readdirSync(dir).length : 0;
      md += '| ' + sub + ' | ' + count + ' |\n';
    }
    if (report) {
      md += '\n| Metric | Count |\n|---|---|\n';
      md += '| Unique FPs | ' + (report.crossRef?.total || 0) + ' |\n';
      md += '| Supported | ' + (report.crossRef?.supported || 0) + ' |\n';
      md += '| New devices | ' + (report.crossRef?.unsupported || 0) + ' |\n';
      md += '| Enrichments proposed | ' + (report.enrichments?.proposed || 0) + ' |\n';
      md += '| Enrichments applied | ' + (report.enrichments?.applied || 0) + ' |\n';
      md += '| Dry run | ' + DRY_RUN + ' |\n';
    }
    md += '\nDuration: ' + elapsed + 's\n';
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
