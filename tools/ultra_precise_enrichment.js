#!/usr/bin/env node
/**
 * ULTRA PRECISE ENRICHMENT - Catégorisation EXACTE par nom ET capabilities
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const APP_JSON = path.join(ROOT, 'app.json');
const SOURCE_FILE = path.join(ROOT, '.external_sources', 'koenkk_tuya_devices_herdsman_converters_1759501156003.json');

console.log('🎯 ULTRA PRECISE ENRICHMENT\n');

const sourceData = JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf8'));
const allManufacturers = sourceData.manufacturers || [];

// ULTRA PRECISE categorization - ORDER MATTERS!
function getUltraPreciseCategory(driverId, compose) {
  const lower = driverId.toLowerCase();
  const deviceClass = compose.class;
  
  // PRIORITY 1: EXACT NAME MATCHES (most specific first)
  
  // Climate devices
  if (lower.match(/^thermostat$/) || lower.match(/radiator_valve/) || 
      lower.match(/smart_radiator/) || lower.match(/^hvac/)) {
    return { category: 'climate', limit: 60 };
  }
  
  // Covers (curtains, blinds, shutters - NOT controllers!)
  if ((lower.includes('curtain') || lower.includes('blind') || 
       lower.includes('shutter') || lower.includes('shade') ||
       lower.includes('projector_screen')) && 
      !lower.includes('scene')) {
    return { category: 'covers', limit: 60 };
  }
  
  // Security
  if (lower.includes('lock') || lower.includes('doorbell') || 
      lower.includes('siren') || lower.includes('sos')) {
    return { category: 'security', limit: 50 };
  }
  
  // Power/Plugs
  if (lower.match(/plug/) || lower.match(/outlet/) || 
      lower.match(/socket/) && !lower.match(/switch/)) {
    return { category: 'power', limit: 80 };
  }
  
  // Lighting (bulbs, LEDs, strips - NOT switches!)
  if ((lower.includes('bulb') || lower.includes('spot') || 
       lower.match(/^led_strip/) || lower.match(/^rgb_led/) ||
       lower.includes('ceiling_light') || lower.match(/^milight/)) &&
      !lower.includes('controller')) {
    return { category: 'lighting', limit: 80 };
  }
  
  // Lighting controllers (special case)
  if (lower.match(/ceiling_light_controller/) || 
      lower.match(/led_strip_controller/) ||
      lower.match(/rgb_led_controller/) ||
      lower.match(/outdoor_light_controller/) ||
      lower.match(/milight_controller/)) {
    return { category: 'lighting', limit: 80 };
  }
  
  // Switches (ALL switch types)
  if (lower.includes('switch') || lower.includes('relay') || 
      lower.includes('scene_controller') || lower.includes('button') ||
      lower.includes('remote') || lower.includes('dimmer_switch') ||
      lower.includes('wireless') || lower.includes('gang') ||
      lower.includes('touch') || lower.includes('wall_switch')) {
    return { category: 'switches', limit: 150 };
  }
  
  // Dimmers (standalone)
  if (lower.match(/^dimmer$/) || lower.match(/^smart_dimmer/) ||
      lower.match(/touch_dimmer/)) {
    return { category: 'lighting', limit: 80 };
  }
  
  // Mini devices
  if (lower.match(/^mini$/)) {
    return { category: 'power', limit: 80 };
  }
  
  // Sensors (ALL sensor types)
  if (lower.includes('sensor') || lower.includes('detector') || 
      lower.includes('monitor') || lower.includes('motion') ||
      lower.includes('pir') || lower.includes('radar') ||
      lower.includes('leak') || lower.includes('smoke') ||
      lower.includes('co2') || lower.includes('co_') ||
      lower.includes('gas') || lower.includes('air_quality') ||
      lower.includes('temp') || lower.includes('humid') ||
      lower.includes('pressure') || lower.includes('lux') ||
      lower.includes('noise') || lower.includes('vibration') ||
      lower.includes('soil') || lower.includes('tank') ||
      lower.includes('formaldehyde') || lower.includes('tvoc') ||
      lower.includes('pm25') || lower.includes('presence') ||
      lower.includes('door_window') || lower.includes('multisensor')) {
    return { category: 'sensors', limit: 100 };
  }
  
  // Specialty controllers (irrigation, pool, solar, etc.)
  if (lower.includes('controller') || lower.includes('garage') ||
      lower.includes('irrigation') || lower.includes('sprinkler') ||
      lower.includes('pool') || lower.includes('solar') ||
      lower.includes('pet_feeder') || lower.includes('valve') ||
      lower.includes('fan') || lower.includes('zbbridge') ||
      lower.includes('gateway')) {
    return { category: 'specialty', limit: 60 };
  }
  
  // Fallback to device class
  if (deviceClass === 'sensor') return { category: 'sensors', limit: 100 };
  if (deviceClass === 'thermostat') return { category: 'climate', limit: 60 };
  if (deviceClass === 'windowcoverings') return { category: 'covers', limit: 60 };
  if (deviceClass === 'lock') return { category: 'security', limit: 50 };
  if (deviceClass === 'socket') return { category: 'power', limit: 80 };
  if (deviceClass === 'light') return { category: 'lighting', limit: 80 };
  if (deviceClass === 'button') return { category: 'switches', limit: 150 };
  
  // Default specialty
  return { category: 'specialty', limit: 60 };
}

function getRelevantManufacturers(category, limit, existingMfrs) {
  const relevant = new Set(existingMfrs.slice(0, 20));
  
  const patterns = {
    sensors: [/_TZ3000_/, /_TZE200_/, /^TS020[1-3]$/, /^TS0601$/],
    switches: [/_TZ3000_/, /_TZE200_/, /^TS000[1-4]$/, /^TS004F$/, /^Tuya$/, /^MOES$/],
    lighting: [/_TZ3000_/, /_TZE200_/, /^TS050[145][AB]?$/, /^TS110[EF]$/],
    power: [/_TZ3000_/, /^TS011F$/],
    climate: [/_TZE200_/, /^TS0601$/, /^TS0201$/],
    covers: [/_TZE200_/, /^TS130F$/, /^TS0601$/],
    security: [/_TZ3000_/, /_TZE200_/, /_TZE204_/],
    specialty: [/_TZE200_/, /_TZ3000_/, /^TS0601$/]
  };
  
  const categoryPatterns = patterns[category] || patterns.specialty;
  
  allManufacturers.forEach(mfr => {
    if (relevant.size >= limit) return;
    for (const pattern of categoryPatterns) {
      if (pattern.test(mfr)) {
        relevant.add(mfr);
        break;
      }
    }
  });
  
  if (relevant.size < limit) {
    allManufacturers.forEach(mfr => {
      if (relevant.size >= limit) return;
      relevant.add(mfr);
    });
  }
  
  return Array.from(relevant).sort();
}

// Process
const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
  .filter(e => e.isDirectory())
  .map(e => e.name);

const stats = {
  byCategory: {},
  corrections: [],
  totalAfter: 0
};

console.log('🔄 Processing with ULTRA PRECISION...\n');

drivers.forEach(driverId => {
  const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    if (!compose.zigbee || !compose.zigbee.manufacturerName) return;
    
    const before = compose.zigbee.manufacturerName.length;
    const { category, limit } = getUltraPreciseCategory(driverId, compose);
    const optimized = getRelevantManufacturers(category, limit, compose.zigbee.manufacturerName);
    const after = optimized.length;
    
    stats.totalAfter += after;
    
    if (!stats.byCategory[category]) {
      stats.byCategory[category] = { count: 0, total: 0, drivers: [] };
    }
    stats.byCategory[category].count++;
    stats.byCategory[category].total += after;
    stats.byCategory[category].drivers.push(driverId);
    
    if (before !== after) {
      const backupPath = composePath + '.backup_ultra';
      if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(composePath, backupPath);
      }
      
      compose.zigbee.manufacturerName = optimized;
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2), 'utf8');
      
      stats.corrections.push({ id: driverId, category, before, after });
      console.log(`  ✅ ${driverId.padEnd(40)} ${before.toString().padStart(3)} → ${after.toString().padStart(3)} [${category}]`);
    }
    
  } catch (error) {
    console.error(`  ❌ ${driverId}: ${error.message}`);
  }
});

// Update app.json
console.log('\n📦 Updating app.json...\n');
const appJson = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));

appJson.drivers.forEach(driver => {
  const composePath = path.join(DRIVERS_DIR, driver.id, 'driver.compose.json');
  if (fs.existsSync(composePath)) {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    if (compose.zigbee && compose.zigbee.manufacturerName) {
      driver.zigbee.manufacturerName = compose.zigbee.manufacturerName;
    }
  }
});

const appBackup = APP_JSON + '.backup_ultra';
if (!fs.existsSync(appBackup)) {
  fs.copyFileSync(APP_JSON, appBackup);
}
fs.writeFileSync(APP_JSON, JSON.stringify(appJson, null, 2), 'utf8');
console.log('✅ app.json synchronized\n');

// Report
console.log('━'.repeat(70));
console.log('📊 ULTRA PRECISE CATEGORIZATION RESULTS');
console.log('━'.repeat(70));
console.log(`Total manufacturer entries: ${stats.totalAfter.toLocaleString()}`);
console.log(`Corrections applied: ${stats.corrections.length}`);
console.log('\n📋 By Category:\n');

Object.entries(stats.byCategory)
  .sort((a, b) => b[1].total - a[1].total)
  .forEach(([cat, data]) => {
    const avg = Math.round(data.total / data.count);
    console.log(`${cat.toUpperCase().padEnd(12)} ${data.count.toString().padStart(3)} drivers × ${avg.toString().padStart(3)} avg = ${data.total.toLocaleString().padStart(6)} IDs`);
    console.log(`  Examples: ${data.drivers.slice(0, 5).join(', ')}`);
    console.log();
  });

console.log('━'.repeat(70));
console.log('\n✅ ULTRA PRECISE ENRICHMENT COMPLETE\n');

// Save categorization report
const report = {
  timestamp: new Date().toISOString(),
  totalDrivers: drivers.length,
  totalManufacturers: stats.totalAfter,
  byCategory: stats.byCategory,
  corrections: stats.corrections
};

fs.writeFileSync(
  path.join(ROOT, 'project-data', 'ultra_precise_categorization.json'),
  JSON.stringify(report, null, 2)
);

console.log('📄 Report saved: project-data/ultra_precise_categorization.json\n');
