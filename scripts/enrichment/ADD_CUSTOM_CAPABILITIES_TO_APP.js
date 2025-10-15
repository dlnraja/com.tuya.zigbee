#!/usr/bin/env node

/**
 * ADD CUSTOM CAPABILITIES TO APP.JSON
 * Ajoute les définitions des custom capabilities pour conformité SDK3
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const APP_JSON_PATH = path.join(ROOT, 'app.json');

console.log('📝 ADDING CUSTOM CAPABILITIES TO APP.JSON\n');
console.log('='.repeat(70) + '\n');

// Custom capability definitions conformes SDK3
const customCapabilities = {
  "measure_angle": {
    "type": "number",
    "title": { "en": "Opening Angle", "fr": "Angle d'ouverture" },
    "units": { "en": "°" },
    "decimals": 0,
    "min": 0,
    "max": 180,
    "desc": { "en": "Door/window opening angle in degrees" },
    "chartType": "stepLine",
    "getable": true,
    "setable": false,
    "uiComponent": "sensor"
  },
  "battery_state": {
    "type": "enum",
    "title": { "en": "Battery State", "fr": "État batterie" },
    "values": [
      { "id": "low", "title": { "en": "Low", "fr": "Faible" } },
      { "id": "medium", "title": { "en": "Medium", "fr": "Moyen" } },
      { "id": "high", "title": { "en": "High", "fr": "Élevé" } },
      { "id": "charging", "title": { "en": "Charging", "fr": "En charge" } }
    ],
    "getable": true,
    "setable": false,
    "uiComponent": "sensor"
  },
  "measure_smoke": {
    "type": "number",
    "title": { "en": "Smoke Level", "fr": "Niveau de fumée" },
    "units": { "en": "ppm" },
    "decimals": 0,
    "min": 0,
    "max": 1000,
    "desc": { "en": "Smoke concentration level" },
    "chartType": "stepLine",
    "getable": true,
    "setable": false,
    "uiComponent": "sensor"
  },
  "alarm_fault": {
    "type": "boolean",
    "title": { "en": "Fault Alarm", "fr": "Alarme défaut" },
    "desc": { "en": "Device fault detected" },
    "getable": true,
    "setable": false,
    "uiComponent": "sensor"
  },
  "alarm_temperature": {
    "type": "boolean",
    "title": { "en": "Temperature Alarm", "fr": "Alarme température" },
    "desc": { "en": "Temperature threshold exceeded" },
    "getable": true,
    "setable": false,
    "uiComponent": "sensor"
  }
};

// Load app.json
const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));

// Add capabilities section if it doesn't exist
if (!appJson.capabilities) {
  appJson.capabilities = {};
  console.log('✅ Created capabilities section in app.json');
}

// Add each custom capability
let added = 0;
Object.entries(customCapabilities).forEach(([capId, capDef]) => {
  if (!appJson.capabilities[capId]) {
    appJson.capabilities[capId] = capDef;
    console.log(`✅ Added: ${capId}`);
    added++;
  } else {
    console.log(`⏭️  Skipped: ${capId} (already exists)`);
  }
});

// Save app.json
fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2), 'utf8');

console.log('\n' + '='.repeat(70));
console.log(`\n📊 SUMMARY: ${added} capabilities added to app.json\n`);

console.log('✅ Custom capabilities are now SDK3 compliant!\n');

// Save report
const report = {
  timestamp: new Date().toISOString(),
  capabilitiesAdded: added,
  customCapabilities: Object.keys(customCapabilities)
};

fs.writeFileSync(
  path.join(ROOT, 'reports', 'CUSTOM_CAPABILITIES_ADDED.json'),
  JSON.stringify(report, null, 2)
);

console.log('📝 Report saved to: reports/CUSTOM_CAPABILITIES_ADDED.json\n');
