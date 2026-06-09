#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔍 ANALYSE DUPLICATES RESTANTS - DÉTERMINATION LÉGITIMITÉ\n');

const ROOT = path.join(__dirname, '..');
const AUDIT_FILE = path.join(ROOT, 'AUDIT_ADVANCED_REPORT.json');

// Product IDs qui PEUVENT être légitimement partagés
const LEGITIMATE_SHARED_PRODUCTS = {
  'TS0601': 'Multi-fonction Tuya (curtains, thermostats, air quality, etc.)',
  'TS0201': 'Temperature/Humidity sensor (peut être standalone ou combiné)',
  'TS0041': '1-button controller (différents usages)',
  'TS0042': '2-button controller (scene vs switch)',
  'TS0043': '3-button controller',
  'TS0044': '4-button controller',
  'TS0046': '6-button controller',
  'TS0001': '1-gang switch/relay (différents types)',
  'TS0002': '2-gang switch/relay',
  'TS0011': '1-gang switch (différent du TS0001)',
  'TS0012': '2-gang switch',
  'TS0003': '3-gang switch',
  'TS0004': '4-gang switch',
  'TS0005': '5-gang switch',
  'TS0006': '6-gang switch',
  'TS0121': 'Smart plug with metering',
  'TS0115': 'Power strip',
  'TS0202': 'Motion sensor (différents modèles)',
  'TS0203': 'Contact sensor (door/window)',
  'TS0210': 'Contact sensor vibration',
  'TS0218': 'Emergency button',
  'TS0222': 'Multi-sensor (temp+humidity+occupancy)',
  'TS0225': 'Multi-sensor avancé',
  'TS0302': 'Curtain motor',
  'TS0111': 'Dimmer switch'
};

// Lire rapport audit
const audit = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));
const criticalIssues = audit.issues.manufacturerIds.filter(i => i.severity === 'CRITICAL');

console.log(`📊 Total duplicates critiques: ${criticalIssues.length}\n`);

const analysis = {
  legitimate: [],
  needsReview: [],
  shouldFix: []
};

criticalIssues.forEach(issue => {
  const id = issue.manufacturerId.replace('PRODUCT:', '');
  const isProduct = issue.manufacturerId.startsWith('PRODUCT:');

  if (isProduct && LEGITIMATE_SHARED_PRODUCTS[id]) {
    // Duplicate légitime
    analysis.legitimate.push({
      id,
      reason: LEGITIMATE_SHARED_PRODUCTS[id],
      drivers: issue.drivers,
      count: issue.count
    });
  } else if (isProduct) {
    // Product ID partagé mais pas dans la liste légitime
    analysis.needsReview.push({
      id,
      drivers: issue.drivers,
      count: issue.count,
      recommendation: 'Vérifier si les drivers sont réellement différents'
    });
  } else {
    // Manufacturer ID partagé (potentiellement problématique)
    analysis.shouldFix.push({
      id,
      drivers: issue.drivers,
      count: issue.count,
      recommendation: 'Manufacturer ID devrait être unique par variant'
    });
  }
});

console.log('✅ DUPLICATES LÉGITIMES (Product IDs multi-usage):\n');
analysis.legitimate.forEach(item => {
  console.log(`   ${item.id} (${item.count} drivers)`);
  console.log(`      Raison: ${item.reason}`);
  console.log(`      Drivers: ${item.drivers.map(d => path.basename(path.dirname(d))).join(', ')}\n`);
});

console.log('\n⚠️  DUPLICATES À EXAMINER:\n');
analysis.needsReview.forEach(item => {
  console.log(`   ${item.id} (${item.count} drivers)`);
  console.log(`      ${item.recommendation}`);
  console.log(`      Drivers: ${item.drivers.map(d => path.basename(path.dirname(d))).join(', ')}\n`);
});

console.log('\n🔴 DUPLICATES À CORRIGER:\n');
analysis.shouldFix.forEach(item => {
  console.log(`   ${item.id} (${item.count} drivers)`);
  console.log(`      ${item.recommendation}`);
  console.log(`      Drivers: ${item.drivers.map(d => path.basename(path.dirname(d))).join(', ')}\n`);
});

console.log('\n📊 RÉSUMÉ:\n');
console.log(`   ✅ Légitimes: ${analysis.legitimate.length}`);
console.log(`   ⚠️  À examiner: ${analysis.needsReview.length}`);
console.log(`   🔴 À corriger: ${analysis.shouldFix.length}\n`);

// Sauvegarder analyse
const analysisFile = path.join(ROOT, 'DUPLICATES_ANALYSIS.json');
fs.writeFileSync(analysisFile, JSON.stringify(analysis, null, 2), 'utf8');
console.log(`✅ Analyse sauvegardée: ${analysisFile}\n`);

// Recommandations
if (analysis.shouldFix.length > 0) {
  console.log('🎯 ACTIONS RECOMMANDÉES:\n');
  console.log(`   1. Examiner manuellement les ${analysis.shouldFix.length} manufacturer IDs dupliqués`);
  console.log('   2. Vérifier si ce sont des variants du même device');
  console.log('   3. Si oui, fusionner dans un seul driver');
  console.log('   4. Si non, supprimer le duplicate du driver le moins pertinent\n');
}

process.exit(analysis.shouldFix.length > 0 ? 1 : 0);
