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
  const forumCache = path.join(ROOT, '.github/state/forum-intel.json');
  if (fs.existsSync(forumCache)) {
    console.log('--- Forum Intelligence Triage ---');
    try {
      const intel = JSON.parse(fs.readFileSync(forumCache, 'utf8'));
      for (const item of intel.reports || []) {
        if (item.mfr && item.pid) {
          const result = classifyDevice(item.mfr, item.pid, item.clusters || []);
          if (result) {
            console.log(`  [MATCH] ${item.mfr} -> ${result.driver} (${result.confidence}%)`);
            // TODO: Auto-add to driver.compose.json if --auto-add is set
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
      const manifest = JSON.parse(fs.readFileSync(path.join(DRIVERS_DIR, d, 'driver.compose.json'), 'utf8'));
      const endpoints = manifest.zigbee?.endpoints || {};
      for (const epId in endpoints) {
        const clusters = endpoints[epId].clusters || [];
        if (clusters.includes(1280) && d !== 'button_emergency_sos') {
          console.warn(`  [ALERT] Driver ${d} has SOS cluster (1280) but is NOT the SOS driver! Potential misclassification.`);
        }
      }
    } catch (e) {}
  }

  console.log('\nDone.');
}

main().catch(console.error);
