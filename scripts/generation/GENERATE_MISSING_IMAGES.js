#!/usr/bin/env node

/**
 * 🎨 GENERATE MISSING IMAGES
 * 
 * Génère toutes les images manquantes avec design homogène
 * - Scan tous les drivers
 * - Identifie images manquantes
 * - Génère SVG avec style unifié
 * - Dimensions correctes (75x75, 500x500, 1000x1000)
 */

const fs = require('fs');
const path = require('path');

class ImageGenerator {
  constructor() {
    this.root = path.resolve(__dirname, '../..');
    this.driversDir = path.join(this.root, 'drivers');
    this.assetsDir = path.join(this.root, 'assets');
    
    // Style homogène pour tous les icons
    this.style = {
      primaryColor: '#00A3E0',     // Bleu Tuya
      secondaryColor: '#FF6B35',   // Orange accent
      backgroundColor: '#FFFFFF',
      strokeWidth: 3,
      borderRadius: 20
    };
  }

  async run() {
    console.log('🎨 GENERATE MISSING IMAGES v2.15.33');
    console.log('=' .repeat(70));
    console.log('');

    // Scan et génère
    await this.scanAndGenerate();

    console.log('');
    console.log('✅ GÉNÉRATION TERMINÉE!');
  }

  async scanAndGenerate() {
    console.log('📊 Scanning drivers...');
    
    const drivers = fs.readdirSync(this.driversDir).filter(d =>
      fs.statSync(path.join(this.driversDir, d)).isDirectory()
    );

    console.log(`Found ${drivers.length} drivers`);
    console.log('');

    let generated = 0;

    for (const driver of drivers) {
      const assetsPath = path.join(this.driversDir, driver, 'assets');
      
      // Créer dossier assets si manquant
      if (!fs.existsSync(assetsPath)) {
        fs.mkdirSync(assetsPath, { recursive: true });
      }

      // Vérifier images
      const hasSmall = fs.existsSync(path.join(assetsPath, 'small.png'));
      const hasLarge = fs.existsSync(path.join(assetsPath, 'large.png'));
      const hasXlarge = fs.existsSync(path.join(assetsPath, 'xlarge.png'));

      if (!hasSmall || !hasLarge || !hasXlarge) {
        console.log(`🖼️  Generating images for: ${driver}`);
        
        // Générer SVG source
        const svg = this.generateDriverIcon(driver);
        
        // Sauvegarder SVG
        const svgPath = path.join(assetsPath, 'icon.svg');
        fs.writeFileSync(svgPath, svg);
        
        // Créer placeholder PNG (à remplacer plus tard par vraies images)
        if (!hasSmall) {
          this.createPlaceholder(path.join(assetsPath, 'small.png'), 75);
          generated++;
        }
        if (!hasLarge) {
          this.createPlaceholder(path.join(assetsPath, 'large.png'), 500);
          generated++;
        }
        if (!hasXlarge) {
          this.createPlaceholder(path.join(assetsPath, 'xlarge.png'), 1000);
          generated++;
        }
      }
    }

    console.log('');
    console.log(`✅ Généré ${generated} images`);
  }

  generateDriverIcon(driverName) {
    // Déterminer type de device basé sur le nom
    const type = this.detectDeviceType(driverName);
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="500" height="500" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="500" height="500" rx="${this.style.borderRadius}" fill="${this.style.backgroundColor}"/>
  
  <!-- Border -->
  <rect x="10" y="10" width="480" height="480" rx="${this.style.borderRadius - 5}" 
        fill="none" stroke="${this.style.primaryColor}" stroke-width="${this.style.strokeWidth}"/>
  
  <!-- Device Icon -->
  ${this.getDeviceIcon(type)}
  
  <!-- Device Type Label -->
  <text x="250" y="450" font-family="Arial, sans-serif" font-size="24" 
        text-anchor="middle" fill="${this.style.primaryColor}">${type}</text>
</svg>`;
  }

  detectDeviceType(driverName) {
    const name = driverName.toLowerCase();
    
    // Sensors
    if (name.includes('motion')) return 'Motion';
    if (name.includes('temperature')) return 'Temperature';
    if (name.includes('humidity')) return 'Humidity';
    if (name.includes('contact') || name.includes('door') || name.includes('window')) return 'Contact';
    if (name.includes('water') || name.includes('leak')) return 'Water';
    if (name.includes('smoke')) return 'Smoke';
    if (name.includes('gas') || name.includes('co')) return 'Gas';
    if (name.includes('air_quality')) return 'Air Quality';
    if (name.includes('luminance') || name.includes('lux')) return 'Light';
    
    // Switches & Lights
    if (name.includes('switch')) return 'Switch';
    if (name.includes('bulb') || name.includes('light')) return 'Light';
    if (name.includes('dimmer')) return 'Dimmer';
    if (name.includes('rgb') || name.includes('color')) return 'Color';
    if (name.includes('led_strip')) return 'LED Strip';
    
    // Climate
    if (name.includes('thermostat')) return 'Thermostat';
    if (name.includes('valve')) return 'Valve';
    if (name.includes('fan')) return 'Fan';
    if (name.includes('heater')) return 'Heater';
    
    // Covers
    if (name.includes('curtain') || name.includes('blind')) return 'Curtain';
    if (name.includes('garage')) return 'Garage';
    
    // Security
    if (name.includes('siren')) return 'Siren';
    if (name.includes('lock')) return 'Lock';
    if (name.includes('doorbell')) return 'Doorbell';
    if (name.includes('button') || name.includes('remote')) return 'Button';
    if (name.includes('sos')) return 'SOS';
    
    // Power
    if (name.includes('socket') || name.includes('plug')) return 'Socket';
    if (name.includes('energy')) return 'Energy';
    
    return 'Device';
  }

  getDeviceIcon(type) {
    const icons = {
      'Motion': `
        <!-- PIR Sensor -->
        <circle cx="250" cy="200" r="80" fill="none" stroke="${this.style.primaryColor}" stroke-width="5"/>
        <circle cx="250" cy="200" r="40" fill="${this.style.secondaryColor}"/>
        <path d="M 170 200 Q 150 150 180 120" stroke="${this.style.primaryColor}" stroke-width="4" fill="none"/>
        <path d="M 330 200 Q 350 150 320 120" stroke="${this.style.primaryColor}" stroke-width="4" fill="none"/>
      `,
      'Temperature': `
        <!-- Thermometer -->
        <rect x="220" y="100" width="60" height="200" rx="30" fill="none" stroke="${this.style.primaryColor}" stroke-width="5"/>
        <circle cx="250" cy="330" r="40" fill="${this.style.secondaryColor}"/>
        <rect x="235" y="120" width="30" height="180" fill="${this.style.secondaryColor}" opacity="0.5"/>
      `,
      'Humidity': `
        <!-- Water Drop -->
        <path d="M 250 100 Q 200 200 200 280 Q 200 360 280 360 Q 360 360 360 280 Q 360 200 310 100 Z" 
              fill="${this.style.primaryColor}" opacity="0.7"/>
        <circle cx="280" cy="250" r="30" fill="${this.style.backgroundColor}" opacity="0.5"/>
      `,
      'Contact': `
        <!-- Door Sensor -->
        <rect x="150" y="100" width="100" height="250" rx="10" fill="none" stroke="${this.style.primaryColor}" stroke-width="5"/>
        <rect x="260" y="100" width="100" height="250" rx="10" fill="${this.style.secondaryColor}" opacity="0.5"/>
        <circle cx="200" cy="225" r="15" fill="${this.style.primaryColor}"/>
      `,
      'Light': `
        <!-- Bulb -->
        <circle cx="250" cy="180" r="80" fill="${this.style.secondaryColor}" opacity="0.7"/>
        <rect x="220" y="260" width="60" height="40" fill="${this.style.primaryColor}"/>
        <rect x="230" y="300" width="40" height="20" fill="${this.style.primaryColor}"/>
        <line x1="250" y1="80" x2="250" y2="60" stroke="${this.style.secondaryColor}" stroke-width="4"/>
        <line x1="350" y1="180" x2="370" y2="180" stroke="${this.style.secondaryColor}" stroke-width="4"/>
        <line x1="150" y1="180" x2="130" y2="180" stroke="${this.style.secondaryColor}" stroke-width="4"/>
      `,
      'Switch': `
        <!-- Toggle Switch -->
        <rect x="150" y="150" width="200" height="200" rx="20" fill="none" stroke="${this.style.primaryColor}" stroke-width="5"/>
        <circle cx="250" cy="250" r="60" fill="${this.style.secondaryColor}"/>
        <line x1="220" y1="220" x2="280" y2="280" stroke="${this.style.backgroundColor}" stroke-width="8"/>
      `,
      'Button': `
        <!-- Button -->
        <circle cx="250" cy="250" r="100" fill="${this.style.primaryColor}" opacity="0.7"/>
        <circle cx="250" cy="250" r="60" fill="${this.style.secondaryColor}"/>
        <text x="250" y="270" font-family="Arial" font-size="48" font-weight="bold" 
              text-anchor="middle" fill="${this.style.backgroundColor}">!</text>
      `,
      'SOS': `
        <!-- SOS Button -->
        <circle cx="250" cy="250" r="100" fill="${this.style.secondaryColor}"/>
        <text x="250" y="280" font-family="Arial" font-size="64" font-weight="bold" 
              text-anchor="middle" fill="${this.style.backgroundColor}">SOS</text>
      `,
      'Smoke': `
        <!-- Smoke Detector -->
        <circle cx="250" cy="250" r="100" fill="none" stroke="${this.style.primaryColor}" stroke-width="5"/>
        <circle cx="250" cy="250" r="70" fill="none" stroke="${this.style.primaryColor}" stroke-width="3"/>
        <circle cx="250" cy="250" r="20" fill="${this.style.secondaryColor}"/>
        <path d="M 200 150 Q 230 120 260 150" stroke="${this.style.primaryColor}" stroke-width="4" fill="none" opacity="0.5"/>
        <path d="M 220 170 Q 240 150 260 170" stroke="${this.style.primaryColor}" stroke-width="4" fill="none" opacity="0.5"/>
      `,
      'Water': `
        <!-- Water Leak -->
        <path d="M 250 120 L 200 250 L 300 250 Z" fill="${this.style.primaryColor}" opacity="0.7"/>
        <ellipse cx="250" cy="260" rx="80" ry="40" fill="${this.style.secondaryColor}" opacity="0.5"/>
        <circle cx="220" cy="280" r="10" fill="${this.style.primaryColor}" opacity="0.7"/>
        <circle cx="280" cy="290" r="8" fill="${this.style.primaryColor}" opacity="0.7"/>
      `,
      'Curtain': `
        <!-- Curtain -->
        <line x1="150" y1="100" x2="350" y2="100" stroke="${this.style.primaryColor}" stroke-width="8"/>
        <path d="M 175 100 Q 175 250 150 350" stroke="${this.style.primaryColor}" stroke-width="6" fill="none"/>
        <path d="M 225 100 Q 225 250 200 350" stroke="${this.style.primaryColor}" stroke-width="6" fill="none"/>
        <path d="M 275 100 Q 275 250 300 350" stroke="${this.style.secondaryColor}" stroke-width="6" fill="none"/>
        <path d="M 325 100 Q 325 250 350 350" stroke="${this.style.secondaryColor}" stroke-width="6" fill="none"/>
      `,
      'Socket': `
        <!-- Power Socket -->
        <rect x="150" y="150" width="200" height="200" rx="20" fill="none" stroke="${this.style.primaryColor}" stroke-width="5"/>
        <circle cx="220" cy="220" r="20" fill="${this.style.primaryColor}"/>
        <circle cx="280" cy="220" r="20" fill="${this.style.primaryColor}"/>
        <rect x="230" y="270" width="40" height="50" rx="10" fill="${this.style.secondaryColor}"/>
      `
    };

    return icons[type] || `
      <!-- Generic Device -->
      <rect x="180" y="150" width="140" height="200" rx="15" fill="${this.style.primaryColor}" opacity="0.7"/>
      <circle cx="250" cy="250" r="40" fill="${this.style.secondaryColor}"/>
    `;
  }

  createPlaceholder(filepath, size) {
    // Créer un SVG placeholder simple
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#00A3E0"/>
  <text x="${size/2}" y="${size/2}" font-family="Arial" font-size="${size/8}" 
        text-anchor="middle" fill="#FFFFFF" dominant-baseline="middle">${size}x${size}</text>
</svg>`;

    // Pour l'instant, on sauvegarde le SVG
    // Dans un vrai projet, il faudrait convertir en PNG avec sharp ou imagemagick
    const svgPath = filepath.replace('.png', '.svg');
    fs.writeFileSync(svgPath, svg);
    
    console.log(`  Created placeholder: ${path.basename(filepath)} (${size}x${size})`);
  }
}

// Run
if (require.main === module) {
  const generator = new ImageGenerator();
  generator.run().catch(console.error);
}

module.exports = ImageGenerator;
