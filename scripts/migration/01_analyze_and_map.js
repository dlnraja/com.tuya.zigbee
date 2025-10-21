#!/usr/bin/env node

/**
 * PHASE 1: ANALYSE & MAPPING COMPLET
 * Génère le mapping complet OLD → NEW pour tous les drivers
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '..', '..', 'drivers');
const outputDir = __dirname;

/**
 * Détecte la marque depuis manufacturerNames
 */
function detectBrand(manufacturerNames = [], productIds = []) {
  const names = manufacturerNames.filter(Boolean);
  const products = productIds.filter(Boolean);
  
  // Tuya variants
  if (names.some(m => m.includes('_TZ') || m.includes('_TY'))) return 'tuya';
  
  // Aqara/Xiaomi
  if (names.some(m => m.toLowerCase().includes('lumi') || m.toLowerCase().includes('aqara')) ||
      products.some(p => p.startsWith('lumi.'))) return 'aqara';
  
  // IKEA
  if (names.some(m => m.toLowerCase().includes('ikea') || m === 'TRADFRI')) return 'ikea';
  
  // Philips/Signify
  if (names.some(m => m.toLowerCase().includes('philips') || m.includes('Signify'))) return 'philips';
  
  // Sonoff
  if (names.some(m => m.toLowerCase().includes('sonoff') || m.toLowerCase().includes('ewelink'))) return 'sonoff';
  
  // Legrand
  if (names.some(m => m.toLowerCase().includes('legrand'))) return 'legrand';
  
  // Schneider
  if (names.some(m => m.toLowerCase().includes('schneider'))) return 'schneider';
  
  // GE
  if (names.some(m => m.toLowerCase().includes('ge ') || m === 'GE')) return 'ge';
  
  // Sengled
  if (names.some(m => m.toLowerCase().includes('sengled'))) return 'sengled';
  
  // Samsung/SmartThings
  if (names.some(m => m.toLowerCase().includes('samsung') || m.toLowerCase().includes('smartthings') || m === 'Samjin')) return 'samsung';
  
  // Default: Tuya (95%)
  return 'tuya';
}

/**
 * Génère nouveau ID de driver
 */
function generateNewDriverId(oldId, brand, battery, driverData) {
  const parts = [brand];
  
  // Détecter catégorie
  if (oldId.includes('motion') || oldId.includes('pir') || oldId.includes('presence') || oldId.includes('radar')) {
    parts.push('motion_sensor');
    if (oldId.includes('mmwave') || oldId.includes('radar')) parts.push('mmwave');
    else if (oldId.includes('pir')) parts.push('pir');
    else parts.push('pir');
    if (oldId.includes('advanced')) parts.push('advanced');
    else if (oldId.includes('pro')) parts.push('pro');
    else parts.push('basic');
  }
  else if (oldId.includes('temperature') && oldId.includes('humidity')) {
    parts.push('temp_humidity_sensor');
    if (oldId.includes('advanced')) parts.push('advanced');
    else if (oldId.includes('pro')) parts.push('pro');
    else parts.push('basic');
  }
  else if (oldId.includes('temp') && oldId.includes('humid')) {
    parts.push('temp_humidity_sensor');
    parts.push('basic');
  }
  else if (oldId.includes('water') && oldId.includes('leak')) {
    parts.push('water_leak_detector');
    if (oldId.includes('advanced')) parts.push('advanced');
    else parts.push('basic');
  }
  else if (oldId.includes('door') && oldId.includes('window')) {
    parts.push('door_window_sensor');
    parts.push('basic');
  }
  else if (oldId.includes('contact')) {
    parts.push('contact_sensor');
    parts.push('basic');
  }
  else if (oldId.includes('smoke')) {
    parts.push('smoke_detector');
    if (oldId.includes('advanced')) parts.push('advanced');
    else parts.push('basic');
  }
  else if (oldId.includes('co_detector') || oldId.includes('co2')) {
    if (oldId.includes('co2')) parts.push('co2_sensor');
    else parts.push('co_detector');
    if (oldId.includes('pro')) parts.push('pro');
    else parts.push('basic');
  }
  else if (oldId.includes('wireless_switch') || oldId.includes('scene_controller') || oldId.includes('remote')) {
    parts.push('wireless_switch');
    const match = oldId.match(/(\d+)(gang|button)/);
    if (match) parts.push(`${match[1]}button`);
    else parts.push('1button');
  }
  else if (oldId.includes('wall_switch')) {
    parts.push('wall_switch');
    const match = oldId.match(/(\d+)gang/);
    if (match) parts.push(`${match[1]}gang`);
    else parts.push('1gang');
    if (oldId.includes('touch')) parts.push('touch');
  }
  else if (oldId.includes('smart_switch') || oldId.includes('switch_') && !oldId.includes('wall')) {
    parts.push('smart_switch');
    const match = oldId.match(/(\d+)gang/);
    if (match) parts.push(`${match[1]}gang`);
    else parts.push('1gang');
  }
  else if (oldId.includes('plug') || oldId.includes('socket') || oldId.includes('outlet')) {
    parts.push('plug');
    if (oldId.includes('energy')) parts.push('energy_monitor');
    else if (oldId.includes('smart')) parts.push('smart');
    else parts.push('basic');
  }
  else if (oldId.includes('dimmer')) {
    parts.push('dimmer');
    const match = oldId.match(/(\d+)gang/);
    if (match) parts.push(`${match[1]}gang`);
    if (oldId.includes('touch')) parts.push('touch');
    else if (oldId.includes('wireless')) parts.push('wireless');
  }
  else if (oldId.includes('bulb') || oldId.includes('light')) {
    parts.push('bulb');
    if (oldId.includes('rgb')) parts.push('rgb');
    else if (oldId.includes('color')) parts.push('color');
    else if (oldId.includes('tunable')) parts.push('tunable');
    else parts.push('white');
  }
  else if (oldId.includes('led_strip')) {
    parts.push('led_strip');
    if (oldId.includes('pro')) parts.push('pro');
    else if (oldId.includes('advanced')) parts.push('advanced');
    else parts.push('basic');
  }
  else if (oldId.includes('curtain') || oldId.includes('blind') || oldId.includes('shutter') || oldId.includes('shade')) {
    if (oldId.includes('curtain')) parts.push('curtain_motor');
    else if (oldId.includes('blind')) parts.push('roller_blind');
    else if (oldId.includes('shutter')) parts.push('roller_shutter');
    else parts.push('shade_controller');
  }
  else if (oldId.includes('lock')) {
    parts.push('lock');
    if (oldId.includes('fingerprint')) parts.push('fingerprint');
    else if (oldId.includes('smart')) parts.push('smart');
    else parts.push('basic');
  }
  else if (oldId.includes('thermostat') || oldId.includes('valve')) {
    if (oldId.includes('thermostat')) parts.push('thermostat');
    else if (oldId.includes('radiator')) parts.push('radiator_valve');
    else if (oldId.includes('water')) parts.push('water_valve');
    else parts.push('valve');
    if (oldId.includes('smart')) parts.push('smart');
  }
  else if (oldId.includes('doorbell')) {
    parts.push('doorbell');
    if (oldId.includes('camera')) parts.push('camera');
    else parts.push('button');
  }
  else if (oldId.includes('siren') || oldId.includes('alarm')) {
    parts.push('siren');
    if (oldId.includes('outdoor')) parts.push('outdoor');
  }
  else {
    // Fallback générique
    const cleaned = oldId.replace(/_battery$|_ac$|_dc$|_hybrid$|_cr\d+$/gi, '');
    parts.push(cleaned);
  }
  
  // Ajouter power type
  if (battery) {
    parts.push(battery.toLowerCase());
  } else if (oldId.includes('_ac')) {
    parts.push('ac');
  } else if (oldId.includes('_dc')) {
    parts.push('dc');
  } else if (oldId.includes('_hybrid')) {
    parts.push('hybrid');
  }
  
  return parts.join('_');
}

console.log('\n🔍 PHASE 1: ANALYSE & MAPPING\n');

const drivers = fs.readdirSync(driversDir).filter(f => 
  fs.statSync(path.join(driversDir, f)).isDirectory()
);

const migrationMap = [];
const stats = {
  total: drivers.length,
  toRename: 0,
  toDuplicate: 0,
  unchanged: 0,
  errors: 0,
  brands: {},
  batteries: {}
};

for (const oldId of drivers) {
  const composePath = path.join(driversDir, oldId, 'driver.compose.json');
  if (!fs.existsSync(composePath)) {
    stats.errors++;
    continue;
  }
  
  try {
    const driver = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    
    const manufacturerNames = driver.zigbee?.manufacturerName || [];
    const productIds = driver.zigbee?.productId || [];
    const batteries = driver.energy?.batteries || [];
    
    const brand = detectBrand(manufacturerNames, productIds);
    
    // Stats par marque
    stats.brands[brand] = (stats.brands[brand] || 0) + 1;
    
    // Multi-battery: dupliquer
    if (batteries.length > 1) {
      batteries.forEach(battery => {
        const newId = generateNewDriverId(oldId, brand, battery, driver);
        stats.batteries[battery] = (stats.batteries[battery] || 0) + 1;
        
        migrationMap.push({
          oldId,
          newId,
          brand,
          battery,
          action: 'duplicate',
          oldName: driver.name?.en || oldId,
          manufacturerNames,
          productIds
        });
        stats.toDuplicate++;
      });
    } 
    // Single battery ou no battery: renommer
    else {
      const battery = batteries[0] || null;
      if (battery) stats.batteries[battery] = (stats.batteries[battery] || 0) + 1;
      
      const newId = generateNewDriverId(oldId, brand, battery, driver);
      
      if (newId !== oldId) {
        migrationMap.push({
          oldId,
          newId,
          brand,
          battery: battery || 'none',
          action: 'rename',
          oldName: driver.name?.en || oldId,
          manufacturerNames,
          productIds
        });
        stats.toRename++;
      } else {
        stats.unchanged++;
      }
    }
    
  } catch (err) {
    console.error(`❌ Error analyzing ${oldId}:`, err.message);
    stats.errors++;
  }
}

console.log('📊 STATISTIQUES:\n');
console.log(`Total drivers:     ${stats.total}`);
console.log(`À renommer:        ${stats.toRename}`);
console.log(`À dupliquer:       ${stats.toDuplicate}`);
console.log(`Inchangés:         ${stats.unchanged}`);
console.log(`Erreurs:           ${stats.errors}`);
console.log(`\nNOUVEAU TOTAL:     ${stats.toRename + stats.toDuplicate}\n`);

console.log('🏢 PAR MARQUE:\n');
Object.entries(stats.brands)
  .sort((a, b) => b[1] - a[1])
  .forEach(([brand, count]) => {
    console.log(`${brand.padEnd(12)} ${count} drivers`);
  });

console.log('\n🔋 PAR BATTERIE:\n');
Object.entries(stats.batteries)
  .sort((a, b) => b[1] - a[1])
  .forEach(([battery, count]) => {
    console.log(`${battery.padEnd(12)} ${count} drivers`);
  });

// Sauvegarder mapping
const mappingPath = path.join(outputDir, 'MIGRATION_MAP_v4.json');
fs.writeFileSync(mappingPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  stats,
  mapping: migrationMap
}, null, 2));

console.log(`\n✅ Mapping sauvegardé: ${mappingPath}`);
console.log(`\n📝 Exemples de transformation:\n`);

migrationMap.slice(0, 10).forEach(m => {
  const action = m.action === 'duplicate' ? '📋 DUP' : '✏️  REN';
  console.log(`${action}  ${m.oldId}`);
  console.log(`      → ${m.newId} (${m.brand}, ${m.battery})`);
});

if (migrationMap.length > 10) {
  console.log(`\n... et ${migrationMap.length - 10} autres\n`);
}

console.log(`\n✅ PHASE 1 TERMINÉE\n`);
console.log(`Prochaine étape: node scripts/migration/02_duplicate_drivers.js\n`);
