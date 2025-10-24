#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔍 RECHERCHE EXHAUSTIVE DE TOUTES LES TRACES DE MARQUES\n');

const driversDir = path.join(__dirname, '..', 'drivers');
const appJsonPath = path.join(__dirname, '..', 'app.json');

// TOUTES LES MARQUES (exhaustif)
const ALL_BRANDS = [
  'lsc', 'philips', 'innr', 'osram', 'samsung', 'sonoff',
  'avatto', 'zemismart', 'tuya', 'moes', 'nous',
  'lonsonho', 'lidl', 'ikea', 'xiaomi', 'aqara',
  'blitzwolf', 'smartthings', 'aqara', 'nue', 'lifesmart',
  'neo', 'heiman', 'woox', 'wofea', 'ewelink'
];

const traces = {
  driverNames: [],
  driverFlowCards: [],
  appJsonFlowCards: [],
  fileContents: []
};

// 1. NOMS DE DRIVERS
console.log('📁 Vérification noms de drivers...\n');

const drivers = fs.readdirSync(driversDir).filter(d => 
  fs.statSync(path.join(driversDir, d)).isDirectory() && 
  !d.startsWith('.')
);

drivers.forEach(driverName => {
  ALL_BRANDS.forEach(brand => {
    if (driverName.toLowerCase().includes(brand)) {
      traces.driverNames.push({ driver: driverName, brand });
      console.log(`   ❌ Driver: ${driverName} (contient "${brand}")`);
    }
  });
});

// 2. FLOW CARDS DANS DRIVERS
console.log('\n🔄 Vérification flow cards dans drivers...\n');

drivers.forEach(driverName => {
  const flowPath = path.join(driversDir, driverName, 'driver.flow.compose.json');
  
  if (!fs.existsSync(flowPath)) return;
  
  try {
    const flow = JSON.parse(fs.readFileSync(flowPath, 'utf8'));
    
    const checkFlows = (cards, type) => {
      if (!cards) return;
      cards.forEach(card => {
        ALL_BRANDS.forEach(brand => {
          if (card.id && card.id.toLowerCase().includes(brand)) {
            traces.driverFlowCards.push({
              driver: driverName,
              type,
              id: card.id,
              brand
            });
            console.log(`   ❌ ${driverName}/${type}: ${card.id} (contient "${brand}")`);
          }
        });
      });
    };
    
    checkFlows(flow.triggers, 'trigger');
    checkFlows(flow.conditions, 'condition');
    checkFlows(flow.actions, 'action');
    
  } catch (err) {
    // Ignorer erreurs
  }
});

// 3. FLOW CARDS DANS APP.JSON
console.log('\n📄 Vérification app.json...\n');

if (fs.existsSync(appJsonPath)) {
  try {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    
    const checkAppFlows = (cards, type) => {
      if (!cards) return;
      cards.forEach(card => {
        ALL_BRANDS.forEach(brand => {
          if (card.id && card.id.toLowerCase().includes(brand)) {
            traces.appJsonFlowCards.push({
              type,
              id: card.id,
              brand
            });
            console.log(`   ❌ app.json/${type}: ${card.id} (contient "${brand}")`);
          }
        });
      });
    };
    
    if (appJson.flow) {
      checkAppFlows(appJson.flow.triggers, 'trigger');
      checkAppFlows(appJson.flow.conditions, 'condition');
      checkAppFlows(appJson.flow.actions, 'action');
    }
    
  } catch (err) {
    console.log(`   ❌ Erreur lecture app.json: ${err.message}`);
  }
}

// RAPPORT FINAL
console.log('\n' + '='.repeat(70));
console.log('📊 RAPPORT EXHAUSTIF');
console.log('='.repeat(70));

console.log(`\n❌ TRACES DE MARQUES DÉTECTÉES:`);
console.log(`   Noms de drivers: ${traces.driverNames.length}`);
console.log(`   Flow cards (drivers): ${traces.driverFlowCards.length}`);
console.log(`   Flow cards (app.json): ${traces.appJsonFlowCards.length}`);

const total = traces.driverNames.length + 
              traces.driverFlowCards.length + 
              traces.appJsonFlowCards.length;

if (total === 0) {
  console.log('\n✅ AUCUNE TRACE DE MARQUE DÉTECTÉE!');
  console.log('🎉 APP 100% UNBRANDED!');
} else {
  console.log(`\n⚠️  TOTAL: ${total} traces à corriger`);
  
  // Grouper par marque
  const byBrand = {};
  [...traces.driverNames, ...traces.driverFlowCards, ...traces.appJsonFlowCards].forEach(t => {
    if (!byBrand[t.brand]) byBrand[t.brand] = 0;
    byBrand[t.brand]++;
  });
  
  console.log('\n📊 Par marque:');
  Object.entries(byBrand).forEach(([brand, count]) => {
    console.log(`   ${brand}: ${count} occurrences`);
  });
}

// Sauvegarder
const reportPath = path.join(__dirname, '..', 'BRAND_TRACES_REPORT.json');
fs.writeFileSync(reportPath, JSON.stringify({
  total,
  traces
}, null, 2), 'utf8');

console.log(`\n💾 Rapport sauvegardé: BRAND_TRACES_REPORT.json`);
