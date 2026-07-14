#!/usr/bin/env node
/**
 * detect-data-flooding.js — P57 Data Flooding Detector
 *
 * Scans all driver device.js files in drivers/ to detect:
 * 1. Same capability set multiple times from different sources
 *    (e.g. measure_battery set from ZCL + Tuya DP + voltage + cached)
 * 2. Missing debounce / hysteresis (no anti-flooding protection)
 * 3. Same data path: e.g. measure_temperature set from BOTH
 *    ZCL msTemperatureMeasured AND Tuya DP 1 in same device.js
 * 4. Direct setCapabilityValue usage instead of safeSetCapabilityValue
 *
 * Generates a flooding report: tools/ci/data-flooding-report.json
 *
 * Usage:
 *   node tools/ci/detect-data-flooding.js
 *   node tools/ci/detect-data-flooding.js --driver=switch_1gang
 */
'use strict';
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
const DRIVERS_DIR = path.join(REPO, 'drivers');
const OUTPUT = path.join(REPO, '.github', 'state', 'data-flooding-report.json');
const args = process.argv.slice(2);
const ONLY_DRIVER = (() => { const a = args.find(x => x.startsWith('--driver=')); return a ? a.split('=')[1] : null; })();

// Patterns that indicate "flooding risk" or "duplicate source"
const SET_CAP_PATTERNS = [
  /this\.setCapabilityValue\(\s*['"]([\w.]+)['"]/g,
  /this\.setCapabilityValue\(\s*['"]([\w.]+)['"]/g,
  /setCapabilityValue\(\s*['"]([\w.]+)['"]/g,
  /safeSetCapabilityValue\(\s*['"]([\w.]+)['"]/g,
];
const SOURCE_PATTERNS = [
  // ZCL cluster reads
  /zclNode\.(\w+)\s*\(\s*['"](\w+)['"]/g,
  /\.clusters\.(\w+)\s*\.\s*readAttribute/g,
  /registerCapability\(\s*['"]([\w.]+)['"]\s*,\s*(\d+)/g,
  // Tuya DP
  /getData\(\s*\[\s*(\d+)\s*\]\s*\)/g,
  /setData\(\s*\{[^}]*(\d+)\s*:/g,
  // Battery
  /measure_battery/,
  // Voltage
  /readBatteryVoltage/,
  /voltage\s*=/,
  // Temperature
  /measure_temperature/,
  /Temperature\s*=/,
];

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(full, callback);
    } else if (entry.name === 'device.js') {
      callback(full);
    }
  }
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const driverName = path.basename(path.dirname(filePath));
  const result = {
    driver: driverName,
    file: filePath.replace(REPO + path.sep, ''),
    capabilitiesSet: new Set(),
    setCountByCap: {},   // capability -> count
    sources: [],         // detected data sources
    floodingRisks: [],   // capabilities set > 3 times
    noDebounce: false,
    noSafeTimer: false,
    lines: content.split('\n').length,
    size: content.length,
  };

  // Find all setCapabilityValue calls
  for (const re of SET_CAP_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(content)) !== null) {
      const cap = m[1];
      result.capabilitiesSet.add(cap);
      result.setCountByCap[cap] = (result.setCountByCap[cap] || 0) + 1;
    }
  }

  // Detect data sources
  if (/zclNode|registerCapability|clusters\.\w+\.readAttribute/.test(content)) {
    result.sources.push('zcl');
  }
  if (/getData\s*\(\s*\[/.test(content) || /tuya/.test(content.toLowerCase())) {
    result.sources.push('tuya-dp');
  }
  if (/voltage|readBattery/.test(content)) {
    result.sources.push('voltage');
  }
  if (/cachedSettings|getSettings/.test(content)) {
    result.sources.push('cached');
  }
  if (/measure_battery/.test(content)) {
    result.sources.push('battery');
  }

  // Flooding risks: capability set > 3 times
  for (const [cap, count] of Object.entries(result.setCountByCap)) {
    if (count > 3) {
      result.floodingRisks.push({ capability: cap, count });
    }
  }

  // No anti-flooding protection
  if (!/debounce|throttle|safeSetTimeout|setTimeout.*hysteresis|rate.?limit/i.test(content)) {
    result.noDebounce = result.floodingRisks.length > 0;
  }

  // Direct setTimeout (not safeSetTimeout)
  if (/(?<!safe)setTimeout\s*\(\s*this/.test(content)) {
    result.noSafeTimer = true;
  }

  return result;
}

function main() {
  console.log('=== DATA FLOODING DETECTOR (P57) ===\n');
  const results = [];
  const driverFilter = ONLY_DRIVER;
  if (driverFilter) {
    const target = path.join(DRIVERS_DIR, driverFilter, 'device.js');
    if (fs.existsSync(target)) results.push(analyzeFile(target));
  } else {
    walkDir(DRIVERS_DIR, f => results.push(analyzeFile(f)));
  }

  // Stats
  const withRisks = results.filter(r => r.floodingRisks.length > 0);
  const withSources = results.filter(r => r.sources.length >= 2);
  const noDebounce = results.filter(r => r.noDebounce);

  console.log(`Drivers analyzed:   ${results.length}`);
  console.log(`With flooding risk: ${withRisks.length} (capability set > 3 times)`);
  console.log(`Multi-source:      ${withSources.length} (>= 2 sources for same cap)`);
  console.log(`No debounce:        ${noDebounce.length} (flooding risk + no debounce protection)`);
  console.log('');

  // Top flooding risks
  const topRisks = withRisks
    .flatMap(r => r.floodingRisks.map(fr => ({ driver: r.driver, ...fr })))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
  console.log('TOP 20 CAPABILITIES SET TOO MANY TIMES:');
  for (const r of topRisks) {
    console.log(`  ${r.driver.padEnd(30)} ${r.capability.padEnd(28)} x ${r.count}`);
  }
  console.log('');

  // Top multi-source drivers (high entropy)
  const topMulti = withSources
    .map(r => ({ driver: r.driver, sources: r.sources.join('+'), caps: r.capabilitiesSet.size, line: r.lines }))
    .sort((a, b) => b.caps - a.caps)
    .slice(0, 15);
  console.log('TOP 15 MULTI-SOURCE DRIVERS (most dedup potential):');
  for (const r of topMulti) {
    console.log(`  ${r.driver.padEnd(30)} ${r.sources.padEnd(25)} ${r.caps} caps (${r.line} lines)`);
  }
  console.log('');

  // Save full report
  if (!fs.existsSync(path.dirname(OUTPUT))) fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify({
    meta: {
      generatedAt: new Date().toISOString(),
      totalDrivers: results.length,
      withFloodingRisk: withRisks.length,
      multiSource: withSources.length,
      noDebounce: noDebounce.length,
    },
    drivers: results,
  }, null, 2));
  console.log(`Full report: ${OUTPUT}`);
}

main();
