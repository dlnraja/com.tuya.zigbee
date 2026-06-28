#!/usr/bin/env node
/**
 * SDK v3 Battery Capability Conflict Resolver
 * 
 * RULES (source: apps-sdk-v3.developer.homey.app):
 * 1. NEVER use both measure_battery AND alarm_battery on same device
 * 2. Mains-only devices should have NEITHER
 * 3. WiFi drivers have their own auth/implementation — don't touch
 * 4. Kinetic/mechanical self-powered devices have NO battery
 * 5. Power source varies per variant — check compose, not driver name
 * 
 * This script is IDEMPOTENT — running multiple times = same result.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DDIR = path.join(process.cwd(), 'drivers');
let conflicts = 0, mainsFix = 0, total = 0;

for (const d of fs.readdirSync(DDIR)) {
  const composeFile = path.join(DDIR, d, 'driver.compose.json');
  if (!fs.existsSync(composeFile)) continue;
  total++;

  const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
  const caps = compose.capabilities || [];
  let modified = false;

  // === CHECK 1: measure_battery + alarm_battery conflict ===
  if (caps.includes('measure_battery') && caps.includes('alarm_battery')) {
    // Remove alarm_battery (measure_battery has priority — it's more informative)
    const idx = caps.indexOf('alarm_battery');
    caps.splice(idx, 1);
    compose.capabilities = caps;
    modified = true;
    conflicts++;
    console.log(`⚡ ${d}: removed alarm_battery (conflicts with measure_battery)`);
  }

  // === CHECK 2: Mains-powered check ===
  // Do not remove measure_battery from static manifests based on a driver-wide
  // mainsPowered getter. Many Tuya drivers are mixed: some variants are mains,
  // while other productIds in the same driver are battery powered and need the
  // default measure_battery capability to appear in Homey.
  if (caps.includes('measure_battery')) {
    const energy = compose.energy || {};
    const hasBatteryMetadata = Array.isArray(energy.batteries) && energy.batteries.length > 0;
    const isExplicitMainsOnly = energy.mains === true && !hasBatteryMetadata;
    if (isExplicitMainsOnly) {
      const idx = caps.indexOf('measure_battery');
      caps.splice(idx, 1);
      compose.capabilities = caps;
      modified = true;
      mainsFix++;
      console.log(`🔌 ${d}: removed measure_battery (explicit mains-only manifest)`);
    }
  }

  // === CHECK 3: WiFi drivers shouldn't have zigbee battery caps injected ===
  const isWifi = compose.connectivity?.includes('cloud') || 
                 compose.connectivity?.includes('local') && !compose.connectivity?.includes('zigbee');
  if (isWifi && !compose.zigbee) {
    // Pure WiFi/cloud driver — battery handling is driver-specific
    // Don't auto-inject/remove — just warn
    if (caps.includes('alarm_battery') && caps.includes('measure_battery')) {
      console.log(`📡 ${d}: WiFi driver with battery conflict (needs manual review)`);
    }
  }

  if (modified) {
    fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2) + '\n');
  }
}

console.log(`\n=== Summary ===`);
console.log(`Total drivers scanned: ${total}`);
console.log(`Battery conflicts fixed: ${conflicts}`);
console.log(`Mains-powered battery removed: ${mainsFix}`);
