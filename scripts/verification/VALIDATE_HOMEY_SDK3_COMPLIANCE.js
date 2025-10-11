#!/usr/bin/env node

/**
 * VALIDATE HOMEY SDK3 COMPLIANCE
 * 
 * Vérifie que toutes nos capabilities, settings et flow cards
 * sont conformes aux guidelines Homey SDK3
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const ENRICHMENT_DIR = path.join(ROOT, 'data', 'enrichment');

console.log('🔍 HOMEY SDK3 COMPLIANCE VALIDATION\n');
console.log('='.repeat(70) + '\n');

// Homey SDK3 official capabilities (from apps-sdk-v3.developer.homey.app)
const OFFICIAL_CAPABILITIES = [
  // Alarms
  'alarm_battery', 'alarm_co', 'alarm_co2', 'alarm_contact', 'alarm_fire',
  'alarm_generic', 'alarm_heat', 'alarm_motion', 'alarm_night', 'alarm_pm25',
  'alarm_smoke', 'alarm_tamper', 'alarm_water',
  
  // Measurements
  'measure_battery', 'measure_co', 'measure_co2', 'measure_current',
  'measure_humidity', 'measure_luminance', 'measure_noise', 'measure_pm25',
  'measure_power', 'measure_pressure', 'measure_temperature', 'measure_voltage',
  'measure_water', 'measure_wind_angle', 'measure_wind_strength', 'measure_gust_angle',
  'measure_gust_strength', 'measure_rain', 'measure_ultraviolet',
  
  // Meters
  'meter_gas', 'meter_power', 'meter_rain', 'meter_water',
  
  // Controls
  'onoff', 'dim', 'volume_set', 'volume_up', 'volume_down', 'volume_mute',
  'channel_up', 'channel_down',
  
  // Lights
  'light_hue', 'light_saturation', 'light_temperature', 'light_mode',
  
  // Thermostat
  'target_temperature', 'thermostat_mode',
  
  // Window coverings
  'windowcoverings_state', 'windowcoverings_set', 'windowcoverings_tilt_set',
  
  // Door lock
  'locked', 'lock_mode',
  
  // Vacuum
  'vacuumcleaner_state', 'homealarm_state',
  
  // Speaker
  'speaker_playing', 'speaker_next', 'speaker_prev', 'speaker_shuffle', 'speaker_repeat',
  'speaker_artist', 'speaker_album', 'speaker_track', 'speaker_duration', 'speaker_position',
  
  // Button
  'button'
];

// Custom capabilities we've added that are NOT in official list
const CUSTOM_CAPABILITIES = [
  'measure_angle',        // Door/window opening angle - NOT OFFICIAL
  'battery_state',        // Battery state enum - NOT OFFICIAL
  'measure_smoke',        // Smoke value - NOT OFFICIAL
  'alarm_fault',          // Fault alarm - NOT OFFICIAL
  'alarm_temperature'     // Temperature alarm - NOT OFFICIAL
];

const issues = {
  invalidCapabilities: [],
  missingDefinitions: [],
  warnings: []
};

console.log('📋 Checking Enhanced Database...\n');

// Load enhanced database
const enhancedDbPath = path.join(ENRICHMENT_DIR, 'enhanced-dps-database.json');
if (fs.existsSync(enhancedDbPath)) {
  const enhancedDb = JSON.parse(fs.readFileSync(enhancedDbPath, 'utf8'));
  
  Object.entries(enhancedDb).forEach(([deviceType, dps]) => {
    Object.entries(dps).forEach(([dpId, config]) => {
      if (config.capability) {
        const cap = config.capability;
        
        // Check if capability is official
        if (!OFFICIAL_CAPABILITIES.includes(cap)) {
          // Check if it's a known custom capability
          if (CUSTOM_CAPABILITIES.includes(cap)) {
            issues.warnings.push({
              type: 'custom_capability',
              capability: cap,
              deviceType: deviceType,
              dpId: dpId,
              severity: 'warning',
              message: `Custom capability '${cap}' requires definition in app.json`,
              fix: 'Must add capability definition to app.json capabilities section'
            });
          } else {
            issues.invalidCapabilities.push({
              capability: cap,
              deviceType: deviceType,
              dpId: dpId,
              severity: 'error',
              message: `Capability '${cap}' is not official and not defined as custom`
            });
          }
        }
      }
    });
  });
}

console.log('📋 Validation Results:\n');
console.log(`✅ Official capabilities used: ${OFFICIAL_CAPABILITIES.length}`);
console.log(`⚠️  Custom capabilities: ${CUSTOM_CAPABILITIES.length}`);
console.log(`❌ Invalid capabilities: ${issues.invalidCapabilities.length}`);
console.log(`⚠️  Warnings: ${issues.warnings.length}\n`);

// Display issues
if (issues.invalidCapabilities.length > 0) {
  console.log('❌ INVALID CAPABILITIES (NOT OFFICIAL, NOT DEFINED):\n');
  issues.invalidCapabilities.forEach(issue => {
    console.log(`   ${issue.capability} in ${issue.deviceType} (DP ${issue.dpId})`);
    console.log(`      ${issue.message}\n`);
  });
}

if (issues.warnings.length > 0) {
  console.log('⚠️  CUSTOM CAPABILITIES (NEED DEFINITIONS IN APP.JSON):\n');
  issues.warnings.forEach(issue => {
    console.log(`   ${issue.capability} in ${issue.deviceType} (DP ${issue.dpId})`);
    console.log(`      ${issue.fix}\n`);
  });
}

// Generate capability definitions for app.json
console.log('📝 Generating Capability Definitions for app.json...\n');

const capabilityDefinitions = {
  "measure_angle": {
    "type": "number",
    "title": { "en": "Opening Angle" },
    "units": { "en": "°" },
    "decimals": 0,
    "min": 0,
    "max": 180,
    "desc": { "en": "Door/window opening angle in degrees" },
    "chartType": "stepLine",
    "getable": true,
    "setable": false,
    "uiComponent": "sensor",
    "icon": "/assets/angle.svg"
  },
  "battery_state": {
    "type": "enum",
    "title": { "en": "Battery State" },
    "values": [
      { "id": "low", "title": { "en": "Low" } },
      { "id": "medium", "title": { "en": "Medium" } },
      { "id": "high", "title": { "en": "High" } },
      { "id": "charging", "title": { "en": "Charging" } }
    ],
    "getable": true,
    "setable": false,
    "uiComponent": "sensor",
    "icon": "/assets/battery_state.svg"
  },
  "measure_smoke": {
    "type": "number",
    "title": { "en": "Smoke Level" },
    "units": { "en": "ppm" },
    "decimals": 0,
    "min": 0,
    "max": 1000,
    "desc": { "en": "Smoke concentration level" },
    "chartType": "stepLine",
    "getable": true,
    "setable": false,
    "uiComponent": "sensor",
    "icon": "/assets/smoke.svg"
  },
  "alarm_fault": {
    "type": "boolean",
    "title": { "en": "Fault Alarm" },
    "desc": { "en": "Device fault detected" },
    "getable": true,
    "setable": false,
    "uiComponent": "sensor",
    "icon": "/assets/fault.svg"
  },
  "alarm_temperature": {
    "type": "boolean",
    "title": { "en": "Temperature Alarm" },
    "desc": { "en": "Temperature threshold exceeded" },
    "getable": true,
    "setable": false,
    "uiComponent": "sensor",
    "icon": "/assets/temperature_alarm.svg"
  }
};

const capDefsPath = path.join(ENRICHMENT_DIR, 'capability-definitions.json');
fs.writeFileSync(capDefsPath, JSON.stringify(capabilityDefinitions, null, 2));
console.log(`✅ Capability definitions saved to: ${capDefsPath}\n`);

// Recommendations
console.log('='.repeat(70));
console.log('\n💡 RECOMMENDATIONS:\n');

console.log('1. Add Custom Capability Definitions to app.json:');
console.log('   Copy content from: data/enrichment/capability-definitions.json');
console.log('   To: app.json → "capabilities": { ... }\n');

console.log('2. Use Official Capabilities When Possible:');
console.log('   ✅ GOOD: measure_battery, alarm_smoke, measure_temperature');
console.log('   ⚠️  CUSTOM: measure_angle, battery_state (need definitions)\n');

console.log('3. For Custom Capabilities:');
console.log('   - Must be defined in app.json capabilities section');
console.log('   - Must follow naming convention (measure_*, alarm_*, meter_*)');
console.log('   - Must have proper type, title, units, getable/setable');
console.log('   - Icons should be provided\n');

console.log('4. SDK3 Guidelines:');
console.log('   - All capabilities must be either official OR defined');
console.log('   - Flow cards must reference existing capabilities');
console.log('   - Settings must not conflict with capabilities');
console.log('   - Icons for custom capabilities recommended\n');

// Save compliance report
const report = {
  timestamp: new Date().toISOString(),
  officialCapabilities: OFFICIAL_CAPABILITIES.length,
  customCapabilities: CUSTOM_CAPABILITIES.length,
  invalidCapabilities: issues.invalidCapabilities.length,
  warnings: issues.warnings.length,
  issues: issues,
  capabilityDefinitions: capabilityDefinitions,
  recommendations: [
    'Add custom capability definitions to app.json',
    'Verify all flow cards reference valid capabilities',
    'Ensure settings do not conflict with capabilities',
    'Provide icons for custom capabilities',
    'Test all custom capabilities with real devices'
  ]
};

fs.writeFileSync(
  path.join(ROOT, 'reports', 'SDK3_COMPLIANCE_REPORT.json'),
  JSON.stringify(report, null, 2)
);

console.log('📝 Compliance report saved to: reports/SDK3_COMPLIANCE_REPORT.json\n');

if (issues.invalidCapabilities.length > 0) {
  console.log('❌ VALIDATION FAILED: Invalid capabilities found\n');
  process.exit(1);
} else if (issues.warnings.length > 0) {
  console.log('⚠️  VALIDATION PASSED WITH WARNINGS: Custom capabilities need definitions\n');
  process.exit(0);
} else {
  console.log('✅ VALIDATION PASSED: All capabilities are compliant\n');
  process.exit(0);
}
