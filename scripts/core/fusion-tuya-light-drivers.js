const fs = require('fs');
const path = require('path');

class FusionTuyaLightDrivers {
    constructor() {
        this.report = {
            timestamp: new Date().toISOString(),
            fusionSteps: [],
            fusedDrivers: [],
            errors: [],
            warnings: [],
            summary: {}
        };
    }

    log(message, type = 'info') {
        const logEntry = {
            message,
            type,
            timestamp: new Date().toISOString()
        };
        this.report.fusionSteps.push(logEntry);
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    async fusionTuyaLightDrivers() {
        this.log('🔄 Fusion des drivers tuya-light avec les dossiers existants...');
        
        try {
            let fusedCount = 0;
            const tuyaLightDir = 'drivers/tuya-light';
            
            if (!fs.existsSync(tuyaLightDir)) {
                this.log('❌ Dossier tuya-light non trouvé', 'error');
                return 0;
            }

            // Récupérer tous les sous-dossiers tuya-light
            const tuyaLightCategories = fs.readdirSync(tuyaLightDir);
            
            for (const category of tuyaLightCategories) {
                const categoryPath = path.join(tuyaLightDir, category);
                
                if (fs.statSync(categoryPath).isDirectory()) {
                    const drivers = fs.readdirSync(categoryPath);
                    
                    for (const driver of drivers) {
                        const driverPath = path.join(categoryPath, driver);
                        const composePath = path.join(driverPath, 'driver.compose.json');
                        
                        if (fs.existsSync(composePath)) {
                            const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                            
                            // Déterminer la catégorie et le dossier de destination
                            const destination = this.determineDestination(compose, driver);
                            
                            if (destination) {
                                const targetDir = path.join('drivers', destination.category, destination.subcategory, driver);
                                
                                // Créer le dossier de destination s'il n'existe pas
                                if (!fs.existsSync(path.dirname(targetDir))) {
                                    fs.mkdirSync(path.dirname(targetDir), { recursive: true });
                                }
                                
                                // Déplacer le driver
                                if (fs.existsSync(targetDir)) {
                                    // Si le dossier existe déjà, fusionner le contenu
                                    this.fusionDriverContent(driverPath, targetDir);
                                } else {
                                    // Déplacer le dossier complet
                                    fs.renameSync(driverPath, targetDir);
                                }
                                
                                this.log(`Driver fusionné: ${driver} -> ${destination.category}/${destination.subcategory}`);
                                fusedCount++;
                            }
                        }
                    }
                }
            }
            
            // Supprimer le dossier tuya-light vide
            if (fs.existsSync(tuyaLightDir) && fs.readdirSync(tuyaLightDir).length === 0) {
                fs.rmdirSync(tuyaLightDir);
                this.log('Dossier tuya-light supprimé (vide)');
            }
            
            this.log(`✅ ${fusedCount} drivers tuya-light fusionnés`);
            return fusedCount;
            
        } catch (error) {
            this.log(`❌ Erreur fusion tuya-light: ${error.message}`, 'error');
            return 0;
        }
    }

    determineDestination(compose, driverName) {
        const capabilities = compose.capabilities || [];
        const zigbee = compose.zigbee || {};
        const clusters = zigbee.clusters || [];
        
        // Déterminer la catégorie principale
        let category = 'tuya';
        let subcategory = 'lights';
        
        // Vérifier les capacités pour déterminer le type
        if (capabilities.includes('meter_power') || capabilities.includes('measure_power')) {
            category = 'tuya';
            subcategory = 'plugs';
        } else if (capabilities.some(cap => cap.includes('measure') || cap.includes('alarm') || cap.includes('sensor'))) {
            category = 'tuya';
            subcategory = 'sensors';
        } else if (capabilities.includes('dim') || capabilities.includes('light_temperature') || capabilities.includes('light_hue') || capabilities.includes('light_saturation')) {
            category = 'tuya';
            subcategory = 'lights';
        } else if (capabilities.includes('onoff') && !capabilities.includes('dim')) {
            category = 'tuya';
            subcategory = 'switches';
        } else if (capabilities.includes('windowcoverings') || capabilities.includes('curtain')) {
            category = 'tuya';
            subcategory = 'controls';
        } else if (capabilities.includes('thermostat') || capabilities.includes('measure_temperature')) {
            category = 'zigbee';
            subcategory = 'temperature';
        } else {
            // Par défaut, tuya lights
            category = 'tuya';
            subcategory = 'lights';
        }
        
        return { category, subcategory };
    }

    fusionDriverContent(sourceDir, targetDir) {
        try {
            // Fusionner les fichiers
            const sourceFiles = fs.readdirSync(sourceDir);
            
            for (const file of sourceFiles) {
                const sourceFile = path.join(sourceDir, file);
                const targetFile = path.join(targetDir, file);
                
                if (fs.statSync(sourceFile).isFile()) {
                    if (fs.existsSync(targetFile)) {
                        // Fusionner le contenu des fichiers
                        this.fusionFileContent(sourceFile, targetFile);
                    } else {
                        // Copier le fichier
                        fs.copyFileSync(sourceFile, targetFile);
                    }
                }
            }
            
            // Supprimer le dossier source
            fs.rmSync(sourceDir, { recursive: true, force: true });
            
        } catch (error) {
            this.log(`❌ Erreur fusion contenu: ${error.message}`, 'error');
        }
    }

    fusionFileContent(sourceFile, targetFile) {
        try {
            const sourceContent = fs.readFileSync(sourceFile, 'utf8');
            const targetContent = fs.readFileSync(targetFile, 'utf8');
            
            // Fusionner le contenu selon le type de fichier
            if (sourceFile.endsWith('.json')) {
                const sourceJson = JSON.parse(sourceContent);
                const targetJson = JSON.parse(targetContent);
                
                // Fusionner les capacités
                if (sourceJson.capabilities && targetJson.capabilities) {
                    targetJson.capabilities = [...new Set([...targetJson.capabilities, ...sourceJson.capabilities])];
                }
                
                // Fusionner les clusters
                if (sourceJson.zigbee && targetJson.zigbee && sourceJson.zigbee.clusters && targetJson.zigbee.clusters) {
                    targetJson.zigbee.clusters = [...new Set([...targetJson.zigbee.clusters, ...sourceJson.zigbee.clusters])];
                }
                
                // Fusionner les métadonnées
                if (sourceJson.metadata && targetJson.metadata) {
                    targetJson.metadata = { ...targetJson.metadata, ...sourceJson.metadata };
                }
                
                fs.writeFileSync(targetFile, JSON.stringify(targetJson, null, 2));
                
            } else if (sourceFile.endsWith('.js')) {
                // Fusionner le code JavaScript
                const mergedContent = this.fusionJavaScriptContent(sourceContent, targetContent);
                fs.writeFileSync(targetFile, mergedContent);
            }
            
        } catch (error) {
            this.log(`❌ Erreur fusion fichier: ${error.message}`, 'error');
        }
    }

    fusionJavaScriptContent(sourceContent, targetContent) {
        // Fusion simple - ajouter les nouvelles classes et méthodes
        const sourceClasses = this.extractClasses(sourceContent);
        const targetClasses = this.extractClasses(targetContent);
        
        let mergedContent = targetContent;
        
        for (const className of sourceClasses) {
            if (!targetClasses.includes(className)) {
                // Ajouter la nouvelle classe
                const classContent = this.extractClassContent(sourceContent, className);
                mergedContent += '\n\n' + classContent;
            }
        }
        
        return mergedContent;
    }

    extractClasses(content) {
        const classRegex = /class\s+(\w+)/g;
        const classes = [];
        let match;
        
        while ((match = classRegex.exec(content)) !== null) {
            classes.push(match[1]);
        }
        
        return classes;
    }

    extractClassContent(content, className) {
        const classRegex = new RegExp(`class\\s+${className}[\\s\\S]*?\\n\\s*\\n`, 'g');
        const match = classRegex.exec(content);
        
        return match ? match[0] : '';
    }

    async updateAppJs() {
        this.log('📝 Mise à jour d\'app.js après fusion...');
        
        try {
            const appJsPath = 'app.js';
            let appJsContent = '';
            
            if (fs.existsSync(appJsPath)) {
                appJsContent = fs.readFileSync(appJsPath, 'utf8');
            }
            
            // Collecter tous les drivers après fusion
            const allDrivers = this.collectAllDrivers();
            
            // Générer le nouveau contenu app.js
            const newAppJs = this.generateAppJsContent(allDrivers);
            fs.writeFileSync(appJsPath, newAppJs);
            
            this.log(`✅ app.js mis à jour avec ${allDrivers.length} drivers`);
            return allDrivers.length;
            
        } catch (error) {
            this.log(`❌ Erreur mise à jour app.js: ${error.message}`, 'error');
            return 0;
        }
    }

    collectAllDrivers() {
        const drivers = [];
        
        // Scanner drivers/tuya
        this.scanDriversDirectory('drivers/tuya', drivers);
        
        // Scanner drivers/zigbee
        this.scanDriversDirectory('drivers/zigbee', drivers);
        
        return drivers;
    }

    scanDriversDirectory(baseDir, drivers) {
        if (!fs.existsSync(baseDir)) return;
        
        const categories = fs.readdirSync(baseDir);
        
        for (const category of categories) {
            const categoryPath = path.join(baseDir, category);
            
            if (fs.statSync(categoryPath).isDirectory()) {
                const subcategories = fs.readdirSync(categoryPath);
                
                for (const subcategory of subcategories) {
                    const subcategoryPath = path.join(categoryPath, subcategory);
                    
                    if (fs.statSync(subcategoryPath).isDirectory()) {
                        const driverDirs = fs.readdirSync(subcategoryPath);
                        
                        for (const driverDir of driverDirs) {
                            const driverPath = path.join(subcategoryPath, driverDir);
                            const composePath = path.join(driverPath, 'driver.compose.json');
                            
                            if (fs.existsSync(composePath)) {
                                drivers.push({
                                    id: driverDir,
                                    path: path.relative('.', driverPath),
                                    category: category,
                                    subcategory: subcategory
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    generateAppJsContent(drivers) {
        const driverImports = drivers.map(driver =>
            `const ${driver.id.replace(/[-_]/g, '')} = require('${driver.path}');`
        ).join('\n');
        
        const driverRegistrations = drivers.map(driver =>
            `  this.registerDriver(${driver.id.replace(/[-_]/g, '')});`
        ).join('\n');
        
        return `'use strict';

const { HomeyApp } = require('homey');

// Driver imports
${driverImports}

class TuyaZigbeeApp extends HomeyApp {
  async onInit() {
    this.log('Tuya Zigbee App is running...');
    
    // Register all drivers
${driverRegistrations}
  }
}

module.exports = TuyaZigbeeApp;`;
    }

    async runFusion() {
        this.log('🚀 Début de la fusion tuya-light...');
        
        try {
            // Fusionner les drivers tuya-light
            const fusedCount = await this.fusionTuyaLightDrivers();
            
            // Mettre à jour app.js
            const updatedDrivers = await this.updateAppJs();
            
            // Générer le rapport final
            this.report.summary = {
                fusedDrivers: fusedCount,
                updatedDrivers: updatedDrivers,
                status: 'fusion_complete'
            };

            // Sauvegarder le rapport
            fs.writeFileSync('reports/fusion-tuya-light-report.json', JSON.stringify(this.report, null, 2));

            this.log(`🎉 Fusion tuya-light terminée!`);
            this.log(`📊 Drivers fusionnés: ${fusedCount}`);
            this.log(`📊 Drivers mis à jour: ${updatedDrivers}`);
            
            return this.report;

        } catch (error) {
            this.log(`❌ Erreur fusion tuya-light: ${error.message}`, 'error');
            return this.report;
        }
    }
}

// Fonction principale
async function main() {
    console.log('🚀 Début de la fusion tuya-light...');
    
    const fusion = new FusionTuyaLightDrivers();
    const report = await fusion.runFusion();
    
    console.log('✅ Fusion tuya-light terminée avec succès!');
    console.log(`📊 Rapport: reports/fusion-tuya-light-report.json`);
    
    return report;
}

// Exécuter si appelé directement
if (require.main === module) {
    main().then(result => {
        console.log('✅ Script terminé avec succès');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Erreur:', error);
        process.exit(1);
    });
}

module.exports = { FusionTuyaLightDrivers }; 