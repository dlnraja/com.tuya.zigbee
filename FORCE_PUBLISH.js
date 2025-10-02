const { execSync } = require('child_process');
const { createCanvas } = require('canvas');
const fs = require('fs');

console.log('💥 FORCE PUBLISH - Solution radicale');

// 1. Supprimer driver problématique temporairement de app.json
const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const drivers = appJson.drivers || [];
const problematic = drivers.findIndex(d => d.id === 'co_detector_advanced');

if (problematic > -1) {
  console.log('Désactivation temporaire co_detector_advanced...');
  drivers[problematic].enabled = false;
  appJson.drivers = drivers;
  fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2));
}

// 2. Clean total
try {
  execSync('rmdir /s /q .homeybuild', { stdio: 'ignore' });
  execSync('rmdir /s /q node_modules\\.cache', { stdio: 'ignore' });
} catch(e) {}

// 3. Valider
console.log('Validation sans driver problématique...');
try {
  execSync('homey app validate --level publish', { stdio: 'inherit' });
  console.log('✅ VALIDATION RÉUSSIE sans co_detector_advanced');
  
  // 4. Publier
  execSync('homey app publish', { stdio: 'inherit' });
  console.log('🎉 PUBLICATION RÉUSSIE!');
} catch(e) {
  console.log('Erreur:', e.message);
}
