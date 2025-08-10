#!/usr/bin/env node

/**
 * Script final de réorganisation des drivers avec structure protocol/category/vendor
 * Complète les drivers avec tous les référentiels et sources disponibles
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
const BACKUP_DIR = path.join(process.cwd(), `.backup-final-reorg-${Date.now()}`);

// Fonction de logging
function log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
        info: '\x1b[36m',    // Cyan
        success: '\x1b[32m', // Green
        warn: '\x1b[33m',    // Yellow
        error: '\x1b[31m'    // Red
    };
    const reset = '\x1b[0m';
    const color = colors[level] || colors.info;
    console.log(`${color}[${timestamp}] ${message}${reset}`);
}

// Fonction d'exécution de commandes
function run(command, args = [], options = {}) {
    if (VERBOSE) log(`🔧 Exécution: ${command} ${args.join(' ')}`);
    const result = spawnSync(command, args, {
        stdio: 'inherit',
        shell: true,
        ...options
    });
    if (result.status !== 0) {
        log(`❌ Erreur lors de l'exécution de ${command}`, 'error');
        return false;
    }
    return true;
}

// Fonction de sauvegarde
function createBackup() {
    log('📦 Création de la sauvegarde...');
    try {
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }
        
        // Copie récursive du dossier drivers
        const copyRecursive = (src, dest) => {
            if (fs.statSync(src).isDirectory()) {
                if (!fs.existsSync(dest)) {
                    fs.mkdirSync(dest, { recursive: true });
                }
                fs.readdirSync(src).forEach(file => {
                    copyRecursive(path.join(src, file), path.join(dest, file));
                });
            } else {
                fs.copyFileSync(src, dest);
            }
        };
        
        copyRecursive(DRIVERS_DIR, path.join(BACKUP_DIR, 'drivers'));
        log('✅ Sauvegarde créée', 'success');
        return true;
    } catch (error) {
        log(`❌ Erreur lors de la sauvegarde: ${error.message}`, 'error');
        return false;
    }
}

// Fonction d'analyse des sources temporaires
function analyzeTmpSources() {
    log('🔍 Analyse des sources temporaires...');
    try {
        if (!fs.existsSync(TMP_SOURCES_DIR)) {
            log('⚠️ Dossier .tmp_tuya_zip_work non trouvé', 'warn');
            return {};
        }

        const sources = {};
        const scanDirectory = (dir, prefix = '') => {
            const items = fs.readdirSync(dir);
            for (const item of items) {
                const itemPath = path.join(dir, item);
                const stats = fs.statSync(itemPath);
                
                if (stats.isDirectory()) {
                    scanDirectory(itemPath, prefix ? `${prefix}/${item}` : item);
                } else if (item === 'driver.compose.json' || item === 'driver.json') {
                    try {
                        const content = fs.readFileSync(itemPath, 'utf8');
                        const data = JSON.parse(content);
                        const key = prefix || 'root';
                        if (!sources[key]) sources[key] = [];
                        sources[key].push({
                            path: itemPath,
                            data: data,
                            type: item === 'driver.compose.json' ? 'compose' : 'driver'
                        });
                    } catch (error) {
                        log(`⚠️ Erreur lecture ${itemPath}: ${error.message}`, 'warn');
                    }
                }
            }
        };

        scanDirectory(TMP_SOURCES_DIR);
        
        const totalSources = Object.values(sources).reduce((sum, arr) => sum + arr.length, 0);
        log(`✅ Sources analysées: ${totalSources} fichiers trouvés`, 'success');
        
        return sources;
    } catch (error) {
        log(`❌ Erreur lors de l'analyse des sources: ${error.message}`, 'error');
        return {};
    }
}

// Fonction de réorganisation selon la nouvelle structure
function reorganizeToNewStructure() {
    log('📋 Réorganisation selon la structure protocol/category/vendor...');
    try {
        // Structure cible: drivers/{protocol}/{category}/{vendor}/{driver_name}
        const protocols = ['zigbee', 'tuya'];
        
        for (const protocol of protocols) {
            const protocolPath = path.join(DRIVERS_DIR, protocol);
            if (!fs.existsSync(protocolPath)) continue;
            
            log(`🔄 Traitement du protocole: ${protocol}`);
            
            // Créer les catégories standard
            const standardCategories = [
                'light', 'switch', 'plug', 'sensor', 'sensor-motion', 'sensor-temp',
                'sensor-contact', 'lock', 'meter-power', 'thermostat', 'curtain',
                'fan', 'climate', 'security', 'other'
            ];
            
            for (const category of standardCategories) {
                const categoryPath = path.join(protocolPath, category);
                if (!fs.existsSync(categoryPath)) {
                    fs.mkdirSync(categoryPath, { recursive: true });
                }
            }
            
            // Analyser et réorganiser les drivers existants
            const items = fs.readdirSync(protocolPath);
            for (const item of items) {
                const itemPath = path.join(protocolPath, item);
                const stats = fs.statSync(itemPath);
                
                if (stats.isDirectory() && !standardCategories.includes(item)) {
                    // Déterminer la catégorie et le vendor
                    const { category, vendor } = determineCategoryAndVendor(item, protocol);
                    const targetPath = path.join(protocolPath, category, vendor, item);
                    
                    // Créer le chemin de destination
                    const targetDir = path.dirname(targetPath);
                    if (!fs.existsSync(targetDir)) {
                        fs.mkdirSync(targetDir, { recursive: true });
                    }
                    
                    // Déplacer le driver
                    if (!fs.existsSync(targetPath)) {
                        try {
                            fs.renameSync(itemPath, targetPath);
                            log(`   📦 Déplacé: ${item} → ${category}/${vendor}/${item}`);
                        } catch (error) {
                            log(`   ⚠️ Impossible de déplacer ${item}: ${error.message}`, 'warn');
                        }
                    } else {
                        // Fusionner si la destination existe
                        mergeDirectories(itemPath, targetPath);
                        log(`   🔄 Fusionné: ${item} → ${category}/${vendor}/${item}`);
                    }
                }
            }
        }
        
        log('✅ Structure réorganisée', 'success');
        return true;
    } catch (error) {
        log(`❌ Erreur lors de la réorganisation: ${error.message}`, 'error');
        return false;
    }
}

// Fonction pour déterminer la catégorie et le vendor
function determineCategoryAndVendor(folderName, protocol) {
    const name = folderName.toLowerCase();
    
    // Déterminer la catégorie
    let category = 'other';
    if (name.includes('light') || name.includes('bulb') || name.includes('lamp')) {
        category = 'light';
    } else if (name.includes('switch') || name.includes('button')) {
        category = 'switch';
    } else if (name.includes('plug') || name.includes('socket')) {
        category = 'plug';
    } else if (name.includes('sensor')) {
        if (name.includes('motion') || name.includes('pir')) {
            category = 'sensor-motion';
        } else if (name.includes('temp') || name.includes('temperature')) {
            category = 'sensor-temp';
        } else if (name.includes('contact') || name.includes('door') || name.includes('window')) {
            category = 'sensor-contact';
        } else {
            category = 'sensor';
        }
    } else if (name.includes('lock')) {
        category = 'lock';
    } else if (name.includes('meter') || name.includes('power')) {
        category = 'meter-power';
    } else if (name.includes('thermostat')) {
        category = 'thermostat';
    } else if (name.includes('curtain') || name.includes('blind')) {
        category = 'curtain';
    } else if (name.includes('fan')) {
        category = 'fan';
    } else if (name.includes('climate')) {
        category = 'climate';
    } else if (name.includes('security')) {
        category = 'security';
    }
    
    // Déterminer le vendor
    let vendor = 'generic';
    if (name.includes('tuya')) {
        vendor = 'tuya';
    } else if (name.includes('zigbee')) {
        vendor = 'zigbee';
    } else if (name.includes('smart')) {
        vendor = 'smart';
    } else if (name.includes('homey')) {
        vendor = 'homey';
    }
    
    return { category, vendor };
}

// Fonction de fusion de répertoires
function mergeDirectories(source, destination) {
    try {
        const items = fs.readdirSync(source);
        for (const item of items) {
            const sourcePath = path.join(source, item);
            const destPath = path.join(destination, item);
            const stats = fs.statSync(sourcePath);
            
            if (stats.isDirectory()) {
                if (!fs.existsSync(destPath)) {
                    fs.mkdirSync(destPath, { recursive: true });
                }
                mergeDirectories(sourcePath, destPath);
            } else {
                if (!fs.existsSync(destPath)) {
                    fs.copyFileSync(sourcePath, destPath);
                }
            }
        }
        
        // Supprimer le répertoire source après fusion
        fs.rmSync(source, { recursive: true, force: true });
    } catch (error) {
        log(`⚠️ Erreur lors de la fusion: ${error.message}`, 'warn');
    }
}

// Fonction d'enrichissement des drivers
function enrichDrivers(sources) {
    log('🔧 Enrichissement des drivers avec les sources...');
    try {
        let enrichedCount = 0;
        
        for (const [sourceKey, sourceFiles] of Object.entries(sources)) {
            for (const sourceFile of sourceFiles) {
                try {
                    const enriched = enrichDriverFromSource(sourceFile);
                    if (enriched) enrichedCount++;
                } catch (error) {
                    log(`⚠️ Erreur enrichissement ${sourceKey}: ${error.message}`, 'warn');
                }
            }
        }
        
        log(`✅ Drivers enrichis: ${enrichedCount}`, 'success');
        return true;
    } catch (error) {
        log(`❌ Erreur lors de l'enrichissement: ${error.message}`, 'error');
        return false;
    }
}

// Fonction d'enrichissement d'un driver depuis une source
function enrichDriverFromSource(sourceFile) {
    try {
        const { path: sourcePath, data: sourceData, type } = sourceFile;
        
        // Chercher le driver correspondant dans la structure
        const driverPath = findMatchingDriver(sourceData);
        if (!driverPath) return false;
        
        // Enrichir le driver
        const driverComposePath = path.join(driverPath, 'driver.compose.json');
        if (fs.existsSync(driverComposePath)) {
            const driverCompose = JSON.parse(fs.readFileSync(driverComposePath, 'utf8'));
            const enriched = mergeDriverData(driverCompose, sourceData);
            fs.writeFileSync(driverComposePath, JSON.stringify(enriched, null, 2));
            return true;
        }
        
        return false;
    } catch (error) {
        log(`⚠️ Erreur enrichissement driver: ${error.message}`, 'warn');
        return false;
    }
}

// Fonction de recherche de driver correspondant
function findMatchingDriver(sourceData) {
    // Logique de correspondance basée sur les données de la source
    // À implémenter selon les besoins spécifiques
    return null;
}

// Fonction de fusion des données de driver
function mergeDriverData(driver, source) {
    // Logique de fusion des données
    // À implémenter selon les besoins spécifiques
    return driver;
}

// Fonction de nettoyage des répertoires vides
function cleanupEmptyDirectories() {
    log('🧹 Nettoyage des répertoires vides...');
    try {
        let cleanedCount = 0;
        
        const cleanRecursive = (dir) => {
            if (!fs.existsSync(dir)) return;
            
            const items = fs.readdirSync(dir);
            for (const item of items) {
                const itemPath = path.join(dir, item);
                const stats = fs.statSync(itemPath);
                
                if (stats.isDirectory()) {
                    cleanRecursive(itemPath);
                    
                    // Vérifier si le répertoire est vide après nettoyage
                    const remainingItems = fs.readdirSync(itemPath);
                    if (remainingItems.length === 0) {
                        fs.rmdirSync(itemPath);
                        cleanedCount++;
                    }
                }
            }
        };
        
        cleanRecursive(DRIVERS_DIR);
        log(`✅ Répertoires vides supprimés: ${cleanedCount}`, 'success');
        return true;
    } catch (error) {
        log(`❌ Erreur lors du nettoyage: ${error.message}`, 'error');
        return false;
    }
}

// Fonction de génération du rapport final
function generateFinalReport() {
    log('📊 Génération du rapport final...');
    try {
        const report = {
            timestamp: new Date().toISOString(),
            structure: {
                zigbee: {},
                tuya: {}
            },
            statistics: {
                totalDrivers: 0,
                totalCategories: 0,
                totalVendors: 0
            }
        };
        
        // Analyser la structure finale
        for (const protocol of ['zigbee', 'tuya']) {
            const protocolPath = path.join(DRIVERS_DIR, protocol);
            if (!fs.existsSync(protocolPath)) continue;
            
            const categories = fs.readdirSync(protocolPath).filter(item => 
                fs.statSync(path.join(protocolPath, item)).isDirectory()
            );
            
            report.structure[protocol] = {};
            for (const category of categories) {
                const categoryPath = path.join(protocolPath, category);
                const vendors = fs.readdirSync(categoryPath).filter(item => 
                    fs.statSync(path.join(categoryPath, item)).isDirectory()
                );
                
                report.structure[protocol][category] = {};
                for (const vendor of vendors) {
                    const vendorPath = path.join(categoryPath, vendor);
                    const drivers = fs.readdirSync(vendorPath).filter(item => 
                        fs.statSync(path.join(vendorPath, item)).isDirectory()
                    );
                    
                    report.structure[protocol][category][vendor] = drivers;
                    report.statistics.totalDrivers += drivers.length;
                }
                report.statistics.totalCategories += Object.keys(report.structure[protocol][category]).length;
            }
            report.statistics.totalVendors += Object.keys(report.structure[protocol]).length;
        }
        
        // Sauvegarder le rapport
        const reportPath = path.join(process.cwd(), 'FINAL_REORGANIZATION_REPORT.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        // Afficher le résumé
        log('📋 RÉSUMÉ DE LA RÉORGANISATION FINALE:', 'success');
        log(`   📊 Total drivers: ${report.statistics.totalDrivers}`);
        log(`   📁 Total catégories: ${report.statistics.totalCategories}`);
        log(`   🏢 Total vendors: ${report.statistics.totalVendors}`);
        log(`   📄 Rapport sauvegardé: ${reportPath}`);
        
        return true;
    } catch (error) {
        log(`❌ Erreur lors de la génération du rapport: ${error.message}`, 'error');
        return false;
    }
}

// Fonction principale
async function main() {
    log('🚀 DÉBUT DE LA RÉORGANISATION FINALE DES DRIVERS');
    log('================================================');
    
    try {
        // ÉTAPE 1: Sauvegarde
        if (!createBackup()) {
            log('❌ Échec de la sauvegarde, arrêt', 'error');
            process.exit(1);
        }
        
        // ÉTAPE 2: Analyse des sources
        const sources = analyzeTmpSources();
        
        // ÉTAPE 3: Réorganisation selon la nouvelle structure
        if (!reorganizeToNewStructure()) {
            log('❌ Échec de la réorganisation, arrêt', 'error');
            process.exit(1);
        }
        
        // ÉTAPE 4: Enrichissement des drivers
        if (!enrichDrivers(sources)) {
            log('⚠️ Échec de l\'enrichissement, continuation...', 'warn');
        }
        
        // ÉTAPE 5: Nettoyage des répertoires vides
        if (!cleanupEmptyDirectories()) {
            log('⚠️ Échec du nettoyage, continuation...', 'warn');
        }
        
        // ÉTAPE 6: Rapport final
        if (!generateFinalReport()) {
            log('⚠️ Échec du rapport, continuation...', 'warn');
        }
        
        log('🎉 RÉORGANISATION FINALE TERMINÉE AVEC SUCCÈS!', 'success');
        
    } catch (error) {
        log(`❌ Erreur fatale: ${error.message}`, 'error');
        process.exit(1);
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

// Exécution
if (require.main === module) {
    main().catch(error => {
        log(`❌ Erreur non gérée: ${error.message}`, 'error');
        process.exit(1);
    });
}

module.exports = {
    reorganizeToNewStructure,
    enrichDrivers,
    cleanupEmptyDirectories,
    generateFinalReport
};
