#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

/**
 * 🎮 ZIP PROCESSOR CONTROLLER - BRIEF "BÉTON"
 * 
 * Script de contrôle pour gérer le processus d'extraction ZIP en arrière-plan
 * Permet de démarrer, arrêter, surveiller et contrôler l'extraction
 */

const BackgroundZipProcessor = require('./background-zip-processor');
const fs = require('fs-extra');
const path = require('path');

class ZipProcessorController {
    constructor() {
        this.processor = null;
        this.isRunning = false;
        this.statusFile = path.join(process.cwd(), '.tmp_background_zip', 'extraction-status.json');
    }

    async run() {
        try {
            console.log('🎮 ZIP PROCESSOR CONTROLLER - BRIEF "BÉTON"');
            console.log('=' .repeat(70));
            console.log('🎯 Contrôleur du processus d\'extraction ZIP...\n');

            // Afficher le menu principal
            await this.showMainMenu();

        } catch (error) {
            console.error('❌ Erreur dans le contrôleur:', error);
        }
    }

    async showMainMenu() {
        while (true) {
            console.log('\n🎮 MENU PRINCIPAL - ZIP PROCESSOR');
            console.log('=' .repeat(50));
            console.log('1. 🚀 Démarrer l\'extraction en arrière-plan');
            console.log('2. 📊 Vérifier le statut');
            console.log('3. 📋 Afficher les logs');
            console.log('4. 🛑 Arrêter tous les processus');
            console.log('5. 🔄 Redémarrer le processus');
            console.log('6. 📁 Ouvrir le dossier d\'extraction');
            console.log('7. 🧹 Nettoyer les fichiers temporaires');
            console.log('8. ❌ Quitter');
            console.log('');

            const choice = await this.getUserChoice('Choisissez une option (1-8): ');

            switch (choice) {
                case '1':
                    await this.startExtraction();
                    break;
                case '2':
                    await this.checkStatus();
                    break;
                case '3':
                    await this.showLogs();
                    break;
                case '4':
                    await this.stopAllProcesses();
                    break;
                case '5':
                    await this.restartProcess();
                    break;
                case '6':
                    await this.openExtractionFolder();
                    break;
                case '7':
                    await this.cleanupTempFiles();
                    break;
                case '8':
                    console.log('👋 Au revoir !');
                    process.exit(0);
                    break;
                default:
                    console.log('❌ Option invalide, veuillez réessayer.');
            }

            // Pause avant de revenir au menu
            await this.sleep(2000);
        }
    }

    async startExtraction() {
        console.log('\n🚀 DÉMARRAGE DE L\'EXTRACTION EN ARRIÈRE-PLAN');
        console.log('-' .repeat(50));

        if (this.isRunning) {
            console.log('   ⚠️ L\'extraction est déjà en cours');
            return;
        }

        try {
            // Démarrer le processus en arrière-plan
            this.processor = new BackgroundZipProcessor();
            this.isRunning = true;

            // Lancer l'extraction dans un processus séparé
            this.processor.run().catch(error => {
                console.log(`   ❌ Erreur lors du démarrage: ${error.message}`);
                this.isRunning = false;
            });

            console.log('   ✅ Processus d\'extraction démarré en arrière-plan');
            console.log('   📊 Utilisez l\'option 2 pour vérifier le statut');

        } catch (error) {
            console.log(`   ❌ Erreur lors du démarrage: ${error.message}`);
            this.isRunning = false;
        }
    }

    async checkStatus() {
        console.log('\n📊 VÉRIFICATION DU STATUT');
        console.log('-' .repeat(50));

        try {
            if (fs.existsSync(this.statusFile)) {
                const status = JSON.parse(fs.readFileSync(this.statusFile, 'utf8'));
                
                console.log(`   🕐 Dernière mise à jour: ${status.lastUpdate}`);
                console.log(`   📊 Total ZIPs: ${status.stats.totalZips}`);
                console.log(`   ✅ Extrait: ${status.stats.extracted}`);
                console.log(`   ❌ Échoué: ${status.stats.failed}`);
                console.log(`   🔄 En cours: ${status.stats.inProgress}`);

                if (status.stats.totalZips > 0) {
                    const progress = ((status.stats.extracted + status.stats.failed) / status.stats.totalZips * 100).toFixed(1);
                    console.log(`   📈 Progression: ${progress}%`);
                }

                if (status.processes.length > 0) {
                    console.log('\n   📋 Détail des processus:');
                    for (const process of status.processes.slice(0, 5)) {
                        const duration = process.duration || 0;
                        console.log(`      📄 ${process.name}: ${process.status} (${duration}s)`);
                    }
                    
                    if (status.processes.length > 5) {
                        console.log(`      ... et ${status.processes.length - 5} autres processus`);
                    }
                }

            } else {
                console.log('   ⚠️ Aucun fichier de statut trouvé');
                console.log('   🚀 Démarrez d\'abord l\'extraction (option 1)');
            }

        } catch (error) {
            console.log(`   ❌ Erreur lors de la vérification: ${error.message}`);
        }
    }

    async showLogs() {
        console.log('\n📋 AFFICHAGE DES LOGS');
        console.log('-' .repeat(50));

        const logFile = path.join(process.cwd(), '.tmp_background_zip', 'extraction.log');
        
        if (fs.existsSync(logFile)) {
            try {
                const logs = fs.readFileSync(logFile, 'utf8');
                const lines = logs.split('\n');
                
                console.log(`   📄 Fichier de log: ${logFile}`);
                console.log(`   📊 Total lignes: ${lines.length}`);
                
                // Afficher les 20 dernières lignes
                const recentLines = lines.slice(-20);
                console.log('\n   📋 20 dernières lignes:');
                console.log('   ' + '=' .repeat(40));
                
                for (const line of recentLines) {
                    if (line.trim()) {
                        console.log(`   ${line}`);
                    }
                }

            } catch (error) {
                console.log(`   ❌ Erreur lors de la lecture des logs: ${error.message}`);
            }
        } else {
            console.log('   ⚠️ Aucun fichier de log trouvé');
            console.log('   🚀 Démarrez d\'abord l\'extraction (option 1)');
        }
    }

    async stopAllProcesses() {
        console.log('\n🛑 ARRÊT DE TOUS LES PROCESSUS');
        console.log('-' .repeat(50));

        if (this.processor && this.isRunning) {
            try {
                this.processor.stopAllProcesses();
                this.isRunning = false;
                console.log('   ✅ Tous les processus arrêtés');
            } catch (error) {
                console.log(`   ❌ Erreur lors de l\'arrêt: ${error.message}`);
            }
        } else {
            console.log('   ⚠️ Aucun processus en cours');
        }
    }

    async restartProcess() {
        console.log('\n🔄 REDÉMARRAGE DU PROCESSUS');
        console.log('-' .repeat(50));

        try {
            // Arrêter le processus actuel
            if (this.processor && this.isRunning) {
                this.processor.stopAllProcesses();
                this.isRunning = false;
                console.log('   ✅ Processus actuel arrêté');
            }

            // Attendre un peu
            await this.sleep(2000);

            // Redémarrer
            await this.startExtraction();

        } catch (error) {
            console.log(`   ❌ Erreur lors du redémarrage: ${error.message}`);
        }
    }

    async openExtractionFolder() {
        console.log('\n📁 OUVERTURE DU DOSSIER D\'EXTRACTION');
        console.log('-' .repeat(50));

        const extractionDir = path.join(process.cwd(), '.tmp_background_zip');
        
        if (fs.existsSync(extractionDir)) {
            try {
                // Ouvrir le dossier avec l'explorateur Windows
                const { execSync } = require('child_process');
                execSync(`explorer "${extractionDir}"`, { stdio: 'pipe' });
                console.log('   ✅ Dossier d\'extraction ouvert');
            } catch (error) {
                console.log(`   ❌ Erreur lors de l\'ouverture: ${error.message}`);
                console.log(`   📁 Chemin manuel: ${extractionDir}`);
            }
        } else {
            console.log('   ⚠️ Dossier d\'extraction non trouvé');
            console.log('   🚀 Démarrez d\'abord l\'extraction (option 1)');
        }
    }

    async cleanupTempFiles() {
        console.log('\n🧹 NETTOYAGE DES FICHIERS TEMPORAIRES');
        console.log('-' .repeat(50));

        const tempDir = path.join(process.cwd(), '.tmp_background_zip');
        
        if (fs.existsSync(tempDir)) {
            try {
                // Arrêter les processus en cours
                if (this.processor && this.isRunning) {
                    this.processor.stopAllProcesses();
                    this.isRunning = false;
                }

                // Supprimer le dossier temporaire
                fs.removeSync(tempDir);
                console.log('   ✅ Fichiers temporaires supprimés');
                console.log('   🚀 Redémarrez l\'extraction si nécessaire (option 1)');

            } catch (error) {
                console.log(`   ❌ Erreur lors du nettoyage: ${error.message}`);
            }
        } else {
            console.log('   ✅ Aucun fichier temporaire à nettoyer');
        }
    }

    async getUserChoice(prompt) {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            rl.question(prompt, (answer) => {
                rl.close();
                resolve(answer.trim());
            });
        });
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Méthode pour vérifier l'état depuis l'extérieur
    static getCurrentStatus() {
        try {
            const statusFile = path.join(process.cwd(), '.tmp_background_zip', 'extraction-status.json');
            if (fs.existsSync(statusFile)) {
                return JSON.parse(fs.readFileSync(statusFile, 'utf8'));
            }
        } catch (error) {
            // Ignorer les erreurs
        }
        return null;
    }
}

// Gestion des signaux pour un arrêt propre
process.on('SIGINT', () => {
    console.log('\n🛑 Signal SIGINT reçu, arrêt propre...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Signal SIGTERM reçu, arrêt propre...');
    process.exit(0);
});

if (require.main === module) {
    const controller = new ZipProcessorController();
    controller.run().catch(console.error);
}

module.exports = ZipProcessorController;
