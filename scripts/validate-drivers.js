/**
 * Script: validate-drivers.js
 * Purpose: Validate all driver.js files for syntax errors
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

console.log('=== Driver Syntax Validation ===\n');

const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => path.join(DRIVERS_DIR, d.name, 'driver.js'));

let checked = 0;
let passed = 0;
let failed = 0;
const errors = [];

for (const driverPath of drivers) {
  if (!fs.existsSync(driverPath)) continue;
  checked++;
  
  try {
    execSync(`node -c "${driverPath}"`, { stdio: 'pipe' });
    passed++;
  } catch (e) {
    failed++;
    const stderr = e.stderr ? e.stderr.toString() : '';
    const firstLine = stderr.split('\n')[1] || stderr.split('\n')[0] || 'Unknown error';
    errors.push({ file: driverPath, error: firstLine });
  }
}

console.log(`Checked: ${checked} drivers`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}\n`);

if (failed > 0) {
  console.log('=== ERRORS ===');
  errors.forEach(e => console.log(`${e.file}: ${e.error}`));
}

console.log('\n=== Validation Complete ===');
process.exit(failed > 0 ? 1 : 0);
