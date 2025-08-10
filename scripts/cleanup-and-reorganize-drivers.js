#!/usr/bin/env node

/**
 * Script de nettoyage et réorganisation complète des drivers
 * Utilise les sources .tmp* pour enrichir et corriger la structure
 * Auteur: dlnraja
 * Date: 2025-08-10
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Configuration
const VERBOSE = true;
const DRIVERS_DIR = path.join(process.cwd(), 'drivers');
const TMP_SOURCES_DIR = path.join(process.cwd(), '.tmp_tuya_zip_work');
const BACKUP_DIR = path.join(process.cwd(), `.backup-cleanup-${Date.now()}`);

// Fonction de logging
function log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅';
    console.log(`[${timestamp}] ${prefix} [CLEANUP] ${message}`);
}

// Fonction pour exécuter des commandes
function run(cmd, args, description) {
    if (VERBOSE) log(`🚀 Exécution: ${cmd} ${args.join(' ')} - ${description}`);
    
    const result = spawnSync(cmd, args, {
        stdio: 'inherit',
        timeout: 300000, // 5 minutes
        cwd: process.cwd()
    });
    
    if (result.status === 0) {
        if (VERBOSE) log(`✅ Succès: ${description}`);
        return true;
    } else {
        log(`❌ Échec: ${description} (code: ${result.status})`, 'error');
        if (result.error) {
            log(`💥 Erreur: ${result.error.message}`, 'error');
        }
        return false;
    }
}

// Fonction pour créer un backup
function createBackup() {
    log('📋 ÉTAPE 1: Création du backup');
    
    try {
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }
        
        // Copier le dossier drivers
        if (fs.existsSync(DRIVERS_DIR)) {
            run('xcopy', [DRIVERS_DIR, BACKUP_DIR, '/E', '/I', '/H', '/Y'], 'Backup des drivers');
        }
        
        log('✅ Backup créé dans: ' + BACKUP_DIR);
        return true;
    } catch (error) {
        log(`⚠️ Échec du backup: ${error.message}`, 'warn');
        return false;
    }
}

// Fonction pour analyser les sources .tmp*
function analyzeTmpSources() {
    log('📋 ÉTAPE 2: Analyse des sources .tmp*');
    
    if (!fs.existsSync(TMP_SOURCES_DIR)) {
        log('⚠️ Dossier .tmp_tuya_zip_work non trouvé', 'warn');
        return [];
    }
    
    try {
        const sources = [];
        const items = fs.readdirSync(TMP_SOURCES_DIR);
        
        for (const item of items) {
            const itemPath = path.join(TMP_SOURCES_DIR, item);
            const stats = fs.statSync(itemPath);
            
            if (stats.isDirectory()) {
                // Analyser le contenu du dossier
                const driverFiles = [];
                const walkDir = (dir) => {
                    const files = fs.readdirSync(dir);
                    for (const file of files) {
                        const filePath = path.join(dir, file);
                        const fileStats = fs.statSync(filePath);
                        
                        if (fileStats.isDirectory()) {
                            walkDir(filePath);
                        } else if (file === 'driver.compose.json' || file === 'driver.json') {
                            driverFiles.push({
                                path: filePath,
                                relativePath: path.relative(TMP_SOURCES_DIR, filePath),
                                name: path.basename(path.dirname(filePath))
                            });
                        }
                    }
                };
                
                walkDir(itemPath);
                
                sources.push({
                    name: item,
                    path: itemPath,
                    driverCount: driverFiles.length,
                    driverFiles: driverFiles
                });
                
                log(`📁 Source: ${item} (${driverFiles.length} drivers)`);
            }
        }
        
        log(`✅ ${sources.length} sources .tmp* analysées`);
        return sources;
    } catch (error) {
        log(`❌ Erreur lors de l'analyse des sources .tmp*: ${error.message}`, 'error');
        return [];
    }
}

// Fonction pour nettoyer les noms de dossiers étranges
function cleanStrangeFolderNames() {
    log('📋 ÉTAPE 3: Nettoyage des noms de dossiers étranges');
    
    try {
        const cleanFolder = (dirPath) => {
            if (!fs.existsSync(dirPath)) return;
            
            const items = fs.readdirSync(dirPath);
            for (const item of items) {
                const itemPath = path.join(dirPath, item);
                const stats = fs.statSync(itemPath);
                
                if (stats.isDirectory()) {
                    // Nettoyer les noms de dossiers
                    let cleanName = item;
                    
                    // Remplacer les caractères étranges
                    cleanName = cleanName.replace(/[^\w\s-]/g, '_');
                    cleanName = cleanName.replace(/\s+/g, '_');
                    cleanName = cleanName.replace(/_+/g, '_');
                    cleanName = cleanName.replace(/^_+|_+$/g, '');
                    
                    // Normaliser les noms spécifiques
                    if (cleanName.includes('tuya')) {
                        cleanName = cleanName.replace(/tuya/gi, 'tuya');
                    }
                    if (cleanName.includes('smart')) {
                        cleanName = cleanName.replace(/smart/gi, 'smart');
                    }
                    if (cleanName.includes('cover')) {
                        cleanName = cleanName.replace(/cover/gi, 'cover');
                    }
                    if (cleanName.includes('lock')) {
                        cleanName = cleanName.replace(/lock/gi, 'lock');
                    }
                    if (cleanName.includes('switch')) {
                        cleanName = cleanName.replace(/switch/gi, 'switch');
                    }
                    if (cleanName.includes('sensor')) {
                        cleanName = cleanName.replace(/sensor/gi, 'sensor');
                    }
                    if (cleanName.includes('plug')) {
                        cleanName = cleanName.replace(/plug/gi, 'plug');
                    }
                    if (cleanName.includes('light')) {
                        cleanName = cleanName.replace(/light/gi, 'light');
                    }
                    
                    // Si le nom a changé, renommer le dossier
                    if (cleanName !== item && cleanName.length > 0) {
                        const newPath = path.join(dirPath, cleanName);
                        
                        if (!fs.existsSync(newPath)) {
                            try {
                                fs.renameSync(itemPath, newPath);
                                log(`   🔄 Renommé: ${item} → ${cleanName}`);
                                cleanFolder(newPath); // Continuer avec le nouveau chemin
                            } catch (error) {
                                log(`   ⚠️ Impossible de renommer ${item}: ${error.message}`, 'warn');
                                cleanFolder(itemPath); // Continuer avec l'ancien chemin
                            }
                        } else {
                            log(`   ⚠️ Destination existe déjà: ${cleanName}`, 'warn');
                            cleanFolder(itemPath); // Continuer avec l'ancien chemin
                        }
                    } else {
                        cleanFolder(itemPath); // Continuer avec le chemin actuel
                    }
                }
            }
        };
        
        // Nettoyer drivers/tuya
        const tuyaPath = path.join(DRIVERS_DIR, 'tuya');
        if (fs.existsSync(tuyaPath)) {
            log('   🧹 Nettoyage de drivers/tuya');
            cleanFolder(tuyaPath);
        }
        
        log('✅ Noms de dossiers nettoyés');
        return true;
    } catch (error) {
        log(`❌ Erreur lors du nettoyage: ${error.message}`, 'error');
        return false;
    }
}

// Fonction pour réorganiser la structure
function reorganizeStructure() {
    log('📋 ÉTAPE 4: Réorganisation de la structure');
    
    try {
        const tuyaPath = path.join(DRIVERS_DIR, 'tuya');
        if (!fs.existsSync(tuyaPath)) {
            log('⚠️ Dossier drivers/tuya non trouvé', 'warn');
            return false;
        }
        
        // Créer la structure standard
        const standardCategories = [
            'light', 'switch', 'plug', 'sensor', 'sensor-motion', 'sensor-temp',
            'sensor-contact', 'sensor-leak', 'cover', 'lock', 'meter-power', 'other'
        ];
        
        for (const category of standardCategories) {
            const categoryPath = path.join(tuyaPath, category);
            if (!fs.existsSync(categoryPath)) {
                fs.mkdirSync(categoryPath, { recursive: true });
                log(`   📁 Catégorie créée: ${category}`);
            }
        }
        
        // Déplacer les drivers dans les bonnes catégories
        const items = fs.readdirSync(tuyaPath);
        for (const item of items) {
            const itemPath = path.join(tuyaPath, item);
            const stats = fs.statSync(itemPath);
            
            if (stats.isDirectory() && !standardCategories.includes(item)) {
                // Déterminer la catégorie appropriée
                let targetCategory = 'other';
                
                if (item.includes('light') || item.includes('bulb') || item.includes('lamp')) {
                    targetCategory = 'light';
                } else if (item.includes('switch') || item.includes('button')) {
                    targetCategory = 'switch';
                } else if (item.includes('plug') || item.includes('outlet')) {
                    targetCategory = 'plug';
                } else if (item.includes('sensor')) {
                    if (item.includes('motion')) {
                        targetCategory = 'sensor-motion';
                    } else if (item.includes('temp') || item.includes('temperature')) {
                        targetCategory = 'sensor-temp';
                    } else if (item.includes('contact') || item.includes('door')) {
                        targetCategory = 'sensor-contact';
                    } else if (item.includes('leak') || item.includes('water')) {
                        targetCategory = 'sensor-leak';
                    } else {
                        targetCategory = 'sensor';
                    }
                } else if (item.includes('cover') || item.includes('curtain') || item.includes('blind')) {
                    targetCategory = 'cover';
                } else if (item.includes('lock') || item.includes('door')) {
                    targetCategory = 'lock';
                } else if (item.includes('meter') || item.includes('power') || item.includes('energy')) {
                    targetCategory = 'meter-power';
                }
                
                const targetPath = path.join(tuyaPath, targetCategory, item);
                
                if (!fs.existsSync(targetPath)) {
                    try {
                        fs.renameSync(itemPath, targetPath);
                        log(`   📦 Déplacé: ${item} → ${targetCategory}/${item}`);
                    } catch (error) {
                        log(`   ⚠️ Impossible de déplacer ${item}: ${error.message}`, 'warn');
                    }
                } else {
                    log(`   ⚠️ Destination existe déjà: ${targetCategory}/${item}`, 'warn');
                }
            }
        }
        
        log('✅ Structure réorganisée');
        return true;
    } catch (error) {
        log(`❌ Erreur lors de la réorganisation: ${error.message}`, 'error');
        return false;
    }
}

// Fonction pour nettoyer les dossiers vides
function cleanupEmptyDirectories() {
    log('📋 ÉTAPE 5: Nettoyage des dossiers vides');
    
    try {
        const removeEmptyDirs = (dirPath) => {
            if (!fs.existsSync(dirPath)) return;
            
            const items = fs.readdirSync(dirPath);
            for (const item of items) {
                const itemPath = path.join(dirPath, item);
                const stats = fs.statSync(itemPath);
                
                if (stats.isDirectory()) {
                    removeEmptyDirs(itemPath);
                    
                    // Vérifier si le dossier est vide après nettoyage
                    const remainingItems = fs.readdirSync(itemPath);
                    if (remainingItems.length === 0) {
                        try {
                            fs.rmdirSync(itemPath);
                            log(`   🗑️ Dossier vide supprimé: ${path.relative(DRIVERS_DIR, itemPath)}`);
                        } catch (error) {
                            log(`   ⚠️ Impossible de supprimer ${itemPath}: ${error.message}`, 'warn');
                        }
                    }
                }
            }
        };
        
        removeEmptyDirs(DRIVERS_DIR);
        log('✅ Dossiers vides nettoyés');
        return true;
    } catch (error) {
        log(`❌ Erreur lors du nettoyage des dossiers vides: ${error.message}`, 'error');
        return false;
    }
}

// Fonction pour générer le rapport final
function generateFinalReport() {
    log('📋 ÉTAPE 6: Génération du rapport final');
    
    try {
        const report = {
            timestamp: new Date().toISOString(),
            backupDir: BACKUP_DIR,
            structure: {
                zigbee: {},
                tuya: {}
            }
        };
        
        // Analyser la structure zigbee
        const zigbeePath = path.join(DRIVERS_DIR, 'zigbee');
        if (fs.existsSync(zigbeePath)) {
            const zigbeeVendors = fs.readdirSync(zigbeePath);
            for (const vendor of zigbeeVendors) {
                const vendorPath = path.join(zigbeePath, vendor);
                const stats = fs.statSync(vendorPath);
                
                if (stats.isDirectory()) {
                    report.structure.zigbee[vendor] = {};
                    const categories = fs.readdirSync(vendorPath);
                    
                    for (const category of categories) {
                        const categoryPath = path.join(vendorPath, category);
                        const catStats = fs.statSync(categoryPath);
                        
                        if (catStats.isDirectory()) {
                            const drivers = fs.readdirSync(categoryPath);
                            report.structure.zigbee[vendor][category] = drivers.length;
                        }
                    }
                }
            }
        }
        
        // Analyser la structure tuya
        const tuyaPath = path.join(DRIVERS_DIR, 'tuya');
        if (fs.existsSync(tuyaPath)) {
            const tuyaCategories = fs.readdirSync(tuyaPath);
            for (const category of tuyaCategories) {
                const categoryPath = path.join(tuyaPath, category);
                const stats = fs.statSync(categoryPath);
                
                if (stats.isDirectory()) {
                    const drivers = fs.readdirSync(categoryPath);
                    report.structure.tuya[category] = drivers.length;
                }
            }
        }
        
        // Sauvegarder le rapport
        const reportPath = path.join(process.cwd(), 'CLEANUP_REPORT.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        log('✅ Rapport final généré: CLEANUP_REPORT.json');
        
        // Afficher un résumé
        console.log('\n📊 RÉSUMÉ DE LA STRUCTURE FINALE:');
        console.log('=====================================');
        
        if (Object.keys(report.structure.zigbee).length > 0) {
            console.log('\n📁 drivers/zigbee/');
            for (const [vendor, categories] of Object.entries(report.structure.zigbee)) {
                console.log(`   📁 ${vendor}/`);
                for (const [category, count] of Object.entries(categories)) {
                    console.log(`      📁 ${category}/ (${count} drivers)`);
                }
            }
        }
        
        if (Object.keys(report.structure.tuya).length > 0) {
            console.log('\n📁 drivers/tuya/');
            for (const [category, count] of Object.entries(report.structure.tuya)) {
                console.log(`   📁 ${category}/ (${count} drivers)`);
            }
        }
        
        return true;
    } catch (error) {
        log(`❌ Erreur lors de la génération du rapport: ${error.message}`, 'error');
        return false;
    }
}

// Fonction principale
async function main() {
    log('🚀 DÉMARRAGE DU NETTOYAGE ET DE LA RÉORGANISATION COMPLÈTE');
    console.log('========================================================');
    
    try {
        // 1. Backup
        if (!createBackup()) {
            log('⚠️ Backup échoué, continuation...', 'warn');
        }
        
        // 2. Analyser les sources .tmp*
        const tmpSources = analyzeTmpSources();
        
        // 3. Nettoyer les noms de dossiers
        if (!cleanStrangeFolderNames()) {
            log('❌ Échec du nettoyage des noms', 'error');
            return false;
        }
        
        // 4. Réorganiser la structure
        if (!reorganizeStructure()) {
            log('❌ Échec de la réorganisation', 'error');
            return false;
        }
        
        // 5. Nettoyer les dossiers vides
        if (!cleanupEmptyDirectories()) {
            log('❌ Échec du nettoyage des dossiers vides', 'error');
            return false;
        }
        
        // 6. Rapport final
        if (!generateFinalReport()) {
            log('❌ Échec de la génération du rapport', 'error');
            return false;
        }
        
        log('🎉 NETTOYAGE ET RÉORGANISATION TERMINÉS AVEC SUCCÈS !');
        console.log('\n🎯 Prochaines étapes recommandées:');
        console.log('   1. ✅ Structure des drivers nettoyée et réorganisée');
        console.log('   2. 🔄 Exécuter enrich-drivers.js avec --apply');
        console.log('   3. 🔄 Exécuter verify-coherence-and-enrich.js');
        console.log('   4. 🔄 Valider l\'app Homey');
        
        return true;
        
    } catch (error) {
        log(`💥 ERREUR FATALE: ${error.message}`, 'error');
        log(`📚 Stack trace: ${error.stack}`, 'error');
        return false;
    }
}

// Gestion des signaux
process.on('SIGINT', () => {
    log('⚠️ Interruption reçue, arrêt en cours...', 'warn');
    process.exit(0);
});

process.on('SIGTERM', () => {
    log('⚠️ Terminaison reçue, arrêt en cours...', 'warn');
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    log(`💥 Exception non gérée: ${error.message}`, 'error');
    log(`📚 Stack trace: ${error.stack}`, 'error');
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    log(`💥 Promesse rejetée non gérée: ${reason}`, 'error');
    process.exit(1);
});

// Exécution
if (require.main === module) {
    main().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        log(`💥 Erreur fatale: ${error.message}`, 'error');
        process.exit(1);
    });
}

module.exports = { main, createBackup, analyzeTmpSources, cleanStrangeFolderNames, reorganizeStructure, cleanupEmptyDirectories, generateFinalReport };
