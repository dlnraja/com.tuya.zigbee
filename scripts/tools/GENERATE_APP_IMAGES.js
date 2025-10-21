#!/usr/bin/env node
'use strict';

/**
 * GENERATE_APP_IMAGES.js
 * Génère des images professionnelles pour l'app principale
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║   🎨 GÉNÉRATION IMAGES APP PRINCIPALE                 ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

const ASSETS_DIR = path.join(__dirname, '../../assets');
const IMAGES_DIR = path.join(ASSETS_DIR, 'images');

// SVG amélioré pour l'app Tuya Zigbee
const generateAppSVG = (size) => {
  const dimensions = {
    small: { w: 250, h: 175 },
    large: { w: 1024, h: 500 },
    xlarge: { w: 2048, h: 800 }
  };
  
  const { w, h } = dimensions[size] || dimensions.large;
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) * 0.35;
  
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-${size}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1E88E5;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#1976D2;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1565C0;stop-opacity:1" />
    </linearGradient>
    
    <radialGradient id="glow-${size}" cx="50%" cy="50%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.4" />
      <stop offset="100%" style="stop-color:#ffffff;stop-opacity:0" />
    </radialGradient>
    
    <filter id="shadow-${size}">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
      <feOffset dx="0" dy="2" result="offsetblur"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.3"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- Background gradient -->
  <rect width="${w}" height="${h}" fill="url(#bg-${size})" rx="${Math.min(w, h) * 0.05}"/>
  
  <!-- Glow effect -->
  <ellipse cx="${cx}" cy="${cy * 0.6}" rx="${w * 0.5}" ry="${h * 0.4}" fill="url(#glow-${size})"/>
  
  <!-- Main hub circle -->
  <circle cx="${cx}" cy="${cy}" r="${radius * 0.8}" 
          fill="rgba(255,255,255,0.15)" 
          stroke="rgba(255,255,255,0.4)" 
          stroke-width="${radius * 0.05}"/>
  
  <!-- Inner circle -->
  <circle cx="${cx}" cy="${cy}" r="${radius * 0.5}" 
          fill="rgba(255,255,255,0.95)" 
          filter="url(#shadow-${size})"/>
  
  <!-- Central Zigbee symbol -->
  <g transform="translate(${cx}, ${cy})">
    <!-- Zigbee Z symbol -->
    <path d="M ${-radius * 0.25} ${-radius * 0.3} 
             L ${radius * 0.25} ${-radius * 0.3} 
             L ${-radius * 0.25} ${radius * 0.3} 
             L ${radius * 0.25} ${radius * 0.3}" 
          stroke="#1E88E5" 
          stroke-width="${radius * 0.08}" 
          fill="none"
          stroke-linecap="round"/>
  </g>
  
  <!-- Connection nodes (4 corners) -->
  <circle cx="${cx - radius * 1.2}" cy="${cy - radius * 0.7}" r="${radius * 0.15}" 
          fill="white" 
          opacity="0.9"
          filter="url(#shadow-${size})"/>
  <circle cx="${cx + radius * 1.2}" cy="${cy - radius * 0.7}" r="${radius * 0.15}" 
          fill="white" 
          opacity="0.9"
          filter="url(#shadow-${size})"/>
  <circle cx="${cx - radius * 1.2}" cy="${cy + radius * 0.7}" r="${radius * 0.15}" 
          fill="white" 
          opacity="0.9"
          filter="url(#shadow-${size})"/>
  <circle cx="${cx + radius * 1.2}" cy="${cy + radius * 0.7}" r="${radius * 0.15}" 
          fill="white" 
          opacity="0.9"
          filter="url(#shadow-${size})"/>
  
  <!-- Connection lines -->
  <line x1="${cx - radius * 0.6}" y1="${cy - radius * 0.4}" 
        x2="${cx - radius * 1.05}" y2="${cy - radius * 0.65}" 
        stroke="rgba(255,255,255,0.6)" 
        stroke-width="${radius * 0.04}"/>
  <line x1="${cx + radius * 0.6}" y1="${cy - radius * 0.4}" 
        x2="${cx + radius * 1.05}" y2="${cy - radius * 0.65}" 
        stroke="rgba(255,255,255,0.6)" 
        stroke-width="${radius * 0.04}"/>
  <line x1="${cx - radius * 0.6}" y1="${cy + radius * 0.4}" 
        x2="${cx - radius * 1.05}" y2="${cy + radius * 0.65}" 
        stroke="rgba(255,255,255,0.6)" 
        stroke-width="${radius * 0.04}"/>
  <line x1="${cx + radius * 0.6}" y1="${cy + radius * 0.4}" 
        x2="${cx + radius * 1.05}" y2="${cy + radius * 0.65}" 
        stroke="rgba(255,255,255,0.6)" 
        stroke-width="${radius * 0.04}"/>
  
  <!-- Brand text (for large sizes) -->
  ${size !== 'small' ? `
  <text x="${cx}" y="${h - radius * 0.8}" 
        font-family="Arial, sans-serif" 
        font-size="${radius * 0.35}" 
        font-weight="700" 
        fill="white" 
        text-anchor="middle"
        opacity="0.9">TUYA ZIGBEE</text>
  <text x="${cx}" y="${h - radius * 0.3}" 
        font-family="Arial, sans-serif" 
        font-size="${radius * 0.2}" 
        font-weight="400" 
        fill="white" 
        text-anchor="middle"
        opacity="0.7">Universal Control</text>
  ` : ''}
</svg>`;
};

async function generateImages() {
  try {
    console.log('📦 Génération small.png (250×175)...');
    const svgSmall = generateAppSVG('small');
    await sharp(Buffer.from(svgSmall))
      .resize(250, 175)
      .png({ quality: 100 })
      .toFile(path.join(IMAGES_DIR, 'small.png'));
    console.log('   ✅ small.png créé');
    
    console.log('\n📦 Génération large.png (1024×500)...');
    const svgLarge = generateAppSVG('large');
    await sharp(Buffer.from(svgLarge))
      .resize(1024, 500)
      .png({ quality: 100 })
      .toFile(path.join(IMAGES_DIR, 'large.png'));
    console.log('   ✅ large.png créé');
    
    console.log('\n📦 Génération xlarge.png (2048×800)...');
    const svgXLarge = generateAppSVG('xlarge');
    await sharp(Buffer.from(svgXLarge))
      .resize(2048, 800)
      .png({ quality: 100 })
      .toFile(path.join(IMAGES_DIR, 'xlarge.png'));
    console.log('   ✅ xlarge.png créé');
    
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ SUCCÈS COMPLET                   ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    console.log('📊 Images générées:');
    console.log('   • assets/images/small.png  (250×175)');
    console.log('   • assets/images/large.png  (1024×500)');
    console.log('   • assets/images/xlarge.png (2048×800)');
    console.log('\n🎨 Design:');
    console.log('   • Gradient bleu Tuya (#1E88E5 → #1565C0)');
    console.log('   • Hub central avec symbole Zigbee "Z"');
    console.log('   • 4 nœuds de connexion');
    console.log('   • Texte "TUYA ZIGBEE" + "Universal Control"');
    console.log('   • Effets glow + shadows professionnels');
    console.log('\n✨ Prêt pour publication Homey!\n');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

generateImages();
