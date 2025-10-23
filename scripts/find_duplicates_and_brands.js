#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔍 DÉTECTION DOUBLONS & PRÉFIXES DE MARQUE\n');

const driversDir = path.join(__dirname, '..', 'drivers');
const drivers = fs.readdirSync(driversDir).filter(d => 
  fs.statSync(path.join(driversDir, d)).isDirectory()
);

const issues = {
  duplicates: [],
  brandPrefixes: [],
  flowCardsWithBrands: []
};

// BRAND PREFIXES À DÉTECTER
const BRAND_PREFIXES = [
  'avatto_', 'zemismart_', 'lsc_', 'philips_', 'innr_',
  'moes_', 'nous_', 'samsung_', 'sonoff_', 'tuya_', 'osram_'
];

// 1. DÉTECTER LES DOUBLONS
console.log('📁 DÉTECTION DES DOUBLONS DE DRIVERS...\n');

const driverGroups = {};
drivers.forEach(driver => {
  // Normaliser le nom (enlever _gang, _button, etc. pour grouper)
  const base = driver
    .replace(/_(\d+)gang$/, '_$1')
    .replace(/_(\d+)button$/, '_$1')
    .replace(/_2port$/, '_2')
    .replace(/_1gang$/, '_1')
    .replace(/_2gang$/, '_2')
    .replace(/_3gang$/, '_3')
    .replace(/_4gang$/, '_4')
    .replace(/_6gang$/, '_6')
    .replace(/_8gang$/, '_8');
  
  if (!driverGroups[base]) {
    driverGroups[base] = [];
  }
  driverGroups[base].push(driver);
});

// Trouver les groupes avec plusieurs drivers
Object.entries(driverGroups).forEach(([base, group]) => {
  if (group.length > 1) {
    issues.duplicates.push({
      base,
      drivers: group,
      count: group.length
    });
  }
});

console.log(`❌ ${issues.duplicates.length} groupes de doublons trouvés:\n`);
issues.duplicates.forEach(dup => {
  console.log(`📍 Groupe "${dup.base}" (${dup.count} variants):`);
  dup.drivers.forEach(d => console.log(`   - ${d}`));
  console.log('');
});

// 2. DÉTECTER LES PRÉFIXES DE MARQUE DANS LES NOMS
console.log('\n🏷️  DÉTECTION DES PRÉFIXES DE MARQUE...\n');

drivers.forEach(driver => {
  BRAND_PREFIXES.forEach(prefix => {
    if (driver.startsWith(prefix) && 
        !driver.includes('_internal') && 
        !driver.includes('_hybrid')) {
      issues.brandPrefixes.push({
        driver,
        prefix,
        suggested: driver.replace(prefix, '')
      });
    }
  });
});

console.log(`❌ ${issues.brandPrefixes.length} drivers avec préfixes de marque:\n`);
issues.brandPrefixes.slice(0, 20).forEach(issue => {
  console.log(`   ${issue.driver}`);
  console.log(`   → Suggéré: ${issue.suggested}\n`);
});

// 3. DÉTECTER LES FLOW CARDS AVEC PRÉFIXES DE MARQUE
console.log('\n🔄 ANALYSE DES FLOW CARDS DANS APP.JSON...\n');

const appJsonPath = path.join(__dirname, '..', 'app.json');
if (fs.existsSync(appJsonPath)) {
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  
  const checkFlowCards = (cards, type) => {
    if (!cards) return;
    
    cards.forEach(card => {
      BRAND_PREFIXES.forEach(prefix => {
        if (card.id && card.id.includes(prefix)) {
          issues.flowCardsWithBrands.push({
            type,
            id: card.id,
            title: card.title?.en || 'No title',
            prefix
          });
        }
      });
    });
  };
  
  checkFlowCards(appJson.flow?.triggers, 'trigger');
  checkFlowCards(appJson.flow?.conditions, 'condition');
  checkFlowCards(appJson.flow?.actions, 'action');
}

console.log(`❌ ${issues.flowCardsWithBrands.length} flow cards avec préfixes de marque:\n`);

// Grouper par préfixe
const byPrefix = {};
issues.flowCardsWithBrands.forEach(fc => {
  if (!byPrefix[fc.prefix]) byPrefix[fc.prefix] = [];
  byPrefix[fc.prefix].push(fc);
});

Object.entries(byPrefix).forEach(([prefix, cards]) => {
  console.log(`\n📍 Préfixe "${prefix}" (${cards.length} flow cards):`);
  cards.slice(0, 5).forEach(fc => {
    console.log(`   ${fc.type}: ${fc.id}`);
  });
  if (cards.length > 5) {
    console.log(`   ... et ${cards.length - 5} autres`);
  }
});

// RAPPORT FINAL
console.log('\n\n' + '='.repeat(70));
console.log('📊 RÉSUMÉ');
console.log('='.repeat(70));
console.log(`\n❌ PROBLÈMES DÉTECTÉS:`);
console.log(`   Groupes de doublons: ${issues.duplicates.length}`);
console.log(`   Drivers avec préfixes: ${issues.brandPrefixes.length}`);
console.log(`   Flow cards avec préfixes: ${issues.flowCardsWithBrands.length}`);

// Sauvegarder
const reportPath = path.join(__dirname, '..', 'DUPLICATES_BRANDS_REPORT.json');
fs.writeFileSync(reportPath, JSON.stringify(issues, null, 2), 'utf8');
console.log(`\n💾 Rapport sauvegardé: DUPLICATES_BRANDS_REPORT.json`);

console.log(`\n💡 CORRECTION:`);
console.log(`   node scripts/fix_duplicates_and_brands.js`);
