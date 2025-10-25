#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * FIX SENSOR DATA REPORTING
 * Corrige le problème de transmission de données des capteurs
 */

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

console.log('🔧 FIX SENSOR DATA REPORTING\n');
console.log('═'.repeat(80));

// ═══════════════════════════════════════════════════════════════════
// TEMPLATE: Proper Attribute Reporting Setup
// ═══════════════════════════════════════════════════════════════════

const REPORTING_TEMPLATES = {
  temperature: `
  // Temperature reporting
  this.registerAttrReportListener(
    'msTemperatureMeasurement',
    'measuredValue',
    1,
    300,
    1,
    value => {
      const temperature = value / 100;
      this.log('Temperature:', temperature);
      this.setCapabilityValue('measure_temperature', temperature).catch(this.error);
    },
    1
  ).catch(err => this.error('Temperature reporting failed:', err));
  
  // Configure reporting intervals
  this.configureAttributeReporting([{
    endpointId: 1,
    cluster: 'msTemperatureMeasurement',
    attributeName: 'measuredValue',
    minInterval: 60,
    maxInterval: 3600,
    minChange: 50
  }]).catch(this.error);`,

  humidity: `
  // Humidity reporting
  this.registerAttrReportListener(
    'msRelativeHumidity',
    'measuredValue',
    1,
    300,
    1,
    value => {
      const humidity = value / 100;
      this.log('Humidity:', humidity);
      this.setCapabilityValue('measure_humidity', humidity).catch(this.error);
    },
    1
  ).catch(err => this.error('Humidity reporting failed:', err));
  
  this.configureAttributeReporting([{
    endpointId: 1,
    cluster: 'msRelativeHumidity',
    attributeName: 'measuredValue',
    minInterval: 60,
    maxInterval: 3600,
    minChange: 100
  }]).catch(this.error);`,

  battery: `
  // Battery reporting
  this.registerAttrReportListener(
    'genPowerCfg',
    'batteryPercentageRemaining',
    1,
    3600,
    1,
    value => {
      const battery = Math.round(value / 2);
      this.log('Battery:', battery, '%');
      this.setCapabilityValue('measure_battery', battery).catch(this.error);
    },
    1
  ).catch(err => this.error('Battery reporting failed:', err));
  
  this.configureAttributeReporting([{
    endpointId: 1,
    cluster: 'genPowerCfg',
    attributeName: 'batteryPercentageRemaining',
    minInterval: 3600,
    maxInterval: 43200,
    minChange: 2
  }]).catch(this.error);`,

  illuminance: `
  // Illuminance reporting
  this.registerAttrReportListener(
    'msIlluminanceMeasurement',
    'measuredValue',
    1,
    300,
    1,
    value => {
      const lux = Math.pow(10, (value - 1) / 10000);
      this.log('Illuminance:', lux, 'lux');
      this.setCapabilityValue('measure_luminance', lux).catch(this.error);
    },
    1
  ).catch(err => this.error('Illuminance reporting failed:', err));
  
  this.configureAttributeReporting([{
    endpointId: 1,
    cluster: 'msIlluminanceMeasurement',
    attributeName: 'measuredValue',
    minInterval: 60,
    maxInterval: 3600,
    minChange: 1000
  }]).catch(this.error);`,

  motion: `
  // Motion IAS Zone reporting
  this.registerAttrReportListener(
    'iasZone',
    'zoneStatus',
    1,
    0,
    1,
    value => {
      const motion = !!(value & 0x01);
      this.log('Motion:', motion);
      this.setCapabilityValue('alarm_motion', motion).catch(this.error);
    },
    1
  ).catch(err => this.error('Motion reporting failed:', err));
  
  // Also listen to zone notifications
  if (this.zclNode.endpoints[1]?.clusters?.iasZone) {
    this.zclNode.endpoints[1].clusters.iasZone.on('zoneStatusChangeNotification', (data) => {
      const motion = !!(data.zoneStatus & 0x01);
      this.log('Motion notification:', motion);
      this.setCapabilityValue('alarm_motion', motion).catch(this.error);
    });
  }`,

  contact: `
  // Contact IAS Zone reporting
  this.registerAttrReportListener(
    'iasZone',
    'zoneStatus',
    1,
    0,
    1,
    value => {
      const contact = !(value & 0x01);
      this.log('Contact:', contact);
      this.setCapabilityValue('alarm_contact', contact).catch(this.error);
    },
    1
  ).catch(err => this.error('Contact reporting failed:', err));
  
  if (this.zclNode.endpoints[1]?.clusters?.iasZone) {
    this.zclNode.endpoints[1].clusters.iasZone.on('zoneStatusChangeNotification', (data) => {
      const contact = !(data.zoneStatus & 0x01);
      this.log('Contact notification:', contact);
      this.setCapabilityValue('alarm_contact', contact).catch(this.error);
    });
  }`
};

// ═══════════════════════════════════════════════════════════════════
// ANALYZE DEVICE.JS FILES
// ═══════════════════════════════════════════════════════════════════

console.log('\n🔍 ANALYZING DEVICE.JS FILES\n');

const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => 
  fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory() && !d.startsWith('.')
);

const issues = {
  noDeviceFile: [],
  missingReporting: [],
  incorrectReporting: [],
  needsFix: []
};

drivers.forEach(driverName => {
  const deviceFile = path.join(DRIVERS_DIR, driverName, 'device.js');
  const composeFile = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(composeFile)) return;
  
  // Check if device.js exists
  if (!fs.existsSync(deviceFile)) {
    issues.noDeviceFile.push(driverName);
    return;
  }
  
  try {
    const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
    const deviceCode = fs.readFileSync(deviceFile, 'utf8');
    const caps = compose.capabilities || [];
    
    // Check for sensors that need reporting
    const needsTemperature = caps.includes('measure_temperature');
    const needsHumidity = caps.includes('measure_humidity');
    const needsBattery = caps.includes('measure_battery');
    const needsIlluminance = caps.includes('measure_luminance');
    const needsMotion = caps.includes('alarm_motion');
    const needsContact = caps.includes('alarm_contact');
    
    // Check if reporting is properly configured
    const hasReporting = deviceCode.includes('registerAttrReportListener') || 
                        deviceCode.includes('configureAttributeReporting');
    
    if ((needsTemperature || needsHumidity || needsBattery || needsIlluminance || needsMotion || needsContact) && !hasReporting) {
      issues.missingReporting.push({
        driver: driverName,
        capabilities: {
          temperature: needsTemperature,
          humidity: needsHumidity,
          battery: needsBattery,
          illuminance: needsIlluminance,
          motion: needsMotion,
          contact: needsContact
        }
      });
    }
    
    // Check for incorrect reporting (common mistakes)
    if (hasReporting) {
      const problems = [];
      
      // Check for missing error handlers
      if (!deviceCode.includes('.catch(')) {
        problems.push('Missing error handlers');
      }
      
      // Check for missing configureAttributeReporting
      if (deviceCode.includes('registerAttrReportListener') && !deviceCode.includes('configureAttributeReporting')) {
        problems.push('Missing configureAttributeReporting');
      }
      
      // Check for IAS Zone without notification listener
      if ((needsMotion || needsContact) && !deviceCode.includes('zoneStatusChangeNotification')) {
        problems.push('Missing IAS Zone notification listener');
      }
      
      if (problems.length > 0) {
        issues.incorrectReporting.push({
          driver: driverName,
          problems
        });
      }
    }
    
  } catch (e) {
    console.error(`❌ Error: ${driverName}:`, e.message);
  }
});

console.log(`📊 Analysis Results:\n`);
console.log(`   No device.js:          ${issues.noDeviceFile.length}`);
console.log(`   Missing reporting:     ${issues.missingReporting.length}`);
console.log(`   Incorrect reporting:   ${issues.incorrectReporting.length}`);
console.log(`\n${'─'.repeat(60)}`);
console.log(`   TOTAL ISSUES:          ${issues.noDeviceFile.length + issues.missingReporting.length + issues.incorrectReporting.length}`);

// ═══════════════════════════════════════════════════════════════════
// CREATE TEMPLATE DEVICE.JS FOR MISSING FILES
// ═══════════════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(80));
console.log('\n🔧 CREATING MISSING DEVICE.JS FILES\n');

const DEVICE_TEMPLATE = `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class MyDevice extends ZigBeeDevice {

  async onNodeInit() {
    this.log('Device initialized');
    
    // Setup capability listeners
    this.setupCapabilityListeners();
    
    // Setup attribute reporting
    this.setupAttributeReporting();
  }
  
  setupCapabilityListeners() {
    // Add capability listeners here based on compose.json
    // Example:
    // this.registerCapability('onoff', CLUSTER.ON_OFF);
  }
  
  async setupAttributeReporting() {
    try {
      // Add attribute reporting based on capabilities
      // See templates in fix-sensor-data-reporting.js
      
    } catch (err) {
      this.error('Failed to configure reporting:', err);
    }
  }

}

module.exports = MyDevice;
`;

let created = 0;

issues.noDeviceFile.forEach(driverName => {
  const deviceFile = path.join(DRIVERS_DIR, driverName, 'device.js');
  
  fs.writeFileSync(deviceFile, DEVICE_TEMPLATE);
  console.log(`  ✅ Created: ${driverName}/device.js`);
  created++;
  
  if (created <= 10 && created === issues.noDeviceFile.length) {
    // Only show all if 10 or less
  } else if (created === 10) {
    console.log(`  ... and ${issues.noDeviceFile.length - 10} more`);
  }
});

console.log(`\n✅ Created ${created} device.js files`);

// ═══════════════════════════════════════════════════════════════════
// GENERATE FIX REPORT
// ═══════════════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(80));
console.log('\n📋 DETAILED ISSUES REPORT\n');

if (issues.missingReporting.length > 0) {
  console.log('⚠️  DRIVERS MISSING REPORTING:\n');
  issues.missingReporting.slice(0, 20).forEach(issue => {
    const caps = Object.entries(issue.capabilities)
      .filter(([_, v]) => v)
      .map(([k, _]) => k)
      .join(', ');
    console.log(`   - ${issue.driver}: ${caps}`);
  });
  if (issues.missingReporting.length > 20) {
    console.log(`   ... and ${issues.missingReporting.length - 20} more`);
  }
}

if (issues.incorrectReporting.length > 0) {
  console.log('\n⚠️  DRIVERS WITH INCORRECT REPORTING:\n');
  issues.incorrectReporting.slice(0, 10).forEach(issue => {
    console.log(`   - ${issue.driver}:`);
    issue.problems.forEach(p => console.log(`     • ${p}`));
  });
  if (issues.incorrectReporting.length > 10) {
    console.log(`   ... and ${issues.incorrectReporting.length - 10} more`);
  }
}

// Save report
const report = {
  timestamp: new Date().toISOString(),
  analysis: {
    driversAnalyzed: drivers.length,
    noDeviceFile: issues.noDeviceFile.length,
    missingReporting: issues.missingReporting.length,
    incorrectReporting: issues.incorrectReporting.length
  },
  filesCreated: created,
  details: {
    noDeviceFile: issues.noDeviceFile,
    missingReporting: issues.missingReporting.slice(0, 50),
    incorrectReporting: issues.incorrectReporting.slice(0, 50)
  },
  templates: Object.keys(REPORTING_TEMPLATES)
};

fs.writeFileSync(
  path.join(__dirname, '..', 'SENSOR_DATA_FIX_REPORT.json'),
  JSON.stringify(report, null, 2)
);

// ═══════════════════════════════════════════════════════════════════
// CREATE IMPLEMENTATION GUIDE
// ═══════════════════════════════════════════════════════════════════

const guide = `# 🔧 SENSOR DATA REPORTING - IMPLEMENTATION GUIDE

## Problem Identified
Sensors not transmitting data due to missing or incorrect attribute reporting configuration.

## Root Causes
1. Missing \`registerAttrReportListener\` calls
2. Missing \`configureAttributeReporting\` calls
3. Missing error handlers (.catch)
4. IAS Zone devices missing notification listeners
5. Incorrect value parsing (especially temperature, humidity, illuminance)

## Solutions

### Temperature Sensor
${REPORTING_TEMPLATES.temperature}

### Humidity Sensor
${REPORTING_TEMPLATES.humidity}

### Battery
${REPORTING_TEMPLATES.battery}

### Illuminance
${REPORTING_TEMPLATES.illuminance}

### Motion (IAS Zone)
${REPORTING_TEMPLATES.motion}

### Contact (IAS Zone)
${REPORTING_TEMPLATES.contact}

## Key Points
1. **ALWAYS** use \`.catch()\` for error handling
2. **ALWAYS** configure both listener AND reporting intervals
3. **IAS Zone**: Use BOTH attribute listener AND notification listener
4. **Correct parsing**: Temperature/Humidity divide by 100, Illuminance use formula
5. **Battery**: Divide by 2 for percentage (0-200 → 0-100%)

## Testing
1. Pair device
2. Check logs for "XXX reporting failed" errors
3. Wait for reporting intervals (1-5 minutes)
4. Verify capability values update in app
5. Trigger physical changes and verify immediate updates

## Files Modified
- ${created} device.js files created
- ${issues.missingReporting.length} drivers need reporting implementation
- ${issues.incorrectReporting.length} drivers need reporting corrections
`;

fs.writeFileSync(
  path.join(__dirname, '..', 'SENSOR_REPORTING_GUIDE.md'),
  guide
);

console.log('\n' + '═'.repeat(80));
console.log('\n✅ COMPLETE!\n');
console.log(`📊 Summary:`);
console.log(`   - Drivers analyzed:       ${drivers.length}`);
console.log(`   - Device.js created:      ${created}`);
console.log(`   - Need reporting setup:   ${issues.missingReporting.length}`);
console.log(`   - Need corrections:       ${issues.incorrectReporting.length}`);
console.log(`\n📄 Files created:`);
console.log(`   - SENSOR_DATA_FIX_REPORT.json`);
console.log(`   - SENSOR_REPORTING_GUIDE.md`);
console.log(`\n⚠️  NEXT: Implement reporting in ${issues.missingReporting.length} drivers\n`);
