#!/usr/bin/env node

/**
 * ULTIMATE IMAGE GENERATOR - Johan Bendz Design + Zigbee2MQTT/Blakadder Integration
 * 
 * Génère automatiquement des images professionnelles pour tous les drivers
 * selon les standards Johan Bendz et les spécifications Homey SDK3
 * Inspiré des designs Zigbee2MQTT et bases de données Blakadder
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

// Standards de design Johan Bendz par catégorie
const JOHAN_BENDZ_DESIGN = {
    colors: {
        lighting: { primary: '#FFD700', secondary: '#FFA500', accent: '#FF8C00' },
        switch: { primary: '#4CAF50', secondary: '#8BC34A', accent: '#66BB6A' },
        sensor: { primary: '#2196F3', secondary: '#03A9F4', accent: '#29B6F6' },
        climate: { primary: '#FF9800', secondary: '#FF5722', accent: '#FF7043' },
        security: { primary: '#F44336', secondary: '#E91E63', accent: '#EC407A' },
        energy: { primary: '#9C27B0', secondary: '#673AB7', accent: '#7E57C2' },
        automation: { primary: '#607D8B', secondary: '#455A64', accent: '#546E7A' },
        default: { primary: '#1B4D72', secondary: '#2E5F8C', accent: '#3F6FA0' }
    },
    
    iconShapes: {
        lighting: ['circle', 'bulb-shape', 'spotlight'],
        switch: ['rectangle', 'rounded-rect', 'toggle'],
        sensor: ['diamond', 'eye-shape', 'wave'],
        climate: ['thermometer', 'snowflake', 'radiator'],
        security: ['shield', 'lock', 'camera'],
        energy: ['plug', 'battery', 'lightning'],
        automation: ['gear', 'remote', 'button'],
        default: ['rectangle', 'rounded-rect']
    }
};

// Spécifications images Homey SDK3
const IMAGE_SPECS = {
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

// Base de données des devices inspirée Zigbee2MQTT/Blakadder
const DEVICE_DATABASE = {
    // Éclairage
    'light': {
        keywords: ['light', 'bulb', 'lamp', 'led', 'strip', 'dimmer'],
        category: 'lighting',
        icon: 'bulb',
        description: 'Smart Lighting Device'
    },
    'switch': {
        keywords: ['switch', 'gang', 'wall', 'toggle', 'relay'],
        category: 'switch', 
        icon: 'switch',
        description: 'Smart Switch'
    },
    'sensor': {
        keywords: ['sensor', 'motion', 'pir', 'presence', 'door', 'window', 'contact'],
        category: 'sensor',
        icon: 'sensor',
        description: 'Smart Sensor'
    },
    'climate': {
        keywords: ['temperature', 'humidity', 'thermostat', 'climate', 'hvac'],
        category: 'climate',
        icon: 'thermometer',
        description: 'Climate Device'
    },
    'security': {
        keywords: ['smoke', 'detector', 'alarm', 'security', 'lock', 'camera'],
        category: 'security',
        icon: 'shield',
        description: 'Security Device'
    },
    'energy': {
        keywords: ['plug', 'socket', 'energy', 'power', 'meter', 'battery'],
        category: 'energy',
        icon: 'plug',
        description: 'Energy Device'
    },
    'automation': {
        keywords: ['button', 'remote', 'scene', 'knob', 'controller'],
        category: 'automation',
        icon: 'remote',
        description: 'Automation Device'
    }
};

class UltimateImageGenerator {
    constructor() {
        this.projectRoot = process.cwd();
        this.generated = [];
        this.errors = [];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = {
            info: '📋',
            success: '✅',
            error: '❌',
            generate: '🎨',
            analyze: '🔍'
        }[type] || '📋';
        
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    // Analyser et catégoriser un driver
    analyzeDriver(driverName) {
        const name = driverName.toLowerCase();
        
        for (const [deviceType, config] of Object.entries(DEVICE_DATABASE)) {
            for (const keyword of config.keywords) {
                if (name.includes(keyword)) {
                    return {
                        type: deviceType,
                        category: config.category,
                        icon: config.icon,
                        description: config.description,
                        colors: JOHAN_BENDZ_DESIGN.colors[config.category] || JOHAN_BENDZ_DESIGN.colors.default
                    };
                }
            }
        }
        
        return {
            type: 'unknown',
            category: 'default',
            icon: 'device',
            description: 'Smart Device',
            colors: JOHAN_BENDZ_DESIGN.colors.default
        };
    }

    // Générer nom d'affichage propre
    generateDisplayName(driverName) {
        return driverName
            .replace(/_/g, ' ')
            .replace(/tuya/gi, '')
            .replace(/zigbee/gi, '')
            .replace(/smart/gi, '')
            .replace(/\b(ts\d+[a-z]*|tze\d+[a-z]*)\b/gi, '')
            .trim()
            .replace(/\s+/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ')
            .trim();
    }

    // Générer image app principale
    async generateAppImage(size) {
        const spec = IMAGE_SPECS.app[size];
        const outputPath = path.join(this.projectRoot, 'assets', 'images', `${size}.png`);
        
        await fs.ensureDir(path.dirname(outputPath));
        
        const gradient = '#1B4D72-#2E5F8C';
        const titleSize = Math.floor(spec.width / 12);
        const subtitleSize = Math.floor(spec.width / 20);
        
        const command = `magick -size ${spec.width}x${spec.height} gradient:${gradient} ` +
                       `-gravity center -fill white -font Arial-Bold ` +
                       `-pointsize ${titleSize} -annotate 0,-20 "Ultimate Zigbee Hub" ` +
                       `-pointsize ${subtitleSize} -annotate 0,20 "Professional Device Integration" ` +
                       `-draw "fill white circle ${spec.width/4},${spec.height-40} ${spec.width/4+15},${spec.height-25}" ` +
                       `-draw "fill white circle ${spec.width/2},${spec.height-40} ${spec.width/2+15},${spec.height-25}" ` +
                       `-draw "fill white circle ${3*spec.width/4},${spec.height-40} ${3*spec.width/4+15},${spec.height-25}" ` +
                       `"${outputPath}"`;
        
        try {
            execSync(command);
            this.generated.push({ path: outputPath, type: 'app', size });
            this.log(`Generated app ${size}: ${spec.width}x${spec.height}`, 'generate');
        } catch (error) {
            this.errors.push({ path: outputPath, error: error.message });
            this.log(`Error generating app ${size}: ${error.message}`, 'error');
        }
    }

    // Générer image driver avec design Johan Bendz
    async generateDriverImage(driverName, size) {
        const spec = IMAGE_SPECS.driver[size];
        const analysis = this.analyzeDriver(driverName);
        const displayName = this.generateDisplayName(driverName);
        const outputPath = path.join(this.projectRoot, 'drivers', driverName, 'assets', `${size}.png`);
        
        await fs.ensureDir(path.dirname(outputPath));
        
        const colors = analysis.colors;
        const cornerRadius = Math.floor(spec.width / 15);
        const fontSize = Math.floor(spec.width / (displayName.length > 12 ? 10 : 8));
        const iconSize = Math.floor(spec.width / 3);
        
        // Créer fond avec gradient Johan Bendz
        let command = `magick -size ${spec.width}x${spec.height} xc:white `;
        
        // Fond coloré avec gradient
        command += `-fill "gradient:${colors.primary}-${colors.secondary}" `;
        command += `-draw "roundrectangle 5,5 ${spec.width-5},${spec.height-5} ${cornerRadius},${cornerRadius}" `;
        
        // Icône selon catégorie
        const iconY = Math.floor(spec.height / 3);
        switch (analysis.category) {
            case 'lighting':
                command += `-fill white -draw "circle ${spec.width/2},${iconY} ${spec.width/2-iconSize/3},${iconY-iconSize/3}" `;
                command += `-draw "rectangle ${spec.width/2-2},${iconY+iconSize/3} ${spec.width/2+2},${iconY+iconSize/2}" `;
                break;
            case 'switch':
                command += `-fill white -draw "roundrectangle ${spec.width/2-iconSize/3},${iconY-iconSize/4} ${spec.width/2+iconSize/3},${iconY+iconSize/4} 5,5" `;
                command += `-draw "circle ${spec.width/2+iconSize/6},${iconY} ${spec.width/2+iconSize/6-8},${iconY-8}" `;
                break;
            case 'sensor':
                command += `-fill white -draw "circle ${spec.width/2},${iconY} ${spec.width/2-iconSize/4},${iconY-iconSize/4}" `;
                command += `-draw "circle ${spec.width/2},${iconY} ${spec.width/2-iconSize/6},${iconY-iconSize/6}" `;
                break;
            case 'climate':
                command += `-fill white -draw "rectangle ${spec.width/2-3},${iconY-iconSize/3} ${spec.width/2+3},${iconY+iconSize/3}" `;
                command += `-draw "rectangle ${spec.width/2-iconSize/4},${iconY-iconSize/4} ${spec.width/2+iconSize/4},${iconY-iconSize/4+6}" `;
                break;
            case 'security':
                command += `-fill white -draw "path 'M ${spec.width/2} ${iconY-iconSize/3} L ${spec.width/2-iconSize/4} ${iconY} L ${spec.width/2} ${iconY+iconSize/3} L ${spec.width/2+iconSize/4} ${iconY} Z'" `;
                break;
            case 'energy':
                command += `-fill white -draw "roundrectangle ${spec.width/2-iconSize/4},${iconY-iconSize/4} ${spec.width/2+iconSize/4},${iconY+iconSize/6} 3,3" `;
                command += `-draw "rectangle ${spec.width/2-iconSize/6},${iconY+iconSize/6} ${spec.width/2+iconSize/6},${iconY+iconSize/3}" `;
                break;
            default:
                command += `-fill white -draw "roundrectangle ${spec.width/2-iconSize/4},${iconY-iconSize/4} ${spec.width/2+iconSize/4},${iconY+iconSize/4} 5,5" `;
        }
        
        // Texte avec nom du device
        if (fontSize > 6) {
            const textY = Math.floor(spec.height * 0.75);
            command += `-gravity center -fill white -font Arial-Bold -pointsize ${fontSize} `;
            command += `-annotate 0,${textY - spec.height/2} "${displayName}" `;
        }
        
        command += `"${outputPath}"`;
        
        try {
            execSync(command);
            this.generated.push({ 
                path: outputPath, 
                type: 'driver', 
                size, 
                driver: driverName,
                category: analysis.category,
                displayName 
            });
            this.log(`Generated ${driverName}/${size}: ${displayName} (${analysis.category})`, 'generate');
        } catch (error) {
            this.errors.push({ path: outputPath, error: error.message });
            this.log(`Error generating ${driverName}/${size}: ${error.message}`, 'error');
        }
    }

    // Générer toutes les images
    async generateAllImages() {
        this.log('🚀 DÉMARRAGE GÉNÉRATION IMAGES ULTIMATE');
        this.log('Design Johan Bendz + Standards Homey SDK3');
        
        try {
            // Générer images app
            this.log('Génération images app principale...', 'analyze');
            for (const size of ['small', 'large', 'xlarge']) {
                await this.generateAppImage(size);
            }
            
            // Copier large.png vers app.png pour compatibilité
            const largePath = path.join(this.projectRoot, 'assets', 'images', 'large.png');
            const appPngPath = path.join(this.projectRoot, 'assets', 'images', 'app.png');
            if (fs.existsSync(largePath)) {
                await fs.copy(largePath, appPngPath);
                this.log('Generated app.png from large.png', 'generate');
            }
            
            // Trouver tous les drivers
            const driversDir = path.join(this.projectRoot, 'drivers');
            if (!fs.existsSync(driversDir)) {
                this.log('Drivers directory not found', 'error');
                return false;
            }
            
            const drivers = fs.readdirSync(driversDir).filter(dir => {
                return fs.statSync(path.join(driversDir, dir)).isDirectory();
            });
            
            this.log(`Génération images pour ${drivers.length} drivers...`, 'analyze');
            
            // Générer images pour chaque driver
            for (const driverName of drivers) {
                for (const size of ['small', 'large', 'xlarge']) {
                    await this.generateDriverImage(driverName, size);
                }
            }
            
            // Rapport final
            this.log('📊 RAPPORT DE GÉNÉRATION:', 'info');
            this.log(`Images générées: ${this.generated.length}`, this.generated.length > 0 ? 'success' : 'info');
            this.log(`Erreurs: ${this.errors.length}`, this.errors.length > 0 ? 'error' : 'success');
            
            // Statistiques par catégorie
            const categories = {};
            this.generated.filter(g => g.type === 'driver').forEach(g => {
                categories[g.category] = (categories[g.category] || 0) + 1;
            });
            
            this.log('RÉPARTITION PAR CATÉGORIE:', 'analyze');
            Object.entries(categories).forEach(([cat, count]) => {
                this.log(`  - ${cat}: ${count} drivers`, 'analyze');
            });
            
            if (this.errors.length > 0) {
                this.log('ERREURS RENCONTRÉES:', 'error');
                this.errors.forEach(({ path, error }) => {
                    this.log(`  - ${path}: ${error}`, 'error');
                });
            }
            
            this.log('🎉 GÉNÉRATION IMAGES TERMINÉE!', 'success');
            return this.errors.length === 0;
            
        } catch (error) {
            this.log(`Erreur durant génération: ${error.message}`, 'error');
            throw error;
        }
    }
}

// Exécution si appelé directement
if (require.main === module) {
    const generator = new UltimateImageGenerator();
    generator.generateAllImages()
        .then(success => process.exit(success ? 0 : 1))
        .catch(error => {
            console.error('❌ Échec génération images:', error);
            process.exit(1);
        });
}

module.exports = UltimateImageGenerator;
