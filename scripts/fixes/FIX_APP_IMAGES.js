const sharp = require('sharp');
const fs = require('fs');

console.log('🎨 GÉNÉRATION IMAGES APP - PROFESSIONNELLES\n');

// Créer une belle image SVG pour l'app Tuya Zigbee
function createAppSVG(width, height) {
  const centerX = width / 2;
  const centerY = height / 2;
  
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0066FF"/>
      <stop offset="100%" stop-color="#0033AA"/>
    </linearGradient>
    <linearGradient id="zigzag" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FFD700"/>
      <stop offset="100%" stop-color="#FFA500"/>
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bg)" rx="${width * 0.1}"/>
  
  <!-- Zigbee symbol (zigzag lightning) -->
  <g transform="translate(${centerX}, ${centerY - height * 0.05})">
    <!-- Lightning bolt -->
    <path d="M -${width*0.08} -${height*0.15} 
             L ${width*0.04} 0 
             L -${width*0.02} 0 
             L ${width*0.08} ${height*0.15} 
             L ${width*0.01} ${height*0.05} 
             L ${width*0.05} ${height*0.05} 
             Z" 
          fill="url(#zigzag)" 
          stroke="white" 
          stroke-width="${width*0.008}"/>
  </g>
  
  <!-- Wireless waves -->
  <g transform="translate(${centerX}, ${centerY - height * 0.05})">
    <path d="M -${width*0.15} -${height*0.08} 
             Q -${width*0.18} -${height*0.12}, -${width*0.15} -${height*0.16}" 
          stroke="white" 
          stroke-width="${width*0.012}" 
          fill="none" 
          opacity="0.6"/>
    <path d="M ${width*0.15} -${height*0.08} 
             Q ${width*0.18} -${height*0.12}, ${width*0.15} -${height*0.16}" 
          stroke="white" 
          stroke-width="${width*0.012}" 
          fill="none" 
          opacity="0.6"/>
  </g>
  
  <!-- Text: TUYA -->
  <text x="${centerX}" 
        y="${centerY + height * 0.22}" 
        font-family="Arial, sans-serif" 
        font-size="${width * 0.12}" 
        font-weight="bold" 
        fill="white" 
        text-anchor="middle">TUYA</text>
  
  <!-- Text: Zigbee -->
  <text x="${centerX}" 
        y="${centerY + height * 0.32}" 
        font-family="Arial, sans-serif" 
        font-size="${width * 0.08}" 
        fill="#FFD700" 
        text-anchor="middle">Zigbee</text>
</svg>`;
}

async function generateAppImages() {
  const assetsDir = 'assets/images';
  
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  
  console.log('📦 Génération des images d\'app...\n');
  
  // Small: 250x175
  const svgSmall = createAppSVG(250, 175);
  await sharp(Buffer.from(svgSmall))
    .png()
    .toFile(`${assetsDir}/small.png`);
  console.log('✅ small.png: 250x175');
  
  // Large: 500x350
  const svgLarge = createAppSVG(500, 350);
  await sharp(Buffer.from(svgLarge))
    .png()
    .toFile(`${assetsDir}/large.png`);
  console.log('✅ large.png: 500x350');
  
  // XLarge: 1000x700
  const svgXLarge = createAppSVG(1000, 700);
  await sharp(Buffer.from(svgXLarge))
    .png()
    .toFile(`${assetsDir}/xlarge.png`);
  console.log('✅ xlarge.png: 1000x700');
  
  console.log('\n✅ Images d\'app générées avec succès!\n');
}

generateAppImages().catch(console.error);
