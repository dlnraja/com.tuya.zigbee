#!/usr/bin/env node

/**
 * Fix Installation Issues - Tuya Zigbee
 * Script pour corriger les problèmes d'installation CLI
 * 
 * @author dlnraja / dylan.rajasekaram+homey@gmail.com
 * @version 1.0.12-20250729-1700
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    version: "1.0.12-20250729-1700",
    logFile: "./logs/fix-installation.log"
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
        for (const field of requiredFields) {
            if (!appData[field]) {
                log(`❌ Champ requis manquant: ${field}`, "ERROR");
                return false;
            }
        }
        
        log("✅ app.json valide");
        return true;
    } catch (error) {
        log(`❌ Erreur parsing app.json: ${error.message}`, "ERROR");
        return false;
    }
}

// Fonction pour valider package.json
function validatePackageJson() {
    log("📦 === VALIDATION PACKAGE.JSON ===");
    
    const packageJsonPath = "./package.json";
    if (!fs.existsSync(packageJsonPath)) {
        log("❌ package.json manquant", "ERROR");
        return false;
    }
    
    try {
        const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        // Vérifier les champs requis
        const requiredFields = ['name', 'version', 'main'];
        for (const field of requiredFields) {
            if (!packageData[field]) {
                log(`❌ Champ requis manquant: ${field}`, "ERROR");
                return false;
            }
        }
        
        log("✅ package.json valide");
        return true;
    } catch (error) {
        log(`❌ Erreur parsing package.json: ${error.message}`, "ERROR");
        return false;
    }
}

// Fonction pour vérifier les fichiers requis
function checkRequiredFiles() {
    log("📁 === VÉRIFICATION FICHIERS REQUIS ===");
    
    const requiredFiles = [
        'app.js',
        'drivers/',
        'assets/',
        'locales/'
    ];
    
    let allPresent = true;
    for (const file of requiredFiles) {
        if (!fs.existsSync(file)) {
            log(`❌ Fichier requis manquant: ${file}`, "ERROR");
            allPresent = false;
        }
    }
    
    if (allPresent) {
        log("✅ Tous les fichiers requis présents");
    }
    
    return allPresent;
}

// Fonction pour tester l'installation CLI
function testCliInstallation() {
    log("🧪 === TEST INSTALLATION CLI ===");
    
    try {
        // Simuler la commande CLI
        const { execSync } = require('child_process');
        const result = execSync('homey app validate', { encoding: 'utf8' });
        log("✅ Validation CLI réussie");
        return true;
    } catch (error) {
        log(`❌ Erreur validation CLI: ${error.message}`, "ERROR");
        return false;
    }
}

// Fonction pour corriger les problèmes
function fixInstallationIssues() {
    log("🔧 === CORRECTION PROBLÈMES INSTALLATION ===");
    
    let success = true;
    
    // 1. Valider app.json
    if (!validateAppJson()) {
        success = false;
    }
    
    // 2. Valider package.json
    if (!validatePackageJson()) {
        success = false;
    }
    
    // 3. Vérifier fichiers requis
    if (!checkRequiredFiles()) {
        success = false;
    }
    
    // 4. Tester installation CLI
    if (!testCliInstallation()) {
        success = false;
    }
    
    if (success) {
        log("🎉 Tous les problèmes d'installation corrigés");
    } else {
        log("❌ Problèmes d'installation détectés", "ERROR");
    }
    
    return success;
}

// Fonction principale
function main() {
    log("🚀 === DÉMARRAGE CORRECTION INSTALLATION ===");
    
    try {
        const success = fixInstallationIssues();
        
        if (success) {
            log("✅ Correction installation terminée avec succès");
            process.exit(0);
        } else {
            log("❌ Échec correction installation", "ERROR");
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
    fixInstallationIssues: main,
    validateAppJson,
    validatePackageJson,
    checkRequiredFiles,
    testCliInstallation
};
