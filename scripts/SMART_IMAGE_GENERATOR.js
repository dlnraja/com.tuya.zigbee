#!/usr/bin/env node

/**
 * SMART IMAGE GENERATOR - Inspired by Build 8-9 Success
 * 
 * Génère des images professionnelles avec:
 * - Codes couleurs Johan Bendz par catégorie
 * - Icônes logiques selon type de produit
 * - Conformité Homey SDK3
 */

const fs = require('fs-extra');
const path = require('path');
const { createCanvas } = require('canvas');

// Johan Bendz Color Schemes (Build 8-9 proven)
const COLOR_SCHEMES = {
    switches: { primary: '#4CAF50', secondary: '#8BC34A', name: 'Green' },
    sensors: { primary: '#2196F3', secondary: '#03A9F4', name: 'Blue' },
    lighting: { primary: '#FFD700', secondary: '#FFA500', name: 'Gold' },
    climate: { primary: '#FF9800', secondary: '#FF5722', name: 'Orange' },
    security: { primary: '#F44336', secondary: '#E91E63', name: 'Red' },
    power: { primary: '#9C27B0', secondary: '#673AB7', name: 'Purple' },
    automation: { primary: '#607D8B', secondary: '#455A64', name: 'Gray' },
    default: { primary: '#1B4D72', secondary: '#2E5F8C', name: 'Blue' }
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
        return 'default';
    }

    // Extraire nombre de gangs
    extractGangCount(name) {
        const match = name.match(/(\d+)gang/);
        return match ? parseInt(match[1]) : 1;
    }

    // Générer icône selon catégorie
    drawIcon(ctx, category, gangCount, centerX, centerY, size) {
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;

        switch(category) {
            case 'switches':
                // Dessiner gangs
                const spacing = size * 0.15;
                const buttonW = size * 0.08;
                const buttonH = size * 0.15;
                const startX = centerX - ((gangCount - 1) * spacing) / 2;
                
                for (let i = 0; i < gangCount; i++) {
                    const x = startX + (i * spacing);
                    ctx.fillRect(x - buttonW/2, centerY - buttonH/2, buttonW, buttonH);
                    ctx.beginPath();
                    ctx.arc(x, centerY - buttonH/4, 3, 0, 2 * Math.PI);
                    ctx.fill();
                }
                break;

            case 'sensors':
                // PIR sensor waves
                ctx.beginPath();
                ctx.arc(centerX, centerY, size * 0.15, 0, 2 * Math.PI);
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.6;
                ctx.beginPath();
                ctx.arc(centerX, centerY, size * 0.25, 0, 2 * Math.PI);
                ctx.stroke();
                ctx.globalAlpha = 0.3;
                ctx.beginPath();
                ctx.arc(centerX, centerY, size * 0.35, 0, 2 * Math.PI);
                ctx.stroke();
                ctx.globalAlpha = 1;
                break;

            case 'lighting':
                // Light bulb
                ctx.beginPath();
                ctx.arc(centerX, centerY - size * 0.05, size * 0.15, 0, 2 * Math.PI);
                ctx.fill();
                ctx.fillRect(centerX - size * 0.06, centerY + size * 0.1, size * 0.12, size * 0.1);
                break;

            case 'climate':
                // Thermometer
                ctx.fillRect(centerX - 3, centerY - size * 0.2, 6, size * 0.3);
                ctx.beginPath();
                ctx.arc(centerX, centerY + size * 0.15, size * 0.08, 0, 2 * Math.PI);
                ctx.fill();
                break;

            case 'security':
                // Shield
                ctx.beginPath();
                ctx.moveTo(centerX, centerY - size * 0.25);
                ctx.lineTo(centerX - size * 0.15, centerY - size * 0.1);
                ctx.lineTo(centerX - size * 0.15, centerY + size * 0.15);
                ctx.lineTo(centerX, centerY + size * 0.25);
                ctx.lineTo(centerX + size * 0.15, centerY + size * 0.15);
                ctx.lineTo(centerX + size * 0.15, centerY - size * 0.1);
                ctx.closePath();
                ctx.fill();
                break;

            case 'power':
                // Plug
                ctx.fillRect(centerX - size * 0.15, centerY - size * 0.15, size * 0.3, size * 0.25);
                ctx.fillRect(centerX - size * 0.08, centerY + size * 0.1, size * 0.16, size * 0.15);
                // Prongs
                ctx.fillRect(centerX - size * 0.08, centerY - size * 0.2, size * 0.05, size * 0.06);
                ctx.fillRect(centerX + size * 0.03, centerY - size * 0.2, size * 0.05, size * 0.06);
                break;

            case 'automation':
                // Button
                ctx.beginPath();
                ctx.arc(centerX, centerY, size * 0.15, 0, 2 * Math.PI);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(centerX, centerY, size * 0.08, 0, 2 * Math.PI);
                ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                ctx.stroke();
                break;

            default:
                // Generic device
                ctx.fillRect(centerX - size * 0.15, centerY - size * 0.15, size * 0.3, size * 0.3);
        }
    }

    // Générer image driver
    async generateDriverImage(driverName, size) {
        const [width, height] = DIMENSIONS.driver[size];
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        const category = this.categorizeDriver(driverName);
        const colors = COLOR_SCHEMES[category];
        const gangCount = this.extractGangCount(driverName);

        // Gradient background
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, colors.primary);
        gradient.addColorStop(1, colors.secondary);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Overlay for depth
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(0, 0, width, height);

        // Draw icon
        this.drawIcon(ctx, category, gangCount, width / 2, height / 2, width);

        // Gang count indicator
        if (category === 'switches' && gangCount > 1) {
            ctx.fillStyle = 'white';
            ctx.font = 'bold 18px Arial';
            ctx.fillText(gangCount.toString(), width - 20, 25);
        }

        // Save
        const outputPath = path.join(this.projectRoot, 'drivers', driverName, 'assets', `${size}.png`);
        await fs.ensureDir(path.dirname(outputPath));
        const buffer = canvas.toBuffer('image/png');
        await fs.writeFile(outputPath, buffer);

        return { driver: driverName, size, category, colors: colors.name };
    }

    // Générer image app
    async generateAppImage(size) {
        const [width, height] = DIMENSIONS.app[size];
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Gradient background
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#1B4D72');
        gradient.addColorStop(1, '#2E5F8C');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Title
        ctx.fillStyle = 'white';
        ctx.font = `bold ${Math.floor(width / 15)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('Tuya Zigbee', width / 2, height / 2 - 10);

        // Subtitle
        ctx.font = `${Math.floor(width / 25)}px Arial`;
        ctx.fillText('Universal Device Hub', width / 2, height / 2 + 20);

        // Decorative dots
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        const dotY = height - 30;
        [width/4, width/2, 3*width/4].forEach(x => {
            ctx.beginPath();
            ctx.arc(x, dotY, 5, 0, 2 * Math.PI);
            ctx.fill();
        });

        // Save
        const outputPath = path.join(this.projectRoot, 'assets', 'images', `${size}.png`);
        await fs.ensureDir(path.dirname(outputPath));
        const buffer = canvas.toBuffer('image/png');
        await fs.writeFile(outputPath, buffer);

        return { type: 'app', size };
    }

    // Générer toutes les images
    async generateAll() {
        this.log('🎨 SMART IMAGE GENERATOR - Build 8-9 Colors & Icons', '🚀');
        
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
            Object.entries(categoryStats).forEach(([cat, count]) => {
                const colors = COLOR_SCHEMES[cat];
                this.log(`  ${cat}: ${count} drivers (${colors.name})`, '🎨');
            });

            this.log('\n🎉 GENERATION COMPLETE!', '🎉');
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
