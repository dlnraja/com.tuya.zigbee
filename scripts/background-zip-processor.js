#!/usr/bin/env node

/**
 * 🚀 BACKGROUND ZIP PROCESSOR - BRIEF "BÉTON"
 * 
 * Processus en arrière-plan pour l'extraction des ZIP
 * Gestion intelligente avec monitoring et reprise automatique
 */

const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

class BackgroundZipProcessor {
    constructor() {
        this.projectRoot = process.cwd();
        this.downloadDir = 'D:\\Download';
        this.tmpDir = path.join(this.projectRoot, '.tmp_background_zip');
        this.processes = new Map();
        this.stats = {
            totalZips: 0,
            extracted: 0,
            failed: 0,
            inProgress: 0,
            totalSize: 0
        };
        this.isRunning = false;
    }

    async run() {
        try {
            console.log('🚀 BACKGROUND ZIP PROCESSOR - BRIEF "BÉTON"');
            console.log('=' .repeat(70));
            console.log('🎯 Démarrage du processus d\'extraction en arrière-plan...\n');

            // 1. Initialiser le processus
            await this.initialize();

            // 2. Démarrer le monitoring
            this.startMonitoring();

            // 3. Lancer l'extraction en arrière-plan
            await this.startBackgroundExtraction();

            // 4. Continuer le travail principal
            console.log('✅ Processus d\'extraction lancé en arrière-plan - Continuons !\n');

        } catch (error) {
            console.error('❌ Erreur lors du démarrage:', error);
        }
    }

    async initialize() {
        console.log('🔧 Initialisation du processus...');

        // Créer le dossier temporaire
        if (!fs.existsSync(this.tmpDir)) {
            fs.mkdirSync(this.tmpDir, { recursive: true });
            console.log('   ✅ Dossier temporaire créé');
        }

        // Créer le fichier de statut
        await this.createStatusFile();

        // Créer le fichier de log
        await this.createLogFile();

        console.log('   ✅ Initialisation terminée\n');
    }

    async createStatusFile() {
        const statusPath = path.join(this.tmpDir, 'extraction-status.json');
        const status = {
            startTime: new Date().toISOString(),
            isRunning: false,
            processes: [],
            stats: this.stats
        };

        fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
    }

    async createLogFile() {
        const logPath = path.join(this.tmpDir, 'extraction.log');
        const logHeader = `=== LOG D'EXTRACTION ZIP - ${new Date().toISOString()} ===\n\n`;
        fs.writeFileSync(logPath, logHeader);
    }

    async startBackgroundExtraction() {
        console.log('📦 Démarrage de l\'extraction en arrière-plan...');

        // Identifier tous les fichiers ZIP
        const zipFiles = await this.identifyZipFiles();
        this.stats.totalZips = zipFiles.length;

        if (zipFiles.length === 0) {
            console.log('   ⚠️ Aucun fichier ZIP trouvé');
            return;
        }

        console.log(`   📊 ${zipFiles.length} fichiers ZIP identifiés`);

        // Lancer l'extraction en arrière-plan
        for (const zip of zipFiles) {
            await this.extractZipInBackground(zip);
            // Petite pause pour éviter la surcharge
            await this.sleep(1000);
        }

        console.log('   ✅ Toutes les extractions lancées en arrière-plan');
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
            console.log(`   ❌ Erreur lors de l'identification: ${error.message}`);
            return [];
        }
    }

    async extractZipInBackground(zipName) {
        const downloadPath = path.join(this.downloadDir, zipName);
        const extractPath = path.join(this.tmpDir, zipName.replace('.zip', ''));

        // Vérifier si déjà extrait
        if (fs.existsSync(extractPath)) {
            console.log(`   ✅ ${zipName}: Déjà extrait`);
            this.stats.extracted++;
            return;
        }

        try {
            // Créer le dossier de destination
            fs.mkdirSync(extractPath, { recursive: true });

            // Lancer l'extraction avec PowerShell en arrière-plan
            const process = this.spawnExtractionProcess(zipName, downloadPath, extractPath);
            
            // Stocker les informations du processus
            this.processes.set(zipName, {
                process: process,
                startTime: Date.now(),
                extractPath: extractPath,
                status: 'running'
            });

            this.stats.inProgress++;
            this.logExtraction(`🔄 Extraction lancée: ${zipName}`);

        } catch (error) {
            console.log(`   ❌ Erreur lors du lancement de ${zipName}: ${error.message}`);
            this.stats.failed++;
            this.logExtraction(`❌ Erreur lancement: ${zipName} - ${error.message}`);
        }
    }

    spawnExtractionProcess(zipName, sourcePath, targetPath) {
        // Utiliser PowerShell pour l'extraction en arrière-plan
        const extractCommand = `powershell -Command "Expand-Archive -Path '${sourcePath}' -DestinationPath '${targetPath}' -Force"`;
        
        const childProcess = spawn('powershell', [
            '-Command', 
            `Start-Job -ScriptBlock { ${extractCommand} } -Name "extract_${zipName.replace(/[^a-zA-Z0-9]/g, '_')}"`
        ], {
            detached: true,
            stdio: 'pipe'
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

    handleProcessError(zipName, error) {
        console.log(`   ❌ Erreur processus ${zipName}: ${error.message}`);
        this.logExtraction(`❌ Erreur processus: ${zipName} - ${error.message}`);
        
        const processInfo = this.processes.get(zipName);
        if (processInfo) {
            processInfo.status = 'failed';
            this.stats.inProgress--;
            this.stats.failed++;
        }
    }

    handleProcessExit(zipName, code) {
        const processInfo = this.processes.get(zipName);
        if (processInfo) {
            if (code === 0) {
                processInfo.status = 'completed';
                this.stats.extracted++;
                this.stats.inProgress--;
                console.log(`   ✅ ${zipName}: Extraction terminée`);
                this.logExtraction(`✅ Extraction terminée: ${zipName}`);
            } else {
                processInfo.status = 'failed';
                this.stats.failed++;
                this.stats.inProgress--;
                console.log(`   ❌ ${zipName}: Extraction échouée (code: ${code})`);
                this.logExtraction(`❌ Extraction échouée: ${zipName} (code: ${code})`);
            }
        }
    }

    startMonitoring() {
        console.log('📊 Démarrage du monitoring en arrière-plan...');

        // Monitoring toutes les 5 secondes
        setInterval(() => {
            this.updateMonitoring();
        }, 5000);

        // Monitoring des processus terminés
        setInterval(() => {
            this.checkCompletedProcesses();
        }, 10000);

        console.log('   ✅ Monitoring démarré');
    }

    async updateMonitoring() {
        try {
            // Mettre à jour le fichier de statut
            const statusPath = path.join(this.tmpDir, 'extraction-status.json');
            const status = {
                lastUpdate: new Date().toISOString(),
                isRunning: this.isRunning,
                processes: Array.from(this.processes.entries()).map(([name, info]) => ({
                    name,
                    status: info.status,
                    startTime: new Date(info.startTime).toISOString(),
                    duration: Math.round((Date.now() - info.startTime) / 1000)
                })),
                stats: this.stats
            };

            fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));

            // Afficher le statut en temps réel
            this.displayRealTimeStatus();

        } catch (error) {
            console.log(`   ❌ Erreur mise à jour monitoring: ${error.message}`);
        }
    }

    displayRealTimeStatus() {
        const progress = this.stats.totalZips > 0 ? 
            ((this.stats.extracted + this.stats.failed) / this.stats.totalZips * 100).toFixed(1) : 0;

        console.log(`\r📊 [${progress}%] Extrait: ${this.stats.extracted}, Échoué: ${this.stats.failed}, En cours: ${this.stats.inProgress}/${this.stats.totalZips}`);
    }

    async checkCompletedProcesses() {
        for (const [zipName, processInfo] of this.processes.entries()) {
            if (processInfo.status === 'running') {
                // Vérifier si l'extraction est terminée
                const isCompleted = await this.checkExtractionCompletion(processInfo.extractPath);
                
                if (isCompleted) {
                    processInfo.status = 'completed';
                    this.stats.extracted++;
                    this.stats.inProgress--;
                    console.log(`   ✅ ${zipName}: Détection automatique de fin d'extraction`);
                    this.logExtraction(`✅ Détection automatique: ${zipName}`);
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

    async logExtraction(message) {
        try {
            const logPath = path.join(this.tmpDir, 'extraction.log');
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

    // Méthodes utilitaires pour le monitoring externe
    getStatus() {
        return {
            isRunning: this.isRunning,
            stats: this.stats,
            processes: Array.from(this.processes.entries()).map(([name, info]) => ({
                name,
                status: info.status,
                startTime: new Date(info.startTime).toISOString(),
                duration: Math.round((Date.now() - info.startTime) / 1000)
            }))
        };
    }

    stopAllProcesses() {
        console.log('🛑 Arrêt de tous les processus...');
        
        for (const [zipName, processInfo] of this.processes.entries()) {
            if (processInfo.status === 'running') {
                try {
                    processInfo.process.kill();
                    processInfo.status = 'stopped';
                    this.stats.inProgress--;
                } catch (error) {
                    console.log(`   ❌ Erreur arrêt ${zipName}: ${error.message}`);
                }
            }
        }

        this.isRunning = false;
        console.log('   ✅ Tous les processus arrêtés');
    }

    // Méthode pour vérifier l'état depuis l'extérieur
    static getStatusFromFile() {
        try {
            const statusPath = path.join(process.cwd(), '.tmp_background_zip', 'extraction-status.json');
            if (fs.existsSync(statusPath)) {
                return JSON.parse(fs.readFileSync(statusPath, 'utf8'));
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
    if (global.zipProcessor) {
        global.zipProcessor.stopAllProcesses();
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Signal SIGTERM reçu, arrêt propre...');
    if (global.zipProcessor) {
        global.zipProcessor.stopAllProcesses();
    }
    process.exit(0);
});

if (require.main === module) {
    const processor = new BackgroundZipProcessor();
    global.zipProcessor = processor;
    processor.run().catch(console.error);
}

module.exports = BackgroundZipProcessor;
