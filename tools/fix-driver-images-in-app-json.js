#!/usr/bin/env node

/**
 * 🔧 CORRECTEUR DES IMAGES DES DRIVERS DANS APP.JSON
 * Corrige les chemins d'images des drivers pour qu'ils pointent vers les bons dossiers
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTEUR DES IMAGES DES DRIVERS DANS APP.JSON');
console.log('==================================================');

function fixDriverImagesInAppJson() {
    try {
        // Lire app.json
        const appJsonPath = 'app.json';
        if (!fs.existsSync(appJsonPath)) {
            console.log('❌ app.json non trouvé');
            return false;
        }

        const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
        let updated = false;

        // Corriger les images des drivers
        if (appJson.drivers && Array.isArray(appJson.drivers)) {
            console.log(`📁 Traitement de ${appJson.drivers.length} drivers...`);
            
            appJson.drivers.forEach((driver, index) => {
                if (driver.images) {
                    const driverId = driver.id;
                    
                    // Corriger le chemin small
                    if (driver.images.small === 'small.png') {
                        driver.images.small = `drivers/${driverId}/small.png`;
                        console.log(`✅ Driver ${driverId}: small.png → drivers/${driverId}/small.png`);
                        updated = true;
                    }
                    
                    // Corriger le chemin large
                    if (driver.images.large === 'large.png') {
                        driver.images.large = `drivers/${driverId}/large.png`;
                        console.log(`✅ Driver ${driverId}: large.png → drivers/${driverId}/large.png`);
                        updated = true;
                    }
                }
            });
        }

        // Sauvegarder si modifié
        if (updated) {
            // Créer une sauvegarde
            const backupPath = `app.json.backup.${Date.now()}`;
            fs.copyFileSync(appJsonPath, backupPath);
            console.log(`💾 Sauvegarde créée: ${backupPath}`);
            
            // Sauvegarder le fichier corrigé
            fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
            console.log('✅ app.json corrigé et sauvegardé');
        } else {
            console.log('⚠️  Aucune correction nécessaire');
        }

        return true;

    } catch (error) {
        console.log(`❌ Erreur: ${error.message}`);
        return false;
    }
}

// Exécution
if (require.main === module) {
    const success = fixDriverImagesInAppJson();
    process.exit(success ? 0 : 1);
}

module.exports = { fixDriverImagesInAppJson };
