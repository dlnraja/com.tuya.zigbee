#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 CORRECTION PROPRIÉTÉ CATEGORY MANQUANTE');

// Lire app.json
const appJsonPath = './app.json';
if (!fs.existsSync(appJsonPath)) {
    console.log('❌ app.json non trouvé');
    process.exit(1);
}

try {
    const content = fs.readFileSync(appJsonPath, 'utf8');
    const appConfig = JSON.parse(content);
    
    // Ajouter la propriété category si elle manque
    if (!appConfig.category) {
        appConfig.category = ["appliances"];
        console.log('✅ Propriété category ajoutée: ["appliances"]');
    } else {
        console.log('✅ Propriété category déjà présente');
    }
    
    // Sauvegarder
    fs.writeFileSync(appJsonPath, JSON.stringify(appConfig, null, 2));
    console.log('✅ app.json mis à jour');
    
    // Vérifier la taille
    const stats = fs.statSync(appJsonPath);
    console.log(`📊 Taille: ${stats.size} bytes`);
    
} catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
    process.exit(1);
}

console.log('🎯 Correction terminée - Prêt pour validation Homey');
