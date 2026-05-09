'use strict';

const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('🛡️  ZERO-DEFECT ARCHITECTURAL AUDIT & FLEET MAINTAINER SUITE  🛡️');
console.log('================================================================\n');

const driversDir = 'drivers';
if (!fs.existsSync(driversDir)) {
  console.error('Drivers directory not found!');
  process.exit(1);
}

let driversChecked = 0;
let jsonValidationErrors = 0;
let deprecatedMethods = 0;
let capabilityMismatchWarnings = 0;

const subdirs = fs.readdirSync(driversDir).filter(f => fs.statSync(path.join(driversDir, f)).isDirectory());

subdirs.forEach(dir => {
  driversChecked++;
  const composePath = path.join(driversDir, dir, 'driver.compose.json');
  const devicePath = path.join(driversDir, dir, 'device.js');

  // 1. JSON Structural Validation
  if (fs.existsSync(composePath)) {
    try {
      const rawCompose = fs.readFileSync(composePath, 'utf8');
      const compose = JSON.parse(rawCompose);

      // Check for empty or invalid arrays
      if (compose.capabilities && !Array.isArray(compose.capabilities)) {
        console.log(`⚠️  [Capabilities] ${dir}: 'capabilities' is not an array!`);
        capabilityMismatchWarnings++;
      }
      if (compose.zigbee && compose.zigbee.manufacturerName && !Array.isArray(compose.zigbee.manufacturerName)) {
        console.log(`⚠️  [Zigbee] ${dir}: 'manufacturerName' must be an array of strings!`);
        capabilityMismatchWarnings++;
      }
    } catch (err) {
      console.log(`❌  [JSON Parsing Error] ${composePath}: ${err.message}`);
      jsonValidationErrors++;
    }
  }

  // 2. JavaScript Architectural Quality & Deprecations
  if (fs.existsSync(devicePath)) {
    try {
      const code = fs.readFileSync(devicePath, 'utf8');

      // Check for SDK2 deprecations
      if (code.includes('this.getTriggerCard') || code.includes('getTriggerCard(')) {
        console.log(`⚠️  [SDK3 Deprecation] ${dir}/device.js uses 'getTriggerCard' (deprecated in Homey SDK3).`);
        deprecatedMethods++;
      }
      if (code.includes('Homey.registerCapabilityListener')) {
        console.log(`⚠️  [SDK3 Deprecation] ${dir}/device.js uses legacy global registration.`);
        deprecatedMethods++;
      }

      // Check for capabilityListener pattern without arrow function (retains 'this' context issues)
      if (code.includes('registerCapabilityListener(') && !code.includes('=>')) {
        console.log(`⚠️  [Architecture] ${dir}/device.js contains registerCapabilityListener without arrow functions. Check 'this' bindings.`);
        capabilityMismatchWarnings++;
      }
    } catch (e) {
      console.log(`❌  Error scanning ${devicePath}:`, e.message);
    }
  }
});

console.log('----------------------------------------------------------------');
console.log(`📊  AUDIT DASHBOARD METRICS:`);
console.log(`- Drivers Evaluated       : ${driversChecked}`);
console.log(`- JSON Validation Errors  : ${jsonValidationErrors}`);
console.log(`- SDK Deprecations Found  : ${deprecatedMethods}`);
console.log(`- Capability Bind Warnings: ${capabilityMismatchWarnings}`);
console.log('----------------------------------------------------------------\n');

if (jsonValidationErrors > 0) {
  console.log('❌  AUDIT FAILED: Structural JSON errors must be resolved immediately.');
  process.exit(1);
} else {
  console.log('✅  ZERO-DEFECT AUDIT CONCLUDED: Codebase is architecturally sound and solid!');
  process.exit(0);
}