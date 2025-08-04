#!/usr/bin/env node

/**
 * 🔧 CLI INSTALLATION SCRIPT
 * 📅 Date: 2025-08-04
 * 🎯 Mode: YOLO CLI INSTALLATION
 * 📦 Script d'installation CLI pour tuya-light
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class CLIIntallationScript {
    constructor() {
        this.projectRoot = process.cwd();
    }
    
    async installViaCLI() {
        console.log('🔧 INSTALLATION VIA CLI...');
        
        try {
            // 1. Validation de l'app
            console.log('📋 Validation de l'application...');
            execSync('npx homey app validate --level debug', { stdio: 'inherit' });
            
            // 2. Build de l'app
            console.log('🔨 Build de l'application...');
            execSync('npx homey app build', { stdio: 'inherit' });
            
            // 3. Installation sur Homey
            console.log('📦 Installation sur Homey...');
            execSync('npx homey app install', { stdio: 'inherit' });
            
            console.log('✅ Installation CLI terminée avec succès');
            
        } catch (error) {
            console.error('❌ Erreur installation CLI:', error.message);
            this.showTroubleshooting();
        }
    }
    
    showTroubleshooting() {
        console.log('\n🔧 TROUBLESHOOTING:');
        console.log('1. Vérifiez que Homey CLI est installé: npm install -g @homey/cli');
        console.log('2. Vérifiez la connexion à votre Homey: npx homey auth');
        console.log('3. Vérifiez les logs: npx homey app run --debug');
        console.log('4. Redémarrez votre Homey si nécessaire');
    }
}

// Exécution
const installer = new CLIIntallationScript();
installer.installViaCLI().catch(console.error);
