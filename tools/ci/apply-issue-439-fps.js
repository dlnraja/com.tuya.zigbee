// apply-issue-439-fps.js — P53
// Apply the 678 missing FPs from issue #439 to generic_tuya driver.
// Issue body: github.com/dlnraja/com.tuya.zigbee/issues/439
//
// Run: node tools/ci/apply-issue-439-fps.js
// Apply: node tools/ci/apply-issue-439-fps.js --apply
//
// What it does:
// 1. Extracts all _TZ* FPs from issue 439 body
// 2. Cross-references with all current drivers
// 3. Adds only the missing ones to generic_tuya/driver.compose.json
// 4. Preserves existing structure (sorts alphabetically)
//
// Safety:
// - All Tuya FPs go to generic_tuya (the standard pattern)
// - Driver-level FPs (specific to a non-generic driver) are NOT touched
//   (we only add FPs that aren't already in ANY driver)
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const GENERIC_TUYA = path.join(DRIVERS_DIR, 'generic_tuya', 'driver.compose.json');

// Issue 439 body (extracted FPs only — not the whole issue text)
const ISSUE_439_BODY = fs.readFileSync(path.join(ROOT, '.github', 'state', 'issue-439-fps.json'), 'utf8');

function extractFps(text) {
  const m = text.match(/_T[YZ][A-Z0-9]{0,4}_[a-zA-Z0-9_]+/g) || [];
  return [...new Set(m)];
}

function getAllDriverFps() {
  const mfrs = new Set();
  const fpToDrivers = new Map();
  for (const d of fs.readdirSync(DRIVERS_DIR)) {
    const cf = path.join(DRIVERS_DIR, d, 'driver.compose.json');
    if (!fs.existsSync(cf)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(cf));
      for (const m of (data.zigbee?.manufacturerName || [])) {
        mfrs.add(m);
        if (!fpToDrivers.has(m)) fpToDrivers.set(m, []);
        fpToDrivers.get(m).push(d);
      }
    } catch {}
  }
  return { mfrs, fpToDrivers };
}

function main() {
  const APPLY = process.argv.includes('--apply');
  console.log('=== P53 — Apply missing FPs from issue #439 to generic_tuya ===');

  // Try multiple sources for the FPs
  let fps = [];
  try {
    fps = extractFps(ISSUE_439_BODY);
  } catch (e) {
    console.log('No issue-439-fps.json — falling back to fetching...');
  }

  if (fps.length === 0) {
    // Fallback: hardcoded list (from previous run)
    console.log('Using embedded FP list from issue 439...');
    fps = require('./issue-439-fps-embedded.json');
  }

  console.log('Total FPs in issue 439:', fps.length);

  const { mfrs, fpToDrivers } = getAllDriverFps();
  const missing = fps.filter(fp => !mfrs.has(fp));
  console.log('Missing FPs (not in any driver):', missing.length);

  // Verify all are Tuya-style
  const nonTuya = missing.filter(fp => !fp.match(/^_T[YZ][A-Z0-9]+_/));
  if (nonTuya.length > 0) {
    console.log('  WARN: Non-Tuya FPs found (will skip):', nonTuya);
  }
  const tuyaFps = missing.filter(fp => fp.match(/^_T[YZ][A-Z0-9]+_/));

  console.log('Tuya FPs to add to generic_tuya:', tuyaFps.length);
  console.log('\nSample first 10:');
  for (const fp of tuyaFps.slice(0, 10)) console.log('  +', fp);

  if (!APPLY) {
    console.log('\n=== PREVIEW MODE ===');
    console.log('Run with --apply to update generic_tuya/driver.compose.json');
    return;
  }

  // Apply
  const data = JSON.parse(fs.readFileSync(GENERIC_TUYA));
  const existing = new Set(data.zigbee.manufacturerName);
  let added = 0;
  for (const fp of tuyaFps) {
    if (existing.has(fp)) continue;
    data.zigbee.manufacturerName.push(fp);
    existing.add(fp);
    added++;
  }

  // Sort alphabetically (preserves consistent ordering)
  data.zigbee.manufacturerName.sort();

  fs.writeFileSync(GENERIC_TUYA, JSON.stringify(data, null, 2) + '\n');
  console.log(`\n✓ Added ${added} FPs to generic_tuya`);
  console.log(`  Before: ${data.zigbee.manufacturerName.length - added} FPs`);
  console.log(`  After:  ${data.zigbee.manufacturerName.length} FPs`);
}

main();
