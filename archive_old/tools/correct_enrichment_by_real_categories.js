#!/usr/bin/env node
/**
 * CORRECT ENRICHMENT - Enrichissement basé sur VRAIES catégories
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const APP_JSON = path.join(ROOT, 'app.json');
const SOURCE_FILE = path.join(ROOT, '.external_sources', 'koenkk_tuya_devices_herdsman_converters_1759501156003.json');

console.log('🔧 CORRECT ENRICHMENT BY REAL CATEGORIES\n');

// Load manufacturer database
const sourceData = JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf8'));
const allManufacturers = sourceData.manufacturers || [];
console.log(`📦 Loaded ${allManufacturers.length} manufacturers\n`);

// CORRECT categorization based on EXACT analysis
function getRealCategory(driverId, compose) {
  const lower = driverId.toLowerCase();
  const deviceClass = compose.class;
  const capabilities = compose.capabilities || [];
  
  // CLIMATE: thermostat, valve, radiator, hvac
  if (lower.includes('thermostat') || lower.includes('radiator_valve') || 
      lower.includes('hvac') || lower.includes('smart_radiator') ||
      deviceClass === 'thermostat') {
    return { category: 'climate', limit: 60 };
  }
  
  // COVERS: curtain, blind, shutter, roller, shade
  if (lower.includes('curtain') || lower.includes('blind') || 
      lower.includes('shutter') || lower.includes('roller') || 
      lower.includes('shade') || lower.includes('projector_screen') ||
      deviceClass === 'windowcoverings') {
    return { category: 'covers', limit: 60 };
  }
  
  // SECURITY: lock, doorbell, siren, alarm
  if (lower.includes('lock') || lower.includes('doorbell') || 
      lower.includes('siren') || lower.includes('alarm') || 
      lower.includes('sos') || lower.includes('door_controller') ||
      deviceClass === 'lock' || deviceClass === 'doorbell' || 
      deviceClass === 'homealarm') {
    return { category: 'security', limit: 50 };
  }
  
  // POWER: plug, socket, outlet, energy, power_meter
  if (lower.includes('plug') || lower.includes('socket') || 
      lower.includes('outlet') || lower.includes('energy_monitoring') ||
      lower.includes('power_meter') || lower.includes('usb_outlet') ||
      lower.includes('extension_plug') || lower.includes('smart_plug') ||
      (deviceClass === 'socket' && !lower.includes('switch'))) {
    return { category: 'power', limit: 80 };
  }
  
  // LIGHTING: light, bulb, led, dimmer (BUT NOT switches with dimmer!)
  if ((lower.includes('light') || lower.includes('bulb') || 
       lower.includes('led') || lower.includes('rgb') || 
       lower.includes('spot') || lower.includes('milight') ||
       lower.includes('ceiling_light')) && 
      !lower.includes('switch') && !lower.includes('controller') &&
      (deviceClass === 'light' || capabilities.includes('light_hue'))) {
    return { category: 'lighting', limit: 80 };
  }
  
  // SWITCHES: All switches, relays, scene controllers, remotes
  if (lower.includes('switch') || lower.includes('relay') || 
      lower.includes('scene') || lower.includes('button') || 
      lower.includes('remote') || lower.includes('wireless') ||
      lower.includes('dimmer_switch') || lower.includes('touch') ||
      lower.includes('wall_switch') || lower.includes('gang') ||
      deviceClass === 'button') {
    return { category: 'switches', limit: 150 };
  }
  
  // SENSORS: All sensors, monitors, detectors
  if (lower.includes('sensor') || lower.includes('detector') || 
      lower.includes('monitor') || lower.includes('motion') || 
      lower.includes('pir') || lower.includes('radar') ||
      lower.includes('door_window') || lower.includes('leak') || 
      lower.includes('smoke') || lower.includes('co2') || 
      lower.includes('co_') || lower.includes('gas') ||
      lower.includes('temperature') || lower.includes('humidity') || 
      lower.includes('temp_humid') || lower.includes('pressure') || 
      lower.includes('lux') || lower.includes('noise') ||
      lower.includes('vibration') || lower.includes('soil') || 
      lower.includes('tank') || lower.includes('formaldehyde') || 
      lower.includes('tvoc') || lower.includes('pm25') ||
      lower.includes('presence') || lower.includes('multisensor') ||
      lower.includes('air_quality') || lower.includes('climate_monitor') ||
      deviceClass === 'sensor') {
    return { category: 'sensors', limit: 100 };
  }
  
  // SPECIALTY: Everything else (fan, garage, pet, irrigation, etc.)
  return { category: 'specialty', limit: 60 };
}

function getRelevantManufacturers(category, limit, existingMfrs) {
  // Keep original manufacturers (proven to work)
  const relevant = new Set(existingMfrs.slice(0, 20));
  
  // Pattern matching by category
  const patterns = {
    sensors: [/_TZ3000_/, /_TZE200_/, /^TS020[1-3]$/, /^TS0601$/],
    switches: [/_TZ3000_/, /_TZE200_/, /^TS000[1-4]$/, /^Tuya$/, /^MOES$/, /^BSEED$/],
    lighting: [/_TZ3000_/, /_TZE200_/, /^TS050[145][AB]?$/, /^TS110[EF]$/],
    power: [/_TZ3000_/, /^TS011F$/],
    climate: [/_TZE200_/, /^TS0601$/, /^TS0201$/],
    covers: [/_TZE200_/, /^TS130F$/, /^TS0601$/],
    security: [/_TZ3000_/, /_TZE200_/],
    specialty: [/_TZE200_/, /^TS0601$/]
  };
  
  const categoryPatterns = patterns[category] || patterns.specialty;
  
  // Add pattern-matched manufacturers
  allManufacturers.forEach(mfr => {
    if (relevant.size >= limit) return;
    
    for (const pattern of categoryPatterns) {
      if (pattern.test(mfr)) {
        relevant.add(mfr);
        break;
      }
    }
  });
  
  // If still not enough, add more general ones
  if (relevant.size < limit) {
    allManufacturers.forEach(mfr => {
      if (relevant.size >= limit) return;
      relevant.add(mfr);
    });
  }
  
  return Array.from(relevant).sort();
}

// Process all drivers
const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
  .filter(e => e.isDirectory())
  .map(e => e.name);

const stats = {
  byCategory: {},
  totalBefore: 0,
  totalAfter: 0,
  corrections: []
};

console.log('🔄 Processing drivers...\n');

drivers.forEach(driverId => {
  const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) return;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    
    if (!compose.zigbee || !compose.zigbee.manufacturerName) return;
    
    const before = compose.zigbee.manufacturerName.length;
    stats.totalBefore += before;
    
    // Get REAL category
    const { category, limit } = getRealCategory(driverId, compose);
    
    // Get relevant manufacturers
    const optimized = getRelevantManufacturers(category, limit, compose.zigbee.manufacturerName);
    
    const after = optimized.length;
    stats.totalAfter += after;
    
    // Track by category
    if (!stats.byCategory[category]) {
      stats.byCategory[category] = { count: 0, total: 0 };
    }
    stats.byCategory[category].count++;
    stats.byCategory[category].total += after;
    
    // Save if changed
    if (before !== after) {
      // Backup
      const backupPath = composePath + '.backup_correct';
      if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(composePath, backupPath);
      }
      
      compose.zigbee.manufacturerName = optimized;
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2), 'utf8');
      
      stats.corrections.push({ id: driverId, category, before, after });
      console.log(`  ✅ ${driverId}: ${before} → ${after} [${category}]`);
    }
    
  } catch (error) {
    console.error(`  ❌ ${driverId}: ${error.message}`);
  }
});

// Update app.json
console.log('\n📦 Updating app.json...\n');

const appJson = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));

appJson.drivers.forEach(driver => {
  if (!driver.zigbee || !driver.zigbee.manufacturerName) return;
  
  const composePath = path.join(DRIVERS_DIR, driver.id, 'driver.compose.json');
  
  if (fs.existsSync(composePath)) {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    
    if (compose.zigbee && compose.zigbee.manufacturerName) {
      driver.zigbee.manufacturerName = compose.zigbee.manufacturerName;
    }
  }
});

// Backup app.json
const appBackup = APP_JSON + '.backup_correct';
if (!fs.existsSync(appBackup)) {
  fs.copyFileSync(APP_JSON, appBackup);
}

fs.writeFileSync(APP_JSON, JSON.stringify(appJson, null, 2), 'utf8');

console.log('✅ app.json updated\n');

// Report
console.log('━'.repeat(60));
console.log('📊 CORRECTION RESULTS');
console.log('━'.repeat(60));
console.log(`Total before: ${stats.totalBefore.toLocaleString()}`);
console.log(`Total after: ${stats.totalAfter.toLocaleString()}`);
console.log(`Corrections: ${stats.corrections.length}`);
console.log('\nBy category:');

Object.entries(stats.byCategory)
  .sort((a, b) => b[1].total - a[1].total)
  .forEach(([cat, data]) => {
    const avg = Math.round(data.total / data.count);
    console.log(`  ${cat.padEnd(12)}: ${data.count} drivers, ${data.total.toLocaleString()} IDs (avg ${avg})`);
  });

console.log('━'.repeat(60));
console.log('\n✅ ENRICHMENT CORRECTION COMPLETE\n');
