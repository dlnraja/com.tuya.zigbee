#!/usr/bin/env node
/**
 * EMERGENCY FIX - Reduce app.json size intelligently
 * Problem: 6.3 MB app.json causes Homey to show exclamation marks
 * Solution: Keep only relevant manufacturers per driver category
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const APP_JSON_PATH = path.join(ROOT, 'app.json');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🚨 EMERGENCY FIX - Reducing app.json size\n');
console.log('Current size:', (fs.statSync(APP_JSON_PATH).size / 1024 / 1024).toFixed(2), 'MB\n');

// Load source data with ALL manufacturers
const sourceData = JSON.parse(fs.readFileSync(
  path.join(ROOT, '.external_sources', 'koenkk_tuya_devices_herdsman_converters_1759501156003.json'),
  'utf8'
));
const allManufacturers = sourceData.manufacturers || [];

// Intelligent manufacturer categorization
const CATEGORY_PATTERNS = {
  switches: {
    patterns: [/_TZ3000_.*/, /_TZE200_[a-z0-9]{8}/, /^TS000[1-4]$/, /^Tuya$/, /^MOES$/, /^BSEED$/],
    keywords: ['switch', 'relay', 'gang', 'button', 'scene', 'wall', 'touch', 'wireless'],
    limit: 150  // Max manufacturers per switch driver
  },
  sensors: {
    patterns: [/_TZ3000_.*/, /_TZE200_.*/, /^TS020[1-3]$/, /^TS0601$/],
    keywords: ['sensor', 'monitor', 'detector', 'pir', 'motion', 'door', 'window', 'leak', 'smoke', 'gas', 'co', 'co2', 'temp', 'humid', 'soil', 'moisture', 'vibration', 'presence', 'radar', 'multisensor'],
    limit: 100
  },
  lighting: {
    patterns: [/_TZ3000_.*/, /_TZE200_.*/, /^TS050[145][AB]?$/, /^TS110[EF]$/],
    keywords: ['light', 'bulb', 'led', 'strip', 'rgb', 'dimmer', 'ceiling', 'spot', 'outdoor'],
    limit: 80
  },
  climate: {
    patterns: [/_TZE200_.*/, /^TS0601$/, /^TS0201$/],
    keywords: ['thermostat', 'valve', 'radiator', 'hvac', 'climate', 'temperature'],
    limit: 60
  },
  power: {
    patterns: [/_TZ3000_.*/, /^TS011F$/],
    keywords: ['plug', 'socket', 'outlet', 'energy', 'power', 'meter', 'usb', 'extension'],
    limit: 80
  },
  covers: {
    patterns: [/_TZE200_.*/, /^TS130F$/, /^TS0601$/],
    keywords: ['curtain', 'blind', 'shutter', 'roller', 'shade', 'cover', 'motor'],
    limit: 60
  },
  security: {
    patterns: [/_TZ3000_.*/, /_TZE200_.*/],
    keywords: ['lock', 'door', 'fingerprint', 'doorbell', 'siren', 'alarm', 'sos'],
    limit: 50
  },
  specialty: {
    patterns: [/_TZE200_.*/, /^TS0601$/],
    keywords: ['fan', 'garage', 'pet', 'irrigation', 'sprinkler', 'valve', 'pool', 'garden', 'projector'],
    limit: 60
  }
};

function categorizeDriver(driverId, compose) {
  const idLower = driverId.toLowerCase();
  
  for (const [category, config] of Object.entries(CATEGORY_PATTERNS)) {
    if (config.keywords.some(kw => idLower.includes(kw))) {
      return { category, config };
    }
  }
  
  return { category: 'specialty', config: CATEGORY_PATTERNS.specialty };
}

function getRelevantManufacturers(category, config, existingMfrs) {
  // Keep existing manufacturers (they're already proven to work)
  const relevant = new Set(existingMfrs);
  
  // Add pattern-matched manufacturers up to limit
  const matches = allManufacturers.filter(mfr => 
    config.patterns.some(pattern => {
      if (pattern instanceof RegExp) {
        return pattern.test(mfr);
      }
      return mfr === pattern;
    })
  );
  
  // Add matches until we reach limit
  for (const mfr of matches) {
    if (relevant.size >= config.limit) break;
    relevant.add(mfr);
  }
  
  return Array.from(relevant).sort();
}

// Process app.json
const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));

// Backup original
const backupPath = APP_JSON_PATH + '.massive_backup_' + Date.now();
fs.copyFileSync(APP_JSON_PATH, backupPath);
console.log('✅ Backup created:', path.basename(backupPath), '\n');

let stats = {
  totalBefore: 0,
  totalAfter: 0,
  driversProcessed: 0,
  byCategory: {}
};

console.log('🔧 Processing drivers...\n');

appJson.drivers.forEach(driver => {
  if (!driver.zigbee || !driver.zigbee.manufacturerName) return;
  
  const before = driver.zigbee.manufacturerName.length;
  stats.totalBefore += before;
  
  // Read driver.compose.json for more context
  const composePath = path.join(DRIVERS_DIR, driver.id, 'driver.compose.json');
  let compose = {};
  if (fs.existsSync(composePath)) {
    compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  }
  
  const { category, config } = categorizeDriver(driver.id, compose);
  
  // Get intelligent manufacturer list
  const optimized = getRelevantManufacturers(category, config, driver.zigbee.manufacturerName.slice(0, 20));
  
  driver.zigbee.manufacturerName = optimized;
  
  const after = optimized.length;
  stats.totalAfter += after;
  stats.driversProcessed++;
  
  if (!stats.byCategory[category]) {
    stats.byCategory[category] = { count: 0, totalMfrs: 0 };
  }
  stats.byCategory[category].count++;
  stats.byCategory[category].totalMfrs += after;
  
  console.log(`  ${driver.id}: ${before} → ${after} (${category})`);
});

// Also process driver.compose.json files
console.log('\n🔧 Processing driver.compose.json files...\n');

const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
  .filter(e => e.isDirectory())
  .map(e => e.name);

drivers.forEach(driverId => {
  const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    if (!compose.zigbee || !compose.zigbee.manufacturerName) return;
    
    const before = compose.zigbee.manufacturerName.length;
    const { category, config } = categorizeDriver(driverId, compose);
    
    const optimized = getRelevantManufacturers(category, config, compose.zigbee.manufacturerName.slice(0, 20));
    compose.zigbee.manufacturerName = optimized;
    
    // Backup
    const backupCompose = composePath + '.backup_emergency';
    if (!fs.existsSync(backupCompose)) {
      fs.copyFileSync(composePath, backupCompose);
    }
    
    fs.writeFileSync(composePath, JSON.stringify(compose, null, 2), 'utf8');
    
    console.log(`  ${driverId}: ${before} → ${optimized.length}`);
  } catch (error) {
    console.error(`  ✗ ${driverId}: ${error.message}`);
  }
});

// Save optimized app.json
fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2), 'utf8');

const newSize = fs.statSync(APP_JSON_PATH).size / 1024 / 1024;

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 OPTIMIZATION RESULTS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`File size: 6.3 MB → ${newSize.toFixed(2)} MB`);
console.log(`Reduction: ${((1 - newSize / 6.3) * 100).toFixed(1)}%`);
console.log(`Total manufacturer entries: ${stats.totalBefore.toLocaleString()} → ${stats.totalAfter.toLocaleString()}`);
console.log(`Drivers processed: ${stats.driversProcessed}`);
console.log('\nBy category:');
Object.entries(stats.byCategory).forEach(([cat, data]) => {
  const avg = Math.round(data.totalMfrs / data.count);
  console.log(`  ${cat}: ${data.count} drivers, avg ${avg} mfrs/driver`);
});
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('✅ EMERGENCY FIX COMPLETE');
console.log('🎯 This should resolve the exclamation marks issue\n');
console.log('Next steps:');
console.log('  1. Test locally: homey app install');
console.log('  2. Commit changes');
console.log('  3. Publish hotfix: homey app publish');
