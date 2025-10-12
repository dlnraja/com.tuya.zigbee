const fs = require('fs');
const path = require('path');

function getPNGDimensions(filepath) {
  const buffer = fs.readFileSync(filepath);
  
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4E || buffer[3] !== 0x47) {
    throw new Error('Not a valid PNG file');
  }
  
  // IHDR chunk is always first after signature (8 bytes)
  // Width is at bytes 16-19, height at 20-23 (big-endian)
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  
  return { width, height };
}

console.log('=== APP IMAGE DIMENSIONS CHECK ===\n');
console.log('HOMEY SDK3 REQUIREMENTS (App Images):');
console.log('- small.png:  250 x 175 px');
console.log('- large.png:  500 x 350 px');
console.log('- xlarge.png: 1000 x 700 px\n');

const imageDir = path.join(__dirname, 'assets', 'images');
const images = ['small.png', 'large.png', 'xlarge.png'];
const required = {
  'small.png': { w: 250, h: 175 },
  'large.png': { w: 500, h: 350 },
  'xlarge.png': { w: 1000, h: 700 }
};

let allCorrect = true;

console.log('CURRENT DIMENSIONS:');
for (const img of images) {
  const imgPath = path.join(imageDir, img);
  try {
    const dims = getPNGDimensions(imgPath);
    const req = required[img];
    const correct = dims.width === req.w && dims.height === req.h;
    const status = correct ? '✅ CORRECT' : `❌ WRONG (need ${req.w}x${req.h})`;
    
    console.log(`${img}: ${dims.width}x${dims.height} ${status}`);
    
    if (!correct) allCorrect = false;
  } catch (err) {
    console.log(`${img}: ❌ ERROR - ${err.message}`);
    allCorrect = false;
  }
}

console.log('\n' + (allCorrect ? '✅ ALL IMAGES CORRECT!' : '❌ IMAGES NEED CORRECTION'));
process.exit(allCorrect ? 0 : 1);
