#!/usr/bin/env node
"use strict";

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 PUBLICATION RAPIDE HOMEY');
console.log('='.repeat(70));

// 1. Lire version actuelle
const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
console.log(`\n📦 App: ${appJson.id}`);
console.log(`📌 Version actuelle: ${appJson.version}`);
console.log(`🔧 Drivers: ${appJson.drivers.length}`);

// 2. Validation rapide
console.log('\n✅ Validation...');
try {
    execSync('node tools/clean_and_validate.js', { stdio: 'inherit' });
} catch (e) {
    console.log('\n❌ Validation échouée');
    process.exit(1);
}

console.log('\n' + '='.repeat(70));
console.log('✅ VALIDATION COMPLÈTE - PRÊT POUR PUBLICATION');
console.log('\n📝 Commandes suivantes:');
console.log('  1. homey login');
console.log('  2. homey app publish');
console.log('\nOu utiliser GitHub Actions (automatique après push)');
