#!/usr/bin/env node
'use strict';
/**
 * enforce-fingerprint-rules.js
 * 
 * Enforces NO-AI strict rules from CRITICAL_MISTAKES.md / DEVELOPMENT_RULES.md:
 * 1. F5: Case-insensitive manufacturerName (auto-injects lowercase versions of _TZ and _TY)
 * 2. F6: Scans and completely removes any wildcards '*' in fingerprints (SDK v3 crashes on them)
 * 3. Removes leading/trailing spaces in arrays that could break Homey SDK matching.
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', '..', 'drivers');

function enforceRules() {
  console.log('=== Enforcing Fingerprint Hygiene Rules (NO-AI) ===\n');

  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory());
  let modifiedCount = 0;
  let wildcardCount = 0;
  let caseCount = 0;

  for (const driver of drivers) {
    const composeFile = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
    if (!fs.existsSync(composeFile)) continue;

    try {
      const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
      if (!compose.zigbee) continue;

      let changed = false;

      // Ensure lists are clean arrays
      let mfrs = compose.zigbee.manufacturerName || [];
      let pids = compose.zigbee.productId || [];

      // 1. Remove ANY wildcard entries (Rule F6)
      const oldMfrsCount = mfrs.length;
      mfrs = mfrs.filter(m => !m.includes('*'));
      if (mfrs.length < oldMfrsCount) {
        console.log(`[${driver}]  Removed wildcard from manufacturerName`);
        wildcardCount += (oldMfrsCount - mfrs.length);
        changed = true;
      }

      const oldPidsCount = pids.length;
      pids = pids.filter(p => !p.includes('*'));
      if (pids.length < oldPidsCount) {
        console.log(`[${driver}]  Removed wildcard from productId`);
        wildcardCount += (oldPidsCount - pids.length);
        changed = true;
      }

      // 2. Clean spaces
      mfrs = mfrs.map(m => m.trim());
      pids = pids.map(p => p.trim());

      // 3. Auto-inject lowercase variants for _TZ / _TY (Rule F5)
      // Because Homey SDK v3 routing is explicitly case-sensitive, but Tuya devices
      // notoriously broadcast lowercase or uppercase depending on their firmware day.
      const newMfrs = new Set(mfrs);
      for (const mfr of mfrs) {
        if ((mfr.startsWith('_TZ') || mfr.startsWith('_TY')) && mfr !== mfr.toLowerCase()) {
          if (!newMfrs.has(mfr.toLowerCase())) {
            newMfrs.add(mfr.toLowerCase());
            caseCount++;
            changed = true;
            // console.log(`[${driver}] injected lowercase variant: ${mfr.toLowerCase()}`);
          }
        }
      }

      if (changed) {
        compose.zigbee.manufacturerName = Array.from(newMfrs);
        compose.zigbee.productId = pids;
        fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2) + '\n');
        modifiedCount++;
      }

    } catch (e) {
      console.error(`[${driver}] JSON Error: ${e.message}`);
    }
  }

  console.log(`\n Enforcement summary:`);
  console.log(` - Drivers modified: ${modifiedCount}`);
  console.log(` - Wildcards removed: ${wildcardCount}`);
  console.log(` - Lowercase variants injected: ${caseCount}\n`);
}

enforceRules();
