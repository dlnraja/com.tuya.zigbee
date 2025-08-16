#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

/**
 * 🔄 RESTART SILENT PROCESSOR - BRIEF "BÉTON"
 * 
 * Script pour nettoyer et redémarrer proprement le processus silencieux
 * Arrête tous les processus et redémarre avec la version fallback
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

class RestartSilentProcessor {
    constructor() {
        this.projectRoot = process.cwd();
        this.tmpDir = path.join(this.projectRoot, '.tmp_silent_processing');
        this.oldTmpDir = path.join(this.projectRoot, '.tmp_background_zip');
    }

    async run() {
        try {
            console.log('🔄 RESTART SILENT PROCESSOR - BRIEF "BÉTON"');
            console.log('=' .repeat(70));
            console.log('🎯 Nettoyage et redémarrage du processus silencieux...\n');

            // 1. Arrêter tous les processus en cours
            await this.stopAllProcesses();

            // 2. Nettoyer les dossiers temporaires
            await this.cleanupTempDirectories();

            // 3. Attendre un peu
            await this.sleep(3000);

            // 4. Redémarrer avec la version fallback
            await this.restartWithFallback();

            console.log('✅ Redémarrage terminé avec succès !');
            console.log('📊 Utilisez "node scripts/quick-status-check.js" pour vérifier l\'état');

        } catch (error) {
            console.error('❌ Erreur lors du redémarrage:', error);
        }
    }

    async stopAllProcesses() {
        console.log('🛑 ARRÊT DE TOUS LES PROCESSUS...');
        console.log('-' .repeat(40));

        try {
            // Tuer tous les processus Node.js liés aux scripts
            const processes = [
                'silent-background-processor',
                'silent-background-processor-fallback',
                'background-zip-processor',
                'auto-zip-enrichment'
            ];

            for (const processName of processes) {
                try {
                    // Windows: tuer les processus par nom
                    execSync(`taskkill /f /im node.exe /fi "WINDOWTITLE eq *${processName}*"`, { 
                        stdio: 'pipe',
                        shell: true 
                    });
                    console.log(`   ✅ Processus ${processName} arrêté`);
                } catch (error) {
                    // Ignorer les erreurs si le processus n'existe pas
                }
            }

            // Attendre un peu pour s'assurer que tous les processus sont arrêtés
            await this.sleep(2000);

        } catch (error) {
            console.log(`   ⚠️ Erreur lors de l'arrêt des processus: ${error.message}`);
        }
    }

    async cleanupTempDirectories() {
        console.log('🧹 NETTOYAGE DES DOSSIERS TEMPORAIRES...');
        console.log('-' .repeat(40));

        const dirsToClean = [this.tmpDir, this.oldTmpDir];

        for (const dir of dirsToClean) {
            if (fs.existsSync(dir)) {
                try {
                    fs.removeSync(dir);
                    console.log(`   ✅ ${path.basename(dir)} supprimé`);
                } catch (error) {
                    console.log(`   ⚠️ Erreur suppression ${path.basename(dir)}: ${error.message}`);
                }
            } else {
                console.log(`   ✅ ${path.basename(dir)} n'existe pas`);
            }
        }
    }

    async restartWithFallback() {
        console.log('🚀 REDÉMARRAGE AVEC VERSION FALLBACK...');
        console.log('-' .repeat(40));

        try {
            // Lancer la version fallback en arrière-plan
            const fallbackScript = path.join(this.projectRoot, 'scripts', 'silent-background-processor-fallback.js');
            
            if (fs.existsSync(fallbackScript)) {
                // Lancer en arrière-plan avec PowerShell
                const command = `Start-Process -FilePath "node" -ArgumentList "${fallbackScript}" -WindowStyle Hidden`;
                execSync(`powershell -Command "${command}"`, { stdio: 'pipe' });
                
                console.log('   ✅ Processus fallback lancé en arrière-plan');
                console.log('   🔇 Aucun affichage dans le terminal principal');
                
                // Attendre un peu pour que le processus démarre
                await this.sleep(5000);
                
            } else {
                throw new Error('Script fallback non trouvé');
            }

        } catch (error) {
            console.log(`   ❌ Erreur lors du redémarrage: ${error.message}`);
            throw error;
        }
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Méthode pour vérifier l'état après redémarrage
    static async checkStatusAfterRestart() {
        try {
            const { QuickStatusCheck } = require('./quick-status-check');
            const checker = new QuickStatusCheck();
            await checker.run();
        } catch (error) {
            console.log(`⚠️ Impossible de vérifier le statut: ${error.message}`);
        }
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
    const restarter = new RestartSilentProcessor();
    restarter.run().catch(console.error);
}

module.exports = RestartSilentProcessor;
