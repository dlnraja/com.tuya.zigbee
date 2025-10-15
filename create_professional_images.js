const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const BRAND_COLOR = '#1E88E5'; // From app.json

function createProfessionalImage(width, height) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Modern gradient background (Blue theme for Zigbee)
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1E88E5');    // Material Blue 600
  gradient.addColorStop(0.5, '#1976D2');  // Material Blue 700
  gradient.addColorStop(1, '#1565C0');    // Material Blue 800
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Calculate responsive sizes
  const scale = Math.min(width, height) / 500;
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Draw Zigbee hexagon network pattern
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2 * scale;
  
  const hexRadius = 80 * scale;
  const hexOffsets = [
    { x: 0, y: 0 },
    { x: -120 * scale, y: -70 * scale },
    { x: 120 * scale, y: -70 * scale },
    { x: -120 * scale, y: 70 * scale },
    { x: 120 * scale, y: 70 * scale }
  ];
  
  // Draw connected hexagons
  hexOffsets.forEach(offset => {
    drawHexagon(ctx, centerX + offset.x, centerY + offset.y, hexRadius);
  });
  
  // Draw central large hexagon (main icon)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
  ctx.lineWidth = 3 * scale;
  drawHexagon(ctx, centerX, centerY, hexRadius, true);
  
  // Draw Zigbee "Z" symbol inside
  ctx.fillStyle = BRAND_COLOR;
  ctx.font = `bold ${hexRadius * 1.2}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Z', centerX, centerY);
  
  // Add title for larger images - COMPLETELY REDESIGNED: No text overlap
  if (width >= 500) {
    // Main title
    ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
    ctx.font = `bold ${width * 0.074}px Arial`;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // "Tuya Zigbee" - SINGLE LINE, properly spaced from bottom
    ctx.fillText('Tuya Zigbee', centerX, height - (height * 0.14));
    
    // Subtitle - smaller, well separated
    ctx.shadowBlur = 4;
    ctx.font = `${width * 0.038}px Arial`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.80)';
    ctx.fillText('Universal Integration', centerX, height - (height * 0.08));
    
    // Version marker (invisible but changes binary)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.001)';
    ctx.font = '1px Arial';
    ctx.fillText('v2.15.99-fixed', 1, 1);
  }
  
  return canvas;
}

function drawHexagon(ctx, x, y, radius, fill = false) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const px = x + radius * Math.cos(angle);
    const py = y + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  
  if (fill) {
    ctx.fill();
  }
  ctx.stroke();
}

async function createImages() {
  console.log('🎨 Creating professional app images...\n');
  
  const imageDir = path.join(__dirname, 'assets', 'images');
  if (!fs.existsSync(imageDir)) {
    fs.mkdirSync(imageDir, { recursive: true });
  }
  
  const sizes = {
    'small.png': { width: 250, height: 175 },
    'large.png': { width: 500, height: 350 },
    'xlarge.png': { width: 1000, height: 700 }
  };
  
  for (const [filename, dims] of Object.entries(sizes)) {
    console.log(`Creating ${filename} (${dims.width}x${dims.height})...`);
    
    const canvas = createProfessionalImage(dims.width, dims.height);
    const buffer = canvas.toBuffer('image/png', {
      compressionLevel: 9,
      filters: canvas.PNG_FILTER_NONE
    });
    
    const outputPath = path.join(imageDir, filename);
    fs.writeFileSync(outputPath, buffer);
    
    console.log(`✅ ${filename}: ${(buffer.length / 1024).toFixed(2)} KB`);
  }
  
  console.log('\n✅ Professional images created successfully!');
  console.log('📍 Location: assets/images/');
  console.log('🎨 Design: Modern gradient with Zigbee network pattern');
  console.log('📐 Dimensions: Homey SDK3 compliant');
}

createImages().catch(err => {
  console.error('❌ Error:', err.message);
  console.error('\n💡 Installing canvas: npm install canvas');
  process.exit(1);
});
