#!/usr/bin/env node

/**
 * Fix Package JSON - Tuya Zigbee
 * Script pour corriger le fichier package.json
 * 
 * @author dlnraja / dylan.rajasekaram+homey@gmail.com
 * @version 1.0.12-20250729-1700
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    version: "1.0.12-20250729-1700",
    logFile: "./logs/fix-package-json.log"
};

// Fonction de logging
function log(message, level = "INFO") {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);
    
    const logDir = path.dirname(CONFIG.logFile);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(CONFIG.logFile, logMessage + "\n");
}

// Fonction pour corriger package.json
function fixPackageJson() {
    log("🔧 === CORRECTION PACKAGE.JSON ===");
    
    const packageJsonPath = "./package.json";
    let packageData = {};
    
    // Lire le fichier existant s'il existe
    if (fs.existsSync(packageJsonPath)) {
        try {
            const content = fs.readFileSync(packageJsonPath, 'utf8');
            // Nettoyer le contenu pour éviter les erreurs de parsing
            const cleanedContent = content.trim().replace(/^\s*/, '').replace(/\s*$/, '');
            packageData = JSON.parse(cleanedContent);
            log("✅ Fichier package.json existant lu");
        } catch (error) {
            log(`❌ Erreur parsing package.json existant: ${error.message}`, "ERROR");
            packageData = {};
        }
    }
    
    // Structure complète package.json
    const fixedPackageJson = {
        name: packageData.name || "com.tuya.zigbee",
        version: packageData.version || "1.0.0",
        description: packageData.description || "Tuya Zigbee Device App for Homey",
        main: packageData.main || "app.js",
        scripts: packageData.scripts || {
            "test": "echo \"Error: no test specified\" && exit 1"
        },
        keywords: packageData.keywords || [
            "homey",
            "tuya",
            "zigbee",
            "smart-home",
            "lighting"
        ],
        author: packageData.author || {
            name: "dlnraja",
            email: "dylan.rajasekaram+homey@gmail.com"
        },
        license: packageData.license || "MIT",
        repository: packageData.repository || {
            type: "git",
            url: "https://github.com/dlnraja/tuya-zigbee.git"
        },
        bugs: packageData.bugs || {
            url: "https://github.com/dlnraja/tuya-zigbee/issues"
        },
        homepage: packageData.homepage || "https://github.com/dlnraja/tuya-zigbee#readme",
        dependencies: packageData.dependencies || {},
        devDependencies: packageData.devDependencies || {},
        engines: packageData.engines || {
            node: ">=14.0.0"
        },
        os: packageData.os || ["linux", "darwin", "win32"],
        cpu: packageData.cpu || ["x64", "arm64"]
    };
    
    // Sauvegarder le fichier corrigé
    try {
        fs.writeFileSync(packageJsonPath, JSON.stringify(fixedPackageJson, null, 2));
        log("✅ package.json corrigé avec succès");
        log(`📦 Nom: ${fixedPackageJson.name}`);
        log(`📋 Version: ${fixedPackageJson.version}`);
        return true;
    } catch (error) {
        log(`❌ Erreur sauvegarde package.json: ${error.message}`, "ERROR");
        return false;
    }
}

// Fonction pour valider package.json
function validatePackageJson() {
    log("🔍 === VALIDATION PACKAGE.JSON ===");
    
    const packageJsonPath = "./package.json";
    if (!fs.existsSync(packageJsonPath)) {
        log("❌ package.json manquant", "ERROR");
        return false;
    }
    
    try {
        const content = fs.readFileSync(packageJsonPath, 'utf8');
        const packageData = JSON.parse(content);
        
        // Vérifier les champs requis
        const requiredFields = ['name', 'version', 'main'];
        let allValid = true;
        
        for (const field of requiredFields) {
            if (!packageData[field]) {
                log(`❌ Champ requis manquant: ${field}`, "ERROR");
                allValid = false;
            }
        }
        
        if (allValid) {
            log("✅ package.json valide");
            log(`📊 Champs présents: ${Object.keys(packageData).length}`);
            log(`📦 Nom: ${packageData.name}`);
            log(`📋 Version: ${packageData.version}`);
        }
        
        return allValid;
    } catch (error) {
        log(`❌ Erreur parsing package.json: ${error.message}`, "ERROR");
        return false;
    }
}

// Fonction pour installer les dépendances
function installDependencies() {
    log("📦 === INSTALLATION DÉPENDANCES ===");
    
    try {
        const { execSync } = require('child_process');
        
        // Vérifier si npm est disponible
        try {
            execSync('npm --version', { encoding: 'utf8' });
            log("✅ npm disponible");
        } catch (error) {
            log("❌ npm non disponible", "ERROR");
            return false;
        }
        
        // Installer les dépendances
        log("📦 Installation des dépendances...");
        execSync('npm install', { encoding: 'utf8', stdio: 'inherit' });
        log("✅ Dépendances installées avec succès");
        
        return true;
    } catch (error) {
        log(`❌ Erreur installation dépendances: ${error.message}`, "ERROR");
        return false;
    }
}

// Fonction principale
function main() {
    log("🚀 === DÉMARRAGE CORRECTION PACKAGE.JSON ===");
    
    try {
        // 1. Corriger package.json
        const fixed = fixPackageJson();
        
        // 2. Valider package.json
        const validated = validatePackageJson();
        
        // 3. Installer les dépendances
        const installed = installDependencies();
        
        if (fixed && validated && installed) {
            log("🎉 Correction package.json terminée avec succès");
            process.exit(0);
        } else {
            log("❌ Échec correction package.json", "ERROR");
            process.exit(1);
        }
        
    } catch (error) {
        log(`❌ Erreur critique: ${error.message}`, "ERROR");
        process.exit(1);
    }
}

// Exécution
if (require.main === module) {
    main();
}

module.exports = {
    fixPackageJson: main,
    fixPackageJson,
    validatePackageJson,
    installDependencies
}; 