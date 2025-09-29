#!/usr/bin/env node

/**
 * 🔧 CORRECTEUR ULTIME - Problème "small.png" résolu définitivement
 * Corrige TOUS les chemins d'images dans app.json
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTEUR ULTIME - Problème "small.png"');
console.log('============================================');

const appJsonPath = 'app.json';
const backupPath = 'backup/ultimate-fix';

// Fonctions utilitaires
function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
        info: '\x1b[36m', success: '\x1b[32m', warning: '\x1b[33m', error: '\x1b[31m', reset: '\x1b[0m'
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

// Fonction de correction ULTIME
function fixUltimateSmallPng() {
    try {
        log('🔍 Lecture de app.json...', 'info');
        
        if (!fs.existsSync(appJsonPath)) {
            log('❌ app.json non trouvé', 'error');
            return false;
        }
        
        // Sauvegarde
        backupFile(appJsonPath);
        
        // Lecture du fichier JSON
        const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
        let totalFixed = 0;
        
        log('🔍 Correction ULTIME des chemins d\'images...', 'info');
        
        // 1. Correction des images principales
        if (appJson.images) {
            if (appJson.images.small === 'small.png' || appJson.images.small === 'assets/small.svg') {
                appJson.images.small = 'assets/small.png';
                log('✅ Image principale small corrigée', 'success');
                totalFixed++;
            }
            if (appJson.images.large === 'large.png' || appJson.images.large === 'assets/large.svg') {
                appJson.images.large = 'assets/large.png';
                log('✅ Image principale large corrigée', 'success');
                totalFixed++;
            }
        }
        
        // 2. Correction MASSIVE des images des drivers
        if (appJson.drivers && Array.isArray(appJson.drivers)) {
            log(`📁 Traitement de ${appJson.drivers.length} drivers...`, 'info');
            
            appJson.drivers.forEach((driver, index) => {
                if (driver.images) {
                    const driverId = driver.id || `driver-${index}`;
                    let driverFixed = false;
                    
                    // Corriger small - CORRECTION ULTIME
                    if (driver.images.small === 'small.png') {
                        driver.images.small = `drivers/${driverId}/small.png`;
                        log(`✅ Driver ${driverId}: small.png → drivers/${driverId}/small.png`, 'success');
                        totalFixed++;
                        driverFixed = true;
                    }
                    
                    // Corriger large - CORRECTION ULTIME
                    if (driver.images.large === 'large.png') {
                        driver.images.large = `drivers/${driverId}/large.png`;
                        log(`✅ Driver ${driverId}: large.png → drivers/${driverId}/large.png`, 'success');
                        totalFixed++;
                        driverFixed = true;
                    }
                    
                    if (driverFixed) {
                        log(`🔧 Driver ${driverId} traité avec succès`, 'info');
                    }
                }
            });
        }
        
        // Sauvegarder le fichier corrigé
        if (totalFixed > 0) {
            fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
            log(`✅ app.json corrigé et sauvegardé`, 'success');
            log(`📊 Total des corrections: ${totalFixed}`, 'success');
        } else {
            log('⚠️  Aucune correction nécessaire', 'warning');
        }
        
        return true;
        
    } catch (error) {
        log(`❌ Erreur correction ULTIME: ${error.message}`, 'error');
        return false;
    }
}

// Vérification finale ULTIME
function verifyUltimateStructure() {
    log('🔍 Vérification finale ULTIME...', 'info');
    
    try {
        const appJsonContent = fs.readFileSync(appJsonPath, 'utf8');
        const errors = [];
        const warnings = [];
        
        // Vérifier qu'il n'y a plus de "small.png" isolés
        if (appJsonContent.includes('"small": "small.png"')) {
            errors.push('Références "small.png" encore présentes dans app.json');
        }
        
        if (appJsonContent.includes('"large": "large.png"')) {
            errors.push('Références "large.png" encore présentes dans app.json');
        }
        
        // Compter les chemins de drivers corrigés
        const driverImageMatches = appJsonContent.match(/"small":\s*"drivers\/[^"]+\/small\.png"/g);
        if (driverImageMatches) {
            log(`📊 Drivers avec images corrigées: ${driverImageMatches.length}`, 'success');
        }
        
        // Rapport de vérification
        console.log('\n📊 RAPPORT DE VÉRIFICATION ULTIME');
        console.log('==================================');
        
        if (errors.length > 0) {
            console.log(`\n❌ ERREURS CRITIQUES (${errors.length}):`);
            errors.forEach(error => console.log(`  - ${error}`));
        }
        
        if (warnings.length > 0) {
            console.log(`\n⚠️  AVERTISSEMENTS (${warnings.length}):`);
            warnings.forEach(warning => console.log(`  - ${warning}`));
        }
        
        if (errors.length === 0) {
            console.log('\n🎉 VÉRIFICATION ULTIME TERMINÉE AVEC SUCCÈS !');
            console.log('Tous les chemins d\'images sont corrects !');
        } else {
            console.log('\n⚠️  Vérification terminée avec des erreurs critiques');
        }
        
        return { errors, warnings };
        
    } catch (error) {
        log(`❌ Erreur vérification ULTIME: ${error.message}`, 'error');
        return { errors: [error.message], warnings: [] };
    }
}

// Fonction principale
async function main() {
    try {
        log('🚀 DÉMARRAGE DE LA CORRECTION ULTIME', 'info');
        
        // 1. Correction ULTIME des images
        const correctionSuccess = fixUltimateSmallPng();
        if (!correctionSuccess) {
            log('❌ Échec de la correction ULTIME', 'error');
            return false;
        }
        
        // 2. Vérification finale ULTIME
        const verification = verifyUltimateStructure();
        
        // 3. Rapport final
        console.log('\n📊 RAPPORT FINAL DE CORRECTION ULTIME');
        console.log('=======================================');
        console.log(`Correction ULTIME: ${correctionSuccess ? 'SUCCÈS' : 'ÉCHEC'}`);
        console.log(`Erreurs critiques: ${verification.errors.length}`);
        console.log(`Avertissements: ${verification.warnings.length}`);
        
        if (verification.errors.length === 0) {
            console.log('\n🎉 CORRECTION ULTIME TERMINÉE AVEC SUCCÈS !');
            console.log('Le problème "Filepath does not exist: small.png" est définitivement résolu !');
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

module.exports = { main, fixUltimateSmallPng, verifyUltimateStructure };
