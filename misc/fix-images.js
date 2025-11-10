const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🖼️  Fixing app images...\n');

const sizes = {
  'small.png': '75x75',
  'large.png': '250x175',
  'xlarge.png': '500x350'
};

for (const [filename, size] of Object.entries(sizes)) {
  const filepath = path.join('assets', 'images', filename);
  
  try {
    console.log(`📏 ${filename}: Resizing to ${size}...`);
    
    // Using ImageMagick
    execSync(`magick "${filepath}" -resize ${size}! "${filepath}"`, { stdio: 'inherit' });
    
    console.log(`✅ ${filename}: Done!\n`);
  } catch (err) {
    console.error(`❌ ${filename}: Error - ${err.message}\n`);
  }
}

console.log('🎉 All images fixed!');
console.log('\nVerifying sizes...');
execSync('magick identify assets\\images\\*.png', { stdio: 'inherit' });
