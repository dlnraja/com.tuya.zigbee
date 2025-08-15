#!/usr/bin/env node

/**
 * 📊 QUICK STATUS CHECK - BRIEF "BÉTON"
 * 
 * Vérification rapide de l'état du processus silencieux
 * Sans interférer avec le processus en cours
 */

const SilentBackgroundProcessor = require('./silent-background-processor');

class QuickStatusCheck {
    constructor() {
        this.statusFile = '.tmp_silent_processing/silent-status.json';
        this.logFile = '.tmp_silent_processing/silent-processing.log';
    }

    async run() {
        try {
            console.log('📊 QUICK STATUS CHECK - BRIEF "BÉTON"');
            console.log('=' .repeat(50));
            console.log('🔍 Vérification rapide de l\'état...\n');

            // Vérifier le statut
            await this.checkStatus();
            
            // Afficher un résumé rapide
            await this.showQuickSummary();

        } catch (error) {
            console.error('❌ Erreur lors de la vérification:', error);
        }
    }

    async checkStatus() {
        try {
            const status = SilentBackgroundProcessor.getStatusFromFile();
            
            if (status) {
                console.log('📊 STATUT DU PROCESSUS SILENCIEUX');
                console.log('-' .repeat(40));
                console.log(`🕐 Dernière mise à jour: ${status.lastUpdate}`);
                console.log(`📊 Total ZIPs: ${status.stats.totalZips}`);
                console.log(`✅ Extrait: ${status.stats.extracted}`);
                console.log(`❌ Échoué: ${status.stats.failed}`);
                console.log(`🔄 En cours: ${status.stats.inProgress}`);
                console.log(`🔧 Enrichissement: ${status.stats.enrichmentSteps}`);

                if (status.stats.totalZips > 0) {
                    const progress = ((status.stats.extracted + status.stats.failed) / status.stats.totalZips * 100).toFixed(1);
                    console.log(`📈 Progression: ${progress}%`);
                }

                if (status.processes.length > 0) {
                    console.log('\n📋 PROCESSUS ACTIFS:');
                    for (const process of status.processes) {
                        const statusIcon = process.status === 'completed' ? '✅' : 
                                          process.status === 'running' ? '🔄' : 
                                          process.status === 'failed' ? '❌' : '⏸️';
                        const duration = process.duration || 0;
                        console.log(`   ${statusIcon} ${process.name}: ${process.status} (${duration}s)`);
                    }
                }

            } else {
                console.log('⚠️ Aucun processus silencieux en cours');
                console.log('🚀 Utilisez "node scripts/silent-controller.js" pour démarrer');
            }

        } catch (error) {
            console.log(`❌ Erreur vérification statut: ${error.message}`);
        }
    }

    async showQuickSummary() {
        try {
            const logs = SilentBackgroundProcessor.getLogs();
            
            if (logs) {
                const lines = logs.split('\n').filter(line => line.trim());
                const recentLines = lines.slice(-5);
                
                if (recentLines.length > 0) {
                    console.log('\n📋 DERNIÈRES ACTIVITÉS:');
                    console.log('-' .repeat(40));
                    
                    for (const line of recentLines) {
                        if (line.trim()) {
                            console.log(`   ${line}`);
                        }
                    }
                }
            }

        } catch (error) {
            console.log(`⚠️ Impossible de récupérer les logs: ${error.message}`);
        }
    }

    // Méthode statique pour utilisation externe
    static getQuickStatus() {
        try {
            const status = SilentBackgroundProcessor.getStatusFromFile();
            const logs = SilentBackgroundProcessor.getLogs();
            
            return {
                status: status,
                recentLogs: logs ? logs.split('\n').slice(-3) : [],
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

if (require.main === module) {
    const checker = new QuickStatusCheck();
    checker.run().catch(console.error);
}

module.exports = QuickStatusCheck;
