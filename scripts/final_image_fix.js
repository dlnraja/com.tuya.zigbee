const { createCanvas } = require('canvas');
const fs = require('fs');

console.log('🖼️ CORRECTION FINALE IMAGES SDK3');

// Créer image 500x500 correcte
const canvas = createCanvas(500, 500);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#E6E6E6';
ctx.fillRect(0, 0, 500, 500);
const buffer = canvas.toBuffer('image/png');

// Corriger co_detector_advanced
fs.writeFileSync('drivers/co_detector_advanced/assets/large.png', buffer);

// Forcer dans cache si existe
if (fs.existsSync('.homeybuild/assets/large.png')) {
  fs.writeFileSync('.homeybuild/assets/large.png', buffer);
}

console.log('✅ Image 500x500 corrigée définitivement');
console.log('🚀 Prêt pour validation finale!');
