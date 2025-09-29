#!/usr/bin/env node

/**
 * IMAGE GENERATOR CORE
 * Système modulaire de génération d'images basé sur les standards Johan Bendz
 * Utilise des outils gratuits et des modules device-specific
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync, spawn } = require('child_process');

class ImageGeneratorCore {
    constructor() {
        this.projectRoot = process.cwd();
        this.driversPath = path.join(this.projectRoot, 'drivers');
        this.reportsPath = path.join(this.projectRoot, 'project-data', 'analysis-results');
        this.templatesPath = path.join(__dirname, 'templates');
        
        // Standards Johan Bendz depuis la mémoire
        this.johanBendzStandards = {
            colorPalette: {
                lighting: ['#FFD700', '#FFA500'],
                switches: ['#4CAF50', '#8BC34A'], 
                sensors: ['#2196F3', '#03A9F4'],
                climate: ['#FF9800', '#FF5722'],
                security: ['#F44336', '#E91E63'],
                energy: ['#9C27B0', '#673AB7'],
                automation: ['#607D8B', '#455A64']
            },
            imageSizes: {
                small: { width: 75, height: 75 },
                large: { width: 500, height: 500 }
            },
            requirements: {
                format: 'PNG',
                quality: 'professional',
                background: 'white',
                style: 'minimalist_gradient'
            }
        };
        
        this.availableTools = [];
        this.deviceDrawers = {};
        this.generationQueue = [];
    }

    async initialize() {
        console.log('🎨 Initializing Image Generator Core...');
        
        await this.detectAvailableTools();
        await this.loadDeviceDrawers();
        await this.ensureDirectories();
        
        console.log(`   Available tools: ${this.availableTools.join(', ')}`);
        console.log(`   Device drawers: ${Object.keys(this.deviceDrawers).length} modules loaded`);
    }

    async detectAvailableTools() {
        const tools = [
            { name: 'node-canvas', test: () => this.testNodeCanvas() },
            { name: 'puppeteer', test: () => this.testPuppeteer() },
            { name: 'imagemagick', test: () => this.testImageMagick() },
            { name: 'svg-to-png', test: () => this.testSvgToPng() },
            { name: 'html-to-image', test: () => this.testHtmlToImage() }
        ];
        
        for (const tool of tools) {
            if (await tool.test()) {
                this.availableTools.push(tool.name);
            }
        }
        
        // Si aucun outil disponible, utiliser la génération de base
        if (this.availableTools.length === 0) {
            this.availableTools.push('basic-generation');
        }
    }

    async testNodeCanvas() {
        try {
            require.resolve('canvas');
            return true;
        } catch (e) {
            return false;
        }
    }

    async testPuppeteer() {
        try {
            require.resolve('puppeteer');
            return true;
        } catch (e) {
            return false;
        }
    }

    async testImageMagick() {
        try {
            execSync('magick -version', { stdio: 'ignore' });
            return true;
        } catch (e) {
            return false;
        }
    }

    async testSvgToPng() {
        try {
            require.resolve('svg2png');
            return true;
        } catch (e) {
            return false;
        }
    }

    async testHtmlToImage() {
        try {
            require.resolve('html-to-image');
            return true;
        } catch (e) {
            return false;
        }
    }

    async loadDeviceDrawers() {
        const drawersPath = path.join(__dirname, '../device-drawers');
        
        if (!await fs.pathExists(drawersPath)) {
            await fs.ensureDir(drawersPath);
        }
        
        try {
            const drawerFiles = await fs.readdir(drawersPath);
            
            for (const file of drawerFiles) {
                if (file.endsWith('.js')) {
                    const drawerPath = path.join(drawersPath, file);
                    const drawerName = path.basename(file, '.js');
                    
                    try {
                        this.deviceDrawers[drawerName] = require(drawerPath);
                    } catch (error) {
                        console.log(`⚠️  Could not load drawer: ${drawerName}`);
                    }
                }
            }
        } catch (error) {
            console.log('⚠️  Device drawers directory not accessible');
        }
    }

    async ensureDirectories() {
        await fs.ensureDir(this.templatesPath);
        await fs.ensureDir(path.join(this.projectRoot, 'temp-generation'));
    }

    async loadRegenerationPlan() {
        const planFile = path.join(this.reportsPath, 'image-regeneration-plan.json');
        
        if (!await fs.pathExists(planFile)) {
            console.log('❌ Regeneration plan not found');
            return null;
        }
        
        const plan = await fs.readJson(planFile);
        console.log(`📋 Loaded regeneration plan: ${plan.totalDriversNeedingRegeneration} drivers`);
        return plan;
    }

    async generateForDriver(driverInfo, priority = 'medium') {
        const driverName = driverInfo.driverName;
        const category = driverInfo.category || this.determineCategory(driverName);
        const expectedFeatures = driverInfo.expectedFeatures || this.analyzeDriverFeatures(driverName);
        
        console.log(`\n🎨 Generating images for: ${driverName} (${priority} priority)`);
        
        const results = {
            driverName,
            category,
            generatedImages: [],
            errors: []
        };
        
        // Générer les deux tailles requises
        for (const [sizeName, dimensions] of Object.entries(this.johanBendzStandards.imageSizes)) {
            try {
                const imagePath = await this.generateSingleImage(
                    driverName, category, expectedFeatures, sizeName, dimensions
                );
                
                if (imagePath) {
                    results.generatedImages.push({
                        size: sizeName,
                        path: imagePath,
                        dimensions
                    });
                    console.log(`  ✅ Generated: ${sizeName}.png (${dimensions.width}x${dimensions.height})`);
                } else {
                    results.errors.push(`Failed to generate ${sizeName} image`);
                }
                
            } catch (error) {
                results.errors.push(`Error generating ${sizeName}: ${error.message}`);
                console.log(`  ❌ Failed: ${sizeName}.png - ${error.message}`);
            }
        }
        
        return results;
    }

    async generateSingleImage(driverName, category, expectedFeatures, sizeName, dimensions) {
        const driverPath = path.join(this.driversPath, driverName, 'assets');
        await fs.ensureDir(driverPath);
        
        const outputPath = path.join(driverPath, `${sizeName}.png`);
        
        // Choisir la méthode de génération selon les outils disponibles
        if (this.availableTools.includes('puppeteer')) {
            return await this.generateWithPuppeteer(driverName, category, expectedFeatures, dimensions, outputPath);
        } else if (this.availableTools.includes('node-canvas')) {
            return await this.generateWithCanvas(driverName, category, expectedFeatures, dimensions, outputPath);
        } else if (this.availableTools.includes('imagemagick')) {
            return await this.generateWithImageMagick(driverName, category, expectedFeatures, dimensions, outputPath);
        } else {
            return await this.generateBasicImage(driverName, category, expectedFeatures, dimensions, outputPath);
        }
    }

    async generateWithPuppeteer(driverName, category, expectedFeatures, dimensions, outputPath) {
        try {
            const puppeteer = require('puppeteer');
            
            // Générer le HTML pour l'image
            const html = await this.generateImageHTML(driverName, category, expectedFeatures, dimensions);
            
            const browser = await puppeteer.launch({ headless: true });
            const page = await browser.newPage();
            
            await page.setViewport({
                width: dimensions.width,
                height: dimensions.height
            });
            
            await page.setContent(html);
            
            await page.screenshot({
                path: outputPath,
                type: 'png',
                clip: {
                    x: 0,
                    y: 0,
                    width: dimensions.width,
                    height: dimensions.height
                }
            });
            
            await browser.close();
            return outputPath;
            
        } catch (error) {
            console.log(`⚠️  Puppeteer generation failed: ${error.message}`);
            return null;
        }
    }

    async generateWithCanvas(driverName, category, expectedFeatures, dimensions, outputPath) {
        try {
            const { createCanvas } = require('canvas');
            
            const canvas = createCanvas(dimensions.width, dimensions.height);
            const ctx = canvas.getContext('2d');
            
            // Utiliser le device drawer approprié
            const drawer = this.getDeviceDrawer(category);
            if (drawer && drawer.drawOnCanvas) {
                await drawer.drawOnCanvas(ctx, driverName, expectedFeatures, dimensions, this.johanBendzStandards);
            } else {
                await this.drawGenericOnCanvas(ctx, driverName, category, expectedFeatures, dimensions);
            }
            
            const buffer = canvas.toBuffer('image/png');
            await fs.writeFile(outputPath, buffer);
            
            return outputPath;
            
        } catch (error) {
            console.log(`⚠️  Canvas generation failed: ${error.message}`);
            return null;
        }
    }

    async generateWithImageMagick(driverName, category, expectedFeatures, dimensions, outputPath) {
        try {
            const tempSvgPath = path.join(this.projectRoot, 'temp-generation', `${driverName}-${Date.now()}.svg`);
            
            // Générer SVG avec le device drawer
            const svgContent = await this.generateImageSVG(driverName, category, expectedFeatures, dimensions);
            await fs.writeFile(tempSvgPath, svgContent);
            
            // Convertir SVG vers PNG avec ImageMagick
            const convertCmd = `magick "${tempSvgPath}" -resize ${dimensions.width}x${dimensions.height} "${outputPath}"`;
            execSync(convertCmd);
            
            // Nettoyer le fichier temporaire
            await fs.remove(tempSvgPath);
            
            return outputPath;
            
        } catch (error) {
            console.log(`⚠️  ImageMagick generation failed: ${error.message}`);
            return null;
        }
    }

    async generateBasicImage(driverName, category, expectedFeatures, dimensions, outputPath) {
        // Génération de base: créer une image simple avec les couleurs de catégorie
        const colors = this.johanBendzStandards.colorPalette[category] || this.johanBendzStandards.colorPalette.automation;
        
        // Créer un SVG simple
        const svg = `
        <svg width="${dimensions.width}" height="${dimensions.height}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:${colors[0]};stop-opacity:1" />
                    <stop offset="100%" style="stop-color:${colors[1] || colors[0]};stop-opacity:1" />
                </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="white"/>
            <rect x="10%" y="10%" width="80%" height="80%" fill="url(#grad1)" rx="10"/>
            <text x="50%" y="55%" text-anchor="middle" font-family="Arial" font-size="${Math.max(8, dimensions.width/10)}" fill="white">${this.getDeviceIcon(category)}</text>
        </svg>`;
        
        const tempSvgPath = path.join(this.projectRoot, 'temp-generation', `${driverName}-basic.svg`);
        await fs.writeFile(tempSvgPath, svg);
        
        try {
            // Essayer avec ImageMagick si disponible
            if (this.availableTools.includes('imagemagick')) {
                execSync(`magick "${tempSvgPath}" "${outputPath}"`);
            } else {
                // Fallback: copier comme base
                await fs.copy(tempSvgPath, outputPath.replace('.png', '.svg'));
            }
            
            await fs.remove(tempSvgPath);
            return outputPath;
            
        } catch (error) {
            console.log(`⚠️  Basic generation failed: ${error.message}`);
            return null;
        }
    }

    getDeviceDrawer(category) {
        const drawerNames = [
            `${category}-drawer`,
            `${category}`,
            'generic-drawer',
            'default'
        ];
        
        for (const name of drawerNames) {
            if (this.deviceDrawers[name]) {
                return this.deviceDrawers[name];
            }
        }
        
        return null;
    }

    getDeviceIcon(category) {
        const icons = {
            switches: '⚡',
            sensors: '📡',
            lighting: '💡',
            security: '🔒',
            energy: '🔌',
            climate: '🌡️',
            automation: '🎛️'
        };
        
        return icons[category] || '📱';
    }

    determineCategory(driverName) {
        const name = driverName.toLowerCase();
        
        if (name.includes('switch') || name.includes('button')) return 'switches';
        if (name.includes('sensor')) return 'sensors';
        if (name.includes('bulb') || name.includes('light')) return 'lighting';
        if (name.includes('plug') || name.includes('outlet')) return 'energy';
        if (name.includes('lock')) return 'security';
        if (name.includes('thermostat') || name.includes('climate')) return 'climate';
        if (name.includes('detector')) return 'security';
        
        return 'automation';
    }

    analyzeDriverFeatures(driverName) {
        const name = driverName.toLowerCase();
        const features = {
            buttonCount: 0,
            powerType: 'unknown',
            deviceType: 'unknown'
        };
        
        // Extraire le nombre de boutons
        const buttonPatterns = [/(\d+)gang/, /(\d+)_gang/, /(\d+)button/];
        for (const pattern of buttonPatterns) {
            const match = name.match(pattern);
            if (match) {
                features.buttonCount = parseInt(match[1]);
                break;
            }
        }
        
        // Type d'alimentation
        if (name.includes('battery') || name.includes('cr2032')) {
            features.powerType = 'battery';
        } else if (name.includes('ac')) {
            features.powerType = 'ac';
        } else if (name.includes('dc')) {
            features.powerType = 'dc';
        }
        
        return features;
    }

    async generateImageHTML(driverName, category, expectedFeatures, dimensions) {
        const colors = this.johanBendzStandards.colorPalette[category] || this.johanBendzStandards.colorPalette.automation;
        
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { margin: 0; padding: 0; width: ${dimensions.width}px; height: ${dimensions.height}px; }
                .device-container {
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg, ${colors[0]}, ${colors[1] || colors[0]});
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: Arial, sans-serif;
                    color: white;
                }
                .device-icon {
                    font-size: ${Math.max(16, dimensions.width/8)}px;
                    text-align: center;
                }
            </style>
        </head>
        <body>
            <div class="device-container">
                <div class="device-icon">${this.getDeviceIcon(category)}</div>
            </div>
        </body>
        </html>`;
    }

    async generateImageSVG(driverName, category, expectedFeatures, dimensions) {
        const colors = this.johanBendzStandards.colorPalette[category] || this.johanBendzStandards.colorPalette.automation;
        
        return `
        <svg width="${dimensions.width}" height="${dimensions.height}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="deviceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:${colors[0]};stop-opacity:1" />
                    <stop offset="100%" style="stop-color:${colors[1] || colors[0]};stop-opacity:1" />
                </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="white"/>
            <rect x="5%" y="5%" width="90%" height="90%" fill="url(#deviceGrad)" rx="10"/>
            <text x="50%" y="55%" text-anchor="middle" font-family="Arial" font-size="${Math.max(12, dimensions.width/8)}" fill="white">${this.getDeviceIcon(category)}</text>
        </svg>`;
    }

    async drawGenericOnCanvas(ctx, driverName, category, expectedFeatures, dimensions) {
        const colors = this.johanBendzStandards.colorPalette[category] || this.johanBendzStandards.colorPalette.automation;
        
        // Background blanc
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, dimensions.width, dimensions.height);
        
        // Gradient de fond
        const gradient = ctx.createLinearGradient(0, 0, dimensions.width, dimensions.height);
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(1, colors[1] || colors[0]);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(dimensions.width * 0.1, dimensions.height * 0.1, 
                    dimensions.width * 0.8, dimensions.height * 0.8);
        
        // Icône
        ctx.fillStyle = 'white';
        ctx.font = `${Math.max(16, dimensions.width/8)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.getDeviceIcon(category), dimensions.width/2, dimensions.height/2);
    }
}

module.exports = ImageGeneratorCore;
