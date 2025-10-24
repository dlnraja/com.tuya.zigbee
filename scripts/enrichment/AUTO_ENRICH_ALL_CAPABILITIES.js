#!/usr/bin/env node

/**
 * AUTO ENRICH ALL CAPABILITIES
 * Ajoute automatiquement toutes les capabilities manquantes
 * basé sur l'analyse du forum et les specs des devices
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🔧 AUTO ENRICHING ALL CAPABILITIES\n');
console.log('='.repeat(70) + '\n');

// Capabilities à ajouter par type de device
const enrichmentRules = {
  'smoke_detector': {
    capabilities_add: ['alarm_smoke', 'measure_battery', 'alarm_battery'],
    capabilities_optional: ['measure_temperature', 'measure_humidity', 'alarm_tamper'],
    class: 'sensor',
    category: 'security'
  },
  'gas_detector': {
    capabilities_add: ['alarm_co', 'measure_battery', 'alarm_battery'],
    capabilities_optional: ['measure_co'],
    class: 'sensor',
    category: 'security'
  },
  'water_leak': {
    capabilities_add: ['alarm_water', 'measure_battery', 'alarm_battery'],
    capabilities_optional: ['alarm_tamper'],
    class: 'sensor',
    category: 'security'
  },
  'sos_button': {
    capabilities_add: ['alarm_generic', 'measure_battery'],
    capabilities_optional: ['alarm_button'],
    class: 'button',
    category: 'security'
  },
  'door_window': {
    capabilities_add: ['alarm_contact', 'measure_battery'],
    capabilities_optional: ['alarm_tamper', 'alarm_battery'],
    class: 'sensor',
    category: 'security'
  },
  'motion': {
    capabilities_add: ['alarm_motion', 'measure_battery'],
    capabilities_optional: ['measure_luminance', 'measure_temperature'],
    class: 'sensor',
    category: 'security'
  },
  'temperature': {
    capabilities_add: ['measure_temperature', 'measure_battery'],
    capabilities_optional: ['measure_humidity', 'alarm_temperature'],
    class: 'sensor',
    category: 'climate'
  },
  'humidity': {
    capabilities_add: ['measure_humidity', 'measure_battery'],
    capabilities_optional: ['measure_temperature'],
    class: 'sensor',
    category: 'climate'
  },
  'co2': {
    capabilities_add: ['measure_co2', 'measure_battery'],
    capabilities_optional: ['measure_temperature', 'measure_humidity', 'alarm_co2'],
    class: 'sensor',
    category: 'climate'
  },
  'vibration': {
    capabilities_add: ['alarm_motion', 'measure_battery'],
    capabilities_optional: ['alarm_tamper'],
    class: 'sensor',
    category: 'security'
  }
};

const stats = {
  total: 0,
  enriched: 0,
  skipped: 0,
  changes: []
};

const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => {
  return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory();
});

stats.total = drivers.length;

drivers.forEach(driverName => {
  const manifestPath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(manifestPath)) return;
  
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    let modified = false;
    const changes = [];
    
    // Detect device type
    const lower = driverName.toLowerCase();
    let deviceType = null;
    let rules = null;
    
    if (lower.includes('smoke')) {
      deviceType = 'smoke_detector';
      rules = enrichmentRules.smoke_detector;
    } else if (lower.includes('gas')) {
      deviceType = 'gas_detector';
      rules = enrichmentRules.gas_detector;
    } else if (lower.includes('leak') || lower.includes('water')) {
      deviceType = 'water_leak';
      rules = enrichmentRules.water_leak;
    } else if (lower.includes('sos')) {
      deviceType = 'sos_button';
      rules = enrichmentRules.sos_button;
    } else if (lower.includes('door') || lower.includes('window') || lower.includes('contact')) {
      deviceType = 'door_window';
      rules = enrichmentRules.door_window;
    } else if (lower.includes('motion') || lower.includes('pir')) {
      deviceType = 'motion';
      rules = enrichmentRules.motion;
    } else if (lower.includes('temperature')) {
      deviceType = 'temperature';
      rules = enrichmentRules.temperature;
    } else if (lower.includes('humidity')) {
      deviceType = 'humidity';
      rules = enrichmentRules.humidity;
    } else if (lower.includes('co2')) {
      deviceType = 'co2';
      rules = enrichmentRules.co2;
    } else if (lower.includes('vibration')) {
      deviceType = 'vibration';
      rules = enrichmentRules.vibration;
    }
    
    if (!rules) {
      stats.skipped++;
      return;
    }
    
    // Ensure capabilities array exists
    if (!manifest.capabilities) {
      manifest.capabilities = [];
      modified = true;
      changes.push('Created capabilities array');
    }
    
    // Add missing required capabilities
    rules.capabilities_add.forEach(cap => {
      if (!manifest.capabilities.includes(cap)) {
        manifest.capabilities.push(cap);
        modified = true;
        changes.push(`Added ${cap}`);
      }
    });
    
    // Add optional capabilities if device seems to support them
    rules.capabilities_optional.forEach(cap => {
      // Check if device name suggests this capability
      const capName = String(cap).replace('alarm_', '').replace('measure_', '');
      if (lower.includes(capName) && !manifest.capabilities.includes(cap)) {
        manifest.capabilities.push(cap);
        modified = true;
        changes.push(`Added ${cap} (optional)`);
      }
    });
    
    // Update class if needed
    if (rules.class && manifest.class !== rules.class) {
      manifest.class = rules.class;
      modified = true;
      changes.push(`Updated class to ${rules.class}`);
    }
    
    if (modified) {
      // Save manifest
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
      
      console.log(`✅ ${driverName} (${deviceType}):`);
      changes.forEach(change => console.log(`   ${change}`));
      console.log('');
      
      stats.enriched++;
      stats.changes.push({ driver: driverName, type: deviceType, changes });
    } else {
      stats.skipped++;
    }
    
  } catch (err) {
    console.log(`❌ ${driverName}: ${err.message}`);
  }
});

console.log('='.repeat(70));
console.log('\n📊 ENRICHMENT SUMMARY\n');
console.log(`Total drivers: ${stats.total}`);
console.log(`Enriched: ${stats.enriched}`);
console.log(`Skipped: ${stats.skipped}`);

// Save report
const report = {
  timestamp: new Date().toISOString(),
  stats,
  changes: stats.changes
};

fs.writeFileSync(
  path.join(ROOT, 'reports', 'CAPABILITIES_ENRICHMENT.json'),
  JSON.stringify(report, null, 2)
);

console.log('\n📝 Report saved to reports/CAPABILITIES_ENRICHMENT.json');
console.log('\n✅ ENRICHMENT COMPLETE!');
console.log('\n💡 Next: Sync to app.json and add flow cards');
