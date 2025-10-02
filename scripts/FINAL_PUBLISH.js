const { createCanvas } = require('canvas');
const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚀 FINAL PUBLISH - Solution définitive');

// 1. Créer image parfaite 500x500
const canvas = createCanvas(500, 500);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#E6E6E6';
ctx.fillRect(0, 0, 500, 500);
const buffer = canvas.toBuffer('image/png');

fs.writeFileSync('drivers/co_detector_advanced/assets/large.png', buffer);
console.log('✅ Image 500x500 créée');

// 2. Nettoyer cache complètement
try {
  if (fs.existsSync('.homeybuild')) {
    execSync('rmdir /s /q .homeybuild', { stdio: 'ignore' });
  }
} catch(e) {}

console.log('✅ Cache nettoyé');

// 3. Composer proprement
try {
  execSync('homey app compose', { stdio: 'inherit' });
  console.log('✅ App composée');
} catch(e) {
  console.log('⚠️ Compose:', e.message);
}

// 4. Valider
try {
  execSync('homey app validate --level publish', { stdio: 'inherit' });
  console.log('🎉 VALIDATION RÉUSSIE!');
} catch(e) {
  console.log('❌ Validation échouée');
}
