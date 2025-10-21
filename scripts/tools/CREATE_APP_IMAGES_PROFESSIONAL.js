#!/usr/bin/env node

/**
 * CREATE_APP_IMAGES_PROFESSIONAL.js
 * Crée des images d'app professionnelles avec design unique
 * - Couleurs cohérentes avec branding Zigbee
 * - Design moderne et minimaliste
 * - Icônes power intégrées
 */

const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');

console.log('🎨 CRÉATION DES IMAGES APP PROFESSIONNELLES...\n');

// Couleurs professionnelles Zigbee
const COLORS = {
  primary: '#5A9FE2',      // Bleu Zigbee
  secondary: '#4A8FD2',    // Bleu foncé
  accent: '#4CAF50',       // Vert (battery)
  background: '#F8F9FA',   // Gris clair
  backgroundDark: '#E9ECEF',
  text: '#6C757D',
  textLight: '#8B96A0',
  white: '#FFFFFF'
};

// ============================================
// SMALL IMAGE (250x175)
// ============================================
const smallImage = `<svg width="250" height="175" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-small" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${COLORS.background};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${COLORS.backgroundDark};stop-opacity:1" />
    </linearGradient>
    <linearGradient id="icon-small" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${COLORS.primary};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${COLORS.secondary};stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="250" height="175" rx="20" fill="url(#bg-small)"/>
  
  <!-- Cercle central -->
  <circle cx="125" cy="75" r="42" fill="${COLORS.white}" opacity="0.7"/>
  
  <!-- Icône Zigbee réseau -->
  <g transform="translate(125, 75)">
    <!-- Noeud central -->
    <circle cx="0" cy="0" r="8" fill="url(#icon-small)"/>
    
    <!-- Lignes -->
    <line x1="0" y1="0" x2="0" y2="-25" stroke="${COLORS.primary}" stroke-width="1.5" opacity="0.6"/>
    <line x1="0" y1="0" x2="22" y2="13" stroke="${COLORS.primary}" stroke-width="1.5" opacity="0.6"/>
    <line x1="0" y1="0" x2="-22" y2="13" stroke="${COLORS.primary}" stroke-width="1.5" opacity="0.6"/>
    
    <!-- Noeuds -->
    <circle cx="0" cy="-25" r="5" fill="url(#icon-small)" opacity="0.9"/>
    <circle cx="22" cy="13" r="5" fill="url(#icon-small)" opacity="0.9"/>
    <circle cx="-22" cy="13" r="5" fill="url(#icon-small)" opacity="0.9"/>
    
    <!-- Points lumineux -->
    <circle cx="0" cy="0" r="1.5" fill="${COLORS.white}"/>
    <circle cx="0" cy="-25" r="1" fill="${COLORS.white}"/>
    <circle cx="22" cy="13" r="1" fill="${COLORS.white}"/>
    <circle cx="-22" cy="13" r="1" fill="${COLORS.white}"/>
  </g>
  
  <!-- Badge batterie (coin) -->
  <g transform="translate(200, 30)">
    <circle cx="0" cy="0" r="12" fill="${COLORS.accent}" opacity="0.9"/>
    <rect x="-4" y="-3" width="8" height="6" rx="1" fill="${COLORS.white}" opacity="0.9"/>
    <rect x="-2" y="-4" width="4" height="1" rx="0.5" fill="${COLORS.white}" opacity="0.9"/>
  </g>
  
  <!-- Texte ZIGBEE -->
  <text x="125" y="145" 
        font-family="'SF Pro Display', Arial, sans-serif" 
        font-size="16" 
        font-weight="300"
        letter-spacing="3"
        fill="${COLORS.text}" 
        text-anchor="middle">ZIGBEE</text>
  
  <!-- Sous-titre -->
  <text x="125" y="162" 
        font-family="'SF Pro Display', Arial, sans-serif" 
        font-size="9" 
        font-weight="400"
        letter-spacing="1.5"
        fill="${COLORS.textLight}" 
        text-anchor="middle">183 DRIVERS</text>
</svg>`;

// ============================================
// LARGE IMAGE (500x350)
// ============================================
const largeImage = `<svg width="500" height="350" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-large" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${COLORS.background};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${COLORS.backgroundDark};stop-opacity:1" />
    </linearGradient>
    <linearGradient id="icon-large" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${COLORS.primary};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${COLORS.secondary};stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="500" height="350" rx="45" fill="url(#bg-large)"/>
  
  <!-- Cercle central -->
  <circle cx="250" cy="150" r="90" fill="${COLORS.white}" opacity="0.7"/>
  
  <!-- Icône Zigbee principale -->
  <g transform="translate(250, 150)">
    <!-- Noeud central -->
    <circle cx="0" cy="0" r="18" fill="url(#icon-large)"/>
    
    <!-- Lignes de connexion -->
    <line x1="0" y1="0" x2="0" y2="-55" stroke="${COLORS.primary}" stroke-width="2" opacity="0.6"/>
    <line x1="0" y1="0" x2="48" y2="28" stroke="${COLORS.primary}" stroke-width="2" opacity="0.6"/>
    <line x1="0" y1="0" x2="-48" y2="28" stroke="${COLORS.primary}" stroke-width="2" opacity="0.6"/>
    
    <!-- Noeuds périphériques -->
    <circle cx="0" cy="-55" r="12" fill="url(#icon-large)" opacity="0.9"/>
    <circle cx="48" cy="28" r="12" fill="url(#icon-large)" opacity="0.9"/>
    <circle cx="-48" cy="28" r="12" fill="url(#icon-large)" opacity="0.9"/>
    
    <!-- Points lumineux -->
    <circle cx="0" cy="0" r="3.5" fill="${COLORS.white}"/>
    <circle cx="0" cy="-55" r="2.5" fill="${COLORS.white}"/>
    <circle cx="48" cy="28" r="2.5" fill="${COLORS.white}"/>
    <circle cx="-48" cy="28" r="2.5" fill="${COLORS.white}"/>
  </g>
  
  <!-- Badges power types -->
  <g transform="translate(400, 60)">
    <!-- Battery -->
    <circle cx="0" cy="0" r="16" fill="${COLORS.accent}" opacity="0.9"/>
    <rect x="-6" y="-4" width="12" height="8" rx="1.5" fill="${COLORS.white}" opacity="0.9"/>
    <rect x="-3" y="-6" width="6" height="2" rx="1" fill="${COLORS.white}" opacity="0.9"/>
    
    <!-- AC Lightning -->
    <circle cx="0" cy="40" r="16" fill="${COLORS.primary}" opacity="0.9"/>
    <path d="M 3 32 L -3 40 L 0 40 L -2 48 L 4 38 L 1 38 Z" fill="${COLORS.white}" opacity="0.9"/>
  </g>
  
  <!-- Titre principal -->
  <text x="250" y="275" 
        font-family="'SF Pro Display', 'Segoe UI', Arial, sans-serif" 
        font-size="42" 
        font-weight="300"
        letter-spacing="8"
        fill="${COLORS.text}" 
        text-anchor="middle">ZIGBEE</text>
  
  <!-- Sous-titre -->
  <text x="250" y="310" 
        font-family="'SF Pro Display', 'Segoe UI', Arial, sans-serif" 
        font-size="18" 
        font-weight="400"
        letter-spacing="3"
        fill="${COLORS.textLight}" 
        text-anchor="middle">UNIVERSAL DEVICE APP</text>
  
  <!-- Version badge -->
  <text x="250" y="330" 
        font-family="'SF Pro Display', 'Segoe UI', Arial, sans-serif" 
        font-size="11" 
        font-weight="400"
        letter-spacing="2"
        fill="${COLORS.textLight}" 
        opacity="0.7"
        text-anchor="middle">SDK3 • 183 DRIVERS • 300+ DEVICES</text>
</svg>`;

// ============================================
// XLARGE IMAGE (1024x1024)
// ============================================
const xlargeImage = `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-xlarge" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${COLORS.background};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${COLORS.backgroundDark};stop-opacity:1" />
    </linearGradient>
    <linearGradient id="icon-xlarge" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${COLORS.primary};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${COLORS.secondary};stop-opacity:1" />
    </linearGradient>
    <radialGradient id="glow-xlarge">
      <stop offset="0%" style="stop-color:${COLORS.primary};stop-opacity:0.3" />
      <stop offset="100%" style="stop-color:${COLORS.primary};stop-opacity:0" />
    </radialGradient>
  </defs>
  
  <!-- Background -->
  <rect width="1024" height="1024" rx="120" fill="url(#bg-xlarge)"/>
  
  <!-- Glow effect -->
  <circle cx="512" cy="420" r="250" fill="url(#glow-xlarge)"/>
  
  <!-- Cercle principal -->
  <circle cx="512" cy="420" r="200" fill="${COLORS.white}" opacity="0.7"/>
  
  <!-- Icône Zigbee mesh network -->
  <g transform="translate(512, 420)">
    <!-- Noeud central grand -->
    <circle cx="0" cy="0" r="38" fill="url(#icon-xlarge)"/>
    <circle cx="0" cy="0" r="30" fill="${COLORS.white}" opacity="0.2"/>
    
    <!-- Lignes principales -->
    <line x1="0" y1="0" x2="0" y2="-120" stroke="${COLORS.primary}" stroke-width="4" opacity="0.6"/>
    <line x1="0" y1="0" x2="104" y2="-60" stroke="${COLORS.primary}" stroke-width="4" opacity="0.6"/>
    <line x1="0" y1="0" x2="104" y2="60" stroke="${COLORS.primary}" stroke-width="4" opacity="0.6"/>
    <line x1="0" y1="0" x2="-104" y2="60" stroke="${COLORS.primary}" stroke-width="4" opacity="0.6"/>
    <line x1="0" y1="0" x2="-104" y2="-60" stroke="${COLORS.primary}" stroke-width="4" opacity="0.6"/>
    
    <!-- Noeuds périphériques -->
    <circle cx="0" cy="-120" r="24" fill="url(#icon-xlarge)" opacity="0.9"/>
    <circle cx="104" cy="-60" r="24" fill="url(#icon-xlarge)" opacity="0.9"/>
    <circle cx="104" cy="60" r="24" fill="url(#icon-xlarge)" opacity="0.9"/>
    <circle cx="-104" cy="60" r="24" fill="url(#icon-xlarge)" opacity="0.9"/>
    <circle cx="-104" cy="-60" r="24" fill="url(#icon-xlarge)" opacity="0.9"/>
    
    <!-- Points lumineux -->
    <circle cx="0" cy="0" r="8" fill="${COLORS.white}"/>
    <circle cx="0" cy="-120" r="5" fill="${COLORS.white}"/>
    <circle cx="104" cy="-60" r="5" fill="${COLORS.white}"/>
    <circle cx="104" cy="60" r="5" fill="${COLORS.white}"/>
    <circle cx="-104" cy="60" r="5" fill="${COLORS.white}"/>
    <circle cx="-104" cy="-60" r="5" fill="${COLORS.white}"/>
  </g>
  
  <!-- Badges power types (grande taille) -->
  <g transform="translate(820, 200)">
    <!-- Battery -->
    <circle cx="0" cy="0" r="35" fill="${COLORS.accent}" opacity="0.95"/>
    <rect x="-14" y="-10" width="28" height="20" rx="3" fill="${COLORS.white}" opacity="0.95"/>
    <rect x="-8" y="-14" width="16" height="4" rx="2" fill="${COLORS.white}" opacity="0.95"/>
    
    <!-- AC -->
    <circle cx="0" cy="85" r="35" fill="${COLORS.primary}" opacity="0.95"/>
    <path d="M 8 70 L -8 85 L 0 85 L -6 100 L 10 82 L 2 82 Z" fill="${COLORS.white}" opacity="0.95"/>
    
    <!-- Hybrid -->
    <circle cx="0" cy="170" r="35" fill="#FF9800" opacity="0.95"/>
    <path d="M 0 155 A 15 15 0 1 1 0 185" fill="none" stroke="${COLORS.white}" stroke-width="3" stroke-linecap="round"/>
    <path d="M -3 157 L 0 155 L 0 159 Z" fill="${COLORS.white}"/>
  </g>
  
  <!-- Titre principal -->
  <text x="512" y="700" 
        font-family="'SF Pro Display', 'Segoe UI', Arial, sans-serif" 
        font-size="90" 
        font-weight="300"
        letter-spacing="16"
        fill="${COLORS.text}" 
        text-anchor="middle">ZIGBEE</text>
  
  <!-- Sous-titre -->
  <text x="512" y="770" 
        font-family="'SF Pro Display', 'Segoe UI', Arial, sans-serif" 
        font-size="36" 
        font-weight="400"
        letter-spacing="6"
        fill="${COLORS.textLight}" 
        text-anchor="middle">UNIVERSAL DEVICE APP</text>
  
  <!-- Description -->
  <text x="512" y="830" 
        font-family="'SF Pro Display', 'Segoe UI', Arial, sans-serif" 
        font-size="22" 
        font-weight="400"
        letter-spacing="3"
        fill="${COLORS.textLight}" 
        opacity="0.8"
        text-anchor="middle">183 Native SDK3 Drivers • 300+ Device IDs</text>
  
  <!-- Features -->
  <text x="512" y="880" 
        font-family="'SF Pro Display', 'Segoe UI', Arial, sans-serif" 
        font-size="18" 
        font-weight="400"
        letter-spacing="2"
        fill="${COLORS.textLight}" 
        opacity="0.7"
        text-anchor="middle">Battery Intelligence • Energy Optimized • Homey Standards</text>
  
  <!-- Version badge -->
  <text x="512" y="940" 
        font-family="'SF Pro Display', 'Segoe UI', Arial, sans-serif" 
        font-size="16" 
        font-weight="400"
        letter-spacing="2"
        fill="${COLORS.textLight}" 
        opacity="0.6"
        text-anchor="middle">v2.15.62 • 100% Local Control • Community Maintained</text>
</svg>`;

// ============================================
// SAUVEGARDER LES IMAGES
// ============================================
const images = {
  'icon-small-pro.svg': smallImage,
  'icon-large-pro.svg': largeImage,
  'icon-xlarge-pro.svg': xlargeImage
};

let created = 0;

Object.keys(images).forEach(filename => {
  const filepath = path.join(IMAGES_DIR, filename);
  fs.writeFileSync(filepath, images[filename], 'utf8');
  console.log(`✅ ${filename}`);
  created++;
});

console.log(`\n✅ ${created} images professionnelles créées!`);
console.log(`\n📁 Emplacement: ${IMAGES_DIR}`);
console.log('\n🎨 CARACTÉRISTIQUES:');
console.log('  • Design moderne et minimaliste');
console.log('  • Couleurs Zigbee professionnelles');
console.log('  • Badges power types intégrés');
console.log('  • Mesh network visualization');
console.log('  • Effets de glow et gradients');
console.log('  • Typography moderne (SF Pro Display)');
console.log('\n💡 Pour utiliser ces images:');
console.log('  Renommez-les pour remplacer les anciennes:');
console.log('  - icon-small-pro.svg → icon-small.svg');
console.log('  - icon-large-pro.svg → icon-large.svg');
console.log('  - icon-xlarge-pro.svg → icon-xlarge.svg');
