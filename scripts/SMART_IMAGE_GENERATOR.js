#!/usr/bin/env node

/**
 * SMART IMAGE GENERATOR V2 - Simple Icons + Category Text
 * Style: https://apps.homeycdn.net/app/com.dlnraja.tuya.zigbee/10/.../icon.svg
 * - Simple emoji/icon
 * - Category text badge
 * - Clean professional design
 */

const fs = require('fs-extra');
const path = require('path');

// Johan Bendz Color Schemes
const COLOR_SCHEMES = {
    switches: { primary: '#4CAF50', secondary: '#66BB6A', name: 'SWITCHES', icon: '💡' },
    sensors: { primary: '#2196F3', secondary: '#64B5F6', name: 'SENSORS', icon: '📡' },
    lighting: { primary: '#FFD700', secondary: '#FFB300', name: 'LIGHTING', icon: '💡' },
    climate: { primary: '#FF9800', secondary: '#FFB74D', name: 'CLIMATE', icon: '🌡️' },
    security: { primary: '#F44336', secondary: '#E57373', name: 'SECURITY', icon: '🔒' },
    power: { primary: '#9C27B0', secondary: '#BA68C8', name: 'POWER', icon: '⚡' },
    automation: { primary: '#607D8B', secondary: '#78909C', name: 'AUTOMATION', icon: '🎮' },
    covers: { primary: '#795548', secondary: '#A1887F', name: 'COVERS', icon: '🪟' },
    default: { primary: '#1B4D72', secondary: '#2E5F8C', name: 'DEVICE', icon: '📱' }
};

// SDK3 Image Dimensions
const DIMENSIONS = {
    driver: { small: [75, 75], large: [500, 500] },
    app: { small: [250, 175], large: [500, 350] }
};

class SmartImageGenerator {
    constructor() {
        this.projectRoot = process.cwd();
        this.stats = { success: 0, errors: 0 };
    }

    log(msg, icon = '📋') {
        console.log(`${icon} ${msg}`);
    }

    // Analyser catégorie du driver
    categorizeDriver(name) {
        const n = name.toLowerCase();
        if (n.includes('switch') || n.includes('gang') || n.includes('relay')) return 'switches';
        if (n.includes('motion') || n.includes('sensor') || n.includes('detector') || n.includes('door') || n.includes('window')) return 'sensors';
        if (n.includes('light') || n.includes('bulb') || n.includes('led') || n.includes('strip') || n.includes('dimmer')) return 'lighting';
        if (n.includes('temperature') || n.includes('humidity') || n.includes('thermostat') || n.includes('climate')) return 'climate';
        if (n.includes('smoke') || n.includes('alarm') || n.includes('security') || n.includes('lock')) return 'security';
        if (n.includes('plug') || n.includes('socket') || n.includes('energy') || n.includes('power')) return 'power';
        if (n.includes('button') || n.includes('remote') || n.includes('scene') || n.includes('knob')) return 'automation';
        if (n.includes('curtain') || n.includes('blind') || n.includes('shutter') || n.includes('cover')) return 'covers';
        return 'default';
    }

    // Extraire nombre de gangs
    extractGangCount(name) {
        const match = name.match(/(\d+)gang/);
        return match ? parseInt(match[1]) : null;
    }

    // Générer SVG avec style simple
    generateSimpleSVG(category, gangCount, width, height) {
        const colors = COLOR_SCHEMES[category];
        const categoryName = gangCount ? `${gangCount}G ${colors.name}` : colors.name;
        const icon = colors.icon;
        
        // Adapter taille icône selon dimensions
        const iconSize = Math.floor(height * 0.28);
        const badgeY = height - Math.floor(height * 0.22);
        const brandY = height - Math.floor(height * 0.1);
        const badgeWidth = Math.floor(width * 0.6);
        const badgeHeight = Math.floor(height * 0.1);
        const cornerRadius = Math.floor(height * 0.12);
        const badgeRadius = Math.floor(badgeHeight * 0.5);
        
        return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad_${category}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${colors.secondary};stop-opacity:0.8" />
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="${Math.floor(height * 0.008)}" stdDeviation="${Math.floor(height * 0.016)}" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Background with gradient -->
  <rect width="${width}" height="${height}" fill="url(#grad_${category})" rx="${cornerRadius}"/>
  
  <!-- Icon circle background -->
  <circle cx="${width/2}" cy="${height * 0.44}" r="${height * 0.2}" fill="white" opacity="0.2" filter="url(#shadow)"/>
  
  <!-- Large icon/emoji -->
  <text x="${width/2}" y="${height * 0.56}" font-family="Arial, sans-serif" font-size="${iconSize}" 
        fill="white" text-anchor="middle" font-weight="bold" 
        filter="url(#shadow)">${icon}</text>
  
  <!-- Category badge -->
  <rect x="${(width - badgeWidth) / 2}" y="${badgeY}" width="${badgeWidth}" height="${badgeHeight}" rx="${badgeRadius}" fill="white" opacity="0.95"/>
  <text x="${width/2}" y="${badgeY + badgeHeight * 0.7}" font-family="Arial, sans-serif" font-size="${Math.floor(badgeHeight * 0.45)}" 
        fill="${colors.primary}" text-anchor="middle" font-weight="bold">${categoryName}</text>
  
  <!-- Brand -->
  <text x="${width/2}" y="${brandY}" font-family="Arial, sans-serif" font-size="${Math.floor(height * 0.056)}" 
        fill="white" text-anchor="middle" opacity="0.9" font-weight="300">Tuya Zigbee</text>
</svg>`;
    }

    // Générer image driver
    async generateDriverImage(driverName, size) {
        const [width, height] = DIMENSIONS.driver[size];
        const category = this.categorizeDriver(driverName);
        const gangCount = this.extractGangCount(driverName);
        
        const svg = this.generateSimpleSVG(category, gangCount, width, height);
        
        const outputPath = path.join(this.projectRoot, 'drivers', driverName, 'assets', `${size}.svg`);
        await fs.ensureDir(path.dirname(outputPath));
        await fs.writeFile(outputPath, svg);

        return { driver: driverName, size, category };
    }

    // Générer image app
    async generateAppImage(size) {
        const [width, height] = DIMENSIONS.app[size];
        const colors = COLOR_SCHEMES.default;
        
        const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad_app" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1B4D72;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2E5F8C;stop-opacity:0.8" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#grad_app)" rx="${Math.floor(height * 0.1)}"/>
  
  <!-- Icon -->
  <text x="${width/2}" y="${height * 0.5}" font-family="Arial, sans-serif" font-size="${Math.floor(height * 0.3)}" 
        fill="white" text-anchor="middle" font-weight="bold">🏠</text>
  
  <!-- Title -->
  <text x="${width/2}" y="${height * 0.75}" font-family="Arial, sans-serif" font-size="${Math.floor(height * 0.12)}" 
        fill="white" text-anchor="middle" font-weight="bold">Universal Tuya</text>
  
  <!-- Subtitle -->
  <text x="${width/2}" y="${height * 0.88}" font-family="Arial, sans-serif" font-size="${Math.floor(height * 0.08)}" 
        fill="white" text-anchor="middle" opacity="0.8">Zigbee Local Control</text>
</svg>`;

        const outputPath = path.join(this.projectRoot, 'assets', 'images', `${size}.svg`);
        await fs.ensureDir(path.dirname(outputPath));
        await fs.writeFile(outputPath, svg);

        return { type: 'app', size };
    }

    // Générer toutes les images
    async generateAll() {
        this.log('🎨 SMART IMAGE GENERATOR V2 - Simple Icons + Text', '🚀');
        
        try {
            // App images
            this.log('Generating app images...', '📱');
            for (const size of ['small', 'large']) {
                await this.generateAppImage(size);
                this.stats.success++;
                this.log(`✅ App ${size}: ${DIMENSIONS.app[size].join('x')}`, '✅');
            }

            // Driver images
            const driversPath = path.join(this.projectRoot, 'drivers');
            const drivers = await fs.readdir(driversPath);
            
            this.log(`\nGenerating images for ${drivers.length} drivers...`, '🎨');

            const categoryStats = {};
            
            for (const driver of drivers) {
                const stat = await fs.stat(path.join(driversPath, driver));
                if (!stat.isDirectory()) continue;

                try {
                    for (const size of ['small', 'large']) {
                        const result = await this.generateDriverImage(driver, size);
                        categoryStats[result.category] = (categoryStats[result.category] || 0) + 1;
                        this.stats.success++;
                    }
                    this.log(`✅ ${driver}`, '✅');
                } catch (error) {
                    this.log(`❌ ${driver}: ${error.message}`, '❌');
                    this.stats.errors++;
                }
            }

            // Report
            this.log('\n📊 GENERATION REPORT:', '📊');
            this.log(`Success: ${this.stats.success}`, '✅');
            this.log(`Errors: ${this.stats.errors}`, this.stats.errors > 0 ? '❌' : '✅');
            
            this.log('\n🎨 CATEGORIES DISTRIBUTION:', '🎨');
            Object.entries(categoryStats).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
                const colors = COLOR_SCHEMES[cat];
                this.log(`  ${colors.icon} ${cat}: ${count} drivers`, '🎨');
            });

            this.log('\n🎉 GENERATION COMPLETE!', '🎉');
            this.log('Style: Simple icons + category text badges', 'ℹ️');
            return this.stats.errors === 0;

        } catch (error) {
            this.log(`Fatal error: ${error.message}`, '❌');
            throw error;
        }
    }
}

// Execute
if (require.main === module) {
    const generator = new SmartImageGenerator();
    generator.generateAll()
        .then(success => process.exit(success ? 0 : 1))
        .catch(error => {
            console.error('❌ Failed:', error);
            process.exit(1);
        });
}

module.exports = SmartImageGenerator;
