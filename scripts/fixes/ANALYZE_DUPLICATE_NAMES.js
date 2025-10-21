#!/usr/bin/env node

/**
 * ANALYZE DUPLICATE/SIMILAR DRIVER NAMES
 * Identifie les drivers avec noms similaires qui doivent être distingués
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '..', '..', 'drivers');
const drivers = fs.readdirSync(driversDir).filter(f => 
  fs.statSync(path.join(driversDir, f)).isDirectory()
);

// Lire les noms des drivers
const driverNames = drivers.map(driverId => {
  const composePath = path.join(driversDir, driverId, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return { id: driverId, name: driverId };
  
  try {
    const driver = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    return {
      id: driverId,
      name: driver.name?.en || driverId,
      class: driver.class,
      capabilities: driver.capabilities || [],
      hasBattery: (driver.capabilities || []).includes('measure_battery'),
      energy: driver.energy
    };
  } catch (err) {
    return { id: driverId, name: driverId };
  }
});

// Grouper par nom
const nameGroups = {};
driverNames.forEach(driver => {
  const key = driver.name.toLowerCase().trim();
  if (!nameGroups[key]) nameGroups[key] = [];
  nameGroups[key].push(driver);
});

// Trouver les duplicates
const duplicates = Object.entries(nameGroups).filter(([_, drivers]) => drivers.length > 1);

console.log('\n🔍 ANALYSE DES NOMS SIMILAIRES/IDENTIQUES\n');
console.log(`Total drivers: ${driverNames.length}`);
console.log(`Noms uniques: ${Object.keys(nameGroups).length}`);
console.log(`Noms en conflit: ${duplicates.length}\n`);

if (duplicates.length > 0) {
  console.log('⚠️  CONFLITS DÉTECTÉS:\n');
  
  duplicates.forEach(([name, drivers]) => {
    console.log(`\n📛 "${name}" (${drivers.length} drivers):`);
    drivers.forEach(d => {
      const battery = d.hasBattery ? '🔋 Battery' : '⚡ AC/DC';
      const gangCount = d.id.match(/(\d+)gang/i)?.[1] || '?';
      console.log(`   - ${d.id} (${gangCount} gang, ${battery})`);
    });
  });
}

// Analyser patterns
console.log('\n\n📊 PATTERNS IDENTIFIÉS:\n');

const patterns = {
  'wireless_switch': [],
  'switch_': [],
  'smart_switch': [],
  'wall_switch': [],
  'touch_switch': [],
  'scene_controller': [],
  'dimmer_switch': []
};

driverNames.forEach(d => {
  Object.keys(patterns).forEach(pattern => {
    if (d.id.startsWith(pattern)) {
      patterns[pattern].push(d);
    }
  });
});

Object.entries(patterns).forEach(([pattern, drivers]) => {
  if (drivers.length > 0) {
    console.log(`${pattern}* : ${drivers.length} drivers`);
  }
});

// Suggestions de renommage
console.log('\n\n💡 SUGGESTIONS DE RENOMMAGE:\n');

const suggestions = [];

duplicates.forEach(([name, drivers]) => {
  drivers.forEach(d => {
    const gangMatch = d.id.match(/(\d+)gang/i);
    const gangCount = gangMatch ? gangMatch[1] : '1';
    const powerType = d.hasBattery ? 'Battery' : 
                     d.id.includes('_ac') ? 'AC' :
                     d.id.includes('_dc') ? 'DC' :
                     d.id.includes('hybrid') ? 'Hybrid' : 'Powered';
    
    const batteryType = d.energy?.batteries?.[0] || 'CR2032';
    
    let newName = `${gangCount}-Gang`;
    
    if (d.id.includes('wireless')) newName = `${gangCount}-Gang Wireless Switch`;
    else if (d.id.includes('smart')) newName = `${gangCount}-Gang Smart Switch`;
    else if (d.id.includes('wall')) newName = `${gangCount}-Gang Wall Switch`;
    else if (d.id.includes('touch')) newName = `${gangCount}-Gang Touch Switch`;
    else if (d.id.includes('scene')) newName = `${gangCount}-Button Scene Controller`;
    else if (d.id.includes('dimmer')) newName = `${gangCount}-Gang Dimmer Switch`;
    else newName = `${gangCount}-Gang Switch`;
    
    if (d.hasBattery) {
      newName += ` (${batteryType})`;
    } else {
      newName += ` (${powerType})`;
    }
    
    if (newName !== d.name) {
      suggestions.push({
        id: d.id,
        oldName: d.name,
        newName: newName
      });
    }
  });
});

if (suggestions.length > 0) {
  console.log(`${suggestions.length} drivers à renommer:\n`);
  suggestions.forEach(s => {
    console.log(`${s.id}:`);
    console.log(`  ❌ Old: "${s.oldName}"`);
    console.log(`  ✅ New: "${s.newName}"`);
    console.log();
  });
  
  // Sauvegarder dans un fichier JSON
  const outputPath = path.join(__dirname, 'RENAME_SUGGESTIONS.json');
  fs.writeFileSync(outputPath, JSON.stringify(suggestions, null, 2));
  console.log(`\n✅ Suggestions sauvegardées: ${outputPath}\n`);
}

console.log('\n✅ Analyse terminée\n');
