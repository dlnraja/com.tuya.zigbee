#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

/**
 * 🎮 SILENT CONTROLLER - BRIEF "BÉTON"
 * 
 * Contrôleur silencieux pour le processus d'extraction et d'enrichissement
 * Permet de démarrer, arrêter et surveiller sans affichage
 */

const SilentBackgroundProcessor = require('./silent-background-processor');
const fs = require('fs-extra');
const path = require('path');

class SilentController {
    constructor() {
        this.processor = null;
        this.isRunning = false;
        this.statusFile = path.join(process.cwd(), '.tmp_silent_processing', 'silent-status.json');
    }

    async run() {
        try {
            console.log('🎮 SILENT CONTROLLER - BRIEF "BÉTON"');
            console.log('=' .repeat(70));
            console.log('🎯 Contrôleur du processus silencieux...\n');

            // Afficher le menu principal
            await this.showMainMenu();

        } catch (error) {
            console.error('❌ Erreur dans le contrôleur:', error);
        }
    }

    async showMainMenu() {
        while (true) {
            console.log('\n🎮 MENU PRINCIPAL - SILENT PROCESSOR');
            console.log('=' .repeat(50));
            console.log('1. 🚀 Démarrer le processus silencieux');
            console.log('2. 📊 Vérifier le statut');
            console.log('3. 📋 Afficher les logs');
            console.log('4. 🛑 Arrêter tous les processus');
            console.log('5. 🔄 Redémarrer le processus');
            console.log('6. 📁 Ouvrir le dossier de travail');
            console.log('7. 🧹 Nettoyer les fichiers temporaires');
            console.log('8. ❌ Quitter');
            console.log('');

            const choice = await this.getUserChoice('Choisissez une option (1-8): ');

            switch (choice) {
                case '1':
                    await this.startSilentProcess();
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
                    await this.openWorkFolder();
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

    async startSilentProcess() {
        console.log('\n🚀 DÉMARRAGE DU PROCESSUS SILENCIEUX');
        console.log('-' .repeat(50));

        if (this.isRunning) {
            console.log('   ⚠️ Le processus est déjà en cours');
            return;
        }

        try {
            // Démarrer le processus silencieux
            this.processor = new SilentBackgroundProcessor();
            this.isRunning = true;

            // Lancer le processus dans un processus séparé
            this.processor.run().catch(error => {
                console.log(`   ❌ Erreur lors du démarrage: ${error.message}`);
                this.isRunning = false;
            });

            console.log('   ✅ Processus silencieux démarré en arrière-plan');
            console.log('   📊 Utilisez l\'option 2 pour vérifier le statut');
            console.log('   🔇 Aucun affichage dans le terminal principal');

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
                console.log(`   🔧 Étapes d'enrichissement: ${status.stats.enrichmentSteps}`);

                if (status.stats.totalZips > 0) {
                    const progress = ((status.stats.extracted + status.stats.failed) / status.stats.totalZips * 100).toFixed(1);
                    console.log(`   📈 Progression: ${progress}%`);
                }

                if (status.processes.length > 0) {
                    console.log('\n   📋 Détail des processus:');
                    for (const process of status.processes) {
                        const duration = process.duration || 0;
                        const statusIcon = process.status === 'completed' ? '✅' : 
                                          process.status === 'running' ? '🔄' : 
                                          process.status === 'failed' ? '❌' : '⏸️';
                        console.log(`      ${statusIcon} ${process.name}: ${process.status} (${duration}s)`);
                    }
                }

            } else {
                console.log('   ⚠️ Aucun fichier de statut trouvé');
                console.log('   🚀 Démarrez d\'abord le processus (option 1)');
            }

        } catch (error) {
            console.log(`   ❌ Erreur lors de la vérification: ${error.message}`);
        }
    }

    async showLogs() {
        console.log('\n📋 AFFICHAGE DES LOGS');
        console.log('-' .repeat(50));

        const logs = SilentBackgroundProcessor.getLogs();
        
        if (logs) {
            const lines = logs.split('\n');
            console.log(`   📄 Total lignes: ${lines.length}`);
            
            // Afficher les 30 dernières lignes
            const recentLines = lines.slice(-30);
            console.log('\n   📋 30 dernières lignes:');
            console.log('   ' + '=' .repeat(40));
            
            for (const line of recentLines) {
                if (line.trim()) {
                    console.log(`   ${line}`);
                }
            }

        } else {
            console.log('   ⚠️ Aucun log trouvé');
            console.log('   🚀 Démarrez d\'abord le processus (option 1)');
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
            await this.sleep(3000);

            // Redémarrer
            await this.startSilentProcess();

        } catch (error) {
            console.log(`   ❌ Erreur lors du redémarrage: ${error.message}`);
        }
    }

    async openWorkFolder() {
        console.log('\n📁 OUVERTURE DU DOSSIER DE TRAVAIL');
        console.log('-' .repeat(50));

        const workDir = path.join(process.cwd(), '.tmp_silent_processing');
        
        if (fs.existsSync(workDir)) {
            try {
                // Ouvrir le dossier avec l'explorateur Windows
                const { execSync } = require('child_process');
                execSync(`explorer "${workDir}"`, { stdio: 'pipe' });
                console.log('   ✅ Dossier de travail ouvert');
            } catch (error) {
                console.log(`   ❌ Erreur lors de l\'ouverture: ${error.message}`);
                console.log(`   📁 Chemin manuel: ${workDir}`);
            }
        } else {
            console.log('   ⚠️ Dossier de travail non trouvé');
            console.log('   🚀 Démarrez d\'abord le processus (option 1)');
        }
    }

    async cleanupTempFiles() {
        console.log('\n🧹 NETTOYAGE DES FICHIERS TEMPORAIRES');
        console.log('-' .repeat(50));

        const tempDir = path.join(process.cwd(), '.tmp_silent_processing');
        
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
                console.log('   🚀 Redémarrez le processus si nécessaire (option 1)');

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
        return SilentBackgroundProcessor.getStatusFromFile();
    }

    // Méthode pour obtenir les logs depuis l'extérieur
    static getCurrentLogs() {
        return SilentBackgroundProcessor.getLogs();
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
    const controller = new SilentController();
    controller.run().catch(console.error);
}

module.exports = SilentController;
