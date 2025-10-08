#!/usr/bin/env node

/**
 * 🔧 CORRECTEUR SPÉCIFIQUE - Images des drivers dans app.json
 * Résout le problème "Filepath does not exist: small.png"
 * 
 * Le problème : app.json contient des drivers embarqués avec des chemins d'images
 * relatifs qui sont interprétés par Homey comme étant relatifs à la racine de l'app
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTEUR SPÉCIFIQUE - Images des drivers dans app.json');
console.log('==========================================================');

const appJsonPath = 'app.json';
const backupPath = 'backup/app-json-driver-images-fix';

// Fonctions utilitaires
function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
        info: '\x1b[36m',    // Cyan
        success: '\x1b[32m', // Green
        warning: '\x1b[33m', // Yellow
        error: '\x1b[31m',   // Red
        reset: '\x1b[0m'     // Reset
    };
    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
}

function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        log(`📁 Dossier créé: ${dirPath}`, 'success');
    }
}

function backupFile(filePath) {
    if (fs.existsSync(filePath)) {
        ensureDirectoryExists(backupPath);
        const backupFilePath = path.join(backupPath, path.basename(filePath));
        fs.copyFileSync(filePath, backupFilePath);
        log(`💾 Sauvegarde créée: ${backupFilePath}`, 'success');
    }
}

// Fonction principale de correction
function fixDriverImagesInAppJson() {
    try {
        log('🔍 Lecture de app.json...', 'info');
        
        if (!fs.existsSync(appJsonPath)) {
            log('❌ app.json non trouvé', 'error');
            return false;
        }
        
        // Sauvegarde
        backupFile(appJsonPath);
        
        // Lecture et parsing
        const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
        let updated = false;
        let driversFixed = 0;
        
        log('🔍 Analyse des drivers embarqués...', 'info');
        
        if (appJson.drivers && Array.isArray(appJson.drivers)) {
            appJson.drivers.forEach((driver, index) => {
                if (driver.images) {
                    let driverUpdated = false;
                    
                    // Correction des chemins d'images
                    if (driver.images.small === 'small.png') {
                        // Le problème : Homey cherche small.png à la racine
                        // Solution : utiliser le chemin complet du driver
                        const driverId = driver.id || `driver-${index}`;
                        driver.images.small = `drivers/${driverId}/small.png`;
                        log(`✅ Driver ${driverId}: small.png → drivers/${driverId}/small.png`, 'success');
                        driverUpdated = true;
                    }
                    
                    if (driver.images.large === 'large.png') {
                        const driverId = driver.id || `driver-${index}`;
                        driver.images.large = `drivers/${driverId}/large.png`;
                        log(`✅ Driver ${driverId}: large.png → drivers/${driverId}/large.png`, 'success');
                        driverUpdated = true;
                    }
                    
                    if (driverUpdated) {
                        updated = true;
                        driversFixed++;
                    }
                }
            });
        }
        
        // Sauvegarde des modifications
        if (updated) {
            fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
            log(`✅ app.json corrigé et sauvegardé`, 'success');
            log(`📊 Drivers corrigés: ${driversFixed}`, 'success');
        } else {
            log('⚠️  Aucune correction nécessaire', 'warning');
        }
        
        return true;
        
    } catch (error) {
        log(`❌ Erreur correction: ${error.message}`, 'error');
        return false;
    }
}

// Vérification de la structure finale
function verifyFinalStructure() {
    log('🔍 Vérification de la structure finale...', 'info');
    
    try {
        const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
        const errors = [];
        const warnings = [];
        
        if (appJson.drivers && Array.isArray(appJson.drivers)) {
            appJson.drivers.forEach((driver, index) => {
                if (driver.images) {
                    const driverId = driver.id || `driver-${index}`;
                    
                    // Vérifier image small
                    if (driver.images.small) {
                        const expectedPath = `drivers/${driverId}/small.png`;
                        if (driver.images.small !== expectedPath) {
                            warnings.push(`Driver ${driverId}: chemin small incorrect`);
                        }
                        
                        // Vérifier que l'image existe
                        const imagePath = path.join('drivers', driverId, 'small.png');
                        if (!fs.existsSync(imagePath)) {
                            errors.push(`Driver ${driverId}: image small manquante (${imagePath})`);
                        }
                    }
                    
                    // Vérifier image large
                    if (driver.images.large) {
                        const expectedPath = `drivers/${driverId}/large.png`;
                        if (driver.images.large !== expectedPath) {
                            warnings.push(`Driver ${driverId}: chemin large incorrect`);
                        }
                        
                        // Vérifier que l'image existe
                        const imagePath = path.join('drivers', driverId, 'large.png');
                        if (!fs.existsSync(imagePath)) {
                            errors.push(`Driver ${driverId}: image large manquante (${imagePath})`);
                        }
                    }
                }
            });
        }
        
        // Rapport de vérification
        console.log('\n📊 RAPPORT DE VÉRIFICATION');
        console.log('============================');
        
        if (errors.length > 0) {
            console.log(`\n❌ ERREURS CRITIQUES (${errors.length}):`);
            errors.forEach(error => console.log(`  - ${error}`));
        }
        
        if (warnings.length > 0) {
            console.log(`\n⚠️  AVERTISSEMENTS (${warnings.length}):`);
            warnings.forEach(warning => console.log(`  - ${warning}`));
        }
        
        if (errors.length === 0) {
            console.log('\n🎉 VÉRIFICATION TERMINÉE AVEC SUCCÈS !');
            console.log('Tous les chemins d\'images sont corrects !');
        } else {
            console.log('\n⚠️  Vérification terminée avec des erreurs critiques');
        }
        
        return { errors, warnings };
        
    } catch (error) {
        log(`❌ Erreur vérification: ${error.message}`, 'error');
        return { errors: [error.message], warnings: [] };
    }
}

// Fonction principale
async function main() {
    try {
        log('🚀 DÉMARRAGE DE LA CORRECTION SPÉCIFIQUE', 'info');
        
        // 1. Correction des images des drivers dans app.json
        const correctionSuccess = fixDriverImagesInAppJson();
        if (!correctionSuccess) {
            log('❌ Échec de la correction', 'error');
            return false;
        }
        
        // 2. Vérification de la structure finale
        const verification = verifyFinalStructure();
        
        // 3. Rapport final
        console.log('\n📊 RAPPORT FINAL DE CORRECTION');
        console.log('================================');
        console.log(`Correction app.json: ${correctionSuccess ? 'SUCCÈS' : 'ÉCHEC'}`);
        console.log(`Erreurs critiques: ${verification.errors.length}`);
        console.log(`Avertissements: ${verification.warnings.length}`);
        
        if (verification.errors.length === 0) {
            console.log('\n🎉 CORRECTION SPÉCIFIQUE TERMINÉE AVEC SUCCÈS !');
            console.log('Le problème "Filepath does not exist: small.png" est résolu !');
            return true;
        } else {
            console.log('\n⚠️  Correction terminée avec des erreurs critiques');
            return false;
        }
        
    } catch (error) {
        log(`❌ Erreur fatale: ${error.message}`, 'error');
        return false;
    }
}

// Exécution
if (require.main === module) {
    main().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { main, fixDriverImagesInAppJson, verifyFinalStructure };
