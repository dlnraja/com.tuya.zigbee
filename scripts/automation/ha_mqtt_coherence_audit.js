'use strict';

const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('🌐 RUNNING 360° MQTT & HOME ASSISTANT COHERENCE AUDIT GATEWAY 🌐');
console.log('================================================================\n');

const DRIVERS_DIR = path.join(__dirname, '..', '..', 'drivers');
if (!fs.existsSync(DRIVERS_DIR)) {
  console.error('❌ Error: drivers directory not found!');
  process.exit(1);
}

const driverDirs = fs.readdirSync(DRIVERS_DIR).filter(f => {
  return fs.statSync(path.join(DRIVERS_DIR, f)).isDirectory();
});

const STANDARD_HA_CLASSES = ['socket', 'switch', 'light', 'sensor', 'thermostat', 'blinds', 'lock', 'doorbell'];
const compatibilityReport = [];
let totalDrivers = 0;
let fullyHACompatible = 0;
let needsCustomYaml = 0;

driverDirs.forEach(drv => {
  const composePath = path.join(DRIVERS_DIR, drv, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return;

  totalDrivers++;
  let composeData = {};
  try {
    composeData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  } catch (e) {
    compatibilityReport.push({
      driver: drv,
      status: 'CRITICAL',
      reason: `Malformed driver.compose.json: ${e.message}`
    });
    return;
  }

  const devClass = composeData.class || 'other';
  const capabilities = composeData.capabilities || [];
  const subCapabilities = capabilities.filter(c => c.includes('.'));
  
  const isStandardClass = STANDARD_HA_CLASSES.includes(devClass);
  let status = 'COMPATIBLE';
  let warnings = [];

  if (!isStandardClass) {
    status = 'CUSTOM_YAML_REQUIRED';
    warnings.push(`Non-standard Homey class "${devClass}" — requires manual MQTT mapping in Home Assistant`);
    needsCustomYaml++;
  } else {
    fullyHACompatible++;
  }

  // Check sub-capabilities for Home Assistant Discovery (Zigbee only)
  if (subCapabilities.length > 0 && composeData.zigbee) {
    const endpoints = composeData.zigbee.endpoints || {};
    subCapabilities.forEach(sub => {
      const parts = sub.split('.');
      const gangNum = parts[1]?.replace('gang', '');
      if (gangNum && !endpoints[gangNum]) {
        warnings.push(`Sub-capability "${sub}" declared but endpoint "${gangNum}" is missing in zigbee.endpoints`);
        status = 'WARNING';
      }
    });
  }

  compatibilityReport.push({
    driver: drv,
    class: devClass,
    capabilitiesCount: capabilities.length,
    subCapabilities: subCapabilities,
    status: status,
    warnings: warnings
  });
});

console.log('----------------------------------------------------------------');
console.log(`📊 COHERENCE SUMMARY:`);
console.log(`- Total Drivers Audited    : ${totalDrivers}`);
console.log(`- Auto-Discoverable in HA : ${fullyHACompatible}`);
console.log(`- Custom YAML Needed      : ${needsCustomYaml}`);
console.log('----------------------------------------------------------------\n');

// Write out the JSON report to the state folder
const stateDir = path.join(__dirname, '..', '..', '.github', 'state');
if (fs.existsSync(stateDir)) {
  fs.writeFileSync(
    path.join(stateDir, 'ha-mqtt-coherence-report.json'),
    JSON.stringify({ auditedAt: new Date().toISOString(), totalDrivers, fullyHACompatible, needsCustomYaml, report: compatibilityReport }, null, 2)
  );
  console.log(`💾 Report written to .github/state/ha-mqtt-coherence-report.json`);
}

// Print non-compatible or warning drivers for visibility
const issueDrivers = compatibilityReport.filter(r => r.status !== 'COMPATIBLE');
if (issueDrivers.length > 0) {
  console.log(`\n⚠️  Drivers with special integration conditions or warnings (${issueDrivers.length}):`);
  issueDrivers.forEach(r => {
    console.log(`- [${r.status}] ${r.driver} (Class: ${r.class})`);
    r.warnings.forEach(w => console.log(`    ↳ ${w}`));
  });
} else {
  console.log(`\n🎉 All drivers are 100% Home Assistant Auto-Discovery compatible out of the box!`);
}

console.log('================================================================');
