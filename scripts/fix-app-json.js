#!/usr/bin/env node

/**
 * Fix App JSON - Tuya Zigbee
 * Script pour corriger le fichier app.json
 * 
 * @author dlnraja / [redacted-email]
 * @version 1.0.12-20250729-1700
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    version: "1.0.12-20250729-1700",
    logFile: "./logs/fix-app-json.log"
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

// Fonction pour corriger app.json
function fixAppJson() {
    log("🔧 === CORRECTION APP.JSON ===");
    
    const appJsonPath = "./app.json";
    let appData = {};
    
    // Lire le fichier existant s'il existe
    if (fs.existsSync(appJsonPath)) {
        try {
            appData = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
            log("✅ Fichier app.json existant lu");
        } catch (error) {
            log(`❌ Erreur parsing app.json existant: ${error.message}`, "ERROR");
            appData = {};
        }
    }
    
    // Structure complète app.json
    const fixedAppJson = {
        id: appData.id || "com.tuya.zigbee",
        version: appData.version || "1.0.0",
        name: appData.name || "Tuya Zigbee",
        category: appData.category || "lighting",
        permissions: [
            "homey:app:com.tuya.zigbee",
            "homey:manager:api",
            "homey:manager:devices",
            "homey:manager:drivers"
        ],
        images: appData.images || {
            small: "/assets/icon-small.svg",
            large: "/assets/icon-large.svg"
        },
        author: appData.author || {
            name: "dlnraja",
            email: "[redacted-email]"
        },
        support: appData.support || "mailto:[redacted-email]",
        api: appData.api || {
            min: 3,
            max: 3
        },
        sdk: appData.sdk || 3,
        platform: appData.platform || "local",
        flow: appData.flow || {
            actions: [],
            conditions: [],
            triggers: []
        },
        devices: appData.devices || [],
        drivers: appData.drivers || []
    };
    
    // Sauvegarder le fichier corrigé
    try {
        fs.writeFileSync(appJsonPath, JSON.stringify(fixedAppJson, null, 2));
        log("✅ app.json corrigé avec succès");
        log(`📋 Permissions ajoutées: ${fixedAppJson.permissions.length}`);
        return true;
    } catch (error) {
        log(`❌ Erreur sauvegarde app.json: ${error.message}`, "ERROR");
        return false;
    }
}

// Fonction pour valider app.json
function validateAppJson() {
    log("🔍 === VALIDATION APP.JSON ===");
    
    const appJsonPath = "./app.json";
    if (!fs.existsSync(appJsonPath)) {
        log("❌ app.json manquant", "ERROR");
        return false;
    }
    
    try {
        const appData = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
        
        // Vérifier les champs requis
        const requiredFields = ['id', 'version', 'name', 'category', 'permissions'];
        let allValid = true;
        
        for (const field of requiredFields) {
            if (!appData[field]) {
                log(`❌ Champ requis manquant: ${field}`, "ERROR");
                allValid = false;
            }
        }
        
        if (allValid) {
            log("✅ app.json valide");
            log(`📊 Champs présents: ${Object.keys(appData).length}`);
            log(`🔐 Permissions: ${appData.permissions ? appData.permissions.length : 0}`);
        }
        
        return allValid;
    } catch (error) {
        log(`❌ Erreur parsing app.json: ${error.message}`, "ERROR");
        return false;
    }
}

// Fonction principale
function main() {
    log("🚀 === DÉMARRAGE CORRECTION APP.JSON ===");
    
    try {
        // 1. Corriger app.json
        const fixed = fixAppJson();
        
        // 2. Valider app.json
        const validated = validateAppJson();
        
        if (fixed && validated) {
            log("🎉 Correction app.json terminée avec succès");
            process.exit(0);
        } else {
            log("❌ Échec correction app.json", "ERROR");
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
    fixAppJson: main,
    fixAppJson,
    validateAppJson
}; 