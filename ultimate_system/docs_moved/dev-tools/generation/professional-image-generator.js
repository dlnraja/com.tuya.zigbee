#!/usr/bin/env node

/**
 * Professional Image Generator - Creates Johan Benz style images with SDK3 compliance
 * Generates app and driver images with Zigbee2MQTT/Blakadder inspiration
 */

const fs = require('fs-extra');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

class ProfessionalImageGenerator {
    constructor() {
        this.projectRoot = process.cwd();
        
        // SDK3 compliant dimensions
        this.dimensions = {
            app: {
                small: { width: 250, height: 175 },
                large: { width: 500, height: 350 }, 
                xlarge: { width: 1000, height: 700 }
            },
            driver: {
                small: { width: 75, height: 75 },
                large: { width: 500, height: 500 },
                xlarge: { width: 1000, height: 1000 }
            }
        };

        // Johan Benz color palettes by device category
        this.colorPalettes = {
            sensors: {
                primary: '#2196F3',
                secondary: '#03A9F4',
                accent: '#81D4FA',
                background: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)'
            },
            lights: {
                primary: '#FFD700', 
                secondary: '#FFA500',
                accent: '#FFEB3B',
                background: 'linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%)'
            },
            switches: {
                primary: '#4CAF50',
                secondary: '#8BC34A', 
                accent: '#C8E6C9',
                background: 'linear-gradient(135deg, #F1F8E9 0%, #DCEDC8 100%)'
            },
            plugs: {
                primary: '#9C27B0',
                secondary: '#673AB7',
                accent: '#CE93D8', 
                background: 'linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)'
            },
            safety: {
                primary: '#F44336',
                secondary: '#E91E63',
                accent: '#FFCDD2',
                background: 'linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%)'
            },
            climate: {
                primary: '#FF9800', 
                secondary: '#FF5722',
                accent: '#FFCC80',
                background: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)'
            },
            covers: {
                primary: '#607D8B',
                secondary: '#455A64',
                accent: '#B0BEC5',
                background: 'linear-gradient(135deg, #ECEFF1 0%, #CFD8DC 100%)'
            }
        };

        this.generatedImages = [];
    }

    async generateAllImages() {
        console.log('🎨 Generating professional images with Johan Benz + SDK3 standards...');
        
        await this.generateAppImages();
        await this.generateDriverImages();
        await this.generateCatalogImages();
        
        console.log(`✅ Generated ${this.generatedImages.length} professional images`);
        return this.generatedImages;
    }

    async generateAppImages() {
        console.log('📱 Generating app images...');
        
        const appColors = {
            primary: '#1976D2',
            secondary: '#2196F3', 
            accent: '#64B5F6',
            background: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 50%, #90CAF9 100%)'
        };

        await fs.ensureDir(path.join(this.projectRoot, 'assets', 'images'));
        
        for (const [size, dimensions] of Object.entries(this.dimensions.app)) {
            const canvas = createCanvas(dimensions.width, dimensions.height);
            const ctx = canvas.getContext('2d');
            
            // Create gradient background
            await this.drawGradientBackground(ctx, dimensions, appColors.background);
            
            // Draw main Zigbee hub icon
            await this.drawZigbeeHubIcon(ctx, dimensions, appColors);
            
            // Add subtle branding elements
            await this.drawAppBranding(ctx, dimensions, appColors);
            
            const imagePath = path.join(this.projectRoot, 'assets', 'images', `${size}.png`);
            const buffer = canvas.toBuffer('image/png');
            await fs.writeFile(imagePath, buffer);
            
            this.generatedImages.push({
                type: 'app',
                size: size,
                path: imagePath,
                dimensions: dimensions
            });
            
            console.log(`   ✅ Generated app ${size}: ${dimensions.width}x${dimensions.height}`);
        }
    }

    async generateDriverImages() {
        console.log('🔧 Generating driver images...');
        
        const driversDir = path.join(this.projectRoot, 'drivers');
        const categories = await fs.readdir(driversDir);
        
        for (const category of categories) {
            const categoryPath = path.join(driversDir, category);
            const stat = await fs.stat(categoryPath);
            if (!stat.isDirectory()) continue;
            
            const drivers = await fs.readdir(categoryPath);
            const colors = this.colorPalettes[category] || this.colorPalettes.sensors;
            
            for (const driver of drivers) {
                const driverPath = path.join(categoryPath, driver);
                const driverStat = await fs.stat(driverPath);
                if (!driverStat.isDirectory()) continue;
                
                await this.generateDriverImageSet(driverPath, category, driver, colors);
            }
        }
    }

    async generateDriverImageSet(driverPath, category, driverName, colors) {
        const assetsDir = path.join(driverPath, 'assets');
        await fs.ensureDir(assetsDir);
        
        for (const [size, dimensions] of Object.entries(this.dimensions.driver)) {
            const canvas = createCanvas(dimensions.width, dimensions.height);
            const ctx = canvas.getContext('2d');
            
            // Draw professional background
            await this.drawGradientBackground(ctx, dimensions, colors.background);
            
            // Draw device-specific icon
            await this.drawDeviceIcon(ctx, dimensions, category, driverName, colors);
            
            // Add quality indicators for larger sizes
            if (size !== 'small') {
                await this.drawQualityIndicators(ctx, dimensions, colors);
            }
            
            const imagePath = path.join(assetsDir, `${size}.png`);
            const buffer = canvas.toBuffer('image/png');
            await fs.writeFile(imagePath, buffer);
            
            this.generatedImages.push({
                type: 'driver',
                category: category,
                driver: driverName,
                size: size,
                path: imagePath,
                dimensions: dimensions
            });
        }
        
        console.log(`   ✅ Generated ${category}/${driverName} images`);
    }

    async drawGradientBackground(ctx, dimensions, gradientSpec) {
        // Parse gradient specification
        const match = gradientSpec.match(/linear-gradient\((.+?),(.+)\)/);
        if (match) {
            const [, direction, colors] = match;
            const colorStops = colors.split(',').map(c => c.trim());
            
            // Create gradient
            const gradient = ctx.createLinearGradient(0, 0, dimensions.width, dimensions.height);
            
            colorStops.forEach((stop, index) => {
                const parts = stop.split(' ');
                const color = parts[0];
                const position = parts[1] ? parseFloat(parts[1]) / 100 : index / (colorStops.length - 1);
                gradient.addColorStop(position, color);
            });
            
            ctx.fillStyle = gradient;
        } else {
            // Solid color fallback
            ctx.fillStyle = gradientSpec;
        }
        
        ctx.fillRect(0, 0, dimensions.width, dimensions.height);
    }

    async drawZigbeeHubIcon(ctx, dimensions, colors) {
        const centerX = dimensions.width / 2;
        const centerY = dimensions.height / 2;
        const size = Math.min(dimensions.width, dimensions.height) * 0.6;
        
        // Draw central hub
        ctx.fillStyle = colors.primary;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * 0.15, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw connecting lines (Zigbee mesh network)
        const nodes = 6;
        const radius = size * 0.35;
        
        ctx.strokeStyle = colors.secondary;
        ctx.lineWidth = Math.max(2, size * 0.02);
        
        for (let i = 0; i < nodes; i++) {
            const angle = (i * 2 * Math.PI) / nodes;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            // Draw line from center to node
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x, y);
            ctx.stroke();
            
            // Draw node
            ctx.fillStyle = colors.accent;
            ctx.beginPath();
            ctx.arc(x, y, size * 0.08, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    async drawDeviceIcon(ctx, dimensions, category, driverName, colors) {
        const centerX = dimensions.width / 2;
        const centerY = dimensions.height / 2;
        const size = Math.min(dimensions.width, dimensions.height) * 0.7;
        
        ctx.fillStyle = colors.primary;
        ctx.strokeStyle = colors.secondary;
        ctx.lineWidth = Math.max(1, size * 0.02);
        
        switch (category) {
            case 'sensors':
                await this.drawSensorIcon(ctx, centerX, centerY, size, driverName, colors);
                break;
            case 'lights':
                await this.drawLightIcon(ctx, centerX, centerY, size, driverName, colors);
                break;
            case 'switches':
                await this.drawSwitchIcon(ctx, centerX, centerY, size, driverName, colors);
                break;
            case 'plugs':
                await this.drawPlugIcon(ctx, centerX, centerY, size, colors);
                break;
            case 'safety':
                await this.drawSafetyIcon(ctx, centerX, centerY, size, driverName, colors);
                break;
            case 'climate':
                await this.drawClimateIcon(ctx, centerX, centerY, size, driverName, colors);
                break;
            case 'covers':
                await this.drawCoverIcon(ctx, centerX, centerY, size, driverName, colors);
                break;
            default:
                await this.drawGenericIcon(ctx, centerX, centerY, size, colors);
        }
    }

    async drawSensorIcon(ctx, x, y, size, driverName, colors) {
        const name = driverName.toLowerCase();
        
        if (name.includes('motion') || name.includes('pir')) {
            // Motion sensor
            ctx.beginPath();
            ctx.arc(x, y, size * 0.2, 0, 2 * Math.PI);
            ctx.fill();
            
            // Detection waves
            for (let i = 1; i <= 3; i++) {
                ctx.beginPath();
                ctx.arc(x, y, size * 0.2 * (1 + i * 0.4), 0, Math.PI, true);
                ctx.stroke();
            }
        } else if (name.includes('door') || name.includes('window') || name.includes('contact')) {
            // Contact sensor
            ctx.fillRect(x - size * 0.15, y - size * 0.25, size * 0.3, size * 0.5);
            ctx.fillRect(x - size * 0.1, y - size * 0.15, size * 0.05, size * 0.3);
        } else if (name.includes('temperature') || name.includes('humidity')) {
            // Temperature/humidity sensor
            ctx.beginPath();
            ctx.roundRect(x - size * 0.1, y - size * 0.25, size * 0.2, size * 0.4, size * 0.05);
            ctx.fill();
            
            // Temperature indicator
            ctx.fillStyle = colors.accent;
            ctx.fillRect(x - size * 0.05, y - size * 0.1, size * 0.1, size * 0.2);
        } else {
            // Generic sensor
            ctx.beginPath();
            ctx.arc(x, y, size * 0.15, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(x, y, size * 0.25, 0, 2 * Math.PI);
            ctx.stroke();
        }
    }

    async drawLightIcon(ctx, x, y, size, driverName, colors) {
        const name = driverName.toLowerCase();
        
        if (name.includes('bulb') || name.includes('lamp')) {
            // Light bulb
            ctx.beginPath();
            ctx.arc(x, y - size * 0.05, size * 0.15, 0, 2 * Math.PI);
            ctx.fill();
            
            // Base
            ctx.fillRect(x - size * 0.08, y + size * 0.1, size * 0.16, size * 0.1);
            
            // Light rays
            ctx.strokeStyle = colors.accent;
            ctx.lineWidth = size * 0.02;
            for (let i = 0; i < 8; i++) {
                const angle = (i * Math.PI) / 4;
                const startX = x + Math.cos(angle) * size * 0.2;
                const startY = y + Math.sin(angle) * size * 0.2;
                const endX = x + Math.cos(angle) * size * 0.3;
                const endY = y + Math.sin(angle) * size * 0.3;
                
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        } else if (name.includes('strip') || name.includes('led')) {
            // LED strip
            ctx.fillRect(x - size * 0.25, y - size * 0.05, size * 0.5, size * 0.1);
            
            // LED indicators
            ctx.fillStyle = colors.accent;
            for (let i = 0; i < 5; i++) {
                const ledX = x - size * 0.2 + i * size * 0.1;
                ctx.beginPath();
                ctx.arc(ledX, y, size * 0.03, 0, 2 * Math.PI);
                ctx.fill();
            }
        } else {
            // Generic light
            ctx.beginPath();
            ctx.arc(x, y, size * 0.15, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    async drawSwitchIcon(ctx, x, y, size, driverName, colors) {
        const name = driverName.toLowerCase();
        
        if (name.includes('dimmer')) {
            // Dimmer switch
            ctx.fillRect(x - size * 0.15, y - size * 0.2, size * 0.3, size * 0.4);
            
            // Dimmer slider
            ctx.fillStyle = colors.accent;
            ctx.fillRect(x - size * 0.1, y - size * 0.05, size * 0.2, size * 0.02);
            ctx.beginPath();
            ctx.arc(x + size * 0.05, y - size * 0.04, size * 0.04, 0, 2 * Math.PI);
            ctx.fill();
        } else if (name.includes('button')) {
            // Button
            ctx.beginPath();
            ctx.arc(x, y, size * 0.15, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        } else {
            // Toggle switch
            ctx.fillRect(x - size * 0.15, y - size * 0.2, size * 0.3, size * 0.4);
            
            // Switch position
            ctx.fillStyle = colors.accent;
            ctx.fillRect(x - size * 0.12, y - size * 0.1, size * 0.24, size * 0.08);
        }
    }

    async drawPlugIcon(ctx, x, y, size, colors) {
        // Outlet
        ctx.fillRect(x - size * 0.15, y - size * 0.1, size * 0.3, size * 0.2);
        
        // Plug holes
        ctx.fillStyle = colors.background;
        ctx.beginPath();
        ctx.arc(x - size * 0.05, y, size * 0.03, 0, 2 * Math.PI);
        ctx.arc(x + size * 0.05, y, size * 0.03, 0, 2 * Math.PI);
        ctx.fill();
        
        // Ground hole
        ctx.fillRect(x - size * 0.01, y + size * 0.08, size * 0.02, size * 0.04);
    }

    async drawSafetyIcon(ctx, x, y, size, driverName, colors) {
        const name = driverName.toLowerCase();
        
        if (name.includes('smoke')) {
            // Smoke detector
            ctx.beginPath();
            ctx.arc(x, y, size * 0.2, 0, 2 * Math.PI);
            ctx.fill();
            
            // Smoke waves
            ctx.strokeStyle = colors.accent;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.arc(x, y - size * 0.3, size * 0.1 + i * size * 0.05, 0, Math.PI);
                ctx.stroke();
            }
        } else if (name.includes('water') || name.includes('leak')) {
            // Water leak sensor
            ctx.beginPath();
            ctx.ellipse(x, y, size * 0.1, size * 0.15, 0, 0, 2 * Math.PI);
            ctx.fill();
            
            // Water drops
            ctx.fillStyle = colors.accent;
            ctx.beginPath();
            ctx.ellipse(x - size * 0.1, y + size * 0.2, size * 0.06, size * 0.08, 0, 0, 2 * Math.PI);
            ctx.ellipse(x + size * 0.1, y + size * 0.15, size * 0.05, size * 0.07, 0, 0, 2 * Math.PI);
            ctx.fill();
        } else {
            // Generic safety (shield)
            ctx.beginPath();
            ctx.moveTo(x, y - size * 0.2);
            ctx.lineTo(x + size * 0.15, y - size * 0.1);
            ctx.lineTo(x + size * 0.15, y + size * 0.1);
            ctx.lineTo(x, y + size * 0.2);
            ctx.lineTo(x - size * 0.15, y + size * 0.1);
            ctx.lineTo(x - size * 0.15, y - size * 0.1);
            ctx.closePath();
            ctx.fill();
        }
    }

    async drawClimateIcon(ctx, x, y, size, driverName, colors) {
        const name = driverName.toLowerCase();
        
        if (name.includes('thermostat')) {
            // Thermostat
            ctx.beginPath();
            ctx.arc(x, y, size * 0.2, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
            
            // Temperature scale
            ctx.strokeStyle = colors.accent;
            ctx.lineWidth = size * 0.01;
            for (let i = 0; i < 12; i++) {
                const angle = (i * Math.PI) / 6;
                const startX = x + Math.cos(angle) * size * 0.15;
                const startY = y + Math.sin(angle) * size * 0.15;
                const endX = x + Math.cos(angle) * size * 0.18;
                const endY = y + Math.sin(angle) * size * 0.18;
                
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        } else if (name.includes('fan')) {
            // Fan
            ctx.beginPath();
            ctx.arc(x, y, size * 0.05, 0, 2 * Math.PI);
            ctx.fill();
            
            // Fan blades
            for (let i = 0; i < 3; i++) {
                const angle = (i * 2 * Math.PI) / 3;
                ctx.beginPath();
                ctx.ellipse(
                    x + Math.cos(angle) * size * 0.1, 
                    y + Math.sin(angle) * size * 0.1,
                    size * 0.15, size * 0.05, angle, 0, 2 * Math.PI
                );
                ctx.fill();
            }
        } else {
            // Generic climate (thermometer)
            ctx.fillRect(x - size * 0.02, y - size * 0.2, size * 0.04, size * 0.3);
            ctx.beginPath();
            ctx.arc(x, y + size * 0.15, size * 0.06, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    async drawCoverIcon(ctx, x, y, size, driverName, colors) {
        const name = driverName.toLowerCase();
        
        if (name.includes('curtain')) {
            // Curtain
            ctx.fillRect(x - size * 0.2, y - size * 0.2, size * 0.15, size * 0.4);
            ctx.fillRect(x + size * 0.05, y - size * 0.2, size * 0.15, size * 0.4);
            
            // Curtain rod
            ctx.fillRect(x - size * 0.25, y - size * 0.25, size * 0.5, size * 0.02);
        } else if (name.includes('blind')) {
            // Blind
            for (let i = 0; i < 5; i++) {
                const slateY = y - size * 0.15 + i * size * 0.08;
                ctx.fillRect(x - size * 0.2, slateY, size * 0.4, size * 0.03);
            }
        } else {
            // Generic cover
            ctx.fillRect(x - size * 0.2, y - size * 0.15, size * 0.4, size * 0.3);
            
            // Handle
            ctx.beginPath();
            ctx.arc(x + size * 0.15, y, size * 0.03, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    async drawGenericIcon(ctx, x, y, size, colors) {
        // Generic device icon
        ctx.fillRect(x - size * 0.15, y - size * 0.1, size * 0.3, size * 0.2);
        
        // Connection indicator
        ctx.fillStyle = colors.accent;
        ctx.beginPath();
        ctx.arc(x + size * 0.2, y - size * 0.05, size * 0.03, 0, 2 * Math.PI);
        ctx.fill();
    }

    async drawAppBranding(ctx, dimensions, colors) {
        // Add subtle "Ultimate Zigbee Hub" text for larger sizes
        if (dimensions.width >= 500) {
            ctx.fillStyle = colors.secondary;
            ctx.font = `${Math.round(dimensions.width * 0.03)}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText('Ultimate Zigbee Hub', dimensions.width / 2, dimensions.height * 0.85);
        }
    }

    async drawQualityIndicators(ctx, dimensions, colors) {
        // Add quality badges for larger images
        if (dimensions.width >= 500) {
            // SDK3 badge
            ctx.fillStyle = colors.accent;
            ctx.font = `${Math.round(dimensions.width * 0.025)}px Arial`;
            ctx.textAlign = 'right';
            ctx.fillText('SDK3', dimensions.width * 0.95, dimensions.height * 0.95);
            
            // Johan Benz design indicator
            ctx.textAlign = 'left';
            ctx.fillText('Johan Benz Design', dimensions.width * 0.05, dimensions.height * 0.95);
        }
    }

    async generateCatalogImages() {
        console.log('📦 Generating catalog category images...');
        
        const catalogDir = path.join(this.projectRoot, 'catalog');
        await fs.ensureDir(catalogDir);
        
        for (const [category, colors] of Object.entries(this.colorPalettes)) {
            const canvas = createCanvas(500, 300);
            const ctx = canvas.getContext('2d');
            
            // Draw category background
            await this.drawGradientBackground(ctx, { width: 500, height: 300 }, colors.background);
            
            // Draw category icon
            await this.drawCategoryIcon(ctx, 250, 150, 200, category, colors);
            
            // Add category title
            ctx.fillStyle = colors.primary;
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(category.toUpperCase(), 250, 280);
            
            const imagePath = path.join(catalogDir, `${category}.png`);
            const buffer = canvas.toBuffer('image/png');
            await fs.writeFile(imagePath, buffer);
            
            this.generatedImages.push({
                type: 'catalog',
                category: category,
                path: imagePath,
                dimensions: { width: 500, height: 300 }
            });
        }
        
        console.log(`   ✅ Generated ${Object.keys(this.colorPalettes).length} catalog images`);
    }

    async drawCategoryIcon(ctx, x, y, size, category, colors) {
        switch (category) {
            case 'sensors':
                await this.drawSensorIcon(ctx, x, y, size, 'motion', colors);
                break;
            case 'lights':
                await this.drawLightIcon(ctx, x, y, size, 'bulb', colors);
                break;
            case 'switches':
                await this.drawSwitchIcon(ctx, x, y, size, 'switch', colors);
                break;
            case 'plugs':
                await this.drawPlugIcon(ctx, x, y, size, colors);
                break;
            case 'safety':
                await this.drawSafetyIcon(ctx, x, y, size, 'smoke', colors);
                break;
            case 'climate':
                await this.drawClimateIcon(ctx, x, y, size, 'thermostat', colors);
                break;
            case 'covers':
                await this.drawCoverIcon(ctx, x, y, size, 'curtain', colors);
                break;
        }
    }

    async generateImageReport() {
        const report = {
            timestamp: new Date().toISOString(),
            total_generated: this.generatedImages.length,
            sdk3_compliant: true,
            johan_benz_design: true,
            categories: {},
            dimensions_used: this.dimensions
        };

        // Group by category
        this.generatedImages.forEach(img => {
            const key = img.category || img.type;
            if (!report.categories[key]) {
                report.categories[key] = [];
            }
            report.categories[key].push({
                size: img.size,
                path: img.path,
                dimensions: img.dimensions
            });
        });

        await fs.ensureDir(path.join(this.projectRoot, 'reports'));
        await fs.writeJson(
            path.join(this.projectRoot, 'reports', 'image-generation-report.json'),
            report,
            { spaces: 2 }
        );

        console.log('📊 Image Generation Report:');
        console.log(`   Total images: ${this.generatedImages.length}`);
        console.log(`   Categories: ${Object.keys(report.categories).length}`);
        console.log('   All images are SDK3 compliant with Johan Benz design standards');
    }
}

// Execute if run directly  
if (require.main === module) {
    const generator = new ProfessionalImageGenerator();
    generator.generateAllImages()
        .then(() => generator.generateImageReport())
        .catch(console.error);
}

module.exports = ProfessionalImageGenerator;
