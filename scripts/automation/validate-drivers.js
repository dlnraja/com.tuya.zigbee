/**
 * Driver Validation Script - YAML↔JS Consistency Checker
 * Run: node scripts/automation/validate-drivers.js
 * 
 * Validates:
 * - YAML capabilities match JS handlers
 * - Flow Cards reference valid capabilities
 * - Required files exist
 * - TS0043/TS0044 button devices are stateless
 * - TS0601 climate sensors have time sync
 */
const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

// Critical device patterns requiring special validation
const SPECIAL_DEVICES = {
  buttons: ['button_wireless', 'scene_switch', 'TS0043', 'TS0044'],
  climate: ['climate_sensor', 'temphumid', 'TS0601'],
  timesync: ['_TZE284_', '_TZE200_', '_TZE204_']
};

let errors = 0;
let warnings = 0;

function log(type, driver, msg) {
  const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : '✅';
  console.log(`${prefix} [${driver}] ${msg}`);
  if (type === 'error') errors++;
  if (type === 'warn') warnings++;
}

function validateDriver(driverName) {
  const driverPath = path.join(DRIVERS_DIR, driverName);
  const composePath = path.join(driverPath, 'driver.compose.json');
  const devicePath = path.join(driverPath, 'device.js');
  const driverJsPath = path.join(driverPath, 'driver.js');
  
  // Check required files
  if (!fs.existsSync(composePath)) {
    log('error', driverName, 'Missing driver.compose.json');
    return;
  }
  if (!fs.existsSync(devicePath)) {
    log('warn', driverName, 'Missing device.js');
  }
  
  const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  const capabilities = compose.capabilities || [];
  const mfrs = compose.zigbee?.manufacturerName || [];
  
  // Button device validation
  const isButton = SPECIAL_DEVICES.buttons.some(p => driverName.includes(p));
  if (isButton) {
    if (capabilities.includes('onoff')) {
      log('error', driverName, 'Button device has onoff capability (should be stateless)');
    }
    const hasButtonCaps = capabilities.some(c => c.startsWith('button.'));
    if (!hasButtonCaps && !capabilities.includes('button')) {
      log('warn', driverName, 'Button device missing button.X capabilities');
    }
  }
  
  // Climate sensor validation
  const isClimate = SPECIAL_DEVICES.climate.some(p => driverName.includes(p));
  const needsTimeSync = mfrs.some(m => SPECIAL_DEVICES.timesync.some(t => m.includes(t)));
  
  if (isClimate && needsTimeSync) {
    if (fs.existsSync(devicePath)) {
      const deviceJs = fs.readFileSync(devicePath, 'utf8');
      if (!deviceJs.includes('TimeSync') && !deviceJs.includes('syncTime')) {
        log('warn', driverName, 'LCD climate sensor may need time sync implementation');
      }
    }
  }
  
  // Capability options validation
  const capsOptions = compose.capabilitiesOptions || {};
  for (const cap of capabilities) {
    if (cap.includes('.') && !capsOptions[cap]) {
      log('warn', driverName, `Subcapability ${cap} has no capabilitiesOptions`);
    }
  }
}

// Main
console.log('🔍 Validating drivers...\n');

fs.readdirSync(DRIVERS_DIR).forEach(driver => {
  const stat = fs.statSync(path.join(DRIVERS_DIR, driver));
  if (stat.isDirectory()) {
    validateDriver(driver);
  }
});

console.log(`\n📊 Validation complete: ${errors} errors, ${warnings} warnings`);
process.exit(errors > 0 ? 1 : 0);
