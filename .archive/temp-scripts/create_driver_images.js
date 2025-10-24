const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const BRAND_COLOR = '#1E88E5';

// DRIVER image sizes (different from APP images!)
const DRIVER_SIZES = {
  'small.png': { width: 75, height: 75 },
  'large.png': { width: 500, height: 500 },
  'xlarge.png': { width: 1000, height: 1000 }
};

function createDriverImage(width, height) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Gradient background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1E88E5');
  gradient.addColorStop(0.5, '#1976D2');
  gradient.addColorStop(1, '#1565C0');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Central icon
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = width * 0.25;
  
  // White hexagon
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  
  // "Z" symbol
  ctx.fillStyle = BRAND_COLOR;
  ctx.font = `bold ${radius * 1.2}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Z', centerX, centerY);
  
  return canvas;
}

async function createDriverImages() {
  console.log('🎨 Creating DRIVER-sized images (not APP images)...\n');
  console.log('DRIVER IMAGE REQUIREMENTS:');
  console.log('- small.png:  75 x 75 px');
  console.log('- large.png:  500 x 500 px');
  console.log('- xlarge.png: 1000 x 1000 px\n');
  
  const assetsDir = path.join(__dirname, 'assets');
  
  for (const [filename, dims] of Object.entries(DRIVER_SIZES)) {
    console.log(`Creating ${filename} (${dims.width}x${dims.height})...`);
    
    const canvas = createDriverImage(dims.width, dims.height);
    const buffer = canvas.toBuffer('image/png', {
      compressionLevel: 9
    });
    
    const outputPath = path.join(assetsDir, filename);
    fs.writeFileSync(outputPath, buffer);
    
    console.log(`✅ ${filename}: ${(buffer.length / 1024).toFixed(2)} KB`);
  }
  
  console.log('\n✅ Driver images created in assets/');
  console.log('📐 These are for DRIVERS (75x75, 500x500, 1000x1000)');
  console.log('📍 APP images remain in assets/images/ (250x175, 500x350, 1000x700)');
}

createDriverImages().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
