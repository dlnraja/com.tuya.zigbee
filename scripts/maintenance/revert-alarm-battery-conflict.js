#!/usr/bin/env node
/**
 * REVERT alarm_battery from drivers that also have measure_battery.
 * 
 * SDK v3 RULE: Never use both measure_battery AND alarm_battery on same device.
 * - measure_battery = precise numeric 0-100%
 * - alarm_battery = boolean low-battery alarm only
 * If device reports %, use measure_battery ONLY.
 * 
 * Also revert alarm_battery from:
 * - WiFi drivers (no Zigbee battery reporting)
 * - Mains-powered devices (bulbs, LED strips, plugs, switches that don't have batteries)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DDIR = path.join(process.cwd(), 'drivers');
let reverted = 0, kept = 0;

// Mains-powered categories that should NEVER have alarm_battery
const MAINS_PATTERNS = [
  /^bulb_/, /^led_/, /^plug_/, /^switch_\d/, /^switch_plug/,
  /^dimmer_/, /^din_rail/, /^power_/, /^energy_meter/,
  /^smart_breaker/, /^smart_rcbo/, /^module_/, /^shutter_/,
  /^ceiling_fan/, /^curtain_/, /^hvac_/, /^usb_/, 
  /^gateway_/, /^zigbee_repeater/,
  // WiFi drivers
  /^wifi_/, /^ir_blaster/, /^ir_remote/
];

for (const d of fs.readdirSync(DDIR)) {
  const composeFile = path.join(DDIR, d, 'driver.compose.json');
  if (!fs.existsSync(composeFile)) continue;
  
  const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
  const caps = compose.capabilities || [];
  
  if (!caps.includes('alarm_battery')) continue;
  
  const hasMeasureBattery = caps.includes('measure_battery');
  const isMains = MAINS_PATTERNS.some(p => p.test(d));
  
  // SDK v3: NEVER have both measure_battery + alarm_battery
  // Also remove from mains-powered devices
  if (hasMeasureBattery || isMains) {
    const idx = caps.indexOf('alarm_battery');
    caps.splice(idx, 1);
    compose.capabilities = caps;
    fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2) + '\n');
    
    // Also revert device.js injection
    const deviceFile = path.join(DDIR, d, 'device.js');
    if (fs.existsSync(deviceFile)) {
      let code = fs.readFileSync(deviceFile, 'utf8');
      // Remove the injected battery alarm block
      const pattern = /\n    \/\/ --- Battery Alarm \(auto-injected\) ---[\s\S]*?\.catch\(\(\) => \{\}\);\n\s*\}/;
      if (pattern.test(code)) {
        code = code.replace(pattern, '');
        fs.writeFileSync(deviceFile, code);
      }
    }
    
    const reason = hasMeasureBattery ? 'SDK v3: conflict with measure_battery' : 'mains-powered';
    console.log(`🔄 ${d}: reverted alarm_battery (${reason})`);
    reverted++;
  } else {
    kept++;
  }
}

console.log(`\n=== Summary ===`);
console.log(`Reverted: ${reverted}`);
console.log(`Kept (alarm_battery only, no measure_battery): ${kept}`);
