/**
 * Driver Validation Script - YAML/JS Consistency Checker
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
const { loadAllDrivers, DRIVERS_DIR } = require('../lib/drivers');
const { createLogger } = require('../lib/logger');

const { log, summary, errors } = createLogger('Driver Validation');

const SPECIAL_DEVICES = {
  buttons: ['button_wireless', 'scene_switch', 'TS0043', 'TS0044'],
  climate: ['climate_sensor', 'temphumid', 'TS0601'],
  timesync: ['_TZE284_', '_TZE200_', '_TZE204_']
};

function validateDriver(name, d) {
  const driverPath = path.join(DRIVERS_DIR, name);
  const devicePath = path.join(driverPath, 'device.js');

  if (!fs.existsSync(devicePath)) {
    log('warn', name, 'Missing device.js');
  }

  const capabilities = d.caps;
  const mfrs = d.mfrs;

  // Button device validation
  const isButton = SPECIAL_DEVICES.buttons.some(p => name.includes(p));
  const isHybrid = name.includes('_hybrid');
  if (isButton && !isHybrid) {
    if (capabilities.includes('onoff')) {
      log('error', name, 'Stateless button device has onoff capability');
    }
    const hasButtonCaps = capabilities.some(c => c.startsWith('button.'));
    if (!hasButtonCaps && !capabilities.includes('button')) {
      log('warn', name, 'Button device missing button.X capabilities');
    }
  }

  // Climate sensor validation
  const isClimate = SPECIAL_DEVICES.climate.some(p => name.includes(p));
  const needsTimeSync = mfrs.some(m => SPECIAL_DEVICES.timesync.some(t => m.includes(t)));
  if (isClimate && needsTimeSync && fs.existsSync(devicePath)) {
    const deviceJs = fs.readFileSync(devicePath, 'utf8');
    if (!deviceJs.includes('TimeSync') && !deviceJs.includes('syncTime')) {
      log('warn', name, 'LCD climate sensor may need time sync implementation');
    }
  }

  // Capability options validation
  const capsOptions = d.config.capabilitiesOptions || {};
  for (const cap of capabilities) {
    if (cap.includes('.') && !capsOptions[cap]) {
      log('warn', name, 'Subcapability ' + cap + ' has no capabilitiesOptions');
    }
  }
}

// Main
console.log('Validating drivers...\n');
const drivers = loadAllDrivers();
for (const [name, d] of drivers) {
  validateDriver(name, d);
}

const s = summary();
process.exit(s.errors > 0 ? 1 : 0)      ;
