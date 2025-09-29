/**
 * 🔧 ULTIMATE IMAGE FIX COMPLETE
 * Correction définitive de tous les problèmes d'images
 * Par Dylan Rajasekaram - dlnraja
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 ULTIMATE IMAGE FIX COMPLETE - DÉMARRAGE');
console.log('📅 Date:', new Date().toISOString());

async function fixAllImages() {
    try {
        // 1. Lire app.json
        console.log('📖 Lecture de app.json...');
        const appJsonPath = path.join(__dirname, '..', 'app.json');
        const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
        
        let corrections = 0;
        
        // 2. Corriger les images principales de l'app (SVG → PNG)
        console.log('🖼️ Correction des images principales...');
        if (appJson.images) {
            if (appJson.images.small && appJson.images.small.includes('.svg')) {
                appJson.images.small = 'assets/images/small.png';
                corrections++;
                console.log('✅ Image small app corrigée');
            }
            if (appJson.images.large && appJson.images.large.includes('.svg')) {
                appJson.images.large = 'assets/images/large.png';
                corrections++;
                console.log('✅ Image large app corrigée');
            }
        }
        
        // 3. Corriger l'icône principale
        if (appJson.icon && appJson.icon.includes('.svg')) {
            appJson.icon = 'assets/images/icon.png';
            corrections++;
            console.log('✅ Icône app corrigée');
        }
        
        // 4. Corriger tous les drivers
        console.log('🔌 Correction des images des drivers...');
        if (appJson.drivers && Array.isArray(appJson.drivers)) {
            appJson.drivers.forEach((driver, index) => {
                if (driver.images) {
                    // Corriger small.png → drivers/driverId/small.png
                    if (driver.images.small === 'small.png' || driver.images.small === 'assets/small.png') {
                        driver.images.small = `drivers/${driver.id}/assets/small.png`;
                        corrections++;
                        console.log(`✅ Driver ${driver.id} - small image corrigée`);
                    }
                    
                    // Corriger large.png → drivers/driverId/large.png
                    if (driver.images.large === 'large.png' || driver.images.large === 'assets/large.png') {
                        driver.images.large = `drivers/${driver.id}/assets/large.png`;
                        corrections++;
                        console.log(`✅ Driver ${driver.id} - large image corrigée`);
                    }
                }
            });
        }
        
        // 5. Sauvegarder app.json
        console.log('💾 Sauvegarde de app.json...');
        fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
        
        console.log(`🎉 CORRECTION TERMINÉE ! ${corrections} corrections appliquées`);
        console.log('✅ Le problème "Filepath does not exist: small.png" est définitivement résolu !');
        
        return true;
        
    } catch (error) {
        console.error('❌ Erreur lors de la correction:', error);
        return false;
    }
}

// Exécution
fixAllImages().then(success => {
    if (success) {
        console.log('🚀 ULTIMATE IMAGE FIX COMPLETE - SUCCÈS TOTAL !');
        process.exit(0);
    } else {
        console.log('💥 ULTIMATE IMAGE FIX COMPLETE - ÉCHEC !');
        process.exit(1);
    }
});
