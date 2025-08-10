#!/usr/bin/env node

/**
 * Script simple de réorganisation des drivers
 * Structure: drivers/{protocol}/{category}/{vendor}/{driver_name}
 * Auteur: dlnraja
 * Date: 2025-08-10
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DRIVERS_DIR = path.join(process.cwd(), 'drivers');
const BACKUP_DIR = path.join(process.cwd(), `.backup-simple-${Date.now()}`);

// Fonction de logging
function log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
}

// Fonction de sauvegarde
function createBackup() {
    log('📦 Création de la sauvegarde...');
    try {
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }
        
        // Copie récursive
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
        log('✅ Sauvegarde créée');
        return true;
    } catch (error) {
        log(`❌ Erreur sauvegarde: ${error.message}`);
        return false;
    }
}

// Fonction de réorganisation
function reorganize() {
    log('📋 Réorganisation selon la structure protocol/category/vendor...');
    
    try {
        const protocols = ['zigbee', 'tuya'];
        const categories = [
            'light', 'switch', 'plug', 'sensor', 'sensor-motion', 'sensor-temp',
            'sensor-contact', 'lock', 'meter-power', 'thermostat', 'curtain',
            'fan', 'climate', 'security', 'other'
        ];
        
        for (const protocol of protocols) {
            const protocolPath = path.join(DRIVERS_DIR, protocol);
            if (!fs.existsSync(protocolPath)) continue;
            
            log(`🔄 Traitement: ${protocol}`);
            
            // Créer les catégories
            for (const category of categories) {
                const categoryPath = path.join(protocolPath, category);
                if (!fs.existsSync(categoryPath)) {
                    fs.mkdirSync(categoryPath, { recursive: true });
                }
            }
            
            // Réorganiser les drivers
            const items = fs.readdirSync(protocolPath);
            for (const item of items) {
                const itemPath = path.join(protocolPath, item);
                const stats = fs.statSync(itemPath);
                
                if (stats.isDirectory() && !categories.includes(item)) {
                    const { category, vendor } = determineCategoryAndVendor(item);
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
                            log(`   ⚠️ Impossible de déplacer ${item}: ${error.message}`);
                        }
                    } else {
                        log(`   ⚠️ Destination existe: ${category}/${vendor}/${item}`);
                    }
                }
            }
        }
        
        log('✅ Réorganisation terminée');
        return true;
    } catch (error) {
        log(`❌ Erreur réorganisation: ${error.message}`);
        return false;
    }
}

// Fonction pour déterminer la catégorie et le vendor
function determineCategoryAndVendor(folderName) {
    const name = folderName.toLowerCase();
    
    // Catégorie
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
    
    // Vendor
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

// Fonction de nettoyage
function cleanup() {
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
                    
                    const remainingItems = fs.readdirSync(itemPath);
                    if (remainingItems.length === 0) {
                        fs.rmdirSync(itemPath);
                        cleanedCount++;
                    }
                }
            }
        };
        
        cleanRecursive(DRIVERS_DIR);
        log(`✅ Répertoires vides supprimés: ${cleanedCount}`);
        return true;
    } catch (error) {
        log(`❌ Erreur nettoyage: ${error.message}`);
        return false;
    }
}

// Fonction principale
function main() {
    log('🚀 DÉBUT DE LA RÉORGANISATION SIMPLE');
    log('=====================================');
    
    try {
        // Sauvegarde
        if (!createBackup()) {
            log('❌ Échec de la sauvegarde, arrêt');
            process.exit(1);
        }
        
        // Réorganisation
        if (!reorganize()) {
            log('❌ Échec de la réorganisation, arrêt');
            process.exit(1);
        }
        
        // Nettoyage
        if (!cleanup()) {
            log('⚠️ Échec du nettoyage, continuation...');
        }
        
        log('🎉 RÉORGANISATION TERMINÉE AVEC SUCCÈS!');
        log(`💾 Sauvegarde: ${BACKUP_DIR}`);
        
    } catch (error) {
        log(`❌ Erreur fatale: ${error.message}`);
        process.exit(1);
    }
}

// Exécution
if (require.main === module) {
    main();
}
