#!/usr/bin/env node

/**
 * 🚀 CORRECTEUR ULTIME HOMEY SDK3 - VERSION SIMPLIFIÉE
 * Résout TOUS les problèmes basé sur les apprentissages des validations
 * Version sans dépendances externes
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 CORRECTEUR ULTIME HOMEY SDK3 - VERSION SIMPLIFIÉE');
console.log('=====================================================');

// Configuration
const CONFIG = {
    appJsonPath: 'app.json',
    homeycomposePath: '.homeycompose/app.json',
    driversPath: 'drivers',
    assetsPath: 'assets',
    backupPath: 'backup',
    validClasses: [
        'light', 'switch', 'socket', 'thermostat', 'cover', 'lock', 
        'sensor', 'fan', 'remote', 'button', 'camera', 'curtain',
        'doorbell', 'garage', 'gate', 'heater', 'humidifier', 'ir',
        'media', 'music', 'other', 'pump', 'speaker', 'vacuum'
    ],
    classMappings: {
        'climate': 'thermostat',
        'socket': 'switch',
        'device': 'switch',
        'outlet': 'socket',
        'bulb': 'light',
        'lamp': 'light',
        'dimmer': 'light',
        'rgb': 'light',
        'contact': 'sensor',
        'motion': 'sensor',
        'temperature': 'sensor',
        'humidity': 'sensor',
        'pressure': 'sensor',
        'illuminance': 'sensor',
        'occupancy': 'sensor',
        'smoke': 'sensor',
        'gas': 'sensor',
        'water': 'sensor',
        'vibration': 'sensor',
        'tamper': 'sensor'
    }
};

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
        const backupDir = path.join(CONFIG.backupPath, path.dirname(filePath));
        ensureDirectoryExists(backupDir);
        const backupPath = path.join(backupDir, path.basename(filePath));
        fs.copyFileSync(filePath, backupPath);
        log(`💾 Sauvegarde créée: ${backupPath}`, 'success');
    }
}

// 1. CORRECTION DES IMAGES PRINCIPALES
function fixMainAppImages() {
    log('🔧 Correction des images principales de l\'app...', 'info');
    
    const mainImages = [
        { src: 'assets/images/small.png', dest: 'assets/small.png' },
        { src: 'assets/images/large.png', dest: 'assets/large.png' },
        { src: 'assets/images/icon.svg', dest: 'assets/icon.svg' }
    ];
    
    let fixed = 0;
    mainImages.forEach(({ src, dest }) => {
        if (fs.existsSync(src) && !fs.existsSync(dest)) {
            ensureDirectoryExists(path.dirname(dest));
            fs.copyFileSync(src, dest);
            log(`✅ Image copiée: ${src} → ${dest}`, 'success');
            fixed++;
        }
    });
    
    return fixed;
}

// 2. CORRECTION DES IMAGES DES DRIVERS
function fixDriverImages() {
    log('🔧 Correction des images des drivers...', 'info');
    
    let totalFixed = 0;
    const driverDirs = fs.readdirSync(CONFIG.driversPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    
    driverDirs.forEach(driverDir => {
        const driverPath = path.join(CONFIG.driversPath, driverDir);
        const composePath = path.join(driverPath, 'driver.compose.json');
        
        if (fs.existsSync(composePath)) {
            try {
                const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                let driverFixed = 0;
                
                // Vérifier les images existantes
                const imageTypes = ['small', 'large'];
                imageTypes.forEach(type => {
                    const imagePath = path.join(driverPath, `${type}.png`);
                    if (!fs.existsSync(imagePath)) {
                        // Copier depuis assets/images si disponible
                        const fallbackImage = path.join('assets', 'images', `${type}.png`);
                        if (fs.existsSync(fallbackImage)) {
                            fs.copyFileSync(fallbackImage, imagePath);
                            log(`✅ Image ${type} copiée depuis fallback: ${imagePath}`, 'success');
                            driverFixed++;
                        } else {
                            log(`⚠️  Image ${type} manquante: ${imagePath}`, 'warning');
                        }
                    }
                });
                
                // Corriger les chemins dans driver.compose.json
                if (compose.images) {
                    let updated = false;
                    imageTypes.forEach(type => {
                        if (compose.images[type] && compose.images[type] !== `${type}.png`) {
                            compose.images[type] = `${type}.png`;
                            updated = true;
                        }
                    });
                    
                    if (updated) {
                        backupFile(composePath);
                        fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
                        log(`✅ driver.compose.json corrigé: ${driverDir}`, 'success');
                        driverFixed++;
                    }
                }
                
                totalFixed += driverFixed;
                
            } catch (error) {
                log(`❌ Erreur traitement driver ${driverDir}: ${error.message}`, 'error');
            }
        }
    });
    
    return totalFixed;
}

// 3. CORRECTION DE APP.JSON
function fixAppJson() {
    log('🔧 Correction de app.json...', 'info');
    
    if (!fs.existsSync(CONFIG.appJsonPath)) {
        log('❌ app.json non trouvé, création depuis .homeycompose...', 'error');
        if (fs.existsSync(CONFIG.homeycomposePath)) {
            fs.copyFileSync(CONFIG.homeycomposePath, CONFIG.appJsonPath);
            log('✅ app.json créé depuis .homeycompose', 'success');
        } else {
            log('❌ .homeycompose/app.json non trouvé', 'error');
            return false;
        }
    }
    
    try {
        backupFile(CONFIG.appJsonPath);
        const appJson = JSON.parse(fs.readFileSync(CONFIG.appJsonPath, 'utf8'));
        let updated = false;
        
        // Correction des images principales
        if (appJson.images) {
            if (appJson.images.small === 'small.png') {
                appJson.images.small = 'assets/small.png';
                updated = true;
            }
            if (appJson.images.large === 'large.png') {
                appJson.images.large = 'assets/large.png';
                updated = true;
            }
        }
        
        // Ajout des permissions
        if (!appJson.permissions) {
            appJson.permissions = ['homey:manager:api'];
            updated = true;
        }
        
        // Correction de la compatibilité
        if (!appJson.compatibility || appJson.compatibility !== '>=6.0.0') {
            appJson.compatibility = '>=6.0.0';
            updated = true;
        }
        
        // Correction du SDK
        if (!appJson.sdk || appJson.sdk !== 3) {
            appJson.sdk = 3;
            updated = true;
        }
        
        // Correction des images des drivers dans app.json
        if (appJson.drivers && Array.isArray(appJson.drivers)) {
            appJson.drivers.forEach((driver, index) => {
                if (driver.images) {
                    if (driver.images.small === 'small.png') {
                        driver.images.small = 'small.png'; // Garder relatif
                        updated = true;
                    }
                    if (driver.images.large === 'large.png') {
                        driver.images.large = 'large.png'; // Garder relatif
                        updated = true;
                    }
                }
                
                // Correction des classes invalides
                if (driver.class && CONFIG.classMappings[driver.class]) {
                    const oldClass = driver.class;
                    driver.class = CONFIG.classMappings[driver.class];
                    log(`✅ Classe corrigée: ${oldClass} → ${driver.class}`, 'success');
                    updated = true;
                }
            });
        }
        
        if (updated) {
            fs.writeFileSync(CONFIG.appJsonPath, JSON.stringify(appJson, null, 2));
            log('✅ app.json corrigé et sauvegardé', 'success');
        }
        
        return true;
        
    } catch (error) {
        log(`❌ Erreur correction app.json: ${error.message}`, 'error');
        return false;
    }
}

// 4. CORRECTION DES CLASSES DE DRIVERS
function fixDriverClasses() {
    log('🔧 Correction des classes de drivers...', 'info');
    
    let totalFixed = 0;
    const driverDirs = fs.readdirSync(CONFIG.driversPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    
    driverDirs.forEach(driverDir => {
        const driverPath = path.join(CONFIG.driversPath, driverDir);
        const composePath = path.join(driverPath, 'driver.compose.json');
        
        if (fs.existsSync(composePath)) {
            try {
                const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                
                if (compose.class && CONFIG.classMappings[compose.class]) {
                    const oldClass = compose.class;
                    compose.class = CONFIG.classMappings[compose.class];
                    
                    backupFile(composePath);
                    fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
                    
                    log(`✅ Classe corrigée ${driverDir}: ${oldClass} → ${compose.class}`, 'success');
                    totalFixed++;
                }
                
            } catch (error) {
                log(`❌ Erreur correction classe ${driverDir}: ${error.message}`, 'error');
            }
        }
    });
    
    return totalFixed;
}

// 5. VALIDATION FINALE
function validateFinalStructure() {
    log('🔍 Validation finale de la structure...', 'info');
    
    const errors = [];
    const warnings = [];
    
    // Vérifier app.json
    if (!fs.existsSync(CONFIG.appJsonPath)) {
        errors.push('app.json manquant');
    } else {
        try {
            const appJson = JSON.parse(fs.readFileSync(CONFIG.appJsonPath, 'utf8'));
            
            if (!appJson.images || !appJson.images.small || !appJson.images.large) {
                warnings.push('Images principales manquantes dans app.json');
            }
            
            if (!appJson.permissions) {
                warnings.push('Permissions manquantes dans app.json');
            }
            
            if (appJson.compatibility !== '>=6.0.0') {
                warnings.push('Compatibilité incorrecte dans app.json');
            }
            
            if (appJson.sdk !== 3) {
                warnings.push('SDK incorrect dans app.json');
            }
        } catch (error) {
            errors.push(`app.json invalide: ${error.message}`);
        }
    }
    
    // Vérifier les images principales
    if (!fs.existsSync('assets/small.png')) {
        errors.push('assets/small.png manquant');
    }
    if (!fs.existsSync('assets/large.png')) {
        errors.push('assets/large.png manquant');
    }
    
    // Vérifier les drivers
    const driverDirs = fs.readdirSync(CONFIG.driversPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    
    driverDirs.forEach(driverDir => {
        const driverPath = path.join(CONFIG.driversPath, driverDir);
        const composePath = path.join(driverPath, 'driver.compose.json');
        
        if (!fs.existsSync(composePath)) {
            warnings.push(`driver.compose.json manquant: ${driverDir}`);
        } else {
            try {
                const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                
                if (!compose.class) {
                    warnings.push(`Classe manquante: ${driverDir}`);
                } else if (!CONFIG.validClasses.includes(compose.class) && !Object.values(CONFIG.classMappings).includes(compose.class)) {
                    warnings.push(`Classe invalide: ${driverDir} (${compose.class})`);
                }
                
                if (compose.images) {
                    if (!fs.existsSync(path.join(driverPath, compose.images.small || 'small.png'))) {
                        warnings.push(`Image small manquante: ${driverDir}`);
                    }
                    if (!fs.existsSync(path.join(driverPath, compose.images.large || 'large.png'))) {
                        warnings.push(`Image large manquante: ${driverDir}`);
                    }
                }
                
            } catch (error) {
                errors.push(`driver.compose.json invalide ${driverDir}: ${error.message}`);
            }
        }
    });
    
    return { errors, warnings };
}

// 6. FONCTION PRINCIPALE
async function runUltimateCorrection() {
    try {
        log('🚀 DÉMARRAGE DE LA CORRECTION ULTIME SIMPLIFIÉE', 'info');
        
        // Créer le dossier de sauvegarde
        ensureDirectoryExists(CONFIG.backupPath);
        
        // 1. Correction des images principales
        const mainImagesFixed = fixMainAppImages();
        log(`✅ Images principales corrigées: ${mainImagesFixed}`, 'success');
        
        // 2. Correction des images des drivers
        const driverImagesFixed = fixDriverImages();
        log(`✅ Images des drivers corrigées: ${driverImagesFixed}`, 'success');
        
        // 3. Correction de app.json
        const appJsonFixed = fixAppJson();
        if (appJsonFixed) {
            log('✅ app.json corrigé', 'success');
        } else {
            log('❌ Échec correction app.json', 'error');
        }
        
        // 4. Correction des classes de drivers
        const driverClassesFixed = fixDriverClasses();
        log(`✅ Classes de drivers corrigées: ${driverClassesFixed}`, 'success');
        
        // 5. Validation finale
        log('🔍 Validation finale...', 'info');
        const validation = validateFinalStructure();
        
        // 6. Rapport final
        console.log('\n📊 RAPPORT DE CORRECTION ULTIME SIMPLIFIÉE');
        console.log('============================================');
        console.log(`Images principales corrigées: ${mainImagesFixed}`);
        console.log(`Images des drivers corrigées: ${driverImagesFixed}`);
        console.log(`Classes de drivers corrigées: ${driverClassesFixed}`);
        console.log(`app.json corrigé: ${appJsonFixed ? 'OUI' : 'NON'}`);
        
        if (validation.errors.length > 0) {
            console.log(`\n❌ ERREURS CRITIQUES (${validation.errors.length}):`);
            validation.errors.forEach(error => console.log(`  - ${error}`));
        }
        
        if (validation.warnings.length > 0) {
            console.log(`\n⚠️  AVERTISSEMENTS (${validation.warnings.length}):`);
            validation.warnings.forEach(warning => console.log(`  - ${warning}`));
        }
        
        if (validation.errors.length === 0) {
            console.log('\n🎉 CORRECTION ULTIME SIMPLIFIÉE TERMINÉE AVEC SUCCÈS !');
            console.log('Le projet est maintenant prêt pour la validation Homey !');
        } else {
            console.log('\n⚠️  Correction terminée avec des erreurs critiques');
        }
        
        return validation.errors.length === 0;
        
    } catch (error) {
        log(`❌ Erreur fatale: ${error.message}`, 'error');
        return false;
    }
}

// Exécution
if (require.main === module) {
    runUltimateCorrection().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { runUltimateCorrection };
