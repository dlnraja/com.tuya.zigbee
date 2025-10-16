const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

console.log('🎨 FIXING APP IMAGES FOR PUBLISH VALIDATION\n');

const assetsPath = path.join(__dirname, 'assets', 'images');
fs.mkdirSync(assetsPath, { recursive: true });

// APP small.png: 250x175 (REQUIRED for publish)
console.log('Creating APP small.png (250x175)...');
const smallCanvas = createCanvas(250, 175);
const smallCtx = smallCanvas.getContext('2d');

// Gradient background
const smallGradient = smallCtx.createLinearGradient(0, 0, 250, 175);
smallGradient.addColorStop(0, '#4CAF50');
smallGradient.addColorStop(1, '#2196F3');
smallCtx.fillStyle = smallGradient;
smallCtx.fillRect(0, 0, 250, 175);

// Text
smallCtx.fillStyle = '#FFFFFF';
smallCtx.font = 'bold 32px Arial';
smallCtx.textAlign = 'center';
smallCtx.textBaseline = 'middle';
smallCtx.fillText('Universal', 125, 70);
smallCtx.font = 'bold 28px Arial';
smallCtx.fillText('Tuya Zigbee', 125, 110);

const smallPath = path.join(assetsPath, 'small.png');
fs.writeFileSync(smallPath, smallCanvas.toBuffer('image/png'));
console.log('✅ small.png created (250x175)');

// APP large.png: 500x350 (REQUIRED for publish)
console.log('Creating APP large.png (500x350)...');
const largeCanvas = createCanvas(500, 350);
const largeCtx = largeCanvas.getContext('2d');

// Gradient background
const largeGradient = largeCtx.createLinearGradient(0, 0, 500, 350);
largeGradient.addColorStop(0, '#4CAF50');
largeGradient.addColorStop(1, '#2196F3');
largeCtx.fillStyle = largeGradient;
largeCtx.fillRect(0, 0, 500, 350);

// Text
largeCtx.fillStyle = '#FFFFFF';
largeCtx.font = 'bold 64px Arial';
largeCtx.textAlign = 'center';
largeCtx.textBaseline = 'middle';
largeCtx.fillText('Universal', 250, 140);
largeCtx.font = 'bold 56px Arial';
largeCtx.fillText('Tuya Zigbee', 250, 210);

const largePath = path.join(assetsPath, 'large.png');
fs.writeFileSync(largePath, largeCanvas.toBuffer('image/png'));
console.log('✅ large.png created (500x350)');

console.log('\n✅ APP IMAGES FIXED!\n');
console.log('Dimensions:');
console.log('  small.png: 250x175 ✅');
console.log('  large.png: 500x350 ✅');
console.log('\nReady for publish validation!\n');
