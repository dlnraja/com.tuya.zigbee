#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

/**
 * 🚀 SILENT BACKGROUND PROCESSOR FALLBACK - BRIEF "BÉTON"
 * 
 * Processus silencieux en arrière-plan avec fallback PowerShell
 * Extraction ZIP + Enrichissement sans affichage terminal
 */

const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

class SilentBackgroundProcessorFallback {
    constructor() {
        this.projectRoot = process.cwd();
        this.downloadDir = 'D:\\Download';
        this.tmpDir = path.join(this.projectRoot, '.tmp_silent_processing');
        this.processes = new Map();
        this.isRunning = false;
        this.stats = {
            totalZips: 0,
            extracted: 0,
            failed: 0,
            inProgress: 0,
            enrichmentSteps: 0
        };
        this.usePowerShell = false;
    }

    async run() {
        try {
            // Créer le dossier de travail silencieux
            if (!fs.existsSync(this.tmpDir)) {
                fs.mkdirSync(this.tmpDir, { recursive: true });
            }

            // Vérifier la disponibilité de 7zip
            await this.check7zipAvailability();

            // Créer le fichier de statut silencieux
            await this.createSilentStatusFile();

            // Démarrer le processus silencieux
            this.isRunning = true;
            
            // Lancer l'extraction silencieuse
            await this.startSilentExtraction();
            
            // Lancer l'enrichissement silencieux
            await this.startSilentEnrichment();
            
            // Démarrer le monitoring silencieux
            this.startSilentMonitoring();

        } catch (error) {
            // Log silencieux des erreurs
            await this.logSilently(`❌ Erreur démarrage: ${error.message}`);
        }
    }

    async check7zipAvailability() {
        try {
            // Vérifier si 7zip est disponible
            const { execSync } = require('child_process');
            execSync('7z --version', { stdio: 'pipe' });
            this.usePowerShell = false;
            await this.logSilently('✅ 7zip détecté - utilisation en mode silencieux');
        } catch (error) {
            this.usePowerShell = true;
            await this.logSilently('⚠️ 7zip non détecté - utilisation de PowerShell comme fallback');
        }
    }

    async createSilentStatusFile() {
        const statusPath = path.join(this.tmpDir, 'silent-status.json');
        const status = {
            startTime: new Date().toISOString(),
            isRunning: true,
            processes: [],
            stats: this.stats,
            lastUpdate: new Date().toISOString(),
            extractionMethod: this.usePowerShell ? 'PowerShell' : '7zip'
        };

        fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
    }

    async startSilentExtraction() {
        try {
            // Identifier tous les fichiers ZIP
            const zipFiles = await this.identifyZipFiles();
            this.stats.totalZips = zipFiles.length;

            if (zipFiles.length === 0) {
                await this.logSilently('⚠️ Aucun fichier ZIP trouvé');
                return;
            }

            await this.logSilently(`📦 ${zipFiles.length} fichiers ZIP identifiés pour extraction`);

            // Lancer l'extraction silencieuse
            for (const zip of zipFiles) {
                await this.extractZipSilently(zip);
                // Pause entre les extractions
                await this.sleep(2000);
            }

        } catch (error) {
            await this.logSilently(`❌ Erreur extraction: ${error.message}`);
        }
    }

    async identifyZipFiles() {
        if (!fs.existsSync(this.downloadDir)) {
            return [];
        }

        try {
            const files = fs.readdirSync(this.downloadDir);
            return files.filter(file => 
                file.toLowerCase().endsWith('.zip') &&
                (file.toLowerCase().includes('tuya') ||
                 file.toLowerCase().includes('zigbee') ||
                 file.toLowerCase().includes('homey') ||
                 file.toLowerCase().includes('bundle') ||
                 file.toLowerCase().includes('pack'))
            );
        } catch (error) {
            await this.logSilently(`❌ Erreur identification: ${error.message}`);
            return [];
        }
    }

    async extractZipSilently(zipName) {
        const downloadPath = path.join(this.downloadDir, zipName);
        const extractPath = path.join(this.tmpDir, zipName.replace('.zip', ''));

        // Vérifier si déjà extrait
        if (fs.existsSync(extractPath)) {
            this.stats.extracted++;
            await this.logSilently(`✅ ${zipName}: Déjà extrait`);
            return;
        }

        try {
            // Créer le dossier de destination
            fs.mkdirSync(extractPath, { recursive: true });

            // Lancer l'extraction selon la méthode disponible
            const process = this.usePowerShell ? 
                this.spawnPowerShellSilently(zipName, downloadPath, extractPath) :
                this.spawn7zipSilently(zipName, downloadPath, extractPath);
            
            // Stocker les informations du processus
            this.processes.set(zipName, {
                process: process,
                startTime: Date.now(),
                extractPath: extractPath,
                status: 'running',
                method: this.usePowerShell ? 'PowerShell' : '7zip'
            });

            this.stats.inProgress++;
            await this.logSilently(`🔄 Extraction lancée: ${zipName} (${this.usePowerShell ? 'PowerShell' : '7zip'})`);

        } catch (error) {
            this.stats.failed++;
            await this.logSilently(`❌ Erreur ${zipName}: ${error.message}`);
        }
    }

    spawn7zipSilently(zipName, sourcePath, targetPath) {
        // Utiliser 7zip en mode silencieux
        const childProcess = spawn('7z', [
            'x',           // Extract with full paths
            sourcePath,    // Source archive
            `-o${targetPath}`, // Output directory
            '-y',          // Yes to all prompts
            '-bd'          // Disable progress indicator
        ], {
            detached: true,
            stdio: 'ignore'  // Ignore all stdio
        });

        // Gérer les événements du processus
        childProcess.on('error', (error) => {
            this.handleProcessError(zipName, error);
        });

        childProcess.on('exit', (code) => {
            this.handleProcessExit(zipName, code);
        });

        // Détacher le processus
        childProcess.unref();

        return childProcess;
    }

    spawnPowerShellSilently(zipName, sourcePath, targetPath) {
        // Utiliser PowerShell avec Expand-Archive en mode silencieux
        const extractCommand = `Expand-Archive -Path '${sourcePath}' -DestinationPath '${targetPath}' -Force`;
        
        const childProcess = spawn('powershell', [
            '-Command', 
            `Start-Job -ScriptBlock { ${extractCommand} } -Name "extract_${zipName.replace(/[^a-zA-Z0-9]/g, '_')}"`
        ], {
            detached: true,
            stdio: 'ignore'  // Ignore all stdio
        });

        // Gérer les événements du processus
        childProcess.on('error', (error) => {
            this.handleProcessError(zipName, error);
        });

        childProcess.on('exit', (code) => {
            this.handleProcessExit(zipName, code);
        });

        // Détacher le processus
        childProcess.unref();

        return childProcess;
    }

    async handleProcessError(zipName, error) {
        await this.logSilently(`❌ Erreur processus ${zipName}: ${error.message}`);
        
        const processInfo = this.processes.get(zipName);
        if (processInfo) {
            processInfo.status = 'failed';
            this.stats.inProgress--;
            this.stats.failed++;
        }
    }

    async handleProcessExit(zipName, code) {
        const processInfo = this.processes.get(zipName);
        if (processInfo) {
            if (code === 0) {
                processInfo.status = 'completed';
                this.stats.extracted++;
                this.stats.inProgress--;
                await this.logSilently(`✅ ${zipName}: Extraction terminée`);
            } else {
                processInfo.status = 'failed';
                this.stats.failed++;
                this.stats.inProgress--;
                await this.logSilently(`❌ ${zipName}: Extraction échouée (code: ${code})`);
            }
        }
    }

    async startSilentEnrichment() {
        try {
            // Lancer l'enrichissement en arrière-plan
            await this.logSilently('🔧 Démarrage de l\'enrichissement silencieux');
            
            // Créer un processus d'enrichissement séparé
            const enrichmentProcess = this.spawnEnrichmentSilently();
            
            // Stocker le processus d'enrichissement
            this.processes.set('enrichment', {
                process: enrichmentProcess,
                startTime: Date.now(),
                status: 'running'
            });

        } catch (error) {
            await this.logSilently(`❌ Erreur enrichissement: ${error.message}`);
        }
    }

    spawnEnrichmentSilently() {
        // Lancer l'enrichissement dans un processus séparé
        const childProcess = spawn('node', [
            'scripts/download-analyzer-enricher.js'
        ], {
            detached: true,
            stdio: 'ignore',  // Ignore all stdio
            cwd: this.projectRoot
        });

        // Gérer les événements
        childProcess.on('error', (error) => {
            this.handleEnrichmentError(error);
        });

        childProcess.on('exit', (code) => {
            this.handleEnrichmentExit(code);
        });

        // Détacher le processus
        childProcess.unref();

        return childProcess;
    }

    async handleEnrichmentError(error) {
        await this.logSilently(`❌ Erreur enrichissement: ${error.message}`);
        
        const processInfo = this.processes.get('enrichment');
        if (processInfo) {
            processInfo.status = 'failed';
        }
    }

    async handleEnrichmentExit(code) {
        const processInfo = this.processes.get('enrichment');
        if (processInfo) {
            if (code === 0) {
                processInfo.status = 'completed';
                this.stats.enrichmentSteps++;
                await this.logSilently('✅ Enrichissement terminé avec succès');
            } else {
                processInfo.status = 'failed';
                await this.logSilently(`❌ Enrichissement échoué (code: ${code})`);
            }
        }
    }

    startSilentMonitoring() {
        // Monitoring silencieux toutes les 10 secondes
        setInterval(async () => {
            await this.updateSilentStatus();
        }, 10000);

        // Vérification des processus terminés
        setInterval(async () => {
            await this.checkCompletedProcesses();
        }, 15000);
    }

    async updateSilentStatus() {
        try {
            const statusPath = path.join(this.tmpDir, 'silent-status.json');
            const status = {
                lastUpdate: new Date().toISOString(),
                isRunning: this.isRunning,
                processes: Array.from(this.processes.entries()).map(([name, info]) => ({
                    name,
                    status: info.status,
                    startTime: new Date(info.startTime).toISOString(),
                    duration: Math.round((Date.now() - info.startTime) / 1000),
                    method: info.method || 'N/A'
                })),
                stats: this.stats,
                extractionMethod: this.usePowerShell ? 'PowerShell' : '7zip'
            };

            fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));

        } catch (error) {
            await this.logSilently(`❌ Erreur mise à jour statut: ${error.message}`);
        }
    }

    async checkCompletedProcesses() {
        for (const [name, processInfo] of this.processes.entries()) {
            if (processInfo.status === 'running') {
                // Vérifier si l'extraction est terminée
                if (processInfo.extractPath) {
                    const isCompleted = await this.checkExtractionCompletion(processInfo.extractPath);
                    
                    if (isCompleted) {
                        processInfo.status = 'completed';
                        this.stats.extracted++;
                        this.stats.inProgress--;
                        await this.logSilently(`✅ ${name}: Détection automatique de fin d'extraction`);
                    }
                }
            }
        }
    }

    async checkExtractionCompletion(extractPath) {
        try {
            if (!fs.existsSync(extractPath)) {
                return false;
            }

            const items = fs.readdirSync(extractPath);
            return items.length > 0;
        } catch (error) {
            return false;
        }
    }

    async logSilently(message) {
        try {
            const logPath = path.join(this.tmpDir, 'silent-processing.log');
            const timestamp = new Date().toISOString();
            const logEntry = `[${timestamp}] ${message}\n`;
            
            fs.appendFileSync(logPath, logEntry);
        } catch (error) {
            // Ignorer les erreurs de log
        }
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Méthodes utilitaires pour le contrôle externe
    getStatus() {
        return {
            isRunning: this.isRunning,
            stats: this.stats,
            processes: Array.from(this.processes.entries()).map(([name, info]) => ({
                name,
                status: info.status,
                startTime: new Date(info.startTime).toISOString(),
                duration: Math.round((Date.now() - info.startTime) / 1000),
                method: info.method || 'N/A'
            })),
            extractionMethod: this.usePowerShell ? 'PowerShell' : '7zip'
        };
    }

    stopAllProcesses() {
        for (const [name, processInfo] of this.processes.entries()) {
            if (processInfo.status === 'running') {
                try {
                    processInfo.process.kill();
                    processInfo.status = 'stopped';
                    if (name !== 'enrichment') {
                        this.stats.inProgress--;
                    }
                } catch (error) {
                    // Ignorer les erreurs d'arrêt
                }
            }
        }

        this.isRunning = false;
    }

    // Méthode pour vérifier l'état depuis l'extérieur
    static getStatusFromFile() {
        try {
            const statusPath = path.join(process.cwd(), '.tmp_silent_processing', 'silent-status.json');
            if (fs.existsSync(statusPath)) {
                return JSON.parse(fs.readFileSync(statusPath, 'utf8'));
            }
        } catch (error) {
            // Ignorer les erreurs
        }
        return null;
    }

    // Méthode pour obtenir les logs
    static getLogs() {
        try {
            const logPath = path.join(process.cwd(), '.tmp_silent_processing', 'silent-processing.log');
            if (fs.existsSync(logPath)) {
                return fs.readFileSync(logPath, 'utf8');
            }
        } catch (error) {
            // Ignorer les erreurs
        }
        return '';
    }
}

// Gestion des signaux pour un arrêt propre
process.on('SIGINT', () => {
    if (global.silentProcessorFallback) {
        global.silentProcessorFallback.stopAllProcesses();
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    if (global.silentProcessorFallback) {
        global.silentProcessorFallback.stopAllProcesses();
    }
    process.exit(0);
});

if (require.main === module) {
    const processor = new SilentBackgroundProcessorFallback();
    global.silentProcessorFallback = processor;
    processor.run().catch(async (error) => {
        await processor.logSilently(`❌ Erreur fatale: ${error.message}`);
        process.exit(1);
    });
}

module.exports = SilentBackgroundProcessorFallback;
