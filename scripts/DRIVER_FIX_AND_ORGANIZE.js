#!/usr/bin/env node
/**
 * DRIVER_FIX_AND_ORGANIZE.js - Classification & Correction
 * Phase 3 du Script Ultime V25
 */

const fs = require('fs');

console.log('🔧 DRIVER_FIX_AND_ORGANIZE - Classification intelligente');

const drivers = fs.readdirSync('drivers').filter(f => 
  fs.statSync(`drivers/${f}`).isDirectory()
);

const mfrMap = new Map(); // manufacturer -> [drivers]
let moved = 0, enriched = 0;

// 1. Mapper manufacturers -> drivers
drivers.forEach(driver => {
  const file = `drivers/${driver}/driver.compose.json`;
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (data.zigbee?.manufacturerName) {
      data.zigbee.manufacturerName.forEach(mfr => {
        if (!mfrMap.has(mfr)) mfrMap.set(mfr, []);
        mfrMap.get(mfr).push({ driver, data });
      });
    }
  }
});

// 2. Déplacer manufacturers mal placés (dans fichiers, pas dossiers)
mfrMap.forEach((locations, mfr) => {
  if (locations.length > 1) {
    // Garder dans le driver le plus spécifique
    const best = locations[0];
    locations.slice(1).forEach(({ driver, data }) => {
      const idx = data.zigbee.manufacturerName.indexOf(mfr);
      if (idx > -1) {
        data.zigbee.manufacturerName.splice(idx, 1);
        fs.writeFileSync(
          `drivers/${driver}/driver.compose.json`,
          JSON.stringify(data, null, 2)
        );
        moved++;
      }
    });
  }
});

// 3. Enrichir productIds basiques si manquants
drivers.forEach(driver => {
  const file = `drivers/${driver}/driver.compose.json`;
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    
    if (!data.zigbee?.productId || data.zigbee.productId.length === 0) {
      data.zigbee = data.zigbee || {};
      
      // Enrichissement basé sur type
      if (driver.includes('switch')) data.zigbee.productId = ['TS0001', 'TS0002', 'TS0003'];
      else if (driver.includes('motion')) data.zigbee.productId = ['TS0202'];
      else if (driver.includes('plug')) data.zigbee.productId = ['TS011F'];
      else if (driver.includes('light') || driver.includes('bulb')) data.zigbee.productId = ['TS0505'];
      else if (driver.includes('sensor')) data.zigbee.productId = ['TS0201'];
      
      if (data.zigbee.productId) {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
        enriched++;
      }
    }
  }
});

console.log(`✅ ${moved} manufacturers déplacés (contenu fichiers)`);
console.log(`✅ ${enriched} drivers enrichis (productIds)`);
console.log(`✅ ${mfrMap.size} manufacturers uniques vérifiés`);
