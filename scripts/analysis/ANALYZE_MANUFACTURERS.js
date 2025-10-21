#!/usr/bin/env node

/**
 * ANALYZE ALL MANUFACTURERS IN DRIVERS
 * Pour préparer la réorganisation par marque
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '..', '..', 'drivers');
const drivers = fs.readdirSync(driversDir).filter(f => 
  fs.statSync(path.join(driversDir, f)).isDirectory()
);

const manufacturerData = {};
const categories = {};

drivers.forEach(driverId => {
  const composePath = path.join(driversDir, driverId, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return;
  
  try {
    const driver = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    
    // Extract manufacturers
    const manufacturers = driver.zigbee?.manufacturerName || [];
    const productIds = driver.zigbee?.productId || [];
    const name = driver.name?.en || driverId;
    const driverClass = driver.class || 'unknown';
    const capabilities = driver.capabilities || [];
    const hasBattery = capabilities.includes('measure_battery') || capabilities.includes('alarm_battery');
    
    // Detect power type
    let powerType = 'unknown';
    if (hasBattery) powerType = 'battery';
    else if (driverId.includes('_ac')) powerType = 'ac';
    else if (driverId.includes('_dc')) powerType = 'dc';
    else if (driverId.includes('_hybrid')) powerType = 'hybrid';
    
    // Detect category
    let category = 'other';
    if (driverId.includes('wall_switch') || driverId.includes('touch_switch')) category = 'wall_switches';
    else if (driverId.includes('wireless_switch') || driverId.includes('scene_controller') || driverId.includes('button') || driverId.includes('remote')) category = 'wireless_remotes';
    else if (driverId.includes('smart_switch') || driverId.includes('switch_') && !driverId.includes('wall')) category = 'smart_switches';
    else if (driverId.includes('plug') || driverId.includes('socket') || driverId.includes('outlet')) category = 'plugs_sockets';
    else if (driverId.includes('dimmer')) category = 'dimmers';
    else if (driverId.includes('bulb') || driverId.includes('light')) category = 'bulbs_lights';
    else if (driverId.includes('curtain') || driverId.includes('blind') || driverId.includes('shutter') || driverId.includes('shade')) category = 'curtains_shutters';
    else if (driverId.includes('motion') || driverId.includes('pir') || driverId.includes('presence') || driverId.includes('radar')) category = 'motion_sensors';
    else if (driverId.includes('temp') || driverId.includes('humidity') || driverId.includes('temperature')) category = 'climate_sensors';
    else if (driverId.includes('door') || driverId.includes('window') || driverId.includes('contact')) category = 'door_window_sensors';
    else if (driverId.includes('water') || driverId.includes('leak')) category = 'water_sensors';
    else if (driverId.includes('smoke') || driverId.includes('co') || driverId.includes('gas')) category = 'safety_sensors';
    else if (driverId.includes('air_quality') || driverId.includes('tvoc') || driverId.includes('pm25') || driverId.includes('co2')) category = 'air_quality';
    else if (driverId.includes('thermostat') || driverId.includes('valve') || driverId.includes('radiator')) category = 'heating_cooling';
    else if (driverId.includes('led_strip') || driverId.includes('rgb')) category = 'led_strips';
    else if (driverId.includes('lock')) category = 'locks';
    else if (driverId.includes('doorbell')) category = 'doorbells';
    else if (driverId.includes('siren') || driverId.includes('alarm')) category = 'alarms';
    
    // Group by manufacturer
    if (manufacturers.length === 0) {
      // Try to detect from productId
      if (productIds.some(id => id.startsWith('lumi.'))) {
        manufacturers.push('Aqara');
      } else {
        manufacturers.push('Unknown/Generic');
      }
    }
    
    manufacturers.forEach(mfr => {
      // Normalize manufacturer name
      let brand = 'Unknown';
      if (mfr.includes('TZ') || mfr.includes('_TZ')) brand = 'Tuya';
      else if (mfr.toLowerCase().includes('lumi') || mfr.toLowerCase().includes('aqara')) brand = 'Aqara';
      else if (mfr.toLowerCase().includes('xiaomi')) brand = 'Xiaomi';
      else if (mfr.toLowerCase().includes('ikea')) brand = 'IKEA';
      else if (mfr.toLowerCase().includes('philips')) brand = 'Philips';
      else if (mfr.toLowerCase().includes('osram')) brand = 'OSRAM';
      else if (mfr.toLowerCase().includes('innr')) brand = 'Innr';
      else if (mfr.toLowerCase().includes('ledvance')) brand = 'LEDVANCE';
      else if (mfr.toLowerCase().includes('schneider')) brand = 'Schneider';
      else if (mfr.toLowerCase().includes('legrand')) brand = 'Legrand';
      else if (mfr.toLowerCase().includes('sonoff')) brand = 'Sonoff';
      else brand = mfr;
      
      if (!manufacturerData[brand]) {
        manufacturerData[brand] = {
          drivers: [],
          categories: {},
          totalCount: 0
        };
      }
      
      manufacturerData[brand].drivers.push({
        id: driverId,
        name: name,
        category: category,
        class: driverClass,
        powerType: powerType,
        manufacturers: manufacturers,
        productIds: productIds
      });
      
      manufacturerData[brand].totalCount++;
      
      if (!manufacturerData[brand].categories[category]) {
        manufacturerData[brand].categories[category] = [];
      }
      manufacturerData[brand].categories[category].push(driverId);
      
      // Global categories
      if (!categories[category]) categories[category] = 0;
      categories[category]++;
    });
    
  } catch (err) {
    console.error(`Error reading ${driverId}:`, err.message);
  }
});

console.log('\n📊 ANALYSE DES MANUFACTURERS\n');
console.log(`Total drivers: ${drivers.length}`);
console.log(`Marques identifiées: ${Object.keys(manufacturerData).length}\n`);

// Sort by count
const sortedBrands = Object.entries(manufacturerData)
  .sort((a, b) => b[1].totalCount - a[1].totalCount);

console.log('🏢 DISTRIBUTION PAR MARQUE:\n');
sortedBrands.forEach(([brand, data]) => {
  console.log(`${brand}: ${data.totalCount} drivers`);
  const catCount = Object.keys(data.categories).length;
  console.log(`   Catégories: ${catCount}`);
  Object.entries(data.categories).forEach(([cat, driverList]) => {
    console.log(`      - ${cat}: ${driverList.length}`);
  });
  console.log();
});

console.log('\n📦 CATÉGORIES GLOBALES:\n');
Object.entries(categories)
  .sort((a, b) => b[1] - a[1])
  .forEach(([cat, count]) => {
    console.log(`${cat}: ${count} drivers`);
  });

// Generate proposed structure
console.log('\n\n💡 STRUCTURE PROPOSÉE:\n');
console.log('drivers/');
sortedBrands.slice(0, 5).forEach(([brand, data]) => {
  const brandSlug = brand.toLowerCase().replace(/[^a-z0-9]/g, '_');
  console.log(`  ${brandSlug}/`);
  Object.keys(data.categories).slice(0, 3).forEach(cat => {
    console.log(`    ${cat}/`);
    data.categories[cat].slice(0, 2).forEach(driverId => {
      console.log(`      ${driverId}/`);
    });
    if (data.categories[cat].length > 2) {
      console.log(`      ... (${data.categories[cat].length - 2} more)`);
    }
  });
  if (Object.keys(data.categories).length > 3) {
    console.log(`    ... (${Object.keys(data.categories).length - 3} more categories)`);
  }
  console.log();
});

// Save to JSON
const outputPath = path.join(__dirname, 'MANUFACTURERS_ANALYSIS.json');
fs.writeFileSync(outputPath, JSON.stringify({
  brands: manufacturerData,
  categories: categories,
  totalDrivers: drivers.length,
  generatedAt: new Date().toISOString()
}, null, 2));

console.log(`\n✅ Analyse sauvegardée: ${outputPath}\n`);
