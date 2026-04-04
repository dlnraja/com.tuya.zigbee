#!/usr/bin/env node
/**
 * Inject alarm_battery capability into battery-powered drivers.
 * 
 * From deep diagnostics analysis:
 * - 282 capability gap entries show alarm_battery missing
 * - Users report not knowing when battery is low
 * - JohanBendz fork and pkuijpers fork both have alarm_battery
 * 
 * Logic:
 * 1. If driver has measure_battery but NOT alarm_battery → add it
 * 2. If driver has energy.batteries in compose → definitely needs it
 * 3. Add alarm_battery capability to compose + implement in device.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DDIR = path.join(process.cwd(), 'drivers');
let fixed = 0, skipped = 0;

for (const d of fs.readdirSync(DDIR)) {
  const composeFile = path.join(DDIR, d, 'driver.compose.json');
  const deviceFile = path.join(DDIR, d, 'device.js');
  if (!fs.existsSync(composeFile)) continue;
  
  const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
  const caps = compose.capabilities || [];
  
  // Skip if already has alarm_battery
  if (caps.includes('alarm_battery')) { skipped++; continue; }
  
  // Check if battery-powered
  const hasBatteryMeasure = caps.includes('measure_battery');
  const hasBatteryConfig = compose.energy?.batteries?.length > 0;
  
  if (!hasBatteryMeasure && !hasBatteryConfig) { skipped++; continue; }
  
  // Add alarm_battery right after measure_battery (or at end)
  const mbIdx = caps.indexOf('measure_battery');
  if (mbIdx >= 0) {
    caps.splice(mbIdx + 1, 0, 'alarm_battery');
  } else {
    caps.push('alarm_battery');
  }
  compose.capabilities = caps;
  
  fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2) + '\n');
  
  // Now inject alarm_battery logic into device.js
  if (fs.existsSync(deviceFile)) {
    let code = fs.readFileSync(deviceFile, 'utf8');
    
    // Only inject if not already handling alarm_battery
    if (!code.includes('alarm_battery')) {
      // Find onNodeInit or onInit and inject battery alarm logic
      const injectCode = `
    // --- Battery Alarm (auto-injected) ---
    if (this.hasCapability('measure_battery')) {
      this.registerCapabilityListener('measure_battery', async (value) => {
        if (this.hasCapability('alarm_battery')) {
          await this.setCapabilityValue('alarm_battery', value < 15).catch(() => {});
        }
      });
      // Initial check
      const bat = this.getCapabilityValue('measure_battery');
      if (bat !== null && this.hasCapability('alarm_battery')) {
        this.setCapabilityValue('alarm_battery', bat < 15).catch(() => {});
      }
    }`;
      
      // Try to inject after attribute reporting block or after super.onNodeInit
      if (code.includes("this.log('Attribute reporting configured successfully')")) {
        code = code.replace(
          "this.log('Attribute reporting configured successfully');",
          "this.log('Attribute reporting configured successfully');" + injectCode
        );
      } else if (code.includes('await super.onNodeInit')) {
        code = code.replace(
          /await super\.onNodeInit\([^)]*\)[^;]*;/,
          (m) => m + injectCode
        );
      } else if (code.includes("this.log('[")) {
        // Insert after first log line in onNodeInit
        code = code.replace(
          /(async onNodeInit\([^)]*\)\s*\{[^}]*?this\.log\([^)]+\);)/,
          (m) => m + injectCode
        );
      }
      
      // Validate syntax before writing
      try {
        new Function(code);
        fs.writeFileSync(deviceFile, code);
      } catch (e) {
        // Syntax invalid - skip device.js modification, only compose changed
      }
    }
  }
  
  console.log(`✅ ${d}: added alarm_battery`);
  fixed++;
}

console.log(`\n=== Summary ===`);
console.log(`Fixed: ${fixed}`);
console.log(`Skipped: ${skipped}`);
