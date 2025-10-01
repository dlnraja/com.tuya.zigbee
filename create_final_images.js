const { createCanvas } = require('canvas');
const fs = require('fs');

// Créer large.png 500x500 pour co_detector_advanced
const largeCanvas = createCanvas(500, 500);
const largeCtx = largeCanvas.getContext('2d');
largeCtx.fillStyle = '#E6E6E6';
largeCtx.fillRect(0, 0, 500, 500);
fs.writeFileSync('drivers/co_detector_advanced/assets/large.png', largeCanvas.toBuffer('image/png'));

console.log('✅ Image 500x500 créée pour co_detector_advanced');
console.log('🚀 Prêt pour validation finale!');
