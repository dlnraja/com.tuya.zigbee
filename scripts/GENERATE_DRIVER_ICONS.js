#!/usr/bin/env node

/**
 * DRIVER ICON GENERATOR - Personalized Icons with Device Characteristics
 * Generates custom icons for each driver showing:
 * - Device type and key features
 * - Power source (battery/AC)
 * - Category color coding
 * - Rounded square format (75x75, 500x500)
 */

const fs = require('fs-extra');
const path = require('path');
const { createCanvas } = require('canvas');

class DriverIconGenerator {
    constructor() {
        this.projectRoot = process.cwd();
        
        // Color palette by category (Johan Bendz standards)
        this.colors = {
            // Switches & Controls
            switches: { primary: '#4CAF50', secondary: '#81C784', icon: '#2E7D32' },
            dimmer: { primary: '#8BC34A', secondary: '#AED581', icon: '#558B2F' },
            
            // Sensors
            sensors: { primary: '#2196F3', secondary: '#64B5F6', icon: '#1565C0' },
            motion: { primary: '#03A9F4', secondary: '#4FC3F7', icon: '#0277BD' },
            
            // Climate & Environment
            temperature: { primary: '#FF9800', secondary: '#FFB74D', icon: '#E65100' },
            humidity: { primary: '#00BCD4', secondary: '#4DD0E1', icon: '#006064' },
            climate: { primary: '#FF5722', secondary: '#FF8A65', icon: '#BF360C' },
            
            // Lighting
            lights: { primary: '#FFD700', secondary: '#FFE082', icon: '#F57F17' },
            rgb: { primary: '#FFA500', secondary: '#FFCC80', icon: '#E65100' },
            
            // Security
            security: { primary: '#F44336', secondary: '#E57373', icon: '#C62828' },
            alarm: { primary: '#E91E63', secondary: '#F06292', icon: '#880E4F' },
            
            // Energy & Power
            plug: { primary: '#9C27B0', secondary: '#BA68C8', icon: '#4A148C' },
            energy: { primary: '#673AB7', secondary: '#9575CD', icon: '#311B92' },
            
            // Automation
            automation: { primary: '#607D8B', secondary: '#90A4AE', icon: '#37474F' },
            scene: { primary: '#455A64', secondary: '#78909C', icon: '#263238' },
            
            // Default
            default: { primary: '#1E88E5', secondary: '#64B5F6', icon: '#0D47A1' }
        };
        
        // Device type icons (emoji representations)
        this.deviceIcons = {
            // Switches
            'switch': '💡',
            'dimmer': '🎚️',
            'relay': '🔌',
            
            // Sensors
            'motion_sensor': '👁️',
            'door_sensor': '🚪',
            'window_sensor': '🪟',
            'contact_sensor': '📍',
            'water_leak': '💧',
            'smoke': '🔥',
            'gas': '⚠️',
            'co2': '🌫️',
            
            // Climate
            'temperature': '🌡️',
            'humidity': '💨',
            'thermostat': '🌡️',
            'hvac': '❄️',
            
            // Lights
            'light': '💡',
            'bulb': '💡',
            'rgb': '🌈',
            'ceiling_light': '💡',
            
            // Security
            'alarm': '🚨',
            'siren': '📢',
            'lock': '🔒',
            
            // Energy
            'plug': '🔌',
            'socket': '🔌',
            'meter': '⚡',
            
            // Others
            'valve': '🚰',
            'pump': '⚙️',
            'fan': '🌀',
            'curtain': '🪟',
            'blind': '📜',
            'garage': '🚗',
            
            // Default
            'default': '🔧'
        };
        
        // Power source icons
        this.powerIcons = {
            'battery': '🔋',
            'ac': '⚡',
            'hybrid': '🔋⚡',
            'usb': '🔌'
        };
    }

    log(msg, icon = '🎨') {
        console.log(`${icon} ${msg}`);
    }

    // Detect device category from driver name
    detectCategory(driverName) {
        const name = driverName.toLowerCase();
        
        if (name.includes('switch') || name.includes('relay')) return 'switches';
        if (name.includes('dimmer')) return 'dimmer';
        if (name.includes('motion') || name.includes('pir')) return 'motion';
        if (name.includes('door') || name.includes('window') || name.includes('contact')) return 'sensors';
        if (name.includes('temperature') || name.includes('temp')) return 'temperature';
        if (name.includes('humidity')) return 'humidity';
        if (name.includes('climate') || name.includes('thermostat') || name.includes('hvac')) return 'climate';
        if (name.includes('light') || name.includes('bulb') || name.includes('ceiling')) return 'lights';
        if (name.includes('rgb') || name.includes('color')) return 'rgb';
        if (name.includes('alarm') || name.includes('siren')) return 'alarm';
        if (name.includes('smoke') || name.includes('gas') || name.includes('co2') || name.includes('leak')) return 'security';
        if (name.includes('plug') || name.includes('socket') || name.includes('outlet')) return 'plug';
        if (name.includes('energy') || name.includes('meter')) return 'energy';
        if (name.includes('scene') || name.includes('remote') || name.includes('wireless')) return 'automation';
        
        return 'default';
    }

    // Detect device type icon
    detectDeviceIcon(driverName) {
        const name = driverName.toLowerCase();
        
        for (const [key, icon] of Object.entries(this.deviceIcons)) {
            if (name.includes(key)) return icon;
        }
        
        return this.deviceIcons.default;
    }

    // Detect power source
    detectPowerSource(driverName) {
        const name = driverName.toLowerCase();
        
        if (name.includes('battery') || name.includes('cr2032') || name.includes('cr2450')) return 'battery';
        if (name.includes('hybrid')) return 'hybrid';
        if (name.includes('usb')) return 'usb';
        if (name.includes('ac') || name.includes('mains')) return 'ac';
        
        // Default: AC if nothing specified
        return 'ac';
    }

    // Detect number of gangs/channels
    detectGangs(driverName) {
        const match = driverName.match(/(\d+)gang|(\d+)channel|(\d+)way/i);
        if (match) {
            return parseInt(match[1] || match[2] || match[3]);
        }
        return null;
    }

    // Generate device type text for badge
    generateDeviceTypeText(driverName, gangs) {
        const name = driverName.toLowerCase();
        
        // Extract base type
        let type = '';
        
        if (name.includes('switch')) type = 'Switch';
        else if (name.includes('dimmer')) type = 'Dimmer';
        else if (name.includes('motion')) type = 'Motion';
        else if (name.includes('door')) type = 'Door';
        else if (name.includes('window')) type = 'Window';
        else if (name.includes('contact')) type = 'Contact';
        else if (name.includes('temperature') || name.includes('temp')) type = 'Temp';
        else if (name.includes('humidity')) type = 'Humidity';
        else if (name.includes('climate')) type = 'Climate';
        else if (name.includes('thermostat')) type = 'Thermostat';
        else if (name.includes('light') || name.includes('bulb')) type = 'Light';
        else if (name.includes('rgb')) type = 'RGB';
        else if (name.includes('plug') || name.includes('socket') || name.includes('outlet')) type = 'Plug';
        else if (name.includes('sensor')) type = 'Sensor';
        else if (name.includes('alarm') || name.includes('siren')) type = 'Alarm';
        else if (name.includes('valve')) type = 'Valve';
        else if (name.includes('fan')) type = 'Fan';
        else if (name.includes('curtain') || name.includes('blind')) type = 'Curtain';
        else if (name.includes('garage')) type = 'Garage';
        else if (name.includes('leak')) type = 'Leak';
        else if (name.includes('smoke')) type = 'Smoke';
        else if (name.includes('gas')) type = 'Gas';
        else if (name.includes('co2')) type = 'CO2';
        else type = 'Device';
        
        // Add gang/channel info
        if (gangs && gangs > 1) {
            return `${type} ${gangs}Gang`;
        }
        
        return type;
    }

    // Create driver icon
    createDriverIcon(driverName, size) {
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');
        
        // Detect characteristics
        const category = this.detectCategory(driverName);
        const colors = this.colors[category] || this.colors.default;
        const deviceIcon = this.detectDeviceIcon(driverName);
        const powerSource = this.detectPowerSource(driverName);
        const gangs = this.detectGangs(driverName);
        
        // Background with rounded corners and gradient
        const radius = size * 0.15; // 15% radius for rounded corners
        const gradient = ctx.createLinearGradient(0, 0, size, size);
        gradient.addColorStop(0, colors.primary);
        gradient.addColorStop(1, colors.secondary);
        
        ctx.fillStyle = gradient;
        this.roundRect(ctx, 0, 0, size, size, radius);
        ctx.fill();
        
        // Subtle inner shadow effect
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = size * 0.02;
        this.roundRect(ctx, size * 0.02, size * 0.02, size * 0.96, size * 0.96, radius);
        ctx.stroke();
        
        // Main device icon (center, large)
        const mainIconSize = size * 0.4;
        ctx.font = `${mainIconSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'white';
        ctx.fillText(deviceIcon, size / 2, size * 0.42);
        
        // Power source badge (top right)
        const powerIconSize = size * 0.2;
        const powerIcon = this.powerIcons[powerSource];
        ctx.font = `${powerIconSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Power badge background (circle)
        const powerBadgeX = size * 0.8;
        const powerBadgeY = size * 0.2;
        const badgeRadius = size * 0.15;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(powerBadgeX, powerBadgeY, badgeRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.fillText(powerIcon, powerBadgeX, powerBadgeY);
        
        // Device type text badge (bottom)
        const textBadgeY = size * 0.85;
        const badgeHeight = size * 0.12;
        const badgePadding = size * 0.05;
        
        // Generate device type text
        let deviceText = this.generateDeviceTypeText(driverName, gangs);
        
        // Measure text to determine badge width
        const textSize = size * 0.08;
        ctx.font = `bold ${textSize}px Arial`;
        const textMetrics = ctx.measureText(deviceText);
        const badgeWidth = textMetrics.width + (badgePadding * 2);
        
        // Badge background (rounded rectangle)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.roundRect(ctx, 
            (size - badgeWidth) / 2, 
            textBadgeY - badgeHeight / 2, 
            badgeWidth, 
            badgeHeight, 
            badgeHeight / 3
        );
        ctx.fill();
        
        // White underline
        const underlineY = textBadgeY + textSize * 0.25;
        const underlineWidth = textMetrics.width * 0.9;
        ctx.strokeStyle = 'white';
        ctx.lineWidth = size * 0.005;
        ctx.beginPath();
        ctx.moveTo((size - underlineWidth) / 2, underlineY);
        ctx.lineTo((size + underlineWidth) / 2, underlineY);
        ctx.stroke();
        
        // Device type text (white)
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(deviceText, size / 2, textBadgeY);
        
        return canvas;
    }

    // Helper: Draw rounded rectangle
    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    // Generate icons for one driver
    async generateDriverIcons(driverName) {
        const driverPath = path.join(this.projectRoot, 'drivers', driverName);
        const assetsPath = path.join(driverPath, 'assets');
        
        if (!await fs.pathExists(driverPath)) {
            this.log(`Driver not found: ${driverName}`, '⚠️');
            return false;
        }
        
        await fs.ensureDir(assetsPath);
        
        // Generate small (75x75) and large (500x500)
        const sizes = [
            { name: 'small', size: 75 },
            { name: 'large', size: 500 }
        ];
        
        for (const { name, size } of sizes) {
            const canvas = this.createDriverIcon(driverName, size);
            const buffer = canvas.toBuffer('image/png');
            const outputPath = path.join(assetsPath, `${name}.png`);
            
            await fs.writeFile(outputPath, buffer);
            this.log(`Generated ${driverName}/${name}.png (${size}x${size})`, '✅');
        }
        
        return true;
    }

    // Generate for all drivers
    async generateAllDriverIcons() {
        this.log('🚀 DRIVER ICON GENERATOR - Personalized Icons', '🎨');
        this.log('');
        
        const driversPath = path.join(this.projectRoot, 'drivers');
        const drivers = await fs.readdir(driversPath);
        
        let success = 0;
        let failed = 0;
        
        for (const driver of drivers) {
            const driverPath = path.join(driversPath, driver);
            const stats = await fs.stat(driverPath);
            
            if (stats.isDirectory()) {
                const result = await this.generateDriverIcons(driver);
                if (result) {
                    success++;
                } else {
                    failed++;
                }
            }
        }
        
        this.log('');
        this.log('🎉 GENERATION COMPLETE!', '✅');
        this.log(`✅ Success: ${success} drivers`);
        if (failed > 0) {
            this.log(`❌ Failed: ${failed} drivers`, '⚠️');
        }
        this.log('');
        this.log('📊 Features:', 'ℹ️');
        this.log('   • Personalized device icons');
        this.log('   • Power source badges (battery/AC)');
        this.log('   • Category color coding');
        this.log('   • Gang/channel indicators');
        this.log('   • Rounded square format');
        this.log('   • Professional gradients');
    }

    async run() {
        try {
            await this.generateAllDriverIcons();
        } catch (error) {
            this.log(`Error: ${error.message}`, '❌');
            console.error(error);
            process.exit(1);
        }
    }
}

// Run if called directly
if (require.main === module) {
    const generator = new DriverIconGenerator();
    generator.run();
}

module.exports = DriverIconGenerator;
