const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║   🎨 GÉNÉRATION IMAGES APP UNIQUES ET DISTINCTES      ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

// Créer 3 designs VRAIMENT différents pour chaque taille

// SMALL (250x175) - Design minimaliste avec logo simple
function createSmallImage() {
  return `<svg width="250" height="175" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-small" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0066FF;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#003399;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="250" height="175" fill="url(#bg-small)" rx="20"/>
  
  <!-- Logo Zigbee simple -->
  <path d="M 100 50 L 150 50 L 125 85 L 160 85 L 90 130 L 115 95 L 85 95 Z" 
        fill="#FFD700" 
        stroke="#FFFFFF" 
        stroke-width="2"/>
  
  <!-- Text TUYA -->
  <text x="125" y="160" 
        font-family="Arial, sans-serif" 
        font-size="24" 
        font-weight="bold" 
        fill="#FFFFFF" 
        text-anchor="middle">TUYA</text>
</svg>`;
}

// LARGE (500x350) - Design complet avec détails
function createLargeImage() {
  return `<svg width="500" height="350" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-large" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0052CC;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0033AA;stop-opacity:1" />
    </linearGradient>
    
    <radialGradient id="shine-large">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.3" />
      <stop offset="100%" style="stop-color:#ffffff;stop-opacity:0" />
    </radialGradient>
  </defs>
  
  <!-- Background -->
  <rect width="500" height="350" fill="url(#bg-large)" rx="40"/>
  
  <!-- Brillance -->
  <ellipse cx="250" cy="100" rx="200" ry="80" fill="url(#shine-large)"/>
  
  <!-- Cercle central -->
  <circle cx="250" cy="175" r="120" 
          fill="rgba(255,255,255,0.1)" 
          stroke="rgba(255,255,255,0.3)" 
          stroke-width="3"/>
  
  <!-- Lightning Zigbee -->
  <path d="M 220 110 L 270 135 L 240 135 L 285 200 L 255 165 L 280 165 Z" 
        fill="#FFD700" 
        stroke="#FFFFFF" 
        stroke-width="4"/>
  
  <!-- Ondes radio -->
  <g opacity="0.7">
    <path d="M 180 140 Q 160 160, 180 180" 
          stroke="#FFFFFF" 
          stroke-width="5" 
          fill="none" 
          stroke-linecap="round"/>
    <path d="M 320 140 Q 340 160, 320 180" 
          stroke="#FFFFFF" 
          stroke-width="5" 
          fill="none" 
          stroke-linecap="round"/>
    <path d="M 160 130 Q 130 160, 160 190" 
          stroke="#FFFFFF" 
          stroke-width="4" 
          fill="none" 
          stroke-linecap="round"
          opacity="0.6"/>
    <path d="M 340 130 Q 370 160, 340 190" 
          stroke="#FFFFFF" 
          stroke-width="4" 
          fill="none" 
          stroke-linecap="round"
          opacity="0.6"/>
  </g>
  
  <!-- Text TUYA -->
  <text x="250" y="280" 
        font-family="Arial, sans-serif" 
        font-size="48" 
        font-weight="bold" 
        fill="#FFFFFF" 
        text-anchor="middle">TUYA</text>
  
  <!-- Badge Zigbee -->
  <rect x="175" y="295" width="150" height="35" rx="8" fill="rgba(255,215,0,0.9)"/>
  <text x="250" y="320" 
        font-family="Arial, sans-serif" 
        font-size="20" 
        font-weight="600" 
        fill="#003366" 
        text-anchor="middle">Zigbee</text>
</svg>`;
}

// XLARGE (1000x700) - Design détaillé avec effet 3D
function createXLargeImage() {
  return `<svg width="1000" height="700" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-xlarge" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0052CC;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#0044BB;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0033AA;stop-opacity:1" />
    </linearGradient>
    
    <linearGradient id="lightning-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FFA500;stop-opacity:1" />
    </linearGradient>
    
    <radialGradient id="shine-xlarge">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.4" />
      <stop offset="100%" style="stop-color:#ffffff;stop-opacity:0" />
    </radialGradient>
    
    <filter id="shadow-xlarge">
      <feGaussianBlur in="SourceAlpha" stdDeviation="5"/>
      <feOffset dx="0" dy="3" result="offsetblur"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.4"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- Background avec gradient -->
  <rect width="1000" height="700" fill="url(#bg-xlarge)" rx="80"/>
  
  <!-- Brillance en haut -->
  <ellipse cx="500" cy="200" rx="400" ry="150" fill="url(#shine-xlarge)"/>
  
  <!-- Cercles décoratifs -->
  <circle cx="500" cy="350" r="250" 
          fill="rgba(255,255,255,0.08)" 
          stroke="rgba(255,255,255,0.2)" 
          stroke-width="4"/>
  <circle cx="500" cy="350" r="180" 
          fill="rgba(255,255,255,0.05)" 
          stroke="rgba(255,255,255,0.15)" 
          stroke-width="3"/>
  
  <!-- Lightning Zigbee principal avec ombre -->
  <g filter="url(#shadow-xlarge)">
    <path d="M 440 220 L 540 280 L 480 280 L 570 400 L 510 330 L 560 330 Z" 
          fill="url(#lightning-gradient)" 
          stroke="#FFFFFF" 
          stroke-width="8"
          stroke-linejoin="round"/>
    
    <!-- Éclats supplémentaires -->
    <path d="M 400 250 L 380 270 L 420 270 Z" fill="#FFD700" opacity="0.8"/>
    <path d="M 590 360 L 570 380 L 610 380 Z" fill="#FFD700" opacity="0.8"/>
  </g>
  
  <!-- Ondes radio concentriques (6 niveaux) -->
  <g opacity="0.6">
    <!-- Gauche -->
    <path d="M 340 310 Q 300 350, 340 390" 
          stroke="#FFFFFF" stroke-width="10" fill="none" stroke-linecap="round"/>
    <path d="M 300 280 Q 240 350, 300 420" 
          stroke="#FFFFFF" stroke-width="8" fill="none" stroke-linecap="round" opacity="0.7"/>
    <path d="M 260 250 Q 180 350, 260 450" 
          stroke="#FFFFFF" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.5"/>
    
    <!-- Droite -->
    <path d="M 660 310 Q 700 350, 660 390" 
          stroke="#FFFFFF" stroke-width="10" fill="none" stroke-linecap="round"/>
    <path d="M 700 280 Q 760 350, 700 420" 
          stroke="#FFFFFF" stroke-width="8" fill="none" stroke-linecap="round" opacity="0.7"/>
    <path d="M 740 250 Q 820 350, 740 450" 
          stroke="#FFFFFF" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.5"/>
  </g>
  
  <!-- Text TUYA avec ombre -->
  <text x="500" y="560" 
        font-family="Arial, sans-serif" 
        font-size="96" 
        font-weight="bold" 
        fill="#FFFFFF" 
        text-anchor="middle"
        filter="url(#shadow-xlarge)">TUYA</text>
  
  <!-- Badge Zigbee -->
  <g filter="url(#shadow-xlarge)">
    <rect x="350" y="590" width="300" height="70" rx="15" fill="rgba(255,215,0,0.95)"/>
    <text x="500" y="640" 
          font-family="Arial, sans-serif" 
          font-size="40" 
          font-weight="600" 
          fill="#003366" 
          text-anchor="middle">Zigbee</text>
  </g>
  
  <!-- Dots décoratifs -->
  <circle cx="200" cy="150" r="8" fill="rgba(255,255,255,0.3)"/>
  <circle cx="800" cy="150" r="8" fill="rgba(255,255,255,0.3)"/>
  <circle cx="200" cy="550" r="8" fill="rgba(255,255,255,0.3)"/>
  <circle cx="800" cy="550" r="8" fill="rgba(255,255,255,0.3)"/>
</svg>`;
}

async function generateImages() {
  const assetsDir = path.join('assets', 'images');
  
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  
  console.log('📦 Génération des 3 images UNIQUES...\n');
  
  try {
    // Small: 250x175 - Design simple
    const svgSmall = createSmallImage();
    await sharp(Buffer.from(svgSmall))
      .png()
      .toFile(path.join(assetsDir, 'small.png'));
    console.log('✅ small.png:  250×175 - Design MINIMALISTE');
    
    // Large: 500x350 - Design complet
    const svgLarge = createLargeImage();
    await sharp(Buffer.from(svgLarge))
      .png()
      .toFile(path.join(assetsDir, 'large.png'));
    console.log('✅ large.png:  500×350 - Design COMPLET');
    
    // XLarge: 1000x700 - Design détaillé
    const svgXLarge = createXLargeImage();
    await sharp(Buffer.from(svgXLarge))
      .png()
      .toFile(path.join(assetsDir, 'xlarge.png'));
    console.log('✅ xlarge.png: 1000×700 - Design DÉTAILLÉ 3D');
    
    console.log('\n✅ 3 IMAGES UNIQUES GÉNÉRÉES!\n');
    
    console.log('🎨 DIFFÉRENCES ENTRE LES IMAGES:\n');
    console.log('   SMALL (250×175):');
    console.log('   ├─ Lightning simple');
    console.log('   ├─ Text TUYA basique');
    console.log('   └─ Pas d\'ondes radio\n');
    
    console.log('   LARGE (500×350):');
    console.log('   ├─ Lightning avec cercle central');
    console.log('   ├─ 4 ondes radio (2 de chaque côté)');
    console.log('   ├─ Badge Zigbee doré');
    console.log('   └─ Brillance en haut\n');
    
    console.log('   XLARGE (1000×700):');
    console.log('   ├─ Lightning avec gradient + ombres');
    console.log('   ├─ 6 ondes radio concentriques');
    console.log('   ├─ 2 cercles décoratifs');
    console.log('   ├─ Badge Zigbee grand');
    console.log('   ├─ Dots aux coins');
    console.log('   └─ Effet 3D avec shadows\n');
    
    // Vérifier les tailles
    const stats = {
      small: fs.statSync(path.join(assetsDir, 'small.png')).size,
      large: fs.statSync(path.join(assetsDir, 'large.png')).size,
      xlarge: fs.statSync(path.join(assetsDir, 'xlarge.png')).size
    };
    
    console.log('📊 TAILLES FICHIERS:\n');
    console.log(`   small.png:  ${(stats.small / 1024).toFixed(1)} KB`);
    console.log(`   large.png:  ${(stats.large / 1024).toFixed(1)} KB`);
    console.log(`   xlarge.png: ${(stats.xlarge / 1024).toFixed(1)} KB\n`);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

generateImages().catch(console.error);
