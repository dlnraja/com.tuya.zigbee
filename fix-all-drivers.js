/**
 * 🔧 SCRIPT DE CORRECTION GLOBALE DES DRIVERS
 * Corrige tous les drivers manquants : generic, tuya_zigbee, zigbee
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION GLOBALE DES DRIVERS...');

// Liste des drivers à corriger
const driversToFix = [
    'drivers/generic/driver.compose.json',
    'drivers/tuya_zigbee/driver.compose.json',
    'drivers/zigbee/driver.compose.json'
];

driversToFix.forEach(driverPath => {
    if (fs.existsSync(driverPath)) {
        console.log(`\n📝 Correction de ${driverPath}...`);
        
        try {
            let content = fs.readFileSync(driverPath, 'utf8');
            let modified = false;
            
            // Ajouter endpoints si manquant
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
            
            // Changer modelId en productId si nécessaire
            if (content.includes('"modelId"')) {
                content = content.replace(/"modelId"/g, '"productId"');
                modified = true;
                console.log('  ✅ modelId changé en productId');
            }
            
            // Changer category en class si nécessaire
            if (content.includes('"category"')) {
                content = content.replace(/"category"/g, '"class"');
                modified = true;
                console.log('  ✅ category changé en class');
            }
            
            if (modified) {
                fs.writeFileSync(driverPath, content);
                console.log(`  🎯 ${driverPath} corrigé avec succès !`);
            } else {
                console.log(`  ℹ️  ${driverPath} était déjà correct`);
            }
            
        } catch (error) {
            console.error(`  ❌ Erreur lors de la correction de ${driverPath}:`, error.message);
        }
    } else {
        console.log(`  ❌ ${driverPath} non trouvé`);
    }
});

console.log('\n🎉 CORRECTION TERMINÉE !');
console.log('🚀 Relancez maintenant : homey app validate');
