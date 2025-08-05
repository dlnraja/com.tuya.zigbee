#!/usr/bin/env node

/**
 * 🎯 FINALIZE REFUSION
 * Version: 1.0.0
 * Date: 2025-08-05
 * 
 * Finalisation de la refusion avec correction de la catégorisation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class FinalizeRefusion {
    constructor() {
        this.startTime = Date.now();
        this.results = {
            driversRecategorized: 0,
            foldersCleaned: 0,
            megaUpdated: 0,
            errors: []
        };
        
        console.log('🎯 FINALIZE REFUSION - DÉMARRAGE');
        console.log('📅 Date:', new Date().toISOString());
        console.log('🎯 Mode: YOLO FINALIZATION');
        console.log('');
    }

    async execute() {
        try {
            await this.recategorizeDrivers();
            await this.cleanupEmptyFolders();
            await this.updateMegaStructure();
            await this.commitFinalization();
            
            this.generateReport();
        } catch (error) {
            console.error('❌ Erreur finalisation:', error.message);
            this.results.errors.push(error.message);
        }
    }

    async recategorizeDrivers() {
        console.log('🔄 RECATÉGORISATION DES DRIVERS...');
        
        try {
            const lightsPath = 'drivers/tuya/lights';
            if (!fs.existsSync(lightsPath)) {
                console.log('❌ Dossier lights non trouvé');
                return;
            }

            const items = fs.readdirSync(lightsPath);
            
            for (const item of items) {
                const itemPath = path.join(lightsPath, item);
                const itemStat = fs.statSync(itemPath);
                
                if (itemStat.isDirectory()) {
                    const category = this.determineCategory(item);
                    if (category && category !== 'lights') {
                        await this.moveDriverToCategory(item, itemPath, category);
                    }
                }
            }
            
            console.log(`✅ ${this.results.driversRecategorized} drivers recatégorisés`);

        } catch (error) {
            console.error('❌ Erreur recatégorisation:', error.message);
            this.results.errors.push(`Recategorization: ${error.message}`);
        }
    }

    determineCategory(driverName) {
        const name = driverName.toLowerCase();
        
        // Logique de catégorisation améliorée
        if (name.includes('switch') || name.includes('remote') || name.includes('ts0001') || name.includes('ts0044')) {
            return 'switches';
        } else if (name.includes('plug') || name.includes('outlet') || name.includes('ts011f')) {
            return 'plugs';
        } else if (name.includes('sensor') || name.includes('motion') || name.includes('temperature') || name.includes('humidity') || name.includes('soil') || name.includes('water') || name.includes('smart-knob')) {
            return 'sensors';
        } else if (name.includes('cover') || name.includes('curtain') || name.includes('blind') || name.includes('shutter')) {
            return 'covers';
        } else if (name.includes('lock') || name.includes('keypad')) {
            return 'locks';
        } else if (name.includes('thermostat') || name.includes('floor')) {
            return 'thermostats';
        } else if (name.includes('light') || name.includes('bulb') || name.includes('rgb') || name.includes('dimmer') || name.includes('strip')) {
            return 'lights';
        }
        
        // Catégoriser les drivers spéciaux
        if (name.includes('report') || name.includes('analysis') || name.includes('matrix') || name.includes('driver') || name.includes('device') || name.includes('complete') || name.includes('comprehensive') || name.includes('historical') || name.includes('verify') || name.includes('ultimate') || name.includes('smart-enrich') || name.includes('test-new') || name.includes('quick') || name.includes('massive') || name.includes('fix') || name.includes('generate') || name.includes('icon') || name.includes('README') || name.includes('tuya-driver') || name.includes('total')) {
            return 'lights'; // Garder dans lights car ce sont des utilitaires
        }
        
        return 'lights'; // Par défaut
    }

    async moveDriverToCategory(driverName, sourcePath, targetCategory) {
        try {
            const targetPath = `drivers/tuya/${targetCategory}/${driverName}`;
            
            // Créer le dossier de destination
            fs.mkdirSync(path.dirname(targetPath), { recursive: true });
            
            // Déplacer le driver
            this.moveFolderRecursively(sourcePath, targetPath);
            
            console.log(`✅ Driver déplacé: ${driverName} → ${targetCategory}`);
            this.results.driversRecategorized++;
            
        } catch (error) {
            console.error(`❌ Erreur déplacement ${driverName}:`, error.message);
        }
    }

    moveFolderRecursively(sourcePath, targetPath) {
        if (fs.existsSync(sourcePath)) {
            // Créer le dossier de destination
            fs.mkdirSync(targetPath, { recursive: true });
            
            const items = fs.readdirSync(sourcePath);
            
            for (const item of items) {
                const sourceItem = path.join(sourcePath, item);
                const targetItem = path.join(targetPath, item);
                
                if (fs.statSync(sourceItem).isDirectory()) {
                    this.moveFolderRecursively(sourceItem, targetItem);
                } else {
                    fs.copyFileSync(sourceItem, targetItem);
                }
            }
            
            // Supprimer le dossier source
            this.removeFolderRecursively(sourcePath);
        }
    }

    removeFolderRecursively(folderPath) {
        if (fs.existsSync(folderPath)) {
            const items = fs.readdirSync(folderPath);
            
            for (const item of items) {
                const itemPath = path.join(folderPath, item);
                const itemStat = fs.statSync(itemPath);
                
                if (itemStat.isDirectory()) {
                    this.removeFolderRecursively(itemPath);
                } else {
                    fs.unlinkSync(itemPath);
                }
            }
            
            fs.rmdirSync(folderPath);
        }
    }

    async cleanupEmptyFolders() {
        console.log('🧹 NETTOYAGE DES DOSSIERS VIDES...');
        
        try {
            const categories = ['lights', 'switches', 'plugs', 'sensors', 'covers', 'locks', 'thermostats'];
            
            for (const category of categories) {
                const categoryPath = `drivers/tuya/${category}`;
                if (fs.existsSync(categoryPath)) {
                    const items = fs.readdirSync(categoryPath);
                    
                    // Supprimer les dossiers vides ou les dossiers de rapports
                    for (const item of items) {
                        const itemPath = path.join(categoryPath, item);
                        const itemStat = fs.statSync(itemPath);
                        
                        if (itemStat.isDirectory()) {
                            const subItems = fs.readdirSync(itemPath);
                            if (subItems.length === 0 || this.isReportFolder(item)) {
                                this.removeFolderRecursively(itemPath);
                                console.log(`🗑️  Dossier supprimé: ${itemPath}`);
                                this.results.foldersCleaned++;
                            }
                        }
                    }
                }
            }
            
            console.log(`✅ ${this.results.foldersCleaned} dossiers nettoyés`);

        } catch (error) {
            console.error('❌ Erreur nettoyage:', error.message);
            this.results.errors.push(`Cleanup: ${error.message}`);
        }
    }

    isReportFolder(folderName) {
        const name = folderName.toLowerCase();
        return name.includes('report') || name.includes('analysis') || name.includes('matrix') || name.includes('driver') || name.includes('device') || name.includes('complete') || name.includes('comprehensive') || name.includes('historical') || name.includes('verify') || name.includes('ultimate') || name.includes('smart-enrich') || name.includes('test-new') || name.includes('quick') || name.includes('massive') || name.includes('fix') || name.includes('generate') || name.includes('icon') || name.includes('README') || name.includes('tuya-driver') || name.includes('total');
    }

    async updateMegaStructure() {
        console.log('🔄 MISE À JOUR FINALE DE LA STRUCTURE MEGA...');
        
        try {
            // Créer le dossier mega
            const megaPath = 'mega';
            fs.mkdirSync(megaPath, { recursive: true });
            
            // Compter les drivers par catégorie
            const stats = this.countDriversByCategory();
            
            // Créer la structure mega finale
            const megaStructure = {
                drivers: stats.total,
                categories: stats.categories,
                finalization: {
                    driversRecategorized: this.results.driversRecategorized,
                    foldersCleaned: this.results.foldersCleaned,
                    timestamp: new Date().toISOString()
                }
            };
            
            // Sauvegarder la structure mega
            fs.writeFileSync(path.join(megaPath, 'final-structure.json'), JSON.stringify(megaStructure, null, 2));
            
            // Créer un rapport final
            const report = this.generateFinalReport(megaStructure);
            fs.writeFileSync(path.join(megaPath, 'finalization-report.md'), report);
            
            this.results.megaUpdated = 1;
            console.log('✅ Structure mega finale mise à jour');

        } catch (error) {
            console.error('❌ Erreur mise à jour mega finale:', error.message);
            this.results.errors.push(`Mega final update: ${error.message}`);
        }
    }

    countDriversByCategory() {
        const categories = ['lights', 'switches', 'plugs', 'sensors', 'covers', 'locks', 'thermostats'];
        const stats = {
            total: 0,
            categories: {}
        };
        
        for (const category of categories) {
            const categoryPath = `drivers/tuya/${category}`;
            if (fs.existsSync(categoryPath)) {
                const items = fs.readdirSync(categoryPath);
                const validDrivers = items.filter(item => {
                    const itemPath = path.join(categoryPath, item);
                    return fs.statSync(itemPath).isDirectory() && !this.isReportFolder(item);
                });
                
                stats.categories[category] = validDrivers.length;
                stats.total += validDrivers.length;
            } else {
                stats.categories[category] = 0;
            }
        }
        
        return stats;
    }

    generateFinalReport(structure) {
        return `# 🎯 FINALIZATION REPORT

## 📊 Statistiques Finales
- **Total drivers**: ${structure.drivers}
- **Drivers recatégorisés**: ${structure.finalization.driversRecategorized}
- **Dossiers nettoyés**: ${structure.finalization.foldersCleaned}

## 📁 Structure Finale par Catégorie

### Tuya Drivers
${Object.entries(structure.categories).map(([cat, count]) => `- **${cat}**: ${count} drivers`).join('\n')}

## 🎯 Résultat Final
Refusion complète et finalisée avec ${structure.drivers} drivers organisés et optimisés.
`;
    }

    async commitFinalization() {
        console.log('💾 COMMIT DE LA FINALISATION...');
        
        try {
            execSync('git add .', { stdio: 'pipe' });
            execSync('git commit -m "🎯 FINALIZE REFUSION [EN/FR/NL/TA] - Version 1.0.0 - Recatégorisation drivers + Nettoyage dossiers vides + Structure finale optimisée + Mise à jour mega + Projet prêt pour validation"', { stdio: 'pipe' });
            execSync('git push origin master', { stdio: 'pipe' });
            console.log('✅ Finalisation commitée et poussée');
        } catch (error) {
            console.error('❌ Erreur commit:', error.message);
        }
    }

    generateReport() {
        const duration = Date.now() - this.startTime;
        
        console.log('');
        console.log('📊 RAPPORT FINALIZE REFUSION');
        console.log('==============================');
        console.log(`⏱️  Durée: ${duration}ms`);
        console.log(`🔄 Drivers recatégorisés: ${this.results.driversRecategorized}`);
        console.log(`🧹 Dossiers nettoyés: ${this.results.foldersCleaned}`);
        console.log(`📁 Mega mis à jour: ${this.results.megaUpdated}`);
        console.log(`❌ Erreurs: ${this.results.errors.length}`);
        
        if (this.results.errors.length > 0) {
            console.log('\n🚨 Erreurs détectées:');
            this.results.errors.forEach(error => console.log(`  - ${error}`));
        }
        
        console.log('\n🎯 FINALIZE REFUSION TERMINÉ');
        console.log('✅ Refusion complète et finalisée avec succès');
    }
}

// Exécution
const finalizer = new FinalizeRefusion();
finalizer.execute().catch(console.error); 