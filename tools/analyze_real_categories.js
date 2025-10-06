#!/usr/bin/env node
/**
 * ANALYZE REAL CATEGORIES - Analyse la vraie structure des drivers
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🔍 ANALYZING REAL DRIVER CATEGORIES\n');

const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
  .filter(e => e.isDirectory())
  .map(e => e.name)
  .sort();

console.log(`Found ${drivers.length} drivers\n`);

// Analyze by name patterns
const categories = {
  sensors: [],
  switches: [],
  lighting: [],
  climate: [],
  power: [],
  covers: [],
  security: [],
  specialty: []
};

drivers.forEach(driverId => {
  const lower = driverId.toLowerCase();
  
  // Read compose to get more info
  const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  let deviceClass = null;
  let capabilities = [];
  
  if (fs.existsSync(composePath)) {
    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      deviceClass = compose.class;
      capabilities = compose.capabilities || [];
    } catch (e) {}
  }
  
  // Categorize based on name AND class AND capabilities
  if (lower.includes('sensor') || lower.includes('detector') || lower.includes('monitor') ||
      lower.includes('motion') || lower.includes('pir') || lower.includes('radar') ||
      lower.includes('door_window') || lower.includes('leak') || lower.includes('smoke') ||
      lower.includes('co2') || lower.includes('co_') || lower.includes('gas') ||
      lower.includes('temperature') || lower.includes('humidity') || lower.includes('temp_humid') ||
      lower.includes('pressure') || lower.includes('lux') || lower.includes('noise') ||
      lower.includes('vibration') || lower.includes('soil') || lower.includes('tank') ||
      lower.includes('formaldehyde') || lower.includes('tvoc') || lower.includes('pm25') ||
      lower.includes('presence') || lower.includes('multisensor') ||
      deviceClass === 'sensor') {
    categories.sensors.push({ id: driverId, class: deviceClass, capabilities });
  }
  else if (lower.includes('switch') || lower.includes('relay') || lower.includes('gang') ||
           lower.includes('scene') || lower.includes('button') || lower.includes('remote') ||
           lower.includes('wireless') || lower.includes('touch') || lower.includes('wall_switch') ||
           deviceClass === 'button' || deviceClass === 'other') {
    categories.switches.push({ id: driverId, class: deviceClass, capabilities });
  }
  else if (lower.includes('light') || lower.includes('bulb') || lower.includes('led') ||
           lower.includes('dimmer') || lower.includes('rgb') || lower.includes('ceiling_light') ||
           lower.includes('strip') || lower.includes('spot') || lower.includes('milight') ||
           deviceClass === 'light') {
    categories.lighting.push({ id: driverId, class: deviceClass, capabilities });
  }
  else if (lower.includes('plug') || lower.includes('socket') || lower.includes('outlet') ||
           lower.includes('energy') || lower.includes('power_meter') || lower.includes('usb_outlet') ||
           lower.includes('extension') || deviceClass === 'socket') {
    categories.power.push({ id: driverId, class: deviceClass, capabilities });
  }
  else if (lower.includes('thermostat') || lower.includes('valve') || lower.includes('radiator') ||
           lower.includes('hvac') || lower.includes('climate') ||
           deviceClass === 'thermostat') {
    categories.climate.push({ id: driverId, class: deviceClass, capabilities });
  }
  else if (lower.includes('curtain') || lower.includes('blind') || lower.includes('shutter') ||
           lower.includes('shade') || lower.includes('roller') || lower.includes('cover') ||
           deviceClass === 'windowcoverings') {
    categories.covers.push({ id: driverId, class: deviceClass, capabilities });
  }
  else if (lower.includes('lock') || lower.includes('doorbell') || lower.includes('siren') ||
           lower.includes('alarm') || lower.includes('sos') || lower.includes('door_controller') ||
           deviceClass === 'lock' || deviceClass === 'doorbell' || deviceClass === 'homealarm') {
    categories.security.push({ id: driverId, class: deviceClass, capabilities });
  }
  else {
    // Specialty: fan, garage, pet, irrigation, etc.
    categories.specialty.push({ id: driverId, class: deviceClass, capabilities });
  }
});

// Display results
console.log('📊 CATEGORIZATION RESULTS\n');

Object.entries(categories).forEach(([category, items]) => {
  console.log(`\n${category.toUpperCase()} (${items.length} drivers):`);
  console.log('━'.repeat(60));
  items.forEach(item => {
    console.log(`  ${item.id.padEnd(40)} [${item.class || 'unknown'}]`);
  });
});

// Generate corrected manufacturer limits
console.log('\n\n📋 SUGGESTED MANUFACTURER LIMITS:\n');

const suggestedLimits = {
  sensors: 100,      // Many variants
  switches: 150,     // Highest variety
  lighting: 80,      // Color/dim variants
  power: 80,         // Socket variants
  climate: 60,       // Thermostat types
  covers: 60,        // Motor variants
  security: 50,      // Specific models
  specialty: 60      // Niche devices
};

Object.entries(categories).forEach(([category, items]) => {
  const limit = suggestedLimits[category];
  const total = items.length * limit;
  console.log(`${category}: ${items.length} drivers × ${limit} = ${total.toLocaleString()} IDs`);
});

const totalDrivers = Object.values(categories).reduce((sum, cat) => sum + cat.length, 0);
const totalIds = Object.entries(categories).reduce((sum, [cat, items]) => {
  return sum + (items.length * suggestedLimits[cat]);
}, 0);

console.log(`\nTOTAL: ${totalDrivers} drivers, ${totalIds.toLocaleString()} manufacturer IDs`);

// Save analysis
const output = {
  timestamp: new Date().toISOString(),
  totalDrivers,
  categories,
  suggestedLimits,
  estimatedTotalIds: totalIds
};

fs.writeFileSync(
  path.join(ROOT, 'project-data', 'real_categories_analysis.json'),
  JSON.stringify(output, null, 2)
);

console.log('\n✅ Analysis saved to project-data/real_categories_analysis.json\n');
