#!/usr/bin/env node
// MEGA ENRICHMENT + UNBRANDED - Enrichir avec tous les IDs + Organisation

const fs = require('fs');
const path = require('path');

const root = 'c:\\Users\\HP\\Desktop\\tuya_repair';
const drivers = path.join(root, 'drivers');
const idsFile = path.join(root, 'ALL_MANUFACTURER_IDS.json');

console.log('🌟 MEGA ENRICHMENT + UNBRANDED\n');

if (!fs.existsSync(idsFile)) {
  console.log('❌ Exécuter d\'abord: node tools\\EXTRACT_ALL_IDS.js\n');
  process.exit(1);
}

const allIDs = JSON.parse(fs.readFileSync(idsFile, 'utf8')).ids;
console.log(`📊 ${allIDs.length} IDs disponibles\n`);

// Grouper IDs par type de device (heuristique)
const idsByType = {
  sensor: new Set(),
  switch: new Set(),
  light: new Set(),
  button: new Set(),
  other: new Set()
};

// Patterns pour classification
allIDs.forEach(id => {
  // Les IDs ne contiennent pas d'info type directement
  // On les ajoutera selon le type de driver existant
  idsByType.other.add(id);
});

let enriched = 0;
let totalAdded = 0;

console.log('🔧 Enrichissement drivers...\n');

fs.readdirSync(drivers).forEach(driverName => {
  const file = path.join(drivers, driverName, 'driver.compose.json');
  if (!fs.existsSync(file)) return;
  
  try {
    let compose = JSON.parse(fs.readFileSync(file, 'utf8'));
    
    if (!compose.zigbee) return;
    
    const current = new Set(compose.zigbee.manufacturerName || []);
    const initialSize = current.size;
    
    // Ajouter TOUS les IDs compatibles (stratégie agressive)
    // Pour maximiser support
    allIDs.forEach(id => {
      if (!current.has(id)) {
        current.add(id);
      }
    });
    
    const added = current.size - initialSize;
    
    if (added > 0) {
      compose.zigbee.manufacturerName = Array.from(current).sort();
      
      // Mode UNBRANDED: Nettoyer le nom
      if (compose.name && compose.name.en) {
        let name = compose.name.en;
        // Supprimer mentions de marques
        name = name.replace(/\b(Tuya|Moes|Lonsonho|Avatto|Girier|Zemismart|Neo|Smart|Pro|Advanced)\b/gi, '').trim();
        name = name.replace(/\s+/g, ' ');
        if (name) compose.name.en = name;
      }
      
      fs.writeFileSync(file, JSON.stringify(compose, null, 2));
      
      console.log(`  ✅ ${driverName}: +${added} IDs (total: ${current.size})`);
      enriched++;
      totalAdded += added;
    }
  } catch (e) {
    console.log(`  ❌ ${driverName}: ${e.message}`);
  }
});

console.log('\n' + '='.repeat(80));
console.log('📊 RAPPORT');
console.log('='.repeat(80));
console.log(`\n✅ Drivers enrichis: ${enriched}`);
console.log(`✅ IDs ajoutés: ${totalAdded}`);
console.log(`✅ Mode UNBRANDED: activé\n`);

console.log('🔄 REBUILD:\n');
console.log('  Remove-Item -Recurse -Force .homeybuild,.homeycompose');
console.log('  homey app build');
console.log('  homey app validate --level=publish\n');
