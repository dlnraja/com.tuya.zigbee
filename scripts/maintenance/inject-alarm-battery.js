#!/usr/bin/env node
/**
 * Inject alarm_battery capability  SDK v3 COMPLIANT version.
 * 
 * SDK v3 RULE: NEVER use BOTH measure_battery AND alarm_battery on same device.
 * - measure_battery = device reports precise 0-100% level
 * - alarm_battery = device only reports boolean low/ok
 * 
 * This script ONLY adds alarm_battery to drivers that:
 * 1. Have energy.batteries configured (battery-powered)
 * 2. Do NOT already have measure_battery (would conflict)
 * 3. Do NOT already have alarm_battery
 * 4. Are NOT mains-powered (bulbs, LEDs, plugs, switches, dimmers)
 * 5. Are NOT WiFi drivers (different auth/implementation)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DDIR = path.join(process.cwd(), 'drivers');
let fixed = 0, skipped = 0;

// Never add alarm_battery to these categories
const EXCLUDE = [
  /^bulb_/, /^led_/, /^plug_/, /^switch_\d/, /^switch_plug/,
  /^dimmer_/, /^din_rail/, /^power_/, /^energy_meter/,
  /^smart_breaker/, /^smart_rcbo/, /^module_/, /^shutter_/,
  /^ceiling_fan/, /^curtain_/, /^hvac_/, /^usb_/,
  /^gateway_/, /^zigbee_repeater/,
  /^wifi_/, /^ir_blaster/, /^ir_remote/,
  /^generic_diy/, /^generic_tuya/, /^universal_fallback/
];

for (const d of fs.readdirSync(DDIR)) {
  const composeFile = path.join(DDIR, d, 'driver.compose.json');
  if (!fs.existsSync(composeFile)) { skipped++; continue; }
  
  const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
  const caps = compose.capabilities || [];
  
  // Skip if already has alarm_battery
  if (caps.includes('alarm_battery')) { skipped++; continue; }
  
  // SDK v3: NEVER combine with measure_battery
  if (caps.includes('measure_battery')) { skipped++; continue; }
  
  // Skip excluded categories
  if (EXCLUDE.some(p => p.test(d))) { skipped++; continue; }
  
  // Only add if battery-powered
  if (!compose.energy?.batteries?.length) { skipped++ ; continue; }
  
  caps.push('alarm_battery' );
  compose.capabilities = caps;
  fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2) + '\n');
  console.log(` ${d}: added alarm_battery (no measure_battery conflict)`);
  fixed++;
}

console.log(`\nFixed: ${fixed}`);
console.log(`Skipped: ${skipped}`);
