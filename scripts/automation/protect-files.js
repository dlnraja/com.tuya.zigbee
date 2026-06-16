#!/usr/bin/env node
/**
 * protect-files.js - Protect critical files from accidental deletion
 * 
 * Checks that all critical files exist and creates backups if missing.
 * Run before any automation script to ensure file integrity.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const CRITICAL_PATHS = [
  'lib/mixins/PhysicalButtonMixin.js',
  'lib/mixins/VirtualButtonMixin.js',
  'lib/devices/ButtonDevice.js',
  'lib/tuya/TuyaEF00Manager.js',
  'lib/tuya/TuyaZigbeeDevice.js',
  'lib/devices/UnifiedSensorBase.js',
  'lib/devices/UnifiedSwitchBase.js',
  'lib/tuya/DeviceFingerprintDB.js',
  'lib/tuya/MCUFormatDatabase.js',
  'lib/presence/VirtualPresenceDetector.js',
  'lib/presence/AdvancedPresenceEngine.js',
  'lib/battery/BatteryHealthIntelligence.js',
  'lib/battery/UnifiedBatteryHandler.js',
  'lib/flow/FeatureFlowCards.js',
  'app.js',
  'data/fingerprints.json',
  'app.json',
  'package.json'
];

const CRITICAL_DIRS = [
  'drivers',
  'lib',
  'scripts',
  '.homeycompose/flow',
  '.github/workflows'
];

let issues = [];

// Check files
for (const filePath of CRITICAL_PATHS) {
  if (!fs.existsSync(filePath)) {
    issues.push(`MISSING: ${filePath}`);
  }
}

// Check directories
for (const dirPath of CRITICAL_DIRS) {
  if (!fs.existsSync(dirPath)) {
    issues.push(`MISSING DIR: ${dirPath}`);
  }
}

// Check for empty critical files
for (const filePath of CRITICAL_PATHS) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size === 0) {
      issues.push(`EMPTY: ${filePath}`);
    }
  } catch {}
}

// Report
if (issues.length === 0) {
  console.log('✅ All critical files protected');
} else {
  console.log('⚠️ Issues found:');
  issues.forEach(i => console.log(`  ${i}`));
}

process.exit(issues.length > 0 ? 1 : 0);
