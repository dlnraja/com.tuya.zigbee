const fs = require('fs');
const path = require('path');

console.log('=== CHECKING APP IMAGE FILES ===\n');
console.log('REQUIRED DIMENSIONS (Homey SDK3 App Images):');
console.log('- small.png:  250 x 175 px');
console.log('- large.png:  500 x 350 px');
console.log('- xlarge.png: 1000 x 700 px\n');

const imageDir = path.join(__dirname, 'assets', 'images');
const images = ['small.png', 'large.png', 'xlarge.png'];

console.log('Files in assets/images/:');
for (const img of images) {
  const imgPath = path.join(imageDir, img);
  if (fs.existsSync(imgPath)) {
    const stats = fs.statSync(imgPath);
    console.log(`✓ ${img}: ${stats.size} bytes`);
  } else {
    console.log(`✗ ${img}: MISSING`);
  }
}

console.log('\n=== CHECKING FOR DUPLICATE FILES ===');
const rootAssets = path.join(__dirname, 'assets');
for (const img of images) {
  const wrongPath = path.join(rootAssets, img);
  if (fs.existsSync(wrongPath)) {
    console.log(`⚠️ DUPLICATE: assets/${img} (should be removed)`);
    const stats = fs.statSync(wrongPath);
    console.log(`   Size: ${stats.size} bytes`);
  }
}

console.log('\n=== RECOMMENDATION ===');
console.log('Use PNG files with EXACT dimensions required by Homey SDK3');
console.log('Create professional gradient images matching your brand color (#1E88E5)');
