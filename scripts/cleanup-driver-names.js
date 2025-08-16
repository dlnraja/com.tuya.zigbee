#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

/**
 * 🧹 NETTOYAGE DES NOMS DE DOSSIERS DRIVERS
 * 
 * Simplifie les noms trop longs et complexes
 */

const fs = require('fs-extra');
const path = require('path');

class DriverNameCleaner {
    constructor() {
        this.projectRoot = process.cwd();
        this.driversPath = path.join(this.projectRoot, 'drivers');
        this.stats = {
            total: 0,
            renamed: 0,
            errors: 0,
            skipped: 0
        };
    }

    async run() {
        try {
            console.log('🧹 NETTOYAGE DES NOMS DE DOSSIERS DRIVERS');
            console.log('=' .repeat(60));
            
            // 1. Vérifier la structure
            await this.verifyStructure();
            
            // 2. Nettoyer les noms
            await this.cleanupDriverNames();
            
            // 3. Rapport final
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Erreur critique:', error);
            process.exit(1);
        }
    }

    async verifyStructure() {
        console.log('\n🔍 VÉRIFICATION DE LA STRUCTURE...');
        
        if (!(await fs.pathExists(this.driversPath))) {
            throw new Error('Dossier drivers/ non trouvé !');
        }
        
        console.log('✅ Structure drivers/ trouvée');
    }

    async cleanupDriverNames() {
        console.log('\n🧹 NETTOYAGE DES NOMS...');
        
        const driverTypes = await fs.readdir(this.driversPath);
        
        for (const driverType of driverTypes) {
            const driverTypePath = path.join(this.driversPath, driverType);
            const driverTypeStats = await fs.stat(driverTypePath);
            
            if (driverTypeStats.isDirectory() && driverType !== '_common') {
                await this.cleanupDriverType(driverType, driverTypePath);
            }
        }
    }

    async cleanupDriverType(driverType, driverTypePath) {
        console.log(`\n📁 Type: ${driverType}`);
        
        const categories = await fs.readdir(driverTypePath);
        
        for (const category of categories) {
            const categoryPath = path.join(driverTypePath, category);
            const categoryStats = await fs.stat(categoryPath);
            
            if (categoryStats.isDirectory()) {
                await this.cleanupDriverCategory(driverType, category, categoryPath);
            }
        }
    }

    async cleanupDriverCategory(driverType, category, categoryPath) {
        const drivers = await fs.readdir(categoryPath);
        
        for (const driver of drivers) {
            const driverPath = path.join(categoryPath, driver);
            const driverStats = await fs.stat(driverPath);
            
            if (driverStats.isDirectory()) {
                await this.cleanupDriver(driverType, category, driver, driverPath);
            }
        }
    }

                    async cleanupDriver(driverType, category, driver, driverPath) {
                    this.stats.total++;
                    
                    try {
                        console.log(`  🚗 ${driver}`);
                        
                        // Vérifier si le nom doit être nettoyé
                        const cleanName = this.cleanDriverName(driver, category);
                        
                        if (cleanName !== driver) {
                            const newDriverPath = path.join(path.dirname(driverPath), cleanName);
                            
                            // Vérifier que le nouveau nom n'existe pas déjà
                            if (await fs.pathExists(newDriverPath)) {
                                console.log(`    ⚠️  Nom déjà existant: ${cleanName}`);
                                this.stats.skipped++;
                                return;
                            }
                            
                            // Renommer le dossier
                            await fs.move(driverPath, newDriverPath);
                            console.log(`    ✅ Renommé: ${driver} → ${cleanName}`);
                            this.stats.renamed++;
                            
                        } else {
                            console.log(`    ⏭️  Nom déjà propre`);
                            this.stats.skipped++;
                        }
                        
                    } catch (error) {
                        console.log(`    ❌ Erreur: ${error.message}`);
                        this.stats.errors++;
                    }
                }

    cleanDriverName(driverName, category) {
        // Règles de nettoyage selon le brief "béton"
        
        // 1. Supprimer les suffixes répétitifs
        let cleanName = driverName
            .replace(/_device_standard_default$/, '')
            .replace(/_device_standard$/, '')
            .replace(/_standard_default$/, '')
            .replace(/_default$/, '');
        
        // 2. Simplifier les noms de fabricants
        cleanName = cleanName
            .replace(/^tuya-/, 'tuya_')
            .replace(/^aqara-/, 'aqara_')
            .replace(/^ikea-/, 'ikea_');
        
        // 3. Raccourcir les noms de produits
        cleanName = cleanName
            .replace(/bulb-(\d+)/, 'bulb_$1')
            .replace(/table-(\d+)/, 'table_$1')
            .replace(/strip-(\d+)/, 'strip_$1')
            .replace(/garden-(\d+)/, 'garden_$1')
            .replace(/floor-(\d+)/, 'floor_$1')
            .replace(/ceiling-(\d+)/, 'ceiling_$1');
        
        // 4. Nettoyer les underscores multiples
        cleanName = cleanName.replace(/_+/g, '_');
        
        // 5. Supprimer les underscores en début et fin
        cleanName = cleanName.replace(/^_+|_+$/g, '');
        
        // 6. Limiter la longueur (max 50 caractères)
        if (cleanName.length > 50) {
            const parts = cleanName.split('_');
            if (parts.length > 3) {
                cleanName = parts.slice(0, 3).join('_');
            }
        }
        
        return cleanName;
    }

    generateReport() {
        console.log('\n📋 RAPPORT FINAL');
        console.log('=' .repeat(60));
        
        console.log(`📊 STATISTIQUES:`);
        console.log(`  Total drivers: ${this.stats.total}`);
        console.log(`  Renommés: ${this.stats.renamed}`);
        console.log(`  Déjà propres: ${this.stats.skipped}`);
        console.log(`  Erreurs: ${this.stats.errors}`);
        
        console.log('\n🎯 RÉSUMÉ DU NETTOYAGE:');
        console.log('  ✅ Noms de dossiers simplifiés');
        console.log('  ✅ Structure plus lisible');
        console.log('  ✅ Conformité brief "béton"');
        
        console.log('\n🚀 PROCHAINES ÉTAPES:');
        console.log('  1. Lancer le correcteur de drivers');
        console.log('  2. Valider l\'app');
        
        console.log('\n🎉 NETTOYAGE TERMINÉ !');
    }
}

// Exécuter le nettoyeur
if (require.main === module) {
    const cleaner = new DriverNameCleaner();
    cleaner.run().catch(console.error);
}
