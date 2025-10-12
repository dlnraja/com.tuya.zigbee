const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

async function checkImageDimensions() {
  const imageDir = path.join(__dirname, 'assets', 'images');
  const images = ['small.png', 'large.png', 'xlarge.png'];
  
  console.log('=== CHECKING APP IMAGE DIMENSIONS ===\n');
  console.log('REQUIRED DIMENSIONS (Homey SDK3 App Images):');
  console.log('- small.png:  250 x 175 px');
  console.log('- large.png:  500 x 350 px');
  console.log('- xlarge.png: 1000 x 700 px\n');
  
  for (const img of images) {
    const imgPath = path.join(imageDir, img);
    try {
      const image = await loadImage(imgPath);
      const status = checkSize(img, image.width, image.height);
      console.log(`${img}: ${image.width}x${image.height} ${status}`);
    } catch (err) {
      console.log(`${img}: ERROR - ${err.message}`);
    }
  }
  
  // Check for duplicate images in wrong location
  console.log('\n=== CHECKING FOR DUPLICATE FILES ===');
  const rootAssets = path.join(__dirname, 'assets');
  for (const img of images) {
    const wrongPath = path.join(rootAssets, img);
    if (fs.existsSync(wrongPath)) {
      console.log(`⚠️ DUPLICATE FOUND: assets/${img} (should only be in assets/images/)`);
    }
  }
}

function checkSize(name, width, height) {
  const requirements = {
    'small.png': { w: 250, h: 175 },
    'large.png': { w: 500, h: 350 },
    'xlarge.png': { w: 1000, h: 700 }
  };
  
  const req = requirements[name];
  if (width === req.w && height === req.h) {
    return '✅ CORRECT';
  } else {
    return `❌ WRONG (expected ${req.w}x${req.h})`;
  }
}

checkImageDimensions().catch(console.error);
