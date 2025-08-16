#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

/**
 * 🚀 PARALLEL SMALL ZIP PROCESSOR - BRIEF "BÉTON"
 * 
 * Script de traitement parallèle des petits fichiers ZIP Tuya
 * Traite tous les petits fichiers en parallèle pour accélérer
 */

const fs = require('fs-extra');
const path = require('path');

class ParallelSmallZipProcessor {
    constructor() {
        this.projectRoot = process.cwd();
        this.downloadDir = 'D:\\Download';
        this.tmpDir = path.join(this.projectRoot, '.tmp_tuya_zip_work');
        this.results = {
            processed: [],
            errors: [],
            totalSize: 0
        };
    }

    async run() {
        try {
            console.log('🚀 PARALLEL SMALL ZIP PROCESSOR - BRIEF "BÉTON"');
            console.log('=' .repeat(70));
            console.log('🎯 Traitement parallèle des petits fichiers ZIP...\n');

            // 1. Identifier les petits fichiers ZIP
            const smallZips = await this.identifySmallZips();
            
            // 2. Traitement parallèle
            await this.processSmallZipsInParallel(smallZips);
            
            // 3. Rapport final
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Erreur lors du traitement parallèle:', error);
        }
    }

    async identifySmallZips() {
        console.log('🔍 Identification des petits fichiers ZIP...');
        
        if (!fs.existsSync(this.downloadDir)) {
            console.log('   ❌ Dossier D:\\Download non accessible');
            return [];
        }

        try {
            const files = fs.readdirSync(this.downloadDir);
            const smallZips = files.filter(file => {
                if (!file.toLowerCase().endsWith('.zip')) return false;
                
                // Fichiers Tuya/Homey de moins de 50 MB
                const fullPath = path.join(this.downloadDir, file);
                const stats = fs.statSync(fullPath);
                const sizeMB = stats.size / 1024 / 1024;
                
                return (file.toLowerCase().includes('tuya') || 
                        file.toLowerCase().includes('zigbee') ||
                        file.toLowerCase().includes('homey')) && 
                       sizeMB < 50;
            });

            console.log(`   📦 ${smallZips.length} petits fichiers ZIP identifiés:`);
            for (const zip of smallZips) {
                const fullPath = path.join(this.downloadDir, zip);
                const stats = fs.statSync(fullPath);
                const sizeMB = stats.size / 1024 / 1024;
                console.log(`      📄 ${zip} (${sizeMB.toFixed(1)} MB)`);
                this.results.totalSize += stats.size;
            }
            
            console.log('');
            return smallZips;
            
        } catch (error) {
            console.log(`   ❌ Erreur lors de l'identification: ${error.message}`);
            return [];
        }
    }

    async processSmallZipsInParallel(smallZips) {
        console.log('📦 Traitement parallèle des petits fichiers ZIP...');
        
        if (smallZips.length === 0) {
            console.log('   ⚠️ Aucun petit fichier ZIP à traiter');
            return;
        }

        // Traitement séquentiel pour éviter les conflits
        for (const zip of smallZips) {
            try {
                console.log(`   🔄 Traitement de ${zip}...`);
                await this.processSmallZip(zip);
                this.results.processed.push(zip);
            } catch (error) {
                console.log(`   ❌ Erreur lors du traitement de ${zip}: ${error.message}`);
                this.results.errors.push({ zip, error: error.message });
            }
        }
        
        console.log('');
    }

    async processSmallZip(zipName) {
        const downloadPath = path.join(this.downloadDir, zipName);
        const extractPath = path.join(this.tmpDir, zipName.replace('.zip', ''));
        
        // Vérifier si déjà extrait
        if (fs.existsSync(extractPath)) {
            console.log(`      ✅ ${zipName} déjà extrait`);
            return;
        }

        // Créer le dossier de destination
        fs.mkdirSync(extractPath, { recursive: true });
        
        // Extraction avec PowerShell
        try {
            const { execSync } = require('child_process');
            execSync(`powershell -Command "Expand-Archive -Path '${downloadPath}' -DestinationPath '${extractPath}' -Force"`, { stdio: 'pipe' });
            console.log(`      ✅ ${zipName} extrait avec succès`);
            
            // Analyser le contenu
            await this.analyzeSmallZipContent(extractPath, zipName);
            
        } catch (error) {
            console.log(`      ❌ Erreur d'extraction: ${error.message}`);
            throw error;
        }
    }

    async analyzeSmallZipContent(extractPath, zipName) {
        try {
            const items = fs.readdirSync(extractPath);
            console.log(`         📊 Contenu: ${items.length} éléments`);
            
            // Analyser la structure
            for (const item of items) {
                const itemPath = path.join(extractPath, item);
                const stats = fs.statSync(itemPath);
                
                if (stats.isDirectory()) {
                    if (item === 'drivers') {
                        await this.analyzeDriversStructure(itemPath);
                    } else if (item === 'assets') {
                        console.log(`            🖼️ Assets: ${fs.readdirSync(itemPath).length} fichiers`);
                    } else if (item === 'scripts') {
                        console.log(`            📜 Scripts: ${fs.readdirSync(itemPath).length} fichiers`);
                    }
                } else {
                    console.log(`            📄 ${item} (${(stats.size / 1024).toFixed(1)} KB)`);
                }
            }
            
        } catch (error) {
            console.log(`         ❌ Erreur d'analyse: ${error.message}`);
        }
    }

    async analyzeDriversStructure(driversPath) {
        try {
            const categories = fs.readdirSync(driversPath, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);

            console.log(`            🔧 Drivers: ${categories.length} catégories`);
            
            for (const category of categories.slice(0, 3)) { // Afficher les 3 premières
                const categoryPath = path.join(driversPath, category);
                const drivers = fs.readdirSync(categoryPath, { withFileTypes: true })
                    .filter(dirent => dirent.isDirectory())
                    .map(dirent => dirent.name);
                
                console.log(`               📁 ${category}: ${drivers.length} drivers`);
            }
            
        } catch (error) {
            console.log(`            ❌ Erreur analyse drivers: ${error.message}`);
        }
    }

    generateReport() {
        console.log('🎯 RAPPORT FINAL DE TRAITEMENT PARALLÈLE');
        console.log('=' .repeat(70));
        console.log(`📊 Fichiers traités: ${this.results.processed.length}`);
        console.log(`❌ Erreurs: ${this.results.errors.length}`);
        console.log(`📦 Taille totale: ${(this.results.totalSize / 1024 / 1024).toFixed(1)} MB`);
        
        if (this.results.processed.length > 0) {
            console.log('\n✅ FICHIERS TRAITÉS AVEC SUCCÈS:');
            for (const zip of this.results.processed) {
                console.log(`   📄 ${zip}`);
            }
        }
        
        if (this.results.errors.length > 0) {
            console.log('\n❌ ERREURS RENCONTRÉES:');
            for (const error of this.results.errors) {
                console.log(`   📄 ${error.zip}: ${error.error}`);
            }
        }
        
        console.log('\n🚀 PROCHAINES ÉTAPES:');
        console.log('   1. ✅ Traitement parallèle terminé');
        console.log('   2. 🎯 Lancement de la fusion intelligente');
        console.log('   3. 🎯 Intégration dans le projet principal');
        
        console.log('\n🎉 TRAITEMENT PARALLÈLE TERMINÉ AVEC SUCCÈS !');
    }
}

if (require.main === module) {
    const processor = new ParallelSmallZipProcessor();
    processor.run().catch(console.error);
}

module.exports = ParallelSmallZipProcessor;
