#!/usr/bin/env node
/**
 * p89-real-mfr-dupes.js — P89
 * Find real (non-synthetic) mfr duplicates in driver.compose.json.
 * Synthetic mfrs like _hybrid_X_needs_device_assignment, _generic_X_placeholder
 * are bot placeholders, not real mfrs.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SYNTHETIC_RE = /_hybrid_|_generic_|_master_|_needs_device_assignment|_placeholder|catchall/i;

function isSynthetic(m) {
  return SYNTHETIC_RE.test(m);
}

function main() {
  const driverFiles = cp.execSync(
    `powershell -NoProfile -Command "Get-ChildItem -Path '${path.join(ROOT, 'drivers')}' -Recurse -File -Filter 'driver.compose.json' | Select-Object -ExpandProperty FullName"`,
    { encoding: 'utf8' }
  ).split(/\r?\n/).filter(Boolean);
  const findings = [];
  for (const f of driverFiles) {
    try {
      const j = JSON.parse(fs.readFileSync(f, 'utf8'));
      const mfrs = (j.zigbee && j.zigbee.manufacturerName) || [];
      const map = new Map();
      for (const m of mfrs) {
        if (isSynthetic(m)) continue;
        const lower = m.toLowerCase();
        if (map.has(lower)) {
          findings.push({ driver: f.replace(/\\/g, '/').split('drivers/')[1], type: 'real-mfr-dup', first: map.get(lower), second: m });
        } else {
          map.set(lower, m);
        }
      }
    } catch (e) {}
  }
  console.log(`Found ${findings.length} real (non-synthetic) mfr duplicates in driver.compose.json`);
  for (const f of findings.slice(0, 30)) {
    console.log(`  ${f.driver}: ${f.first} <==> ${f.second}`);
  }
}

main();
