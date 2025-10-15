#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🎨 GÉNÉRATION ICONS.SVG MANQUANTS\n');
console.log('=' .repeat(70) + '\n');

const stats = {
    total: 0,
    generated: 0,
    alreadyExist: 0,
    errors: 0
};

// Mapping driver → emoji (basé sur le script generate_svg_icons.js)
const driverEmojis = {
    'air_quality': '🌫️',
    'co_detector': '📡',
    'co2': '🔬',
    'climate': '🌡️',
    'temperature': '🌡️',
    'humidity': '💧',
    'thermostat': '🎚️',
    'trv': '🎚️',
    'fan': '💨',
    'light': '💡',
    'ceiling_light': '💡',
    'bulb': '💡',
    'dimmer': '🔆',
    'rgb': '🌈',
    'switch': '⚡',
    'button': '🔘',
    'scene': '🎬',
    'motion': '🏃',
    'pir': '👁️',
    'presence': '🏃',
    'radar': '📡',
    'contact': '🚪',
    'door': '🚪',
    'window': '🪟',
    'plug': '🔌',
    'socket': '🔌',
    'outlet': '🔌',
    'energy': '⚡',
    'curtain': '🪟',
    'blind': '🪟',
    'shade': '🪟',
    'smoke': '🚨',
    'gas': '⚠️',
    'water': '💧',
    'leak': '💧',
    'valve': '🚰',
    'siren': '🔔',
    'alarm': '🚨',
    'vibration': '📳',
    'ir': '📡',
    'lock': '🔒',
    'default': '📱'
};

function getEmojiForDriver(driverName) {
    const name = driverName.toLowerCase();
    
    for (const [key, emoji] of Object.entries(driverEmojis)) {
        if (name.includes(key)) {
            return emoji;
        }
    }
    
    return driverEmojis.default;
}

function getCategoryColor(driverName) {
    const name = driverName.toLowerCase();
    
    if (name.includes('light') || name.includes('bulb') || name.includes('dimmer')) {
        return ['#FFC107', '#FFD54F']; // Yellow
    }
    if (name.includes('switch') || name.includes('button')) {
        return ['#4CAF50', '#81C784']; // Green
    }
    if (name.includes('sensor') || name.includes('motion') || name.includes('pir') || name.includes('detector')) {
        return ['#2196F3', '#64B5F6']; // Blue
    }
    if (name.includes('temp') || name.includes('climate') || name.includes('thermostat')) {
        return ['#FF9800', '#FFB74D']; // Orange
    }
    if (name.includes('plug') || name.includes('socket') || name.includes('energy')) {
        return ['#9C27B0', '#BA68C8']; // Purple
    }
    if (name.includes('smoke') || name.includes('alarm') || name.includes('gas')) {
        return ['#F44336', '#E57373']; // Red
    }
    if (name.includes('curtain') || name.includes('blind')) {
        return ['#795548', '#A1887F']; // Brown
    }
    if (name.includes('fan')) {
        return ['#00BCD4', '#4DD0E1']; // Cyan
    }
    
    return ['#607D8B', '#90A4AE']; // Gray default
}

function generateIconSvg(driverName) {
    const emoji = getEmojiForDriver(driverName);
    const [color1, color2] = getCategoryColor(driverName);
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="500" height="500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad_${driverName}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${color2};stop-opacity:0.8" />
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Background with gradient -->
  <rect width="500" height="500" fill="url(#grad_${driverName})" rx="60"/>
  
  <!-- Icon circle background -->
  <circle cx="250" cy="220" r="100" fill="white" opacity="0.2" filter="url(#shadow)"/>
  
  <!-- Large icon/emoji -->
  <text x="250" y="280" font-family="Arial, sans-serif" font-size="140" 
        fill="white" text-anchor="middle" font-weight="bold" 
        filter="url(#shadow)">${emoji}</text>
</svg>`;
}

async function processDriver(driverName) {
    const driverPath = path.join(DRIVERS_DIR, driverName);
    const assetsDir = path.join(driverPath, 'assets');
    const iconPath = path.join(assetsDir, 'icon.svg');
    
    stats.total++;
    
    if (fs.existsSync(iconPath)) {
        stats.alreadyExist++;
        return null;
    }
    
    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
    }
    
    try {
        const svgContent = generateIconSvg(driverName);
        fs.writeFileSync(iconPath, svgContent);
        stats.generated++;
        return '✅ créé';
    } catch (e) {
        stats.errors++;
        return `❌ ${e.message}`;
    }
}

// Scanner tous les drivers
const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => {
    const stat = fs.statSync(path.join(DRIVERS_DIR, d));
    return stat.isDirectory() && !d.startsWith('.');
}).sort();

console.log(`🎨 Traitement de ${drivers.length} drivers...\n`);

(async () => {
    for (const driver of drivers) {
        const result = await processDriver(driver);
        
        if (result) {
            console.log(`${result} ${driver}`);
        } else if (stats.alreadyExist % 20 === 0 && stats.alreadyExist > 0) {
            console.log(`⏭️  ${stats.alreadyExist} icons déjà présents...`);
        }
    }
    
    console.log('\n' + '='.repeat(70) + '\n');
    console.log('📊 RÉSULTATS:\n');
    console.log(`   Total drivers: ${stats.total}`);
    console.log(`   Icons générés: ${stats.generated}`);
    console.log(`   Déjà présents: ${stats.alreadyExist}`);
    console.log(`   Erreurs: ${stats.errors}`);
    
    console.log('\n✅ Génération terminée!\n');
})();
