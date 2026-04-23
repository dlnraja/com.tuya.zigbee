#!/usr/bin/env node
'use strict';

/**
 * signature-audit.js - v7.0.0
 * 
 * Pre-flight Check for Zigbee Signature Collisions AND Architectural Integrity.
 * Prevents "driver hijacking" and ensures SDK 3 compliance.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

function loadAllSignatures() {
  const signatures = [];
  const entries = fs.readdirSync(DRIVERS_DIR);

  for (const entry of entries) {
    const composePath = path.join(DRIVERS_DIR, entry, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;

    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      if (!compose.zigbee) continue;

      const mfrs = compose.zigbee.manufacturerName || [];
      const pids = compose.zigbee.productId || [];
      const deviceIds = compose.zigbee.deviceId || [null];
      
      // Expand all possible combinations for this driver
      for (const mfr of mfrs) {
        for (const pid of pids) {
          for (const devId of deviceIds) {
            signatures.push({
              driver: entry,
              mfr: mfr.toLowerCase(),
              pid: pid.toLowerCase(),
              devId: devId,
              rawMfr: mfr,
              rawPid: pid
            });
          }
        }
      }
    } catch (e) {
      console.warn(`[WARN] Failed to parse ${entry}: ${e.message}`);
    }
  }
  return signatures;
}

function audit() {
  console.log('===  Zigbee Signature Collision Audit ===\n');
  const signatures = loadAllSignatures();
  const index = {};
  const collisions = [];

  for (const sig of signatures) {
    const key = `${sig.mfr}|${sig.pid}|${sig.devId}`;
    if (index[key]) {
      // Collision detected!
      const first = index[key];
      if (first.driver !== sig.driver) {
        collisions.push({
          key,
          drivers: [first.driver, sig.driver],
          mfr: sig.rawMfr,
          pid: sig.rawPid,
          devId: sig.devId
        });
      }
    } else {
      index[key] = sig;
    }
  }

  // --- ARCHITECTURAL CHECKS ---
  const architecturalIssues = [];
  const entries = fs.readdirSync(DRIVERS_DIR);
  for (const entry of entries) {
    const devicePath = path.join(DRIVERS_DIR, entry, 'device.js');
    if (!fs.existsSync(devicePath)) continue;
    const code = fs.readFileSync(devicePath, 'utf8');

    // Rule 1: SDK3 Async Init
    if (code.includes('onNodeInit(') && !code.includes('async onNodeInit(')) {
       architecturalIssues.push(`[SDK3] ${entry}: onNodeInit should be async.`);
    }

    // Rule 2: Adaptive Lighting Readiness
    if (entry.includes('bulb') || entry.includes('light')) {
       const compose = JSON.parse(fs.readFileSync(path.join(DRIVERS_DIR, entry, 'driver.compose.json'), 'utf8'));
       if (compose.capabilities?.includes('dim' ) && !compose.capabilities?.includes('light_color_temp')) {
          architecturalIssues.push(`[ADAPTIVE] ${entry}: Dimmable light missing light_color_temp capability.`);
       }
    }
  }

  if (collisions.length > 0) {
    console.error(` Found ${collisions.length} Signature Collisions!\n`);
    for (const c of collisions) {
       console.error(`[COLLISION] Signature: Mfr=${c.mfr}, PID=${c.pid}, DeviceID=${c.devId || 'Any'}`);
       console.error(`            Claimed by: ${c.drivers.join(' AND ')}`);
    }
  }

  if (architecturalIssues.length > 0) {
    console.warn(`\n  Found ${architecturalIssues.length} Architectural Suggestions:\n`);
    for (const issue of architecturalIssues) console.warn(issue);
  }

  if (collisions.length > 0) process.exit(1);
  process.exit(0);
}

audit();
