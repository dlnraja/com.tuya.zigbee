#!/usr/bin/env node

/**
 * APP IMAGE GENERATOR - Professional Presentation Images
 * Generates modern, clean app presentation images for Homey App Store
 */

const fs = require('fs-extra');
const path = require('path');
const { createCanvas, registerFont } = require('canvas');

class AppImageGenerator {
    constructor() {
        this.projectRoot = process.cwd();
    }

    log(msg, icon = '📋') {
        console.log(`${icon} ${msg}`);
    }

    // Créer image professionnelle
    createAppImage(width, height, size) {
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Gradient background moderne
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#1B4D72');
        gradient.addColorStop(0.5, '#2E5F8C');
        gradient.addColorStop(1, '#1B4D72');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Pattern overlay subtil
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        for (let i = 0; i < width; i += 40) {
            for (let j = 0; j < height; j += 40) {
                ctx.fillRect(i, j, 20, 20);
            }
        }

        // Grande icône centrale
        const iconSize = Math.floor(height * 0.25);
        ctx.font = `${iconSize}px Arial`;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Cercle background pour l'icône
        ctx.beginPath();
        ctx.arc(width / 2, height * 0.35, iconSize * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fill();

        // Icône emoji
        ctx.fillStyle = 'white';
        ctx.fillText('🏠', width / 2, height * 0.35);

        // Titre principal
        const titleSize = Math.floor(height * 0.08);
        ctx.font = `bold ${titleSize}px Arial, sans-serif`;
        ctx.fillStyle = 'white';
        ctx.fillText('Universal Tuya Zigbee', width / 2, height * 0.58);

        // Sous-titre
        const subtitleSize = Math.floor(height * 0.045);
        ctx.font = `${subtitleSize}px Arial, sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillText('Local Zigbee Control for 10,000+ Devices', width / 2, height * 0.68);

        // Badges features
        const badgeY = height * 0.78;
        const badgeSpacing = width / 4;
        const badges = ['📡 163 Drivers', '🏠 Local Only', '⚡ No Cloud'];
        
        badges.forEach((badge, index) => {
            const x = width / 2 - badgeSpacing + (index * badgeSpacing);
            const badgeSize = Math.floor(height * 0.032);
            
            // Badge background (rounded rectangle manual)
            const badgeWidth = Math.floor(width * 0.22);
            const badgeHeight = Math.floor(height * 0.055);
            const radius = badgeHeight / 2;
            const bx = x - badgeWidth / 2;
            const by = badgeY - badgeHeight / 2;
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.beginPath();
            ctx.moveTo(bx + radius, by);
            ctx.lineTo(bx + badgeWidth - radius, by);
            ctx.quadraticCurveTo(bx + badgeWidth, by, bx + badgeWidth, by + radius);
            ctx.lineTo(bx + badgeWidth, by + badgeHeight - radius);
            ctx.quadraticCurveTo(bx + badgeWidth, by + badgeHeight, bx + badgeWidth - radius, by + badgeHeight);
            ctx.lineTo(bx + radius, by + badgeHeight);
            ctx.quadraticCurveTo(bx, by + badgeHeight, bx, by + badgeHeight - radius);
            ctx.lineTo(bx, by + radius);
            ctx.quadraticCurveTo(bx, by, bx + radius, by);
            ctx.closePath();
            ctx.fill();
            
            // Badge text
            ctx.font = `${badgeSize}px Arial, sans-serif`;
            ctx.fillStyle = 'white';
            ctx.fillText(badge, x, badgeY + badgeSize * 0.1);
        });

        // Version badge en bas
        const versionSize = Math.floor(height * 0.035);
        ctx.font = `${versionSize}px Arial, sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText('v2.0.0 • SDK3 • Homey Pro', width / 2, height * 0.92);

        return canvas;
    }

    async generateImages() {
        this.log('🎨 APP IMAGE GENERATOR - Professional Presentation', '🚀');

        const sizes = {
            small: [250, 175],
            large: [500, 350],
            xlarge: [1000, 700]
        };

        try {
            for (const [sizeName, [width, height]] of Object.entries(sizes)) {
                this.log(`Generating ${sizeName}.png (${width}x${height})...`, '🖼️');
                
                const canvas = this.createAppImage(width, height, sizeName);
                const buffer = canvas.toBuffer('image/png');
                
                const outputPath = path.join(this.projectRoot, 'assets', `${sizeName}.png`);
                await fs.ensureDir(path.dirname(outputPath));
                await fs.writeFile(outputPath, buffer);
                
                this.log(`✅ ${sizeName}.png created (${Math.round(buffer.length / 1024)}KB)`, '✅');
            }

            // Créer aussi les images pour assets/images/
            for (const [sizeName, [width, height]] of Object.entries(sizes)) {
                if (sizeName !== 'xlarge') {
                    const canvas = this.createAppImage(width, height, sizeName);
                    const buffer = canvas.toBuffer('image/png');
                    
                    const outputPath = path.join(this.projectRoot, 'assets', 'images', `${sizeName}.png`);
                    await fs.ensureDir(path.dirname(outputPath));
                    await fs.writeFile(outputPath, buffer);
                }
            }

            this.log('', '');
            this.log('🎉 ALL APP IMAGES GENERATED!', '🎉');
            this.log('Style: Modern professional presentation', 'ℹ️');
            this.log('', '');
            this.log('Generated:', '📊');
            this.log('  • assets/small.png (250x175)', '  ');
            this.log('  • assets/large.png (500x350)', '  ');
            this.log('  • assets/xlarge.png (1000x700)', '  ');
            this.log('  • assets/images/small.png', '  ');
            this.log('  • assets/images/large.png', '  ');

            return true;

        } catch (error) {
            this.log(`Error: ${error.message}`, '❌');
            throw error;
        }
    }
}

// Execute
if (require.main === module) {
    const generator = new AppImageGenerator();
    generator.generateImages()
        .then(success => {
            console.log('');
            console.log('✅ Success! App images are ready for Homey App Store');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Failed:', error);
            process.exit(1);
        });
}

module.exports = AppImageGenerator;
