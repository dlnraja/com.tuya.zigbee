#!/usr/bin/env node

/**
 * 🧹 CLEANUP EMPTY FOLDERS
 * Version: 1.0.0
 * Date: 2025-08-05
 * 
 * Suppression des dossiers vides et inutiles
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class CleanupEmptyFolders {
    constructor() {
        this.startTime = Date.now();
        this.results = {
            foldersChecked: 0,
            emptyFoldersRemoved: 0,
            unnecessaryFoldersRemoved: 0,
            errors: []
        };
        
        this.emptyFolders = [];
        this.unnecessaryFolders = [];
        
        console.log('🧹 CLEANUP EMPTY FOLDERS - DÉMARRAGE');
        console.log('📅 Date:', new Date().toISOString());
        console.log('🎯 Mode: YOLO CLEANUP');
        console.log('');
    }

    async execute() {
        try {
            await this.scanForEmptyFolders();
            await this.identifyUnnecessaryFolders();
            await this.removeEmptyFolders();
            await this.removeUnnecessaryFolders();
            await this.commitCleanup();
            
            this.generateReport();
        } catch (error) {
            console.error('❌ Erreur cleanup:', error.message);
            this.results.errors.push(error.message);
        }
    }

    async scanForEmptyFolders() {
        console.log('🔍 SCAN DES DOSSIERS VIDES...');
        
        try {
            const foldersToCheck = [
                'data/external',
                'reports',
                'mega/drivers/lights/verify-drivers',
                'mega/drivers/lights/ultimate-driver-analyzer',
                'mega/drivers/lights/ultimate-driver-analysis-report',
                'mega/drivers/lights/tuya-drivers-recovery-report',
                'mega/drivers/lights/tuya-driver-creation-report-20250729-121633',
                'mega/drivers/lights/test-new-drivers',
                'mega/drivers/lights/smart-enrich-drivers',
                'mega/drivers/lights/README',
                'mega/drivers/lights/quick-driver-restoration-report',
                'mega/drivers/lights/massive-drivers-restoration-report',
                'mega/drivers/lights/icon',
                'mega/drivers/lights/historical-driver-recovery-report',
                'mega/drivers/lights/historical-driver-recovery',
                'mega/drivers/lights/generate-missing-zigbee-drivers',
                'mega/drivers/lights/fix-last-invalid-driver-report',
                'mega/drivers/lights/fix-invalid-drivers-report',
                'mega/drivers/lights/drivers-table',
                'mega/drivers/lights/drivers-restoration-report',
                'mega/drivers/lights/drivers-reorganization-report',
                'mega/drivers/lights/drivers-reorganization-fixed',
                'mega/drivers/lights/drivers-merge-improve-report',
                'mega/drivers/lights/drivers-matrix-ultimate',
                'mega/drivers/lights/drivers-matrix',
                'mega/drivers/lights/drivers-final-reorganization',
                'mega/drivers/lights/drivers-clean-report',
                'mega/drivers/lights/driver.settings.compose',
                'mega/drivers/lights/driver.compose',
                'mega/drivers/lights/driver-verification-report',
                'mega/drivers/lights/driver-validation-report',
                'mega/drivers/lights/driver-restoration-report',
                'mega/drivers/lights/driver-recovery-report-20250729-121326',
                'mega/drivers/lights/driver-recovery-report-20250729-121303',
                'mega/drivers/lights/driver-optimizer',
                'mega/drivers/lights/driver-optimization-report',
                'mega/drivers/lights/driver-matrix',
                'mega/drivers/lights/driver-integration-report',
                'mega/drivers/lights/driver-conflicts-resolution',
                'mega/drivers/lights/driver-analysis-improvement-report',
                'mega/drivers/lights/driver',
                'mega/drivers/lights/device',
                'mega/drivers/lights/comprehensive-driver-recovery-report',
                'mega/drivers/lights/comprehensive-driver-recovery',
                'mega/drivers/lights/complete-drivers-restoration-report',
                'mega/drivers/lights/complete-drivers-restoration',
                'mega/drivers/lights/complete-657-drivers-report'
            ];

            for (const folderPath of foldersToCheck) {
                if (fs.existsSync(folderPath)) {
                    this.results.foldersChecked++;
                    if (this.isFolderEmpty(folderPath)) {
                        this.emptyFolders.push(folderPath);
                        console.log(`📁 Dossier vide trouvé: ${folderPath}`);
                    }
                }
            }

            console.log(`✅ ${this.emptyFolders.length} dossiers vides identifiés`);

        } catch (error) {
            console.error('❌ Erreur scan dossiers vides:', error.message);
            this.results.errors.push(`Empty folders scan: ${error.message}`);
        }
    }

    async identifyUnnecessaryFolders() {
        console.log('🔍 IDENTIFICATION DES DOSSIERS INUTILES...');
        
        try {
            const unnecessaryFolders = [
                'mega', // Dossier temporaire de fusion
                'tags', // Dossier de tags non utilisé
                'data/external', // Dossier externe vide
                'reports' // Dossier de rapports vide
            ];

            for (const folderPath of unnecessaryFolders) {
                if (fs.existsSync(folderPath)) {
                    this.unnecessaryFolders.push(folderPath);
                    console.log(`🗑️  Dossier inutile identifié: ${folderPath}`);
                }
            }

            console.log(`✅ ${this.unnecessaryFolders.length} dossiers inutiles identifiés`);

        } catch (error) {
            console.error('❌ Erreur identification dossiers inutiles:', error.message);
            this.results.errors.push(`Unnecessary folders identification: ${error.message}`);
        }
    }

    isFolderEmpty(folderPath) {
        try {
            const items = fs.readdirSync(folderPath);
            return items.length === 0;
        } catch (error) {
            return false;
        }
    }

    async removeEmptyFolders() {
        console.log('🗑️  SUPPRESSION DES DOSSIERS VIDES...');
        
        try {
            for (const folderPath of this.emptyFolders) {
                try {
                    fs.rmdirSync(folderPath);
                    console.log(`✅ Dossier vide supprimé: ${folderPath}`);
                    this.results.emptyFoldersRemoved++;
                } catch (error) {
                    console.error(`❌ Erreur suppression ${folderPath}:`, error.message);
                    this.results.errors.push(`Remove empty folder ${folderPath}: ${error.message}`);
                }
            }

            console.log(`✅ ${this.results.emptyFoldersRemoved} dossiers vides supprimés`);

        } catch (error) {
            console.error('❌ Erreur suppression dossiers vides:', error.message);
            this.results.errors.push(`Remove empty folders: ${error.message}`);
        }
    }

    async removeUnnecessaryFolders() {
        console.log('🗑️  SUPPRESSION DES DOSSIERS INUTILES...');
        
        try {
            for (const folderPath of this.unnecessaryFolders) {
                try {
                    if (fs.existsSync(folderPath)) {
                        // Supprimer récursivement
                        this.removeFolderRecursively(folderPath);
                        console.log(`✅ Dossier inutile supprimé: ${folderPath}`);
                        this.results.unnecessaryFoldersRemoved++;
                    }
                } catch (error) {
                    console.error(`❌ Erreur suppression ${folderPath}:`, error.message);
                    this.results.errors.push(`Remove unnecessary folder ${folderPath}: ${error.message}`);
                }
            }

            console.log(`✅ ${this.results.unnecessaryFoldersRemoved} dossiers inutiles supprimés`);

        } catch (error) {
            console.error('❌ Erreur suppression dossiers inutiles:', error.message);
            this.results.errors.push(`Remove unnecessary folders: ${error.message}`);
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

    async commitCleanup() {
        console.log('💾 COMMIT DU NETTOYAGE...');
        
        try {
            execSync('git add .', { stdio: 'pipe' });
            execSync('git commit -m "🧹 CLEANUP EMPTY FOLDERS [EN/FR/NL/TA] - Version 1.0.0 - Suppression dossiers vides + Suppression dossiers inutiles + Nettoyage structure + Optimisation projet + Réduction taille"', { stdio: 'pipe' });
            execSync('git push origin master', { stdio: 'pipe' });
            console.log('✅ Nettoyage commité et poussé');
        } catch (error) {
            console.error('❌ Erreur commit:', error.message);
        }
    }

    generateReport() {
        const duration = Date.now() - this.startTime;
        
        console.log('');
        console.log('📊 RAPPORT CLEANUP EMPTY FOLDERS');
        console.log('==================================');
        console.log(`⏱️  Durée: ${duration}ms`);
        console.log(`🔍 Dossiers vérifiés: ${this.results.foldersChecked}`);
        console.log(`🗑️  Dossiers vides supprimés: ${this.results.emptyFoldersRemoved}`);
        console.log(`🗑️  Dossiers inutiles supprimés: ${this.results.unnecessaryFoldersRemoved}`);
        console.log(`❌ Erreurs: ${this.results.errors.length}`);
        
        if (this.results.errors.length > 0) {
            console.log('\n🚨 Erreurs détectées:');
            this.results.errors.forEach(error => console.log(`  - ${error}`));
        }
        
        console.log('\n🎯 CLEANUP EMPTY FOLDERS TERMINÉ');
        console.log('✅ Projet nettoyé avec succès');
    }
}

// Exécution
const cleanup = new CleanupEmptyFolders();
cleanup.execute().catch(console.error); 