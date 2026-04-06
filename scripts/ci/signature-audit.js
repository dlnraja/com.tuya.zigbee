#!/usr/bin/env node
'use strict';

/**
 * signature-audit.js - v6.3.0
 * 
 * Pre-flight Check for Zigbee Signature Collisions.
 * Prevents "driver hijacking" where multiple drivers claim the same signature.
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
  console.log('=== 🛡️ Zigbee Signature Collision Audit ===\n');
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

  if (collisions.length === 0) {
    console.log('✅ No signature collisions detected. Driver selection is unambiguous.');
    process.exit(0);
  }

  console.error(`❌ Found ${collisions.length} Signature Collisions!\n`);
  for (const c of collisions) {
    console.error(`[COLLISION] Signature: Mfr=${c.mfr}, PID=${c.pid}, DeviceID=${c.devId || 'Any'}`);
    console.error(`            Claimed by: ${c.drivers.join(' AND ')}`);
    console.error('            Action: Differentiate these drivers using deviceId, endpoints, or clusters.\n');
  }

  process.exit(1);
}

audit();
