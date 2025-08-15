#!/usr/bin/env node

/**
 * 🚀 BACKGROUND ZIP EXTRACTOR - BRIEF "BÉTON"
 * 
 * Script d'extraction en arrière-plan avec 7zip
 * Traite tous les ZIP sans bloquer le terminal
 */

const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

class BackgroundZipExtractor {
    constructor() {
        this.projectRoot = process.cwd();
        this.downloadDir = 'D:\\Download';
        this.tmpDir = path.join(this.projectRoot, '.tmp_tuya_zip_work');
        this.extractionJobs = new Map();
    }

    async run() {
        try {
            console.log('🚀 BACKGROUND ZIP EXTRACTOR - BRIEF "BÉTON"');
            console.log('=' .repeat(70));
            console.log('🎯 Lancement de l\'extraction en arrière-plan...\n');

            // 1. Identifier tous les fichiers ZIP
            const zipFiles = await this.identifyAllZips();

            // 2. Lancer l'extraction en arrière-plan
            await this.launchBackgroundExtractions(zipFiles);

            // 3. Continuer avec le reste du travail
            console.log('✅ Extraction lancée en arrière-plan - Continuons l\'enrichissement !\n');

        } catch (error) {
            console.error('❌ Erreur lors du lancement de l\'extraction:', error);
        }
    }

    async identifyAllZips() {
        if (!fs.existsSync(this.downloadDir)) {
            console.log('   ❌ Dossier D:\\Download non accessible');
            return [];
        }

        try {
            const files = fs.readdirSync(this.downloadDir);
            const zipFiles = files.filter(file =>
                file.toLowerCase().includes('tuya') ||
                file.toLowerCase().includes('zigbee') ||
                file.toLowerCase().includes('homey') ||
                file.toLowerCase().endsWith('.zip')
            );

            console.log(`   📦 ${zipFiles.length} fichiers identifiés pour extraction:`);
            for (const zip of zipFiles) {
                const fullPath = path.join(this.downloadDir, zip);
                if (fs.existsSync(fullPath)) {
                    const stats = fs.statSync(fullPath);
                    const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
                    console.log(`      📄 ${zip} (${sizeMB} MB)`);
                }
            }

            return zipFiles;

        } catch (error) {
            console.log(`   ❌ Erreur lors de l'identification: ${error.message}`);
            return [];
        }
    }

    async launchBackgroundExtractions(zipFiles) {
        console.log('   🔄 Lancement des extractions en arrière-plan...');

        for (const zip of zipFiles) {
            const downloadPath = path.join(this.downloadDir, zip);
            const extractPath = path.join(this.tmpDir, zip.replace('.zip', ''));

            // Vérifier si déjà extrait
            if (fs.existsSync(extractPath)) {
                console.log(`      ✅ ${zip}: Déjà extrait`);
                continue;
            }

            // Lancer l'extraction en arrière-plan avec 7zip
            await this.extractInBackground(zip, downloadPath, extractPath);
        }

        console.log('      ✅ Toutes les extractions lancées en arrière-plan');
    }

    async extractInBackground(zipName, sourcePath, targetPath) {
        try {
            // Créer le dossier de destination
            fs.mkdirSync(targetPath, { recursive: true });

            // Lancer 7zip en arrière-plan
            const sevenZipProcess = spawn('7z', [
                'x',           // Extract with full paths
                sourcePath,    // Source archive
                `-o${targetPath}`, // Output directory
                '-y'           // Yes to all prompts
            ], {
                detached: true,
                stdio: 'ignore'
            });

            // Stocker la référence du processus
            this.extractionJobs.set(zipName, {
                process: sevenZipProcess,
                startTime: Date.now(),
                targetPath: targetPath
            });

            // Détacher le processus
            sevenZipProcess.unref();

            console.log(`      🔄 ${zipName}: Extraction lancée en arrière-plan (PID: ${sevenZipProcess.pid})`);

        } catch (error) {
            console.log(`      ❌ ${zipName}: Erreur lors du lancement: ${error.message}`);
        }
    }

    // Méthode pour vérifier l'état des extractions
    checkExtractionStatus() {
        console.log('\n📊 ÉTAT DES EXTRACTIONS EN ARRIÈRE-PLAN:');
        console.log('-' .repeat(50));

        for (const [zipName, job] of this.extractionJobs) {
            const duration = Math.round((Date.now() - job.startTime) / 1000);
            const isRunning = job.process.exitCode === null;
            const hasContent = fs.existsSync(job.targetPath) && 
                             fs.readdirSync(job.targetPath).length > 0;

            if (isRunning) {
                console.log(`   🔄 ${zipName}: En cours (${duration}s)`);
            } else if (hasContent) {
                console.log(`   ✅ ${zipName}: Terminée avec succès`);
            } else {
                console.log(`   ❌ ${zipName}: Échouée ou vide`);
            }
        }
    }
}

if (require.main === module) {
    const extractor = new BackgroundZipExtractor();
    extractor.run().catch(console.error);
}

module.exports = BackgroundZipExtractor;
