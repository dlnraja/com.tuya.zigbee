#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR = path.join(__dirname, '../../data/community-sync');
const DRIVERS_DIR = path.join(__dirname, '../../drivers');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const Z2M_BASE = 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices';
const SOURCES = ['tuya', 'sonoff', 'danfoss', 'schneider_electric', 'legrand', 'bosch', 'ikea', 'lumi', 'niko', 'philips'];

//  HTTP GET 
function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 60000 }, (res) => {
      if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
      let d = '';
      res.on('data', c => (d += c));
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

//  Load local fingerprints from all driver.compose.json 
function getLocalFingerprints() {
  const mfrs = new Set();
  const pids = new Set();
  const driverMap = new Map();

  for (const d of fs.readdirSync(DRIVERS_DIR)) {
    const cf = path.join(DRIVERS_DIR, d, 'driver.compose.json');
    if (!fs.existsSync(cf)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(cf, 'utf8'));
      for (const m of (data.zigbee?.manufacturerName || [])) {
        mfrs.add(m );
        if (!driverMap.has(m)) driverMap.set(m, []);
        driverMap.get(m).push(d);
      }
      for (const p of (data.zigbee?.productId || [])) pids.add(p)       ;
    } catch (e ) { /* skip */ }
  }
  return { mfrs, pids, driverMap };
}

//  Extract fingerprints from Z2M TypeScript source 
function extractFromZ2M(source, sourceName) {
  const results = [];

  // Extract manufacturerName strings from fingerprint blocks
  const mfrRe = /manufacturerName:\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = mfrRe.exec(source)) !== null) {
    results.push({ type: 'mfr', value: m[1], source: sourceName });
  }

  // Extract zigbeeModel arrays (these are productId / modelID values)
  const modelRe = /zigbeeModel:\s*\[([^\]]+)\]/g;
  while ((m = modelRe.exec(source)) !== null) {
    const inner = m[1];
    const strRe = /['"]([^'"]+)['"]/g;
    let s;
    while ((s = strRe.exec(inner)) !== null) {
      if (s[1].length > 1) results.push({ type: 'pid', value: s[1], source: sourceName });
    }
  }

  return results;
}

//  Infer which driver a fingerprint should go to 
function inferDriver(mfr, pid) {
  const p = (pid || '').toUpperCase();
  const ml = (mfr || '').toLowerCase();

  // Tuya standard productIds
  if (p === 'TS0001') return 'switch_1gang';
  if (p === 'TS0002') return 'switch_2gang';
  if (p === 'TS0003') return 'switch_3gang';
  if (p === 'TS0004') return 'switch_4gang';
  if (p === 'TS011F' || p === 'TS0121') return 'plug_energy_monitor';
  if (/^TS004[1-6]$/.test(p)) return 'button_wireless';
  if (p === 'TS004F') return 'button_wireless';
  if (p === 'TS0201' || p === 'TS0222') return 'climate_sensor';
  if (p === 'TS0202' || p === 'TS0225') return 'motion_sensor';
  if (p === 'TS0203') return 'contact_sensor';
  if (p === 'TS0205') return 'smoke_detector_advanced';
  if (p === 'TS0207') return 'water_leak_sensor';
  if (p === 'TS0215A') return 'button_wireless';
  if (p === 'TS0501' || p === 'TS0502' || p === 'TS0503' || p === 'TS0504' || p === 'TS0505') return 'bulb_rgbw';
  if (p === 'TS110E' || p === 'TS110F') return 'dimmer_wall_1gang';
  if (p === 'TS130F' || p === 'TS0302') return 'curtain_motor';

  // TS0601 Tuya DP - infer from manufacturer name
  if (p === 'TS0601') {
    if (/temp|humid|climate|th0/i.test(ml)) return 'climate_sensor';
    if (/presence|radar|human|pir/i.test(ml)) return 'presence_sensor_radar';
    if (/curtain|blind|cover/i.test(ml)) return 'curtain_motor';
    if (/valve|trv|thermo/i.test(ml)) return 'radiator_valve';
    if (/smoke|fire/i.test(ml)) return 'smoke_detector_advanced';
    if (/water|leak/i.test(ml)) return 'water_leak_sensor';
    if (/door|contact/i.test(ml)) return 'contact_sensor';
    if (/soil/i.test(ml)) return 'soil_sensor';
    return 'generic_diy';
  }

  // Non-Tuya Sonoff
  if (/^SNZB-01/.test(p)) return 'button_wireless';
  if (/^SNZB-02/.test(p)) return 'climate_sensor';
  if (/^SNZB-03/.test(p)) return 'motion_sensor';
  if (/^SNZB-04/.test(p)) return 'contact_sensor';
  if (/^SNZB-05/.test(p)) return 'water_leak_sensor';
  if (/^SNZB-06/.test(p)) return 'presence_sensor_radar';
  if (/^(ZBMINI|ZBMINIR|ZBMINIL|BASICZBR|S31ZB|S26R2ZB|01MINI|ZBM5)/.test(p)) return 'switch_1gang';
  if (/^(S40ZB|S60ZB)/.test(p)) return 'plug_energy_monitor';
  if (/^(ZBMINI-DIM|ZBMINID)/.test(p)) return 'dimmer_wall_1gang';
  if (/^ZBCurtain/.test(p)) return 'curtain_motor';
  if (/^TRVZB/.test(p)) return 'radiator_valve';
  if (/^SWV/.test(p)) return 'water_valve_smart';
  if (/^MG1/.test(p)) return 'presence_sensor_radar';

  // Non-Tuya Danfoss
  if (/^(eTRV|TRV00|eT093)/.test(p)) return 'generic_diy';

  return 'generic_diy';
}

//  MAIN 
async function main() {
  console.log('=== Z2M Fingerprint Sync v5.9.0 ===\n');

  // 1. Load local
  const { mfrs, pids, driverMap } = getLocalFingerprints();
  console.log('Local: ' + mfrs.size + ' manufacturerNames, ' + pids.size + ' productIds');

  // Save local snapshot
  fs.writeFileSync(
    path.join(DATA_DIR, 'existing-fingerprints.json'),
    JSON.stringify({ manufacturerNames: [...mfrs].sort(), productIds: [...pids].sort() }, null, 2)
  );

  // 2. Fetch Z2M sources
  const allZ2m = [];
  for (const name of SOURCES) {
    const url = Z2M_BASE + '/' + name + '.ts';
    try {
      console.log('Fetching ' + name + '...');
      const src = await httpGet(url);
      const fps = extractFromZ2M(src, name);
      allZ2m.push(...fps);
      console.log('  -> ' + fps.length + ' fingerprints extracted');
    } catch (e) {
      console.log('  -> SKIP: ' + e.message);
    }
  }

  // 3. Deduplicate
  const z2mMfrs = new Map();
  const z2mPids = new Map();
  for (const fp of allZ2m) {
    if (fp.type === 'mfr' && !z2mMfrs.has(fp.value)) z2mMfrs.set(fp.value, fp.source);
    if (fp.type === 'pid' && !z2mPids.has(fp.value)) z2mPids.set(fp.value, fp.source);
  }
  console.log('\nZ2M total: ' + z2mMfrs.size + ' unique mfrs, ' + z2mPids.size + ' unique pids');

  // 4. Find missing
  const missingMfrs = [];
  for (const [v, src] of z2mMfrs) {
    if (!mfrs.has(v) && !mfrs.has(v.trim())) {
      missingMfrs.push({ value: v, source: src, suggestedDriver: inferDriver(v, '') });
    }
  }
  const missingPids = [];
  for (const [v, src] of z2mPids) {
    if (!pids.has(v)) {
      missingPids.push({ value: v, source: src, suggestedDriver: inferDriver('', v) });
    }
  }

  console.log('Missing: ' + missingMfrs.length + ' mfrs, ' + missingPids.length + ' pids\n');

  // 5. Build report
  const report = {
    timestamp: new Date().toISOString(),
    localStats: { manufacturerNames: mfrs.size, productIds: pids.size },
    z2mStats: { manufacturerNames: z2mMfrs.size, productIds: z2mPids.size },
    missingManufacturerNames: missingMfrs,
    missingProductIds: missingPids,
  };

  fs.writeFileSync(path.join(DATA_DIR, 'missing-fingerprints.json'), JSON.stringify(report, null, 2));

  // 6. Markdown summary
  let md = '# Z2M Fingerprint Sync Report\n\n';
  md += '**Date:** ' + report.timestamp + '\n\n';
  md += '| Metric | Local | Z2M | Missing |\n|---|---|---|---|\n';
  md += '| Manufacturer Names | ' + mfrs.size + ' | ' + z2mMfrs.size + ' | ' + missingMfrs.length + ' |\n';
  md += '| Product IDs | ' + pids.size + ' | ' + z2mPids.size + ' | ' + missingPids.length + ' |\n\n';

  if (missingMfrs.length > 0) {
    md += '## Missing Manufacturer Names\n\n| Value | Z2M Source | Suggested Driver |\n|---|---|---|\n';
    for (const m of missingMfrs.slice(0, 100)) {
      md += '| ' + m.value + ' | ' + m.source + ' | ' + m.suggestedDriver + ' |\n';
    }
    if (missingMfrs.length > 100) md += '\n*...and ' + (missingMfrs.length - 100) + ' more*\n';
    md += '\n';
  }

  if (missingPids.length > 0) {
    md += '## Missing Product IDs\n\n| Value | Z2M Source | Suggested Driver |\n|---|---|---|\n';
    for (const m of missingPids.slice(0, 100)) {
      md += '| ' + m.value + ' | ' + m.source + ' | ' + m.suggestedDriver + ' |\n';
    }
    if (missingPids.length > 100) md += '\n*...and ' + (missingPids.length - 100) + ' more*\n';
    md += '\n';
  }

  fs.writeFileSync(path.join(DATA_DIR, 'sync-report.md'), md);

  // Output summary path for GH Actions
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  }

  console.log('Report: ' + path.join(DATA_DIR, 'sync-report.md'));
  console.log('Data:   ' + path.join(DATA_DIR, 'missing-fingerprints.json'));

  // Return counts for CI exit code
  return { missingMfrs: missingMfrs.length, missingPids: missingPids.length };
}

main().catch(e => { console.error(e); process.exit(1); });
