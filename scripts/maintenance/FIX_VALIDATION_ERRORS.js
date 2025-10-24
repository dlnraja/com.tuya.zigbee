#!/usr/bin/env node
'use strict';

const fs = require('fs').promises;
const path = require('path');

/**
 * FIX VALIDATION ERRORS
 * Corrige automatiquement les erreurs de validation Homey
 */

async function fixMissingAssetFiles() {
  console.log('🔧 FIXING VALIDATION ERRORS\n');
  
  const fixes = [];
  
  // Fix 1: temp_alarm.svg must be in /assets/ (used by app.json capability icon)
  const tempAlarmSource = path.join(__dirname, '../..', 'assets/templates/temp_alarm.svg');
  const tempAlarmTarget = path.join(__dirname, '../..', 'assets/temp_alarm.svg');
  
  try {
    await fs.access(tempAlarmTarget);
    console.log('  ✅ /assets/temp_alarm.svg exists');
  } catch (err) {
    try {
      await fs.copyFile(tempAlarmSource, tempAlarmTarget);
      fixes.push({
        file: 'temp_alarm.svg',
        action: 'Copied from templates/ to assets/',
        reason: 'Referenced in app.json capability icon'
      });
      console.log('  ✅ Fixed: Copied temp_alarm.svg from templates/');
    } catch (copyErr) {
      console.log('  ❌ Error: Could not copy temp_alarm.svg');
    }
  }
  
  // Check other potential issues
  const requiredAssets = [
    'assets/images/small.png',
    'assets/images/large.png',
    'assets/images/xlarge.png',
    'assets/icons/power-ac.svg',
    'assets/icons/power-battery.svg',
    'assets/icons/power-battery-low.svg',
    'assets/icons/placeholder.svg'
  ];
  
  console.log('\n📋 Checking required assets:\n');
  
  for (const asset of requiredAssets) {
    const assetPath = path.join(__dirname, '../..', asset);
    try {
      await fs.access(assetPath);
      console.log(`  ✅ ${asset}`);
    } catch (err) {
      console.log(`  ❌ ${asset} - MISSING`);
      fixes.push({
        file: asset,
        action: 'Missing',
        reason: 'Required for Homey validation'
      });
    }
  }
  
  // Generate report
  console.log('\n\n📊 FIX SUMMARY\n');
  console.log(`Total fixes applied: ${fixes.length}`);
  
  if (fixes.length > 0) {
    console.log('\nFixes:');
    fixes.forEach((fix, i) => {
      console.log(`${i + 1}. ${fix.file}`);
      console.log(`   Action: ${fix.action}`);
      console.log(`   Reason: ${fix.reason}\n`);
    });
  }
  
  const report = {
    timestamp: new Date().toISOString(),
    fixes_applied: fixes.length,
    details: fixes,
    validation_ready: fixes.filter(f => f.action !== 'Missing').length === fixes.length
  };
  
  const reportPath = path.join(__dirname, '../../reports/VALIDATION_FIXES.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 Report: ${reportPath}`);
  console.log('\n✅ Validation fixes complete!');
  console.log('🔍 Run validation again: homey app validate --level publish\n');
}

fixMissingAssetFiles().catch(console.error);
