#!/usr/bin/env node
'use strict';

/**
 * FIX ALL IMAGES - REMOVE "TUYA ZIGBEE" TEXT
 * 
 * Issues:
 * - SVG files contain "Tuya Zigbee" text that must be removed
 * - Category badges (LIGHTING, MOTION, etc.) are OK to keep
 * - Need clean, professional images without branding
 */

const fs = require('fs-extra');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🎨 FIXING ALL IMAGES - REMOVING TEXT');
console.log('═'.repeat(60));

// ============================================================================
// STEP 1: FIX ALL SVG FILES
// ============================================================================

async function fixAllSvgFiles() {
    console.log('\n📝 STEP 1: Fixing SVG files...');
    
    const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => 
        fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory()
    );
    
    let fixedCount = 0;
    
    for (const driver of drivers) {
        const assetsDir = path.join(DRIVERS_DIR, driver, 'assets');
        
        if (!fs.existsSync(assetsDir)) continue;
        
        // Fix all SVG files in this driver
        const svgFiles = ['icon.svg', 'small.svg', 'large.svg'];
        
        for (const svgFile of svgFiles) {
            const svgPath = path.join(assetsDir, svgFile);
            
            if (!fs.existsSync(svgPath)) continue;
            
            let content = fs.readFileSync(svgPath, 'utf8');
            
            // Check if it contains "Tuya Zigbee" text
            if (content.includes('Tuya Zigbee') || content.includes('tuya zigbee')) {
                // Remove the entire <text> element containing "Tuya Zigbee"
                // Match: <text ... >Tuya Zigbee</text>
                content = content.replace(
                    /<text[^>]*>[\s]*(?:Tuya|tuya)[\s]+(?:Zigbee|zigbee)[\s]*<\/text>/gi,
                    ''
                );
                
                // Also remove any standalone "Tuya Zigbee" text nodes
                content = content.replace(/Tuya Zigbee/gi, '');
                content = content.replace(/tuya zigbee/gi, '');
                
                // Clean up any empty lines or extra whitespace
                content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
                
                fs.writeFileSync(svgPath, content, 'utf8');
                fixedCount++;
                console.log(`  ✅ Fixed: ${driver}/${svgFile}`);
            }
        }
    }
    
    console.log(`  ✨ Fixed ${fixedCount} SVG files`);
    return fixedCount;
}

// ============================================================================
// STEP 2: REGENERATE PNG FILES FROM CORRECTED SVG
// ============================================================================

async function regeneratePngFromSvg() {
    console.log('\n🖼️  STEP 2: Regenerating PNG files from SVG...');
    
    const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => 
        fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory()
    );
    
    let regeneratedCount = 0;
    
    for (const driver of drivers) {
        const assetsDir = path.join(DRIVERS_DIR, driver, 'assets');
        
        if (!fs.existsSync(assetsDir)) continue;
        
        // Convert SVG to PNG for small and large
        const conversions = [
            { svg: 'small.svg', png: 'small.png', width: 75, height: 75 },
            { svg: 'large.svg', png: 'large.png', width: 500, height: 500 }
        ];
        
        for (const conv of conversions) {
            const svgPath = path.join(assetsDir, conv.svg);
            const pngPath = path.join(assetsDir, conv.png);
            
            if (!fs.existsSync(svgPath)) continue;
            
            try {
                // Read SVG content
                const svgContent = fs.readFileSync(svgPath, 'utf8');
                
                // Create canvas
                const canvas = createCanvas(conv.width, conv.height);
                const ctx = canvas.getContext('2d');
                
                // For now, we'll use a simple approach: 
                // Extract gradient colors and icon from SVG
                
                // Parse gradient colors
                let color1 = '#2196F3';
                let color2 = '#1976D2';
                
                if (svgContent.includes('FFD700')) {
                    // Lighting
                    color1 = '#FFC107';
                    color2 = '#FFA000';
                } else if (svgContent.includes('4CAF50')) {
                    // Switch
                    color1 = '#4CAF50';
                    color2 = '#388E3C';
                } else if (svgContent.includes('F44336')) {
                    // Safety
                    color1 = '#F44336';
                    color2 = '#D32F2F';
                } else if (svgContent.includes('00BCD4')) {
                    // Climate
                    color1 = '#00BCD4';
                    color2 = '#0097A7';
                } else if (svgContent.includes('9C27B0')) {
                    // Energy
                    color1 = '#9C27B0';
                    color2 = '#7B1FA2';
                } else if (svgContent.includes('607D8B')) {
                    // Button
                    color1 = '#607D8B';
                    color2 = '#455A64';
                } else if (svgContent.includes('FF9800')) {
                    // Sensor
                    color1 = '#FF9800';
                    color2 = '#F57C00';
                }
                
                // Extract icon/emoji
                const iconMatch = svgContent.match(/>([💡🔌👁️🚨❄️⚡🔘🌡️🪟🚪🔔🎛️])<\/text>/);
                const icon = iconMatch ? iconMatch[1] : '💡';
                
                // Draw gradient background
                const gradient = ctx.createLinearGradient(0, 0, conv.width, conv.height);
                gradient.addColorStop(0, color1);
                gradient.addColorStop(1, color2);
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, conv.width, conv.height);
                
                // Draw icon
                ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                ctx.font = `bold ${conv.width === 75 ? 40 : 280}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(icon, conv.width / 2, conv.height / 2.2);
                
                // Draw category badge (extract from SVG)
                const categoryMatch = svgContent.match(/>([A-Z]+)<\/text>/);
                if (categoryMatch && categoryMatch[1] !== 'TUYA' && categoryMatch[1] !== 'ZIGBEE') {
                    const category = categoryMatch[1];
                    
                    // Badge background
                    const badgeY = conv.height * 0.78;
                    const badgeWidth = conv.width * 0.6;
                    const badgeHeight = conv.height * 0.1;
                    const badgeX = (conv.width - badgeWidth) / 2;
                    
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                    ctx.beginPath();
                    ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, badgeHeight / 2);
                    ctx.fill();
                    
                    // Badge text
                    ctx.fillStyle = color1;
                    ctx.font = `bold ${conv.width === 75 ? 10 : 22}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(category, conv.width / 2, badgeY + badgeHeight / 2);
                }
                
                // Save PNG
                const buffer = canvas.toBuffer('image/png');
                fs.writeFileSync(pngPath, buffer);
                
                regeneratedCount++;
                
            } catch (error) {
                console.log(`  ⚠️  Failed to convert ${driver}/${conv.svg}: ${error.message}`);
            }
        }
    }
    
    console.log(`  ✨ Regenerated ${regeneratedCount} PNG files`);
    return regeneratedCount;
}

// ============================================================================
// STEP 3: CLEAN PNG FILES DIRECTLY (IF NO SVG)
// ============================================================================

async function cleanPngFilesDirectly() {
    console.log('\n🧹 STEP 3: Cleaning PNG files that have no SVG source...');
    
    const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => 
        fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory()
    );
    
    let cleanedCount = 0;
    
    for (const driver of drivers) {
        const assetsDir = path.join(DRIVERS_DIR, driver, 'assets');
        
        if (!fs.existsSync(assetsDir)) continue;
        
        // Check for PNG files without corresponding SVG
        const pngFiles = ['small.png', 'large.png'];
        
        for (const pngFile of pngFiles) {
            const pngPath = path.join(assetsDir, pngFile);
            const svgPath = pngPath.replace('.png', '.svg');
            
            // If PNG exists but SVG doesn't, regenerate PNG from scratch
            if (fs.existsSync(pngPath) && !fs.existsSync(svgPath)) {
                const size = pngFile === 'small.png' ? 75 : 500;
                
                // Determine category from driver name
                let category = 'sensor';
                let color1 = '#FF9800';
                let color2 = '#F57C00';
                let icon = '🌡️';
                
                if (driver.includes('motion') || driver.includes('radar') || driver.includes('pir')) {
                    category = 'motion';
                    color1 = '#2196F3';
                    color2 = '#1976D2';
                    icon = '👁️';
                } else if (driver.includes('switch') || driver.includes('plug') || driver.includes('outlet')) {
                    category = 'switch';
                    color1 = '#4CAF50';
                    color2 = '#388E3C';
                    icon = '🔌';
                } else if (driver.includes('light') || driver.includes('bulb') || driver.includes('led') || driver.includes('dimmer')) {
                    category = 'light';
                    color1 = '#FFC107';
                    color2 = '#FFA000';
                    icon = '💡';
                } else if (driver.includes('smoke') || driver.includes('alarm') || driver.includes('sos') || driver.includes('co_')) {
                    category = 'safety';
                    color1 = '#F44336';
                    color2 = '#D32F2F';
                    icon = '🚨';
                } else if (driver.includes('temp') || driver.includes('humid') || driver.includes('climate')) {
                    category = 'climate';
                    color1 = '#00BCD4';
                    color2 = '#0097A7';
                    icon = '❄️';
                } else if (driver.includes('button') || driver.includes('wireless')) {
                    category = 'button';
                    color1 = '#607D8B';
                    color2 = '#455A64';
                    icon = '🔘';
                } else if (driver.includes('energy') || driver.includes('power')) {
                    category = 'energy';
                    color1 = '#9C27B0';
                    color2 = '#7B1FA2';
                    icon = '⚡';
                }
                
                // Create clean PNG without text
                const canvas = createCanvas(size, size);
                const ctx = canvas.getContext('2d');
                
                // Gradient background
                const gradient = ctx.createLinearGradient(0, 0, size, size);
                gradient.addColorStop(0, color1);
                gradient.addColorStop(1, color2);
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, size, size);
                
                // Icon
                ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                ctx.font = `bold ${size === 75 ? 40 : 280}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(icon, size / 2, size / 2.2);
                
                // NO TEXT - just clean icon
                
                // Save
                const buffer = canvas.toBuffer('image/png');
                fs.writeFileSync(pngPath, buffer);
                
                cleanedCount++;
                console.log(`  ✅ Cleaned: ${driver}/${pngFile}`);
            }
        }
    }
    
    console.log(`  ✨ Cleaned ${cleanedCount} PNG files`);
    return cleanedCount;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
    try {
        const svgFixed = await fixAllSvgFiles();
        const pngRegenerated = await regeneratePngFromSvg();
        const pngCleaned = await cleanPngFilesDirectly();
        
        console.log('\n' + '═'.repeat(60));
        console.log('✅ IMAGE CLEANUP COMPLETE');
        console.log('═'.repeat(60));
        console.log('\n📊 SUMMARY:');
        console.log(`  - SVG files fixed: ${svgFixed}`);
        console.log(`  - PNG files regenerated: ${pngRegenerated}`);
        console.log(`  - PNG files cleaned: ${pngCleaned}`);
        console.log(`  - Total images processed: ${svgFixed + pngRegenerated + pngCleaned}`);
        console.log('\n✨ All images now clean (no "Tuya Zigbee" text)');
        console.log('   Category badges retained (LIGHTING, MOTION, etc.)');
        
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

main();
