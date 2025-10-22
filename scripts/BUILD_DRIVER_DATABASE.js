#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const OUTPUT = path.join(ROOT, 'settings', 'drivers-database.json');

console.log('🔍 Building drivers database for search engine...\n');

const drivers = [];
const driversPath = fs.readdirSync(DRIVERS_DIR);

for (const driverName of driversPath) {
  const driverPath = path.join(DRIVERS_DIR, driverName);
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) continue;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    
    // Extract category from driver name
    let category = 'Other';
    const name = driverName.toLowerCase();
    
    if (name.includes('motion') || name.includes('pir')) category = 'Motion Sensors';
    else if (name.includes('contact') || name.includes('door') || name.includes('window')) category = 'Contact Sensors';
    else if (name.includes('temperature') || name.includes('humidity') || name.includes('climate')) category = 'Climate Sensors';
    else if (name.includes('plug')) category = 'Smart Plugs';
    else if (name.includes('switch') && !name.includes('wireless')) category = 'Smart Switches';
    else if (name.includes('wireless') || name.includes('remote') || name.includes('button')) category = 'Wireless Switches';
    else if (name.includes('bulb')) category = 'Light Bulbs';
    else if (name.includes('led') || name.includes('strip')) category = 'LED Strips';
    else if (name.includes('dimmer')) category = 'Dimmers';
    else if (name.includes('curtain') || name.includes('blind')) category = 'Curtains';
    else if (name.includes('thermostat') || name.includes('trv')) category = 'Thermostats';
    else if (name.includes('valve')) category = 'Valves';
    else if (name.includes('smoke') || name.includes('gas') || name.includes('water')) category = 'Safety Sensors';
    else if (name.includes('sos') || name.includes('emergency')) category = 'Emergency Buttons';
    
    // Extract brand from driver name
    let brand = 'Generic';
    if (name.startsWith('tuya_')) brand = 'Tuya';
    else if (name.startsWith('moes_')) brand = 'MOES';
    else if (name.startsWith('avatto_')) brand = 'AVATTO';
    else if (name.startsWith('lsc_')) brand = 'LSC / Lidl';
    else if (name.startsWith('zemismart_')) brand = 'ZemiSmart';
    else if (name.startsWith('nous_')) brand = 'NOUS';
    else if (name.startsWith('lonsonho_')) brand = 'Lonsonho';
    else if (name.startsWith('xiaomi_')) brand = 'Xiaomi';
    else if (name.startsWith('aqara_')) brand = 'Aqara';
    else if (name.startsWith('sonoff_')) brand = 'Sonoff';
    else if (name.startsWith('samsung_')) brand = 'Samsung';
    else if (name.startsWith('philips_')) brand = 'Philips';
    else if (name.startsWith('innr_')) brand = 'INNR';
    else if (name.startsWith('osram_')) brand = 'OSRAM';
    else if (name.startsWith('ikea_')) brand = 'IKEA';
    
    // Get product IDs
    const productIds = compose.zigbee?.productId || [];
    const manufacturerIds = compose.zigbee?.manufacturerName || [];
    
    drivers.push({
      id: driverName,
      name: compose.name?.en || driverName,
      category,
      brand,
      productIds: Array.isArray(productIds) ? productIds : [productIds],
      manufacturerIds: Array.isArray(manufacturerIds) ? manufacturerIds : [manufacturerIds],
      class: compose.class || 'other',
      capabilities: compose.capabilities || [],
      connectivity: compose.connectivity || []
    });
    
  } catch (err) {
    console.log(`⚠️  Skipping ${driverName}: ${err.message}`);
  }
}

// Sort by category then brand
drivers.sort((a, b) => {
  if (a.category !== b.category) return a.category.localeCompare(b.category);
  return a.brand.localeCompare(b.brand);
});

fs.writeFileSync(OUTPUT, JSON.stringify({ drivers, generated: new Date().toISOString() }, null, 2));

console.log(`\n✅ Database created: ${drivers.length} drivers`);
console.log(`📁 Output: settings/drivers-database.json\n`);

// Stats
const categories = {};
const brands = {};
drivers.forEach(d => {
  categories[d.category] = (categories[d.category] || 0) + 1;
  brands[d.brand] = (brands[d.brand] || 0) + 1;
});

console.log('📊 Categories:');
Object.entries(categories).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
  console.log(`   ${cat}: ${count} drivers`);
});

console.log('\n🎨 Brands:');
Object.entries(brands).sort((a, b) => b[1] - a[1]).forEach(([brand, count]) => {
  console.log(`   ${brand}: ${count} drivers`);
});
