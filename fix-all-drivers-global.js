/**
 * 🔧 SCRIPT DE CORRECTION GLOBALE DES DRIVERS
 * Corrige tous les problèmes identifiés dans les drivers
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION GLOBALE DES DRIVERS...');

// Fonction pour corriger un driver
function fixDriver(driverPath) {
    try {
        const driverDir = path.basename(driverPath);
        const composePath = path.join(driverPath, 'driver.compose.json');
        
        if (!fs.existsSync(composePath)) {
            console.log(`  ⚠️  ${driverDir}: driver.compose.json manquant`);
            return;
        }
        
        console.log(`\n📝 Correction de ${driverDir}...`);
        
        let content = fs.readFileSync(composePath, 'utf8');
        let modified = false;
        
        // 1. Corriger les chemins d'images
        if (content.includes('"small": "small.png"')) {
            content = content.replace(
                /"small": "small\.png"/g,
                `"small": "drivers/${driverDir}/small.png"`
            );
            modified = true;
            console.log('  ✅ Chemins d\'images corrigés');
        }
        
        if (content.includes('"large": "large.png"')) {
            content = content.replace(
                /"large": "large\.png"/g,
                `"large": "drivers/${driverDir}/large.png"`
            );
            modified = true;
            console.log('  ✅ Chemins d\'images corrigés');
        }
        
        // 2. Ajouter endpoints si manquant
        if (!content.includes('"endpoints"')) {
            content = content.replace(
                /"productId":\s*\[([^\]]+)\]/,
                `"productId": [$1],
    "endpoints": {
      "1": {
        "clusters": [0, 6]
      }
    }`
            );
            modified = true;
            console.log('  ✅ Endpoints ajoutés');
        }
        
        // 3. Changer modelId en productId si nécessaire
        if (content.includes('"modelId"')) {
            content = content.replace(/"modelId"/g, '"productId"');
            modified = true;
            console.log('  ✅ modelId changé en productId');
        }
        
        // 4. Changer category en class si nécessaire
        if (content.includes('"category"')) {
            content = content.replace(/"category"/g, '"class"');
            modified = true;
            console.log('  ✅ category changé en class');
        }
        
        // 5. Supprimer les métadonnées non standard
        if (content.includes('"metadata"')) {
            content = content.replace(/"metadata":\s*\{[^}]+\},?\s*/g, '');
            modified = true;
            console.log('  ✅ Métadonnées non standard supprimées');
        }
        
        // 6. Supprimer les flowCards non standard
        if (content.includes('"flowCards"')) {
            content = content.replace(/"flowCards":\s*\[[^\]]+\],?\s*/g, '');
            modified = true;
            console.log('  ✅ FlowCards non standard supprimés');
        }
        
        if (modified) {
            fs.writeFileSync(composePath, content);
            console.log(`  🎯 ${driverDir} corrigé avec succès !`);
        } else {
            console.log(`  ℹ️  ${driverDir} était déjà correct`);
        }
        
    } catch (error) {
        console.error(`  ❌ Erreur lors de la correction de ${driverPath}:`, error.message);
    }
}

// Fonction pour créer les images manquantes
function createMissingImages(driverPath) {
    try {
        const driverDir = path.basename(driverPath);
        const imagesDir = path.join(driverPath, 'assets', 'images');
        
        // Créer le dossier images s'il n'existe pas
        if (!fs.existsSync(imagesDir)) {
            fs.mkdirSync(imagesDir, { recursive: true });
        }
        
        // Copier les images depuis le dossier principal
        const sourceSmall = 'assets/images/small.png';
        const sourceLarge = 'assets/images/large.png';
        
        if (fs.existsSync(sourceSmall)) {
            fs.copyFileSync(sourceSmall, path.join(imagesDir, 'small.png'));
        }
        
        if (fs.existsSync(sourceLarge)) {
            fs.copyFileSync(sourceLarge, path.join(imagesDir, 'large.png'));
        }
        
        console.log(`  🖼️  Images créées pour ${driverDir}`);
        
    } catch (error) {
        console.error(`  ❌ Erreur lors de la création des images pour ${driverPath}:`, error.message);
    }
}

// Liste des drivers à corriger
const driversToFix = [
    'drivers/tuya-light-universal',
    'drivers/tuya-plug-universal',
    'drivers/tuya-sensor-universal',
    'drivers/tuya-remote-universal',
    'drivers/tuya-cover-universal',
    'drivers/tuya-climate-universal',
    'drivers/zigbee-tuya-universal',
    'drivers/lock-tuya-universal',
    'drivers/fan-tuya-universal'
];

// Correction de tous les drivers
driversToFix.forEach(driverPath => {
    if (fs.existsSync(driverPath)) {
        fixDriver(driverPath);
        createMissingImages(driverPath);
    } else {
        console.log(`  ❌ ${driverPath} non trouvé`);
    }
});

console.log('\n🎉 CORRECTION GLOBALE TERMINÉE !');
console.log('🚀 Relancez maintenant : homey app validate');
