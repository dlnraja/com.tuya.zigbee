#!/usr/bin/env node
'use strict';
// deploy-safe-set-capability.js — Remplace this.setCapabilityValue par this.safeSetCapabilityValue
// dans toutes les classes de base (lib/devices/). CrashPrevention system.
//
// RÈGLE : safeSetCapabilityValue gère _destroyed guard, throttle, auto-add capability.
// this.setCapabilityValue direct peut crasher si device deleted ou capability absente.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const TARGET_FILES = [
  'lib/devices/UnifiedSensorBase.js',
  'lib/devices/ButtonDevice.js',
  'lib/devices/SwitchDevice.js',
  'lib/devices/UnifiedCoverBase.js',
  'lib/devices/TuyaUnifiedDevice.js',
  'lib/devices/BaseUnifiedDevice.js',
  'lib/devices/UnifiedSwitchBase.js',
  'lib/devices/UnifiedPlugBase.js',
  'lib/devices/UnifiedLightBase.js',
  'lib/devices/UnifiedThermostatBase.js',
];

let totalReplaced = 0;

for (const relPath of TARGET_FILES) {
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, 'utf8');
  let count = 0;

  // Pattern : this.setCapabilityValue( → this.safeSetCapabilityValue(
  // MAIS ne pas remplacer dans la DÉFINITION de safeSetCapabilityValue elle-même
  // ni dans les commentaires
  const lines = content.split('\n');
  const newLines = lines.map((line) => {
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) return line;
    // Skip definition of safeSetCapabilityValue
    if (line.includes('async safeSetCapabilityValue') || line.includes('safeSetCapabilityValue =')) return line;
    // Skip lines that already use safeSetCapabilityValue
    if (line.includes('safeSetCapabilityValue')) return line;
    // Replace this.setCapabilityValue( with this.safeSetCapabilityValue(
    if (line.includes('this.setCapabilityValue(')) {
      count++;
      return line.replace(/this\.setCapabilityValue\(/g, 'this.safeSetCapabilityValue(');
    }
    return line;
  });

  if (count > 0) {
    fs.writeFileSync(fullPath, newLines.join('\n'), 'utf8');
    totalReplaced += count;
    console.log(`✅ ${relPath}: ${count} replacements`);
  }
}

console.log(`\n═══════════════════════════════════════════════`);
console.log(`  Total: ${totalReplaced} setCapabilityValue → safeSetCapabilityValue`);
console.log(`  CrashPrevention deployed on ALL base classes`);
console.log(`═══════════════════════════════════════════════`);
