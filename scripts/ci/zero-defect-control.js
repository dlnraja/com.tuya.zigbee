#!/usr/bin/env node
/**
 * 🛡️ zero-defect-control.js - v1.0.0
 * 
 * High-performance quality guard checking:
 *  - 100% correct super.onNodeInit lifecycle invocation.
 *  - 0% occurrences of deprecated getDeviceTriggerCard.
 *  - 100% fingerprint compliance (No wildcards in manufacturerName).
 *  - 100% battery rule enforcement (No dual alarm_battery + measure_battery in compose).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

let errors = 0;
let filesChecked = 0;

function log(msg) { console.log(`[ZERO-DEFECT-CONTROL] ${msg}`); }
function error(msg) { console.error(`[ZERO-DEFECT-CONTROL] ❌ ERROR: ${msg}`); errors++; }
function warn(msg) { console.warn(`[ZERO-DEFECT-CONTROL] ⚠️ WARNING: ${msg}`); }

if (!fs.existsSync(DRIVERS_DIR)) {
  error('Drivers folder not found.');
  process.exit(1);
}

const entries = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true });

for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  
  const driverId = entry.name;
  const driverPath = path.join(DRIVERS_DIR, driverId);
  const deviceJsPath = path.join(driverPath, 'device.js');
  const composeJsonPath = path.join(driverPath, 'driver.compose.json');

  // 1. Audit device.js
  if (fs.existsSync(deviceJsPath)) {
    filesChecked++;
    try {
      const content = fs.readFileSync(deviceJsPath, 'utf8');
      
      // Check if onNodeInit is overridden but super.onNodeInit is missing
      if (content.includes('onNodeInit(') || content.includes('onNodeInit (')) {
        if (!content.includes('super.onNodeInit') && !content.includes('super.onNodeInit(')) {
          error(`Driver '${driverId}' has onNodeInit() but lacks super.onNodeInit() invocation!`);
        }
      }

      // Check for deprecated getDeviceTriggerCard calls
      if (content.includes('getDeviceTriggerCard')) {
        error(`Driver '${driverId}' uses deprecated getDeviceTriggerCard()! Must use getTriggerCard() instead.`);
      }
    } catch (e) {
      error(`Failed to read ${deviceJsPath}: ${e.message}`);
    }
  }

  // 2. Audit driver.compose.json
  if (fs.existsSync(composeJsonPath)) {
    filesChecked++;
    try {
      const compose = JSON.parse(fs.readFileSync(composeJsonPath, 'utf8'));

      // Check battery capabilities
      if (compose.capabilities) {
        const hasMeasureBattery = compose.capabilities.includes('measure_battery');
        const hasAlarmBattery = compose.capabilities.includes('alarm_battery');
        if (hasMeasureBattery && hasAlarmBattery) {
          error(`Driver '${driverId}' has both 'measure_battery' and 'alarm_battery' capabilities! (SDK3 Rule Conflict)`);
        }
      }

      // Check fingerprints for wildcards
      if (compose.fingerprint) {
        for (const fp of compose.fingerprint) {
          if (fp.manufacturerName && fp.manufacturerName.includes('*')) {
            error(`Driver '${driverId}' fingerprint contains wildcard '*' in manufacturerName: ${fp.manufacturerName}`);
          }
          if (fp.productId && fp.productId.includes('*')) {
            error(`Driver '${driverId}' fingerprint contains wildcard '*' in productId: ${fp.productId}`);
          }
        }
      }
    } catch (e) {
      error(`Failed to parse ${composeJsonPath}: ${e.message}`);
    }
  }
}

log('====================================================');
log(`Audit completed. Checked ${filesChecked} driver resource files.`);
if (errors > 0) {
  log(`FAILED: Found ${errors} alignment / validation violation(s).`);
  process.exit(1);
} else {
  log('PASSED: 100% Zero-Defect compliance across all drivers.');
  process.exit(0);
}
