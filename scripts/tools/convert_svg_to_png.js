const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

console.log('🔄 CONVERSION SVG → PNG\n');

// Convertir SVG en PNG
async function convertSvgToPng(svgPath, pngPath, size) {
    try {
        // Lire le SVG
        const svgContent = fs.readFileSync(svgPath, 'utf8');
        
        // Créer un canvas
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');
        
        // Convertir SVG en data URL
        const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
        
        // Charger et dessiner l'image
        const img = await loadImage(svgDataUrl);
        ctx.drawImage(img, 0, 0, size, size);
        
        // Sauvegarder en PNG
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(pngPath, buffer);
        
        return true;
    } catch (error) {
        console.error(`   ❌ ${path.basename(svgPath)}: ${error.message}`);
        return false;
    }
}

// Traiter tous les drivers
async function processAllDrivers() {
    const driversDir = path.join(process.cwd(), 'drivers');
    const drivers = fs.readdirSync(driversDir).filter(f => {
        return fs.statSync(path.join(driversDir, f)).isDirectory();
    });
    
    let processed = 0;
    let converted = 0;
    
    for (const driver of drivers) {
        const assetsPath = path.join(driversDir, driver, 'assets');
        
        if (!fs.existsSync(assetsPath)) {
            continue;
        }
        
        const smallSvg = path.join(assetsPath, 'small.svg');
        const largeSvg = path.join(assetsPath, 'large.svg');
        const smallPng = path.join(assetsPath, 'small.png');
        const largePng = path.join(assetsPath, 'large.png');
        
        try {
            // Convertir small.svg → small.png
            if (fs.existsSync(smallSvg)) {
                const success = await convertSvgToPng(smallSvg, smallPng, 75);
                if (success) converted++;
            }
            
            // Convertir large.svg → large.png
            if (fs.existsSync(largeSvg)) {
                const success = await convertSvgToPng(largeSvg, largePng, 500);
                if (success) converted++;
            }
            
            processed++;
            
            if (processed % 20 === 0) {
                console.log(`   ${processed}/${drivers.length} drivers...`);
            }
        } catch (error) {
            console.log(`   ⚠️ ${driver}: ${error.message}`);
        }
    }
    
    console.log(`\n✅ ${processed} drivers traités`);
    console.log(`✅ ${converted} PNG générés`);
    
    return { processed, converted };
}

// Exécution
console.log('================================================');
console.log('  CONVERSION SVG → PNG POUR COMPATIBILITÉ');
console.log('================================================\n');

(async () => {
    try {
        const { processed, converted } = await processAllDrivers();
        
        console.log('\n================================================');
        console.log('✅ TERMINÉ!');
        console.log(`   - ${processed} drivers traités`);
        console.log(`   - ${converted} PNG générés`);
        console.log('   - SVG + PNG disponibles');
        console.log('================================================\n');
        
    } catch (error) {
        console.error('\n❌ Erreur:', error.message);
        process.exit(1);
    }
})();
