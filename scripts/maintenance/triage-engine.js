#!/usr/bin/env node
'use strict';

const { CLUSTERS } = require('../../lib/constants/ZigbeeConstants.js');


/**
 * triage-engine.js - v2.0.0 "Universal Task Divider"
 * 
 * UNIVERSAL TRIAGE ENGINE (IA-LESS / CLOUD-LESS)
 * 
 * Automatically Triages:
 * 1. Missing SOS Buttons (clusters 1280/1281)
 * 2. Unmapped Smart Plugs
 * 3. Generic Zigbee devices that should be Tuya Hybrid.
 * 4. ARCHITECTURAL REGRESSIONS: Manager casing, Inheritance gaps.
 * 
 * Uses DeviceFingerprintDB.js for static rule-based classification.
 */

const fs = require('fs');
const path = require('path');
const { classifyDevice } = require('../../lib/tuya-local/DeviceFingerprintDB');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

async function main() {
  console.log('===  Universal Triage Engine (v2.0.0) ===');
  
  const results = {
    injections: 0,
    alerts: 0,
    regressions: 0
  };

  // 1. SCAN FORUM CACHE
  const autoAdd = process.argv.includes('--auto-add');
  const forumCache = path.join(ROOT, '.github/state/forum-intel.json');
  if (fs.existsSync(forumCache)) {
    console.log('--- [1/4] Forum Intelligence Triage ---');
    try {
      const intel = JSON.parse(fs.readFileSync(forumCache, 'utf8'));
      for (const item of intel.reports || []) {
        if (item.mfr && item.pid) {
          const result = classifyDevice(item.mfr, item.pid, item.clusters || []);
          if (result && result.confidence > 80) {
            console.log(`  [MATCH] ${item.mfr} -> ${result.driver} (${result.confidence}%)`);
            if (autoAdd) {
              const injected = await injectFingerprint(result.driver, item.mfr, item.pid);
              if (injected) results.injections++;
            }
          }
        }
      }
    } catch (e) {
      console.error('  [ERR] Failed to parse forum intel:', e.message);
    }
  }

  // 2. ARCHITECTURAL REGRESSION AUDIT (Deep Thinking v99)
  console.log('\n--- [2/4] Architectural Regression Audit ---');
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => fs.existsSync(path.join(DRIVERS_DIR, d, 'device.js')));
  
  for (const d of drivers) {
    try {
      const devicePath = path.join(DRIVERS_DIR, d, 'device.js');
      const code = fs.readFileSync(devicePath, 'utf8');

      // A. Manager Casing Regression (_tuyaEF00Manager vs tuyaEF00Manager)
      if (/_tuyaEF00Manager/.test(code) && !/BaseHybridDevice|TuyaEF00Manager/.test(d)) {
         console.warn(`  [REGRESSION] ${d}: Legacy _tuyaEF00Manager detected. Use tuyaEF00Manager (v7.0.21 standard).`);
         results.regressions++;
      }

      // B. Inheritance Audit
      const manifest = JSON.parse(fs.readFileSync(path.join(DRIVERS_DIR, d, 'driver.compose.json'), 'utf8'));
      const isTuya = (manifest.zigbee?.manufacturerName || []).some(m => m.startsWith('_T') || m.includes('Tuya'))      ;
      
      if (isTuya && !/BaseHybridDevice|HybridSensorBase|HybridSwitchBase|HybridPlugBase|HybridCoverBase|HybridThermostatBase|AutoAdaptiveDevice/.test(code)) {
        console.warn(`  [ALERT] ${d}: Tuya device missing Hybrid Base inheritance. Potential stability risk.`);
        results.alerts++;
      }

      // C. Flow Card Registration Safety
      if (/getTriggerCard|getActionCard|getConditionCard/.test(code) && !/try\s*\{/.test(code)) {
        console.warn(`  [SAFETY] ${d}: Flow card lookup outside try-catch found.`);
        results.alerts++;
      }

    } catch (e) {}
  }

  // 3. CLUSTER & CAPABILITY MISMATCH
  console.log('\n--- [3/4] Smart Cluster Triage ---');
  async function triageDriver(driverId) {
    const driverPath = path.join(ROOT, 'drivers', driverId);
    const manifestPath = path.join(driverPath, 'driver.compose.json');
    
    if (!fs.existsSync(manifestPath)) return;
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    // v7.0.22: ANTI-CONTAMINATION SHIELD
    // Categorize driver to apply protocol-specific rules
    const isZigbee = !!manifest.zigbee;
    const isWiFi = driverId.startsWith('wifi_');
    const protocolPrefix = isZigbee ? ' [Zigbee]' : (isWiFi ? ' [WiFi]' : ' [Other]')      ;

    console.log(`Triage ${protocolPrefix} ${driverId}...`);

    try {
      const endpoints = manifest.zigbee?.endpoints || {}       ;
      for (const epId in endpoints ) {
        const clusters = endpoints[epId].clusters || [];
        
        // SOS Button Check
        if ((clusters.includes(1280) || clusters.includes(1281)) && !driverId.includes('sos')) {
          console.warn(`  [MISMATCH] ${driverId}: Has SOS cluster (1280) but is NOT an SOS driver!`);
          results.alerts++;
        }

        // Radar/mWave Check
        if (clusters.includes(CLUSTERS.TUYA_EF00) && driverId.includes('motion') && !driverId.includes('radar')) {
           const mfrs = manifest.zigbee?.manufacturerName || []      ;
           if (mfrs.some(m => /_TZE20[04]/.test(m))) {
              console.log(`  [INFO] ${driverId}: Multi-gang radar detected in motion driver. Recommendation: Upgrade to HybridSensorBase.`);
           }
        }
      }
    } catch (e) {
      console.error(`  [ERR] Failed to triage ${driverId}: ${e.message}`);
    }
  }

  for (const d of drivers) {
    await triageDriver(d);
  }

  // 4. REPORT SUMMARY
  console.log('\n--- [4/4] Triage Summary ---');
  console.log(`  Injections:  ${results.injections}`);
  console.log(`  Alerts:      ${results.alerts}`);
  console.log(`  Regressions: ${results.regressions}`);
  console.log('=== Triage Complete ===');

  if (results.regressions > 0) process.exit(1); // Block PRs with regressions
}

/**
 *  Injects a fingerprint into a driver's manifest
 */
async function injectFingerprint(driverId, mfr, pid) {
  const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return false;

  try {
    const raw = fs.readFileSync(composePath, 'utf8');
    const compose = JSON.parse(raw);
    if (!compose.zigbee) compose.zigbee = {};
    if (!compose.zigbee.manufacturerName) compose.zigbee.manufacturerName = [];
    if (!compose.zigbee.productId) compose.zigbee.productId = [];

    const mset = new Set(compose.zigbee.manufacturerName.map(m => m.toLowerCase()));
    if (!mset.has(mfr.toLowerCase())) {
      compose.zigbee.manufacturerName.push(mfr);
      if (mfr !== mfr.toLowerCase()) {
        compose.zigbee.manufacturerName.push(mfr.toLowerCase());
      }
      if (pid && !compose.zigbee.productId.includes(pid)) {
        compose.zigbee.productId.push(pid);
      }
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2) + '\n');
      console.log(`   Injected FP ${mfr} into ${driverId}`);
      return true;
    }
  } catch (e) {
    console.error(`  [ERR] Failed to inject FP into ${driverId}:`, e.message);
  }
  return false;
}

main().catch(console.error);

