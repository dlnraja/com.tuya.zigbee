#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION MASSIVE - DOUBLONS & PRÉFIXES\n');

const reportPath = path.join(__dirname, '..', 'DUPLICATES_BRANDS_REPORT.json');
if (!fs.existsSync(reportPath)) {
  console.log('❌ Rapport introuvable! Exécuter d\'abord:');
  console.log('   node scripts/find_duplicates_and_brands.js');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

console.log('📊 À CORRIGER:');
console.log(`   Doublons: ${report.duplicates.length} groupes`);
console.log(`   Flow cards avec préfixes: ${report.flowCardsWithBrands.length}`);
console.log('');

// BRAND PREFIXES À SUPPRIMER
const BRAND_PREFIXES = [
  'avatto_', 'zemismart_', 'lsc_', 'philips_', 'innr_',
  'moes_', 'nous_', 'samsung_', 'sonoff_', 'tuya_', 'osram_'
];

let stats = {
  driversRenamed: 0,
  driversRemoved: 0,
  flowCardsUpdated: 0,
  errors: []
};

// 1. CORRIGER LES DOUBLONS DE DRIVERS
console.log('🔧 CORRECTION DES DOUBLONS...\n');

// Stratégie: garder le nom sans _gang/_button suffix
const driversToRemove = [
  'button_wireless_2gang',  // garder button_wireless_2
  'switch_wireless_4button' // garder switch_wireless_4gang (plus logique pour switches)
];

console.log('⚠️  ATTENTION: Certains drivers seront supprimés!');
console.log('   Les manufacturer IDs seront transférés vers le driver principal.\n');

// Pour l'instant, on ne supprime PAS automatiquement
// On crée juste un plan de migration
console.log('📝 PLAN DE MIGRATION DES DOUBLONS:');
console.log('   button_wireless_2gang → button_wireless_2');
console.log('   switch_wireless_4button → switch_wireless_4gang');
console.log('');
console.log('⚠️  Migration manuelle requise pour préserver manufacturer IDs!');
console.log('');

// 2. NETTOYER LES FLOW CARDS
console.log('🔧 NETTOYAGE DES FLOW CARDS...\n');

const appJsonPath = path.join(__dirname, '..', 'app.json');
const backupPath = appJsonPath + '.backup-brands.' + Date.now();

// Backup
fs.copyFileSync(appJsonPath, backupPath);
console.log(`💾 Backup créé: ${path.basename(backupPath)}\n`);

const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

function removeBrandPrefixes(text) {
  let cleaned = text;
  BRAND_PREFIXES.forEach(prefix => {
    // Enlever le préfixe mais garder le reste
    const regex = new RegExp(prefix, 'g');
    cleaned = cleaned.replace(regex, '');
  });
  return cleaned;
}

function cleanFlowCards(cards, type) {
  if (!cards) return 0;
  
  let updated = 0;
  cards.forEach(card => {
    const originalId = card.id;
    
    // Nettoyer l'ID
    BRAND_PREFIXES.forEach(prefix => {
      if (card.id && card.id.includes(prefix)) {
        card.id = card.id.replace(new RegExp(prefix, 'g'), '');
        updated++;
      }
    });
    
    if (originalId !== card.id) {
      console.log(`   ✅ ${type}: ${originalId} → ${card.id}`);
    }
  });
  
  return updated;
}

// Nettoyer triggers
if (appJson.flow && appJson.flow.triggers) {
  const count = cleanFlowCards(appJson.flow.triggers, 'trigger');
  stats.flowCardsUpdated += count;
  console.log(`\n✅ Triggers nettoyés: ${count}`);
}

// Nettoyer conditions
if (appJson.flow && appJson.flow.conditions) {
  const count = cleanFlowCards(appJson.flow.conditions, 'condition');
  stats.flowCardsUpdated += count;
  console.log(`✅ Conditions nettoyées: ${count}`);
}

// Nettoyer actions
if (appJson.flow && appJson.flow.actions) {
  const count = cleanFlowCards(appJson.flow.actions, 'action');
  stats.flowCardsUpdated += count;
  console.log(`✅ Actions nettoyées: ${count}`);
}

// Sauvegarder app.json nettoyé
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2), 'utf8');
console.log(`\n💾 app.json mis à jour!`);

// RAPPORT FINAL
console.log('\n' + '='.repeat(70));
console.log('📊 RAPPORT DE CORRECTION');
console.log('='.repeat(70));
console.log(`\n✅ Flow cards mis à jour: ${stats.flowCardsUpdated}`);
console.log(`⚠️  Drivers à migrer manuellement: ${driversToRemove.length}`);

console.log(`\n💡 PROCHAINES ÉTAPES:`);
console.log(`   1. Vérifier: node scripts/find_duplicates_and_brands.js`);
console.log(`   2. Build: homey app build`);
console.log(`   3. Valider: homey app validate --level publish`);
console.log(`   4. Commit: git add -A && git commit -m "fix: remove brand prefixes from ${stats.flowCardsUpdated} flow cards"`);

console.log(`\n⚠️  MIGRATION MANUELLE DES DOUBLONS:`);
console.log(`   Les doublons de drivers nécessitent une migration manuelle`);
console.log(`   pour transférer les manufacturer IDs correctement.`);
