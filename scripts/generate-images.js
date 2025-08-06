#!/usr/bin/env node
/**
 * 🖼️ IMAGE GENERATOR SCRIPT
 * Version: 1.0.0
 * Date: 2025-08-06T08:10:00.000Z
 * 
 * Génère les images requises pour l'app Homey
 */
const fs = require('fs');
const path = require('path');

class ImageGenerator {
    constructor() {
        this.assetsDir = path.join(__dirname, '../assets/images');
        this.ensureAssetsDir();
    }

    ensureAssetsDir() {
        if (!fs.existsSync(this.assetsDir)) {
            fs.mkdirSync(this.assetsDir, { recursive: true });
        }
    }

    generatePlaceholderImage(width, height, filename) {
        // Créer une image SVG simple comme placeholder
        const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#4CAF50"/>
            <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-family="Arial" font-size="${Math.min(width, height) / 8}">
                Tuya Zigbee
            </text>
        </svg>`;
        
        const filepath = path.join(this.assetsDir, filename);
        fs.writeFileSync(filepath, svg);
        console.log(`✅ Généré: ${filename} (${width}x${height})`);
    }

    generateAllImages() {
        console.log('🖼️ Génération des images pour l\'app Homey...');
        
        // Générer les images requises
        this.generatePlaceholderImage(120, 120, 'small.png');
        this.generatePlaceholderImage(512, 512, 'large.png');
        
        console.log('✅ Toutes les images ont été générées !');
    }
}

async function main() {
    const generator = new ImageGenerator();
    generator.generateAllImages();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = ImageGenerator; 