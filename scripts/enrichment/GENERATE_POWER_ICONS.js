#!/usr/bin/env node

/**
 * GENERATE_POWER_ICONS.js
 * Génère des icônes SVG professionnelles pour les types d'alimentation
 * - Battery icon (🔋)
 * - AC/Mains icon (⚡)
 * - DC icon (🔌)
 * - Hybrid icon (🔄)
 */

const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '..', 'assets', 'icons');

console.log('🎨 GÉNÉRATION DES ICÔNES D\'ALIMENTATION...\n');

// Couleurs professionnelles
const COLORS = {
  battery: '#4CAF50',      // Vert
  batteryLow: '#FFC107',   // Orange
  batteryCritical: '#F44336', // Rouge
  ac: '#2196F3',           // Bleu
  dc: '#9C27B0',           // Violet
  hybrid: '#FF9800',       // Orange foncé
  background: '#FFFFFF',
  shadow: '#00000020'
};

// ============================================
// 1. BATTERY ICON
// ============================================
const batteryIcon = `<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="battery-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${COLORS.battery};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#45A049;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background circle -->
  <circle cx="32" cy="32" r="28" fill="${COLORS.background}" opacity="0.1"/>
  
  <!-- Battery body -->
  <rect x="18" y="16" width="28" height="36" rx="3" ry="3" 
        fill="url(#battery-gradient)" stroke="#45A049" stroke-width="2"/>
  
  <!-- Battery terminal -->
  <rect x="26" y="12" width="12" height="4" rx="2" ry="2" 
        fill="url(#battery-gradient)"/>
  
  <!-- Battery level (full) -->
  <rect x="21" y="20" width="22" height="26" rx="2" ry="2" 
        fill="${COLORS.background}" opacity="0.9"/>
  
  <!-- Plus sign -->
  <line x1="32" y1="24" x2="32" y2="30" stroke="${COLORS.battery}" stroke-width="2" stroke-linecap="round"/>
  <line x1="29" y1="27" x2="35" y2="27" stroke="${COLORS.battery}" stroke-width="2" stroke-linecap="round"/>
</svg>`;

// ============================================
// 2. AC/MAINS ICON
// ============================================
const acIcon = `<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ac-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${COLORS.ac};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1976D2;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background circle -->
  <circle cx="32" cy="32" r="28" fill="${COLORS.background}" opacity="0.1"/>
  
  <!-- Lightning bolt -->
  <path d="M 38 12 L 22 32 L 30 32 L 26 52 L 42 28 L 34 28 Z" 
        fill="url(#ac-gradient)" 
        stroke="#1976D2" 
        stroke-width="1.5"
        stroke-linejoin="round"/>
  
  <!-- Glow effect -->
  <path d="M 38 12 L 22 32 L 30 32 L 26 52 L 42 28 L 34 28 Z" 
        fill="none" 
        stroke="${COLORS.ac}" 
        stroke-width="0.5"
        opacity="0.5"/>
</svg>`;

// ============================================
// 3. DC ICON
// ============================================
const dcIcon = `<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="dc-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${COLORS.dc};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7B1FA2;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background circle -->
  <circle cx="32" cy="32" r="28" fill="${COLORS.background}" opacity="0.1"/>
  
  <!-- Plug outline -->
  <rect x="20" y="26" width="24" height="16" rx="3" ry="3" 
        fill="none" stroke="url(#dc-gradient)" stroke-width="2.5"/>
  
  <!-- Pins -->
  <rect x="26" y="18" width="3" height="8" rx="1.5" fill="url(#dc-gradient)"/>
  <rect x="35" y="18" width="3" height="8" rx="1.5" fill="url(#dc-gradient)"/>
  
  <!-- Cable -->
  <path d="M 32 42 Q 32 48, 28 52" 
        fill="none" stroke="url(#dc-gradient)" stroke-width="2.5" stroke-linecap="round"/>
  
  <!-- Plus/Minus indicators -->
  <text x="28" y="36" font-family="Arial" font-size="10" font-weight="bold" fill="${COLORS.dc}">+</text>
  <text x="37" y="36" font-family="Arial" font-size="12" font-weight="bold" fill="${COLORS.dc}">−</text>
</svg>`;

// ============================================
// 4. HYBRID ICON
// ============================================
const hybridIcon = `<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="hybrid-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${COLORS.hybrid};stop-opacity:1" />
      <stop offset="50%" style="stop-color:#FB8C00;stop-opacity:1" />
      <stop offset="100%" style="stop-color:${COLORS.battery};stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background circle -->
  <circle cx="32" cy="32" r="28" fill="${COLORS.background}" opacity="0.1"/>
  
  <!-- Circular arrows (cycle) -->
  <path d="M 32 14 A 18 18 0 1 1 32 50" 
        fill="none" stroke="url(#hybrid-gradient)" stroke-width="3" stroke-linecap="round"/>
  <path d="M 32 50 A 18 18 0 1 1 32 14" 
        fill="none" stroke="url(#hybrid-gradient)" stroke-width="3" stroke-linecap="round" opacity="0.6"/>
  
  <!-- Arrow heads -->
  <path d="M 28 16 L 32 14 L 32 18 Z" fill="${COLORS.hybrid}"/>
  <path d="M 36 48 L 32 50 L 32 46 Z" fill="${COLORS.battery}"/>
  
  <!-- Center symbols -->
  <g transform="translate(32, 32)">
    <!-- Lightning (AC) -->
    <path d="M -4 -8 L -8 -2 L -5 -2 L -6 2 L -2 -4 L -5 -4 Z" fill="${COLORS.ac}" opacity="0.8"/>
    <!-- Battery (DC) -->
    <rect x="1" y="-6" width="6" height="10" rx="1" fill="${COLORS.battery}" opacity="0.8"/>
    <rect x="3" y="-7" width="2" height="1.5" rx="0.5" fill="${COLORS.battery}" opacity="0.8"/>
  </g>
</svg>`;

// ============================================
// 5. BATTERY LOW ICON
// ============================================
const batteryLowIcon = `<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="battery-low-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${COLORS.batteryLow};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FF9800;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background circle -->
  <circle cx="32" cy="32" r="28" fill="${COLORS.background}" opacity="0.1"/>
  
  <!-- Battery body -->
  <rect x="18" y="16" width="28" height="36" rx="3" ry="3" 
        fill="url(#battery-low-gradient)" stroke="#FF9800" stroke-width="2"/>
  
  <!-- Battery terminal -->
  <rect x="26" y="12" width="12" height="4" rx="2" ry="2" 
        fill="url(#battery-low-gradient)"/>
  
  <!-- Battery level (20%) -->
  <rect x="21" y="43" width="22" height="6" rx="2" ry="2" 
        fill="${COLORS.background}" opacity="0.9"/>
  
  <!-- Warning sign -->
  <text x="32" y="38" font-family="Arial" font-size="24" font-weight="bold" 
        fill="${COLORS.background}" text-anchor="middle">!</text>
</svg>`;

// ============================================
// SAUVEGARDER LES ICÔNES
// ============================================
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

const icons = {
  'power-battery.svg': batteryIcon,
  'power-ac.svg': acIcon,
  'power-dc.svg': dcIcon,
  'power-hybrid.svg': hybridIcon,
  'power-battery-low.svg': batteryLowIcon
};

let created = 0;

Object.keys(icons).forEach(filename => {
  const filepath = path.join(ICONS_DIR, filename);
  fs.writeFileSync(filepath, icons[filename], 'utf8');
  console.log(`✅ ${filename}`);
  created++;
});

console.log(`\n✅ ${created} icônes créées dans: ${ICONS_DIR}`);
console.log('\n📋 ICÔNES DISPONIBLES:');
console.log('  🔋 power-battery.svg (Vert - Batterie pleine)');
console.log('  ⚡ power-ac.svg (Bleu - Secteur AC)');
console.log('  🔌 power-dc.svg (Violet - DC)');
console.log('  🔄 power-hybrid.svg (Orange/Vert - Hybrid)');
console.log('  ⚠️  power-battery-low.svg (Orange - Batterie faible)');

console.log('\n💡 UTILISATION:');
console.log('Ces icônes peuvent être utilisées pour:');
console.log('- Documentation (README, guides)');
console.log('- Interface utilisateur');
console.log('- Distinction visuelle des types');
console.log('- Badges de status');
