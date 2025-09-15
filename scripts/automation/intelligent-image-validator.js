#!/usr/bin/env node

/**
 * INTELLIGENT IMAGE VALIDATOR & CORRECTOR
 * 
 * Basé sur la documentation officielle Homey SDK3:
 * - APP images (assets/images/): small=250x175, large=500x350, xlarge=1000x700
 * - DRIVER images (drivers/[driver]/assets/): small=75x75, large=500x500, xlarge=1000x1000
 * 
 * Problème résolu: Quand driver n'a pas de small.png, Homey utilise assets/images/small.png
 * comme fallback, causant erreur de validation (250x175 au lieu de 75x75 requis)
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

// Configuration des tailles selon documentation SDK3
const IMAGE_SPECS = {
    app: {
        small: { width: 250, height: 175, desc: 'App Store thumbnail' },
        large: { width: 500, height: 350, desc: 'App Store main image' },
        xlarge: { width: 1000, height: 700, desc: 'App Store large display' }
    },
    driver: {
        small: { width: 75, height: 75, desc: 'Driver icon' },
        large: { width: 500, height: 500, desc: 'Driver large image' },
        xlarge: { width: 1000, height: 1000, desc: 'Driver extra large' }
    }
};

// Couleurs par catégorie de device (unbranded design)
const DEVICE_COLORS = {
    light: '#FFD700',      // Or pour éclairage
    switch: '#4CAF50',     // Vert pour interrupteurs
    sensor: '#2196F3',     // Bleu pour capteurs
    climate: '#FF9800',    // Orange pour climat
    security: '#F44336',   // Rouge pour sécurité
    energy: '#9C27B0',     // Violet pour énergie
    automation: '#607D8B', // Gris pour automation
    default: '#1B4D72'     // Bleu par défaut
};

class IntelligentImageValidator {
    constructor() {
        this.projectRoot = process.cwd();
        this.errors = [];
        this.fixes = [];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = {
            info: '📋',
            success: '✅',
            error: '❌',
            fix: '🔧',
            validate: '🔍'
        }[type] || '📋';
        
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    // Détecter la catégorie d'un device par son nom
    categorizeDevice(deviceName) {
        const name = deviceName.toLowerCase();
        
        if (name.includes('light') || name.includes('bulb') || name.includes('lamp') || name.includes('led')) return 'light';
        if (name.includes('switch') || name.includes('dimmer') || name.includes('gang')) return 'switch';
        if (name.includes('sensor') || name.includes('motion') || name.includes('pir') || name.includes('presence')) return 'sensor';
        if (name.includes('climate') || name.includes('thermostat') || name.includes('temperature')) return 'climate';
        if (name.includes('smoke') || name.includes('detector') || name.includes('security') || name.includes('door') || name.includes('window')) return 'security';
        if (name.includes('plug') || name.includes('socket') || name.includes('energy') || name.includes('power')) return 'energy';
        if (name.includes('button') || name.includes('remote') || name.includes('knob') || name.includes('scene')) return 'automation';
        
        return 'default';
    }

    // Vérifier les dimensions d'une image
    getImageDimensions(imagePath) {
        try {
            const identify = execSync(`magick identify "${imagePath}"`, { encoding: 'utf8' });
            const match = identify.match(/(\d+)x(\d+)/);
            return match ? { width: parseInt(match[1]), height: parseInt(match[2]) } : null;
        } catch (error) {
            return null;
        }
    }

    // Générer image pour app principale
    generateAppImage(size, outputPath) {
        const spec = IMAGE_SPECS.app[size];
        const gradient = '#1B4D72-#2E5F8C';
        
        const command = `magick -size ${spec.width}x${spec.height} gradient:${gradient} ` +
                       `-gravity center -fill white -font Arial-Bold ` +
                       `-pointsize ${Math.floor(spec.width/15)} -annotate 0,0 "Ultimate\\nZigbee Hub" ` +
                       `-pointsize ${Math.floor(spec.width/25)} -annotate 0,${Math.floor(spec.height/8)} "Professional Device Hub" ` +
                       `"${outputPath}"`;
        
        execSync(command);
        this.log(`Generated ${size} app image: ${spec.width}x${spec.height}`, 'fix');
    }

    // Générer image pour driver
    generateDriverImage(driverName, size, outputPath) {
        const spec = IMAGE_SPECS.driver[size];
        const category = this.categorizeDevice(driverName);
        const color = DEVICE_COLORS[category];
        
        // Nom clean pour affichage
        const displayName = driverName.replace(/_/g, ' ')
            .replace(/tuya/gi, '')
            .replace(/zigbee/gi, '')
            .replace(/smart/gi, '')
            .trim()
            .replace(/\s+/g, ' ');
        
        const fontSize = Math.floor(spec.width / (displayName.length > 15 ? 8 : 6));
        
        const command = `magick -size ${spec.width}x${spec.height} xc:white ` +
                       `-fill "${color}" -draw "roundrectangle 5,5 ${spec.width-5},${spec.height-5} 10,10" ` +
                       `-gravity center -fill white -font Arial-Bold ` +
                       `-pointsize ${fontSize} -annotate 0,0 "${displayName}" ` +
                       `"${outputPath}"`;
        
        execSync(command);
        this.log(`Generated ${size} driver image for ${driverName}: ${spec.width}x${spec.height}`, 'fix');
    }

    // Valider et corriger images d'app
    async validateAppImages() {
        const appAssetsDir = path.join(this.projectRoot, 'assets', 'images');
        await fs.ensureDir(appAssetsDir);

        for (const [size, spec] of Object.entries(IMAGE_SPECS.app)) {
            const imagePath = path.join(appAssetsDir, `${size}.png`);
            
            let needsGeneration = false;
            
            if (!fs.existsSync(imagePath)) {
                this.errors.push(`Missing app image: ${size}.png`);
                needsGeneration = true;
            } else {
                const dimensions = this.getImageDimensions(imagePath);
                if (!dimensions || dimensions.width !== spec.width || dimensions.height !== spec.height) {
                    this.errors.push(`Invalid app image size: ${size}.png is ${dimensions?.width}x${dimensions?.height}, required ${spec.width}x${spec.height}`);
                    needsGeneration = true;
                }
            }
            
            if (needsGeneration) {
                this.generateAppImage(size, imagePath);
                this.fixes.push(`Fixed app ${size}.png to ${spec.width}x${spec.height}`);
            } else {
                this.log(`✓ App ${size}.png correct: ${spec.width}x${spec.height}`, 'validate');
            }
        }

        // Générer aussi app.png comme copie de large.png pour compatibilité
        const appPng = path.join(appAssetsDir, 'app.png');
        const largePng = path.join(appAssetsDir, 'large.png');
        if (fs.existsSync(largePng)) {
            await fs.copy(largePng, appPng);
            this.fixes.push('Generated app.png from large.png');
        }
    }

    // Valider et corriger images de drivers
    async validateDriverImages() {
        const driversDir = path.join(this.projectRoot, 'drivers');
        
        if (!fs.existsSync(driversDir)) {
            this.log('No drivers directory found', 'error');
            return;
        }

        const drivers = fs.readdirSync(driversDir).filter(dir => {
            const fullPath = path.join(driversDir, dir);
            return fs.statSync(fullPath).isDirectory();
        });

        this.log(`Found ${drivers.length} drivers to validate`, 'info');

        for (const driverName of drivers) {
            const driverAssetsDir = path.join(driversDir, driverName, 'assets');
            await fs.ensureDir(driverAssetsDir);

            // Focus sur small.png qui est critique pour éviter le fallback
            for (const [size, spec] of Object.entries(IMAGE_SPECS.driver)) {
                const imagePath = path.join(driverAssetsDir, `${size}.png`);
                
                let needsGeneration = false;
                
                if (!fs.existsSync(imagePath)) {
                    this.errors.push(`Missing driver image: ${driverName}/${size}.png`);
                    needsGeneration = true;
                } else {
                    const dimensions = this.getImageDimensions(imagePath);
                    if (!dimensions || dimensions.width !== spec.width || dimensions.height !== spec.height) {
                        this.errors.push(`Invalid driver image: ${driverName}/${size}.png is ${dimensions?.width}x${dimensions?.height}, required ${spec.width}x${spec.height}`);
                        needsGeneration = true;
                    }
                }
                
                if (needsGeneration) {
                    this.generateDriverImage(driverName, size, imagePath);
                    this.fixes.push(`Fixed driver ${driverName}/${size}.png to ${spec.width}x${spec.height}`);
                } else {
                    this.log(`✓ Driver ${driverName}/${size}.png correct: ${spec.width}x${spec.height}`, 'validate');
                }
            }
        }
    }

    // Nettoyer cache Homey
    async cleanHomeyCache() {
        const homeybuildDir = path.join(this.projectRoot, '.homeybuild');
        
        if (fs.existsSync(homeybuildDir)) {
            await fs.remove(homeybuildDir);
            this.log('Cleaned .homeybuild cache', 'fix');
        }
    }

    // Exécution principale
    async execute() {
        this.log('🚀 DÉMARRAGE VALIDATION INTELLIGENTE DES IMAGES');
        this.log('Basé sur documentation officielle Homey SDK3');
        
        try {
            // Nettoyer cache d'abord
            await this.cleanHomeyCache();
            
            // Valider images app
            this.log('Validation des images de l\'app principale...', 'validate');
            await this.validateAppImages();
            
            // Valider images drivers
            this.log('Validation des images des drivers...', 'validate');
            await this.validateDriverImages();
            
            // Rapport final
            this.log('📊 RAPPORT DE VALIDATION:', 'info');
            this.log(`Erreurs détectées: ${this.errors.length}`, this.errors.length > 0 ? 'error' : 'success');
            this.log(`Corrections appliquées: ${this.fixes.length}`, this.fixes.length > 0 ? 'fix' : 'info');
            
            if (this.errors.length > 0) {
                this.log('ERREURS DÉTECTÉES:', 'error');
                this.errors.forEach(error => this.log(`  - ${error}`, 'error'));
            }
            
            if (this.fixes.length > 0) {
                this.log('CORRECTIONS APPLIQUÉES:', 'fix');
                this.fixes.forEach(fix => this.log(`  - ${fix}`, 'fix'));
            }
            
            if (this.errors.length === 0) {
                this.log('🎉 TOUTES LES IMAGES SONT CONFORMES AUX STANDARDS SDK3!', 'success');
                return true;
            } else {
                this.log('⚠️ Images corrigées, re-validation recommandée', 'fix');
                return false;
            }
            
        } catch (error) {
            this.log(`Erreur durant validation: ${error.message}`, 'error');
            throw error;
        }
    }
}

// Exécution si appelé directement
if (require.main === module) {
    const validator = new IntelligentImageValidator();
    validator.execute()
        .then(success => process.exit(success ? 0 : 1))
        .catch(error => {
            console.error('❌ Échec validation:', error);
            process.exit(1);
        });
}

module.exports = IntelligentImageValidator;
