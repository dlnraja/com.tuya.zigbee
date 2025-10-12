const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Homey SDK3 official requirements for APP images (Memory 2e03bb52)
const SIZES = {
  'small.png': { width: 250, height: 175 },
  'large.png': { width: 500, height: 350 },
  'xlarge.png': { width: 1000, height: 700 }
};

function createGradientImage(width, height) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Brand color from app.json: #1E88E5 (Blue)
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1E88E5');
  gradient.addColorStop(0.5, '#1976D2');
  gradient.addColorStop(1, '#1565C0');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Add Zigbee icon concept (simplified)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.25;
  
  // Draw hexagon (Zigbee symbol)
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  
  // Add text for larger images
  if (width >= 500) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = `bold ${width * 0.08}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Tuya', centerX, centerY + radius + (height * 0.15));
    ctx.font = `${width * 0.05}px Arial`;
    ctx.fillText('Zigbee', centerX, centerY + radius + (height * 0.25));
  }
  
  return canvas;
}

async function fixImages() {
  console.log('=== FIXING APP IMAGES ===\n');
  
  const imageDir = path.join(__dirname, 'assets', 'images');
  
  // Ensure directory exists
  if (!fs.existsSync(imageDir)) {
    fs.mkdirSync(imageDir, { recursive: true });
  }
  
  // Create all required images
  for (const [filename, dimensions] of Object.entries(SIZES)) {
    const outputPath = path.join(imageDir, filename);
    console.log(`Creating ${filename} (${dimensions.width}x${dimensions.height})...`);
    
    const canvas = createGradientImage(dimensions.width, dimensions.height);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    
    console.log(`✅ ${filename}: ${buffer.length} bytes`);
  }
  
  // Remove duplicates from wrong location
  console.log('\n=== REMOVING DUPLICATES ===');
  const rootAssets = path.join(__dirname, 'assets');
  for (const filename of Object.keys(SIZES)) {
    const wrongPath = path.join(rootAssets, filename);
    if (fs.existsSync(wrongPath)) {
      fs.unlinkSync(wrongPath);
      console.log(`🗑️ Removed: assets/${filename}`);
    }
  }
  
  console.log('\n✅ ALL APP IMAGES FIXED!');
  console.log('Images are now compliant with Homey SDK3 requirements.');
}

fixImages().catch(err => {
  console.error('❌ ERROR:', err.message);
  process.exit(1);
});
