#!/usr/bin/env node
// SMART ENRICHMENT - Intelligent matching manufacturerName par similarité

const fs = require('fs');
const path = require('path');

const root = 'c:\\Users\\HP\\Desktop\\tuya_repair';
const drivers = path.join(root, 'drivers');
const idsFile = path.join(root, 'ALL_MANUFACTURER_IDS.json');

console.log('🧠 SMART ENRICHMENT - Mode Intelligent\n');

if (!fs.existsSync(idsFile)) {
  console.log('❌ Run: node tools\\EXTRACT_ALL_IDS.js first\n');
  process.exit(1);
}

const allIDs = JSON.parse(fs.readFileSync(idsFile, 'utf8')).ids;
console.log(`📊 ${allIDs.length} IDs disponibles\n`);

// Profiler tous les drivers
const driverProfiles = new Map();

console.log('🔍 Analyse profils drivers...\n');

fs.readdirSync(drivers).forEach(driverName => {
  const file = path.join(drivers, driverName, 'driver.compose.json');
  if (!fs.existsSync(file)) return;
  
  try {
    const compose = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!compose.zigbee) return;
    
    const profile = {
      name: driverName,
      class: compose.class,
      capabilities: compose.capabilities || [],
      clusters: compose.zigbee.endpoints?.['1']?.clusters || [],
      currentIDs: new Set(compose.zigbee.manufacturerName || [])
    };
    
    driverProfiles.set(driverName, profile);
  } catch (e) {}
});

console.log(`  ✅ ${driverProfiles.size} drivers profilés\n`);

// Créer index: ID -> drivers qui l'utilisent
const idToDrivers = new Map();

driverProfiles.forEach((profile, name) => {
  profile.currentIDs.forEach(id => {
    if (!idToDrivers.has(id)) idToDrivers.set(id, []);
    idToDrivers.get(id).push(name);
  });
});

// Fonction similarité
function similarity(profile1, profile2) {
  let score = 0;
  
  // Class identique = +50
  if (profile1.class === profile2.class) score += 50;
  
  // Capabilities communes = +5 each
  const caps1 = new Set(profile1.capabilities);
  const caps2 = new Set(profile2.capabilities);
  caps1.forEach(c => { if (caps2.has(c)) score += 5; });
  
  // Clusters communs = +10 each
  const clust1 = new Set(profile1.clusters);
  const clust2 = new Set(profile2.clusters);
  clust1.forEach(c => { if (clust2.has(c)) score += 10; });
  
  return score;
}

// Enrichir intelligemment
let enriched = 0;
let totalAdded = 0;

console.log('🔧 Enrichissement intelligent...\n');

driverProfiles.forEach((profile, driverName) => {
  const candidates = new Map(); // ID -> score
  
  // Pour chaque ID existant ailleurs
  idToDrivers.forEach((usedBy, id) => {
    if (profile.currentIDs.has(id)) return; // Déjà présent
    
    // Calculer meilleur score de similarité
    let maxScore = 0;
    usedBy.forEach(otherDriver => {
      const otherProfile = driverProfiles.get(otherDriver);
      if (otherProfile) {
        const score = similarity(profile, otherProfile);
        if (score > maxScore) maxScore = score;
      }
    });
    
    if (maxScore >= 40) { // Seuil: similarité minimum 40
      candidates.set(id, maxScore);
    }
  });
  
  if (candidates.size > 0) {
    // Ajouter IDs similaires
    const file = path.join(drivers, driverName, 'driver.compose.json');
    const compose = JSON.parse(fs.readFileSync(file, 'utf8'));
    
    const newIDs = new Set(compose.zigbee.manufacturerName || []);
    const before = newIDs.size;
    
    candidates.forEach((score, id) => {
      newIDs.add(id);
    });
    
    const added = newIDs.size - before;
    
    if (added > 0) {
      compose.zigbee.manufacturerName = Array.from(newIDs).sort();
      fs.writeFileSync(file, JSON.stringify(compose, null, 2));
      
      console.log(`  ✅ ${driverName}: +${added} IDs (score ≥40)`);
      enriched++;
      totalAdded += added;
    }
  }
});

console.log('\n' + '='.repeat(80));
console.log('📊 RAPPORT SMART ENRICHMENT');
console.log('='.repeat(80));
console.log(`\n✅ Drivers enrichis: ${enriched}`);
console.log(`✅ IDs ajoutés: ${totalAdded}`);
console.log(`✅ Méthode: Similarité intelligente (clusters + capabilities)\n`);

console.log('🔄 NEXT STEPS:\n');
console.log('  1. Remove-Item -Recurse -Force .homeybuild,.homeycompose');
console.log('  2. homey app build');
console.log('  3. homey app validate --level=publish\n');
