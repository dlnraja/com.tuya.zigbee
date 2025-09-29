const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 RELANCE COMPLÈTE - Vérification totale');

const scripts = [
  'FULL_DUMPER.js',
  'SCAN.js', 
  'ENRICH.js',
  'MASTER_FUSION.js',
  'SMART.js'
];

let success = 0;
let total = scripts.length;

scripts.forEach((script, index) => {
  try {
    console.log(`\n▶️ ${index + 1}/${total} - ${script}`);
    const output = execSync(`node ${script}`, { encoding: 'utf8', stdio: 'pipe' });
    console.log(`✅ ${script} SUCCESS`);
    success++;
  } catch (e) {
    console.log(`⚠️ ${script} ERREUR: ${e.message}`);
  }
});

console.log(`\n📊 RÉSULTAT: ${success}/${total} réussis`);
console.log('🔍 VÉRIFICATION...');
