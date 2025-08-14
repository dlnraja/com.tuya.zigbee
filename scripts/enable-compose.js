#!/usr/bin/env node

/**
 * 🔧 ACTIVATION DE COMPOSE
 * 
 * Active la fonctionnalité compose dans app.json
 */

const fs = require('fs-extra');
const path = require('path');

async function enableCompose() {
    try {
        console.log('🔧 ACTIVATION DE COMPOSE');
        console.log('=' .repeat(50));
        
        const appJsonPath = path.join(process.cwd(), 'app.json');
        
        if (!(await fs.pathExists(appJsonPath))) {
            throw new Error('app.json non trouvé !');
        }
        
        // Lire app.json
        const appJson = await fs.readJson(appJsonPath);
        
        // Vérifier si compose est déjà activé
        if (appJson.compose && appJson.compose.enable === true) {
            console.log('✅ Compose est déjà activé dans app.json');
            return;
        }
        
        // Activer compose
        if (!appJson.compose) {
            appJson.compose = {};
        }
        appJson.compose.enable = true;
        
        // Vérifier SDK3
        if (appJson.sdk !== 3) {
            appJson.sdk = 3;
            console.log('✅ SDK3 activé');
        }
        
        // Sauvegarder
        await fs.writeJson(appJsonPath, appJson, { spaces: 2 });
        
        console.log('✅ Compose activé avec succès !');
        console.log('✅ app.json mis à jour');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        process.exit(1);
    }
}

// Exécuter
if (require.main === module) {
    enableCompose().catch(console.error);
}
