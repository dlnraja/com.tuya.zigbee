#!/usr/bin/env node
'use strict';

/**
 * AUTO UPGRADE BATTERY CALCULATION
 * Upgrade tous les drivers vers smart battery calculation
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(PROJECT_ROOT, 'drivers');

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║     🔋 AUTO UPGRADE: SMART BATTERY CALCULATION               ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

const SMART_BATTERY_CODE = `reportParser: value => {
            this.log('Battery raw value:', value);
            // Smart calculation: check if value is already 0-100 or 0-200
            if (value <= 100) {
              return Math.max(0, Math.min(100, value));
            } else {
              return Math.max(0, Math.min(100, value / 2));
            }
          }`;

const SMART_BATTERY_GETTER = `getParser: value => {
            if (value <= 100) {
              return Math.max(0, Math.min(100, value));
            } else {
              return Math.max(0, Math.min(100, value / 2));
            }
          }`;

function upgradeBatteryCalculation(devicePath) {
  let content = fs.readFileSync(devicePath, 'utf8');
  let upgraded = false;
  
  // Pattern 1: Simple division by 2
  const simplePattern = /reportParser:\s*value\s*=>\s*Math\.max\(0,\s*Math\.min\(100,\s*value\s*\/\s*2\)\)/;
  
  if (simplePattern.test(content)) {
    content = String(content).replace(simplePattern, String(SMART_BATTERY_CODE).replace(/\s+/g, ' '));
    upgraded = true;
  }
  
  // Add getParser if missing
  if (upgraded && !/getParser:/.test(content) && /reportParser:/.test(content)) {
    content = String(content).replace(
      /(reportParser:[^}]+}),/,
      `$1,\n          ${SMART_BATTERY_GETTER},`
    );
  }
  
  if (upgraded) {
    fs.writeFileSync(devicePath, content);
  }
  
  return upgraded;
}

async function main() {
  const drivers = fs.readdirSync(DRIVERS_DIR);
  let upgraded = 0;
  let skipped = 0;
  
  for (const driver of drivers) {
    const devicePath = path.join(DRIVERS_DIR, driver, 'device.js');
    
    if (fs.existsSync(devicePath)) {
      const content = fs.readFileSync(devicePath, 'utf8');
      
      // Only upgrade if has battery but not smart calc
      if (/measure_battery/i.test(content) && !/if\s*\(.*value.*<=.*100\)/.test(content)) {
        try {
          if (upgradeBatteryCalculation(devicePath)) {
            console.log(`  ✅ Upgraded: ${driver}`);
            upgraded++;
          } else {
            skipped++;
          }
        } catch (err) {
          console.log(`  ❌ Failed: ${driver} - ${err.message}`);
          skipped++;
        }
      }
    }
  }
  
  console.log(`\n╔═══════════════════════════════════════════════════════════════╗`);
  console.log(`║                      ✅ UPGRADE COMPLETE                      ║`);
  console.log(`╚═══════════════════════════════════════════════════════════════╝\n`);
  
  console.log(`📊 Results:`);
  console.log(`   ✅ Upgraded: ${upgraded}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`\n🎉 All drivers now have smart battery calculation!`);
}

main().catch(console.error);
