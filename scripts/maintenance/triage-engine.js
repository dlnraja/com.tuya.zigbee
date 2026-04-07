#!/usr/bin/env node
'use strict';

/**
 * triage-engine.js - v1.0.0
 * 
 * UNIVERSAL TRIAGE ENGINE (IA-LESS / CLOUD-LESS)
 * 
 * Automatically Triages:
 * 1. Missing SOS Buttons (clusters 1280/1281)
 * 2. Unmapped Smart Plugs
 * 3. Generic Zigbee devices that should be Tuya Hybrid.
 * 
 * Uses DeviceFingerprintDB.js for static rule-based classification.
 */

const fs = require('fs');
const path = require('path');
const { classifyDevice } = require('../../lib/tuya-local/DeviceFingerprintDB');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

async function main() {
  console.log('=== 🕵️ Universal Triage Engine (v1.0.0) ===');
  
  // 1. SCAN FORUM CACHE (If available)
  const autoAdd = process.argv.includes('--auto-add');
  const forumCache = path.join(ROOT, '.github/state/forum-intel.json');
  if (fs.existsSync(forumCache)) {
    console.log('--- Forum Intelligence Triage ---');
    try {
      const intel = JSON.parse(fs.readFileSync(forumCache, 'utf8'));
      for (const item of intel.reports || []) {
        if (item.mfr && item.pid) {
          const result = classifyDevice(item.mfr, item.pid, item.clusters || []);
          if (result && result.confidence > 80) {
            console.log(`  [MATCH] ${item.mfr} -> ${result.driver} (${result.confidence}%)`);
            if (autoAdd) {
              await injectFingerprint(result.driver, item.mfr, item.pid);
            }
          }
        }
      }
    } catch (e) {
      console.error('  [ERR] Failed to parse forum intel:', e.message);
    }
  }

  // 2. SOS SPECIAL RECOVERY (Cluster-based scanning)
  console.log('\n--- Smart Cluster Triage ---');
  // Scan all drivers to see if any generic ones have SOS clusters
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => fs.existsSync(path.join(DRIVERS_DIR, d, 'driver.compose.json')));
  for (const d of drivers) {
    try {
      const manifestPath = path.join(DRIVERS_DIR, d, 'driver.compose.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const endpoints = manifest.zigbee?.endpoints || {};
      for (const epId in endpoints) {
        const clusters = endpoints[epId].clusters || [];
        if (clusters.includes(1280) && d !== 'button_emergency_sos') {
          console.warn(`  [ALERT] Driver ${d} has SOS cluster (1280) but is NOT the SOS driver! Potential misclassification.`);
        }
      }
      
      // v5.13.2: Multi-gang variant detection logic
      const mfrs = manifest.zigbee?.manufacturerName || [];
      if (mfrs.some(m => /_TZE20[04]/.test(m)) && d.includes('switch_1gang')) {
        console.warn(`  [ALERT] Driver ${d} contains Tuya Multi-endpoint IDs but is a 1-gang driver. Audit needed.`);
      }

    } catch (e) {}
  }

  console.log('\nDone.');
}

/**
 * 💉 Injects a fingerprint into a driver's manifest
 */
async function injectFingerprint(driverId, mfr, pid) {
  const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return;

  try {
    const raw = fs.readFileSync(composePath, 'utf8');
    const compose = JSON.parse(raw);
    if (!compose.zigbee) compose.zigbee = {};
    if (!compose.zigbee.manufacturerName) compose.zigbee.manufacturerName = [];
    if (!compose.zigbee.productId) compose.zigbee.productId = [];

    // Case-insensitive check
    const mset = new Set(compose.zigbee.manufacturerName.map(m => m.toLowerCase()));
    if (!mset.has(mfr.toLowerCase())) {
      compose.zigbee.manufacturerName.push(mfr);
      // v5.13.2: Rule F5 Lowercase Injection
      if (mfr !== mfr.toLowerCase()) {
        compose.zigbee.manufacturerName.push(mfr.toLowerCase());
      }
      console.log(`  💉 Injected FP ${mfr} into ${driverId}`);
      
      if (pid && !compose.zigbee.productId.includes(pid)) {
        compose.zigbee.productId.push(pid);
      }
      
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2) + '\n');
    }
  } catch (e) {
    console.error(`  [ERR] Failed to inject FP into ${driverId}:`, e.message);
  }
}

main().catch(console.error);
