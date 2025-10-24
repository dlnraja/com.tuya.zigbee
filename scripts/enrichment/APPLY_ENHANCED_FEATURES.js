#!/usr/bin/env node

/**
 * APPLY ENHANCED FEATURES
 * 
 * Applique intelligemment les features enrichies à tous les drivers:
 * - Battery advanced (voltage, state, alarms)
 * - Settings (sensibilité, timeouts, calibration)
 * - Flow cards (triggers, conditions, actions)
 * - Power monitoring (current, voltage, energy)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const ENRICHMENT_DIR = path.join(ROOT, 'data', 'enrichment');

console.log('🚀 APPLYING ENHANCED FEATURES\n');
console.log('='.repeat(70) + '\n');

// Load enriched data
const enhancedDb = JSON.parse(fs.readFileSync(
  path.join(ENRICHMENT_DIR, 'enhanced-dps-database.json'),
  'utf8'
));

const flowCards = JSON.parse(fs.readFileSync(
  path.join(ENRICHMENT_DIR, 'flow-cards-config.json'),
  'utf8'
));

const settings = JSON.parse(fs.readFileSync(
  path.join(ENRICHMENT_DIR, 'settings-schema.json'),
  'utf8'
));

const stats = {
  driversUpdated: 0,
  capabilitiesAdded: 0,
  settingsAdded: 0,
  flowCardsAdded: 0
};

// Mapping device types to drivers
const driverMapping = {
  BATTERY_ADVANCED: ['_battery', '_cr2032', '_cr2450'],
  TEMPERATURE_ADVANCED: ['temp', 'temperature', 'climate', 'thermostat'],
  MOTION_ADVANCED: ['motion', 'pir', 'radar', 'presence'],
  SMOKE_COMPLETE: ['smoke'],
  THERMOSTAT_COMPLETE: ['thermostat', 'trv', 'radiator_valve'],
  SWITCH_POWER_MONITOR: ['plug', 'socket', 'outlet', 'switch'],
  DOOR_WINDOW_ADVANCED: ['door', 'window', 'contact'],
  RGB_COMPLETE: ['rgb', 'color', 'light_rgb']
};

const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => {
  return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory();
});

console.log(`📊 Processing ${drivers.length} drivers...\n`);

drivers.forEach(driverName => {
  const manifestPath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(manifestPath)) return;
  
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    let modified = false;
    const changes = [];
    
    // Detect device type
    const lower = driverName.toLowerCase();
    let deviceTypes = [];
    
    Object.entries(driverMapping).forEach(([type, patterns]) => {
      if (patterns.some(pattern => lower.includes(pattern))) {
        deviceTypes.push(type);
      }
    });
    
    if (deviceTypes.length === 0) return;
    
    // Collect all enhanced capabilities
    const enhancedCaps = new Set();
    deviceTypes.forEach(type => {
      if (enhancedDb[type]) {
        Object.values(enhancedDb[type]).forEach(dp => {
          if (dp.capability) {
            enhancedCaps.add(dp.capability);
          }
        });
      }
    });
    
    // Add missing capabilities
    if (!manifest.capabilities) {
      manifest.capabilities = [];
    }
    
    enhancedCaps.forEach(cap => {
      if (!manifest.capabilities.includes(cap)) {
        // Only add if it makes sense for this device
        if (shouldAddCapability(cap, lower)) {
          manifest.capabilities.push(cap);
          modified = true;
          changes.push(`Added capability: ${cap}`);
          stats.capabilitiesAdded++;
        }
      }
    });
    
    // Add settings
    if (deviceTypes.length > 0) {
      const relevantSettings = settings.filter(setting => {
        return deviceTypes.some(type => 
          setting.id.toLowerCase().includes(type.toLowerCase().split('_')[0])
        );
      });
      
      if (relevantSettings.length > 0 && !manifest.settings) {
        manifest.settings = relevantSettings.slice(0, 5); // Top 5 most relevant
        modified = true;
        changes.push(`Added ${manifest.settings.length} settings`);
        stats.settingsAdded += manifest.settings.length;
      }
    }
    
    if (modified) {
      // Save manifest
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
      
      console.log(`✅ ${driverName}:`);
      changes.forEach(change => console.log(`   ${change}`));
      console.log('');
      
      stats.driversUpdated++;
    }
    
  } catch (err) {
    console.log(`❌ ${driverName}: ${err.message}`);
  }
});

// Helper function
function shouldAddCapability(cap, driverName) {
  // Battery capabilities
  if (cap === 'measure_battery' && (driverName.includes('battery') || driverName.includes('cr2032') || driverName.includes('cr2450'))) {
    return true;
  }
  
  // Voltage for power monitoring devices
  if (cap === 'measure_voltage' && (driverName.includes('plug') || driverName.includes('socket') || driverName.includes('power'))) {
    return true;
  }
  
  // Current for power monitoring
  if (cap === 'measure_current' && (driverName.includes('plug') || driverName.includes('socket') || driverName.includes('power'))) {
    return true;
  }
  
  // Energy meter
  if (cap === 'meter_power' && (driverName.includes('plug') || driverName.includes('socket') || driverName.includes('energy'))) {
    return true;
  }
  
  // Temperature
  if (cap === 'measure_temperature' && (driverName.includes('temp') || driverName.includes('climate') || driverName.includes('thermostat'))) {
    return true;
  }
  
  // Humidity
  if (cap === 'measure_humidity' && (driverName.includes('humidity') || driverName.includes('humid'))) {
    return true;
  }
  
  // Alarms
  if (cap.startsWith('alarm_')) {
    const alarmType = String(cap).replace('alarm_', '');
    if (driverName.includes(alarmType)) {
      return true;
    }
  }
  
  return false;
}

console.log('='.repeat(70));
console.log('\n📊 APPLICATION SUMMARY\n');
console.log(`Drivers updated: ${stats.driversUpdated}`);
console.log(`Capabilities added: ${stats.capabilitiesAdded}`);
console.log(`Settings added: ${stats.settingsAdded}`);

// Generate app.json flow cards section
const appFlowCards = {
  triggers: flowCards.triggers.slice(0, 20), // Top 20
  conditions: flowCards.conditions.slice(0, 15), // Top 15
  actions: flowCards.actions.slice(0, 20) // Top 20
};

const flowCardsAppPath = path.join(ROOT, 'data', 'enrichment', 'app-flow-cards.json');
fs.writeFileSync(flowCardsAppPath, JSON.stringify(appFlowCards, null, 2));

console.log(`\n✅ Generated app flow cards: ${flowCardsAppPath}`);
console.log(`   Triggers: ${appFlowCards.triggers.length}`);
console.log(`   Conditions: ${appFlowCards.conditions.length}`);
console.log(`   Actions: ${appFlowCards.actions.length}`);

console.log('\n✅ ENHANCED FEATURES APPLIED!');
console.log('\n💡 Next: Sync to app.json and test\n');

// Save report
const report = {
  timestamp: new Date().toISOString(),
  stats,
  enhancedDeviceTypes: Object.keys(enhancedDb),
  flowCardsGenerated: {
    triggers: flowCards.triggers.length,
    conditions: flowCards.conditions.length,
    actions: flowCards.actions.length
  }
};

fs.writeFileSync(
  path.join(ROOT, 'reports', 'ENHANCED_FEATURES_APPLIED.json'),
  JSON.stringify(report, null, 2)
);
