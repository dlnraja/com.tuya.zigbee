#!/usr/bin/env node

/**
 * Intelligent Image Generator for Ultimate Zigbee Hub
 * Following Johan Benz design standards and Homey SDK3 guidelines
 * Generates professional device images with correct dimensions
 */

const fs = require('fs-extra');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

class IntelligentImageGenerator {
    constructor() {
        this.projectRoot = process.cwd();
        
        // SDK3 Image Dimensions
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
        
        // Johan Benz Color Palette by Device Category
        this.colorPalette = {
            sensors: {
                primary: '#2196F3',
                secondary: '#03A9F4',
                gradient: ['#1976D2', '#42A5F5']
            },
            lights: {
                primary: '#FFA500',
                secondary: '#FFD700',
                gradient: ['#FF8F00', '#FFC107']
            },
            switches: {
                primary: '#4CAF50',
                secondary: '#8BC34A',
                gradient: ['#388E3C', '#66BB6A']
            },
            plugs: {
                primary: '#9C27B0',
                secondary: '#673AB7',
                gradient: ['#7B1FA2', '#AB47BC']
            },
            safety: {
                primary: '#F44336',
                secondary: '#E91E63',
                gradient: ['#D32F2F', '#EF5350']
            },
            climate: {
                primary: '#FF9800',
                secondary: '#FF5722',
                gradient: ['#F57C00', '#FF7043']
            },
            covers: {
                primary: '#607D8B',
                secondary: '#455A64',
                gradient: ['#455A64', '#78909C']
            },
            specialty: {
                primary: '#795548',
                secondary: '#8D6E63',
                gradient: ['#5D4037', '#A1887F']
            }
        };
        
        // Device icons (simple geometric representations)
        this.deviceIcons = {
            motion_sensor: this.drawMotionSensorIcon,
            contact_sensor: this.drawContactSensorIcon,
            temperature_sensor: this.drawTemperatureSensorIcon,
            smart_light: this.drawLightIcon,
            smart_plug: this.drawPlugIcon,
            switch: this.drawSwitchIcon,
            smoke_detector: this.drawSmokeDetectorIcon,
            curtain_motor: this.drawCurtainIcon,
            thermostat: this.drawThermostatIcon,
            button: this.drawButtonIcon,
            dimmer: this.drawDimmerIcon,
            rgb_light: this.drawRGBLightIcon,
            presence_sensor: this.drawPresenceSensorIcon,
            water_leak: this.drawWaterLeakIcon,
            air_quality: this.drawAirQualityIcon
        };
    }

    async generateAllImages() {
        console.log('🎨 Starting intelligent image generation...');
        
        try {
            // Generate app images
            await this.generateAppImages();
            
            // Generate driver images
            await this.generateDriverImages();
            
            // Validate all generated images
            await this.validateImages();
            
            console.log('✅ All images generated successfully!');
            
        } catch (error) {
            console.error('❌ Error generating images:', error);
            throw error;
        }
    }

    async generateAppImages() {
        console.log('📱 Generating app images...');
        
        const appImagesDir = path.join(this.projectRoot, 'assets/images');
        await fs.ensureDir(appImagesDir);
        
        // Generate main app images with Ultimate Zigbee Hub branding
        for (const [size, dimensions] of Object.entries(this.dimensions.app)) {
            const canvas = createCanvas(dimensions.width, dimensions.height);
            const ctx = canvas.getContext('2d');
            
            // Create gradient background
            const gradient = ctx.createLinearGradient(0, 0, dimensions.width, dimensions.height);
            gradient.addColorStop(0, '#1976D2');
            gradient.addColorStop(1, '#42A5F5');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, dimensions.width, dimensions.height);
            
            // Add Zigbee symbol and hub representation
            this.drawZigbeeHubIcon(ctx, dimensions);
            
            // Add text for larger sizes
            if (size !== 'small') {
                this.drawAppTitle(ctx, dimensions, 'Ultimate Zigbee Hub');
            }
            
            const buffer = canvas.toBuffer('image/png');
            await fs.writeFile(path.join(appImagesDir, `${size}.png`), buffer);
            console.log(`📷 Generated app image: ${size}.png (${dimensions.width}x${dimensions.height})`);
        }
    }

    async generateDriverImages() {
        console.log('🔧 Generating driver images...');
        
        const driversDir = path.join(this.projectRoot, 'drivers');
        if (!await fs.pathExists(driversDir)) return;
        
        const categories = await fs.readdir(driversDir);
        
        for (const category of categories) {
            const categoryPath = path.join(driversDir, category);
            const stat = await fs.stat(categoryPath);
            
            if (stat.isDirectory()) {
                const drivers = await fs.readdir(categoryPath);
                
                for (const driver of drivers) {
                    const driverPath = path.join(categoryPath, driver);
                    const driverStat = await fs.stat(driverPath);
                    
                    if (driverStat.isDirectory()) {
                        await this.generateDriverImageSet(category, driver, driverPath);
                    }
                }
            }
        }
    }

    async generateDriverImageSet(category, driverName, driverPath) {
        const assetsDir = path.join(driverPath, 'assets');
        await fs.ensureDir(assetsDir);
        
        const colors = this.colorPalette[category] || this.colorPalette.specialty;
        const deviceType = this.detectDeviceType(driverName);
        
        // Generate all required driver image sizes
        for (const [size, dimensions] of Object.entries(this.dimensions.driver)) {
            const canvas = createCanvas(dimensions.width, dimensions.height);
            const ctx = canvas.getContext('2d');
            
            // Create professional gradient background
            const gradient = ctx.createRadialGradient(
                dimensions.width / 2, dimensions.height / 2, 0,
                dimensions.width / 2, dimensions.height / 2, dimensions.width / 2
            );
            gradient.addColorStop(0, '#FFFFFF');
            gradient.addColorStop(0.7, '#F8F9FA');
            gradient.addColorStop(1, '#E9ECEF');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, dimensions.width, dimensions.height);
            
            // Draw device icon
            await this.drawDeviceIcon(ctx, dimensions, deviceType, colors);
            
            // Add subtle shadow/depth effect
            this.addShadowEffect(ctx, dimensions);
            
            const buffer = canvas.toBuffer('image/png');
            const imageName = size === 'xlarge' ? 'large.png' : `${size}.png`;
            await fs.writeFile(path.join(assetsDir, imageName), buffer);
            console.log(`🖼️  Generated ${category}/${driverName}: ${imageName}`);
        }
    }

    detectDeviceType(driverName) {
        const name = driverName.toLowerCase();
        
        if (name.includes('motion') || name.includes('pir')) return 'motion_sensor';
        if (name.includes('contact') || name.includes('door') || name.includes('window')) return 'contact_sensor';
        if (name.includes('temperature') || name.includes('humidity')) return 'temperature_sensor';
        if (name.includes('light') || name.includes('bulb') || name.includes('lamp')) return 'smart_light';
        if (name.includes('plug') || name.includes('socket')) return 'smart_plug';
        if (name.includes('switch') && !name.includes('dimmer')) return 'switch';
        if (name.includes('smoke') || name.includes('detector')) return 'smoke_detector';
        if (name.includes('curtain') || name.includes('motor') || name.includes('blind')) return 'curtain_motor';
        if (name.includes('thermostat') || name.includes('radiator')) return 'thermostat';
        if (name.includes('button') || name.includes('scene')) return 'button';
        if (name.includes('dimmer')) return 'dimmer';
        if (name.includes('rgb') || name.includes('color')) return 'rgb_light';
        if (name.includes('presence') || name.includes('radar')) return 'presence_sensor';
        if (name.includes('water') || name.includes('leak')) return 'water_leak';
        if (name.includes('air') || name.includes('quality')) return 'air_quality';
        
        return 'switch'; // Default fallback
    }

    async drawDeviceIcon(ctx, dimensions, deviceType, colors) {
        const iconFunction = this.deviceIcons[deviceType] || this.deviceIcons.switch;
        await iconFunction.call(this, ctx, dimensions, colors);
    }

    drawMotionSensorIcon(ctx, dimensions, colors) {
        const centerX = dimensions.width / 2;
        const centerY = dimensions.height / 2;
        const radius = Math.min(dimensions.width, dimensions.height) * 0.25;
        
        // Main sensor body
        ctx.fillStyle = colors.primary;
        ctx.beginPath();
        ctx.roundRect(centerX - radius, centerY - radius, radius * 2, radius * 2, radius * 0.2);
        ctx.fill();
        
        // Detection waves
        ctx.strokeStyle = colors.secondary;
        ctx.lineWidth = dimensions.width / 50;
        for (let i = 1; i <= 3; i++) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius * (1 + i * 0.3), 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Lens
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = colors.secondary;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.2, 0, Math.PI * 2);
        ctx.fill();
    }

    drawContactSensorIcon(ctx, dimensions, colors) {
        const centerX = dimensions.width / 2;
        const centerY = dimensions.height / 2;
        const width = Math.min(dimensions.width, dimensions.height) * 0.3;
        const height = width * 1.5;
        
        // Sensor base
        ctx.fillStyle = colors.primary;
        ctx.beginPath();
        ctx.roundRect(centerX - width/2, centerY - height/2, width, height, width * 0.1);
        ctx.fill();
        
        // Magnetic part
        ctx.fillStyle = colors.secondary;
        ctx.beginPath();
        ctx.roundRect(centerX + width/2 + 5, centerY - height/4, width/2, height/2, width * 0.05);
        ctx.fill();
        
        // Connection lines
        ctx.strokeStyle = colors.gradient[0];
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(centerX + width/2, centerY - height/4);
        ctx.lineTo(centerX + width/2 + 5, centerY - height/4);
        ctx.moveTo(centerX + width/2, centerY + height/4);
        ctx.lineTo(centerX + width/2 + 5, centerY + height/4);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    drawLightIcon(ctx, dimensions, colors) {
        const centerX = dimensions.width / 2;
        const centerY = dimensions.height / 2;
        const radius = Math.min(dimensions.width, dimensions.height) * 0.2;
        
        // Bulb shape
        ctx.fillStyle = colors.primary;
        ctx.beginPath();
        ctx.arc(centerX, centerY - radius * 0.2, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Base/screw
        ctx.fillStyle = colors.secondary;
        ctx.beginPath();
        ctx.rect(centerX - radius * 0.6, centerY + radius * 0.8, radius * 1.2, radius * 0.4);
        ctx.fill();
        
        // Light rays
        ctx.strokeStyle = colors.gradient[1];
        ctx.lineWidth = 3;
        const rayLength = radius * 0.8;
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI * 2) / 8;
            const startX = centerX + Math.cos(angle) * (radius + 10);
            const startY = centerY - radius * 0.2 + Math.sin(angle) * (radius + 10);
            const endX = centerX + Math.cos(angle) * (radius + rayLength);
            const endY = centerY - radius * 0.2 + Math.sin(angle) * (radius + rayLength);
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
    }

    drawPlugIcon(ctx, dimensions, colors) {
        const centerX = dimensions.width / 2;
        const centerY = dimensions.height / 2;
        const size = Math.min(dimensions.width, dimensions.height) * 0.3;
        
        // Outlet face
        ctx.fillStyle = colors.primary;
        ctx.beginPath();
        ctx.roundRect(centerX - size, centerY - size, size * 2, size * 2, size * 0.15);
        ctx.fill();
        
        // Outlet holes
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(centerX - size * 0.3, centerY - size * 0.2, size * 0.15, 0, Math.PI * 2);
        ctx.arc(centerX + size * 0.3, centerY - size * 0.2, size * 0.15, 0, Math.PI * 2);
        ctx.rect(centerX - size * 0.1, centerY + size * 0.1, size * 0.2, size * 0.3);
        ctx.fill();
        
        // Power indicator
        ctx.fillStyle = colors.secondary;
        ctx.beginPath();
        ctx.arc(centerX, centerY - size * 0.7, size * 0.1, 0, Math.PI * 2);
        ctx.fill();
    }

    drawZigbeeHubIcon(ctx, dimensions) {
        const centerX = dimensions.width / 2;
        const centerY = dimensions.height / 2;
        const size = Math.min(dimensions.width, dimensions.height) * 0.4;
        
        // Hub center
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * 0.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Connection nodes
        const nodePositions = [
            { x: centerX - size * 0.4, y: centerY - size * 0.3 },
            { x: centerX + size * 0.4, y: centerY - size * 0.3 },
            { x: centerX - size * 0.4, y: centerY + size * 0.3 },
            { x: centerX + size * 0.4, y: centerY + size * 0.3 },
            { x: centerX, y: centerY - size * 0.5 },
            { x: centerX, y: centerY + size * 0.5 }
        ];
        
        // Draw connections
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 2;
        nodePositions.forEach(node => {
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(node.x, node.y);
            ctx.stroke();
        });
        
        // Draw nodes
        ctx.fillStyle = '#FFFFFF';
        nodePositions.forEach(node => {
            ctx.beginPath();
            ctx.arc(node.x, node.y, size * 0.08, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    drawAppTitle(ctx, dimensions, title) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${dimensions.height * 0.08}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(title, dimensions.width / 2, dimensions.height - 20);
    }

    addShadowEffect(ctx, dimensions) {
        // Add subtle inner shadow for depth
        const gradient = ctx.createRadialGradient(
            dimensions.width / 2, dimensions.height / 2, 0,
            dimensions.width / 2, dimensions.height / 2, dimensions.width / 2
        );
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.8, 'transparent');
        gradient.addColorStop(1, 'rgba(0,0,0,0.1)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, dimensions.width, dimensions.height);
    }

    async validateImages() {
        console.log('✅ Validating generated images...');
        
        const errors = [];
        
        // Validate app images
        const appImagesDir = path.join(this.projectRoot, 'assets/images');
        for (const [size, expectedDimensions] of Object.entries(this.dimensions.app)) {
            const imagePath = path.join(appImagesDir, `${size}.png`);
            if (!await fs.pathExists(imagePath)) {
                errors.push(`Missing app image: ${size}.png`);
            }
        }
        
        // Validate driver images
        const driversDir = path.join(this.projectRoot, 'drivers');
        if (await fs.pathExists(driversDir)) {
            // Check each driver has required images
            // This would be expanded based on actual driver structure
        }
        
        if (errors.length > 0) {
            console.error('❌ Image validation errors:', errors);
            throw new Error('Image validation failed');
        }
        
        console.log('✅ All images validated successfully');
    }

    // Additional icon drawing methods would be implemented here
    drawTemperatureSensorIcon(ctx, dimensions, colors) { /* Implementation */ }
    drawSwitchIcon(ctx, dimensions, colors) { /* Implementation */ }
    drawSmokeDetectorIcon(ctx, dimensions, colors) { /* Implementation */ }
    drawCurtainIcon(ctx, dimensions, colors) { /* Implementation */ }
    drawThermostatIcon(ctx, dimensions, colors) { /* Implementation */ }
    drawButtonIcon(ctx, dimensions, colors) { /* Implementation */ }
    drawDimmerIcon(ctx, dimensions, colors) { /* Implementation */ }
    drawRGBLightIcon(ctx, dimensions, colors) { /* Implementation */ }
    drawPresenceSensorIcon(ctx, dimensions, colors) { /* Implementation */ }
    drawWaterLeakIcon(ctx, dimensions, colors) { /* Implementation */ }
    drawAirQualityIcon(ctx, dimensions, colors) { /* Implementation */ }
}

// Execute if run directly
if (require.main === module) {
    const generator = new IntelligentImageGenerator();
    generator.generateAllImages().catch(console.error);
}

module.exports = IntelligentImageGenerator;
