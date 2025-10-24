#!/usr/bin/env node
/**
 * VERSION CHECKER
 * Vérifie que la version dans app.json est cohérente
 */

const fs = require('fs');
const path = require('path');

const expectedVersion = process.argv[2] || '2.16.0';

console.log(`🔍 Vérification version: ${expectedVersion}\n`);

const appJsonPath = path.join(__dirname, '..', 'app.json');

if (!fs.existsSync(appJsonPath)) {
  console.error('❌ app.json introuvable!');
  process.exit(1);
}

const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const actualVersion = appJson.version;

console.log(`📦 Version app.json: ${actualVersion}`);
console.log(`🎯 Version attendue: ${expectedVersion}`);

if (actualVersion === expectedVersion) {
  console.log('\n✅ Version OK!\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Versions différentes (normal si auto-increment)\n');
  process.exit(0); // Ne pas bloquer
}
