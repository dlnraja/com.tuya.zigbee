#!/usr/bin/env node

const fs = require('fs');

console.log('🔍 DIAGNOSTIC APP.JSON - PROPRIÉTÉ CATEGORY');

// Lire app.json
const appJsonPath = './app.json';
if (!fs.existsSync(appJsonPath)) {
    console.log('❌ app.json non trouvé');
    process.exit(1);
}

try {
    const content = fs.readFileSync(appJsonPath, 'utf8');
    console.log(`📊 Taille du fichier: ${content.length} bytes`);
    
    // Vérifier le début du fichier
    console.log('\n📋 DÉBUT DU FICHIER (premières 200 caractères):');
    console.log(content.substring(0, 200));
    
    // Vérifier la fin du fichier
    console.log('\n📋 FIN DU FICHIER (derniers 200 caractères):');
    console.log(content.substring(content.length - 200));
    
    // Parser JSON
    const appConfig = JSON.parse(content);
    console.log('\n✅ JSON valide');
    
    // Vérifier toutes les propriétés
    console.log('\n📋 PROPRIÉTÉS VÉRIFIÉES:');
    console.log(`   - id: ${appConfig.id ? '✅' : '❌'}`);
    console.log(`   - version: ${appConfig.version ? '✅' : '❌'}`);
    console.log(`   - compatibility: ${appConfig.compatibility ? '✅' : '❌'}`);
    console.log(`   - category: ${appConfig.category ? '✅' : '❌'}`);
    console.log(`   - name: ${appConfig.name ? '✅' : '❌'}`);
    console.log(`   - author: ${appConfig.author ? '✅' : '❌'}`);
    console.log(`   - platforms: ${appConfig.platforms ? '✅' : '❌'}`);
    console.log(`   - drivers: ${appConfig.drivers ? `✅ (${appConfig.drivers.length})` : '❌'}`);
    
    // Vérifier la propriété category en détail
    if (appConfig.category) {
        console.log(`\n📋 CATEGORY DÉTAIL:`);
        console.log(`   - Type: ${typeof appConfig.category}`);
        console.log(`   - Valeur: ${JSON.stringify(appConfig.category)}`);
        console.log(`   - Array: ${Array.isArray(appConfig.category)}`);
        console.log(`   - Longueur: ${Array.isArray(appConfig.category) ? appConfig.category.length : 'N/A'}`);
    } else {
        console.log('\n❌ PROPRIÉTÉ CATEGORY MANQUANTE');
    }
    
    // Rechercher "category" dans le contenu brut
    const categoryIndex = content.indexOf('"category"');
    if (categoryIndex !== -1) {
        console.log(`\n📋 CATEGORY TROUVÉ À L'INDEX: ${categoryIndex}`);
        const categorySection = content.substring(categoryIndex, categoryIndex + 50);
        console.log(`   Section: ${categorySection}`);
    } else {
        console.log('\n❌ MOT "category" NON TROUVÉ DANS LE FICHIER');
    }
    
} catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
    process.exit(1);
}

console.log('\n🎯 Diagnostic terminé');
