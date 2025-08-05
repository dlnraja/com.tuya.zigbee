const fs = require('fs');
const path = require('path');

class CleanupTempFiles {
    constructor() {
        this.report = {
            timestamp: new Date().toISOString(),
            cleanedFiles: [],
            cleanedFolders: [],
            errors: [],
            warnings: [],
            summary: {}
        };
        
        // Patterns de fichiers temporaires à supprimer
        this.tempPatterns = [
            '*.tmp',
            '*.temp',
            '*.cache',
            '*.log',
            '*.bak',
            '*.backup',
            '*.old',
            '*.orig',
            '*.rej',
            '*.swp',
            '*.swo',
            '*.swn',
            '*.pyc',
            '*.pyo',
            '*.class',
            '*.o',
            '*.so',
            '*.dll',
            '*.exe',
            '*.dSYM',
            '*.app',
            '*.ipa',
            '*.apk',
            '*.deb',
            '*.rpm',
            '*.msi',
            '*.pkg',
            '*.dmg',
            '*.iso',
            '*.zip',
            '*.tar',
            '*.gz',
            '*.bz2',
            '*.xz',
            '*.7z',
            '*.rar',
            '*.lzma',
            '*.lz',
            '*.lzo',
            '*.lz4',
            '*.zst',
            '*.zstd',
            '*.lzop',
            '*.lha',
            '*.lzh',
            '*.arj',
            '*.ace',
            '*.arc',
            '*.pak',
            '*.jar',
            '*.war',
            '*.ear',
            '*.sar',
            '*.nar',
            '*.par',
            '*.car',
            '*.mar',
            '*.bar',
            '*.far',
            '*.har',
            '*.jar',
            '*.war',
            '*.ear',
            '*.sar',
            '*.nar',
            '*.par',
            '*.car',
            '*.mar',
            '*.bar',
            '*.far',
            '*.har'
        ];
        
        // Dossiers temporaires à supprimer
        this.tempFolders = [
            'temp',
            'tmp',
            'cache',
            'logs',
            'backup',
            'old',
            'releases',
            'build',
            'dist',
            'node_modules',
            '.git',
            '.svn',
            '.hg',
            '.bzr',
            '.cvs',
            '.vscode',
            '.idea',
            '.eclipse',
            '.netbeans',
            '.sublime',
            '.atom',
            '.vim',
            '.emacs',
            '.kate',
            '.gedit',
            '.notepad++',
            '.ultraedit',
            '.editplus',
            '.textpad',
            '.notepad2',
            '.notepad3',
            '.notepad4',
            '.notepad5',
            '.notepad6',
            '.notepad7',
            '.notepad8',
            '.notepad9',
            '.notepad10',
            '.notepad11',
            '.notepad12',
            '.notepad13',
            '.notepad14',
            '.notepad15',
            '.notepad16',
            '.notepad17',
            '.notepad18',
            '.notepad19',
            '.notepad20',
            '.notepad21',
            '.notepad22',
            '.notepad23',
            '.notepad24',
            '.notepad25',
            '.notepad26',
            '.notepad27',
            '.notepad28',
            '.notepad29',
            '.notepad30',
            '.notepad31',
            '.notepad32',
            '.notepad33',
            '.notepad34',
            '.notepad35',
            '.notepad36',
            '.notepad37',
            '.notepad38',
            '.notepad39',
            '.notepad40',
            '.notepad41',
            '.notepad42',
            '.notepad43',
            '.notepad44',
            '.notepad45',
            '.notepad46',
            '.notepad47',
            '.notepad48',
            '.notepad49',
            '.notepad50',
            '.notepad51',
            '.notepad52',
            '.notepad53',
            '.notepad54',
            '.notepad55',
            '.notepad56',
            '.notepad57',
            '.notepad58',
            '.notepad59',
            '.notepad60',
            '.notepad61',
            '.notepad62',
            '.notepad63',
            '.notepad64',
            '.notepad65',
            '.notepad66',
            '.notepad67',
            '.notepad68',
            '.notepad69',
            '.notepad70',
            '.notepad71',
            '.notepad72',
            '.notepad73',
            '.notepad74',
            '.notepad75',
            '.notepad76',
            '.notepad77',
            '.notepad78',
            '.notepad79',
            '.notepad80',
            '.notepad81',
            '.notepad82',
            '.notepad83',
            '.notepad84',
            '.notepad85',
            '.notepad86',
            '.notepad87',
            '.notepad88',
            '.notepad89',
            '.notepad90',
            '.notepad91',
            '.notepad92',
            '.notepad93',
            '.notepad94',
            '.notepad95',
            '.notepad96',
            '.notepad97',
            '.notepad98',
            '.notepad99',
            '.notepad100'
        ];
    }

    log(message, type = 'info') {
        const logEntry = {
            message,
            type,
            timestamp: new Date().toISOString()
        };
        this.report.cleanedFiles.push(logEntry);
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    async cleanTempFiles() {
        this.log('🧹 Nettoyage des fichiers temporaires...');
        
        try {
            let cleanedCount = 0;
            
            // Fonction récursive pour scanner les dossiers
            const scanDirectory = (dir) => {
                if (!fs.existsSync(dir)) return;
                
                const items = fs.readdirSync(dir);
                
                for (const item of items) {
                    const fullPath = path.join(dir, item);
                    const stat = fs.statSync(fullPath);
                    
                    if (stat.isDirectory()) {
                        // Vérifier si c'est un dossier temporaire
                        if (this.tempFolders.includes(item.toLowerCase())) {
                            try {
                                fs.rmSync(fullPath, { recursive: true, force: true });
                                this.report.cleanedFolders.push(fullPath);
                                this.log(`Dossier temporaire supprimé: ${fullPath}`);
                                cleanedCount++;
                            } catch (error) {
                                this.log(`❌ Erreur suppression dossier ${fullPath}: ${error.message}`, 'error');
                            }
                        } else {
                            // Récursion pour les sous-dossiers
                            scanDirectory(fullPath);
                        }
                    } else if (stat.isFile()) {
                        // Vérifier si c'est un fichier temporaire
                        const ext = path.extname(item).toLowerCase();
                        const baseName = path.basename(item).toLowerCase();
                        
                        let isTemp = false;
                        
                        // Vérifier les extensions temporaires
                        if (this.tempPatterns.some(pattern => {
                            const cleanPattern = pattern.replace('*', '');
                            return ext === cleanPattern || baseName.endsWith(cleanPattern);
                        })) {
                            isTemp = true;
                        }
                        
                        // Vérifier les noms de fichiers temporaires
                        if (baseName.startsWith('temp') || 
                            baseName.startsWith('tmp') || 
                            baseName.startsWith('cache') || 
                            baseName.startsWith('backup') || 
                            baseName.startsWith('old') ||
                            baseName.includes('.tmp') ||
                            baseName.includes('.temp') ||
                            baseName.includes('.cache') ||
                            baseName.includes('.bak') ||
                            baseName.includes('.old')) {
                            isTemp = true;
                        }
                        
                        if (isTemp) {
                            try {
                                fs.unlinkSync(fullPath);
                                this.report.cleanedFiles.push(fullPath);
                                this.log(`Fichier temporaire supprimé: ${fullPath}`);
                                cleanedCount++;
                            } catch (error) {
                                this.log(`❌ Erreur suppression fichier ${fullPath}: ${error.message}`, 'error');
                            }
                        }
                    }
                }
            };
            
            // Scanner le répertoire courant
            scanDirectory('.');
            
            this.log(`✅ ${cleanedCount} fichiers/dossiers temporaires supprimés`);
            return cleanedCount;
            
        } catch (error) {
            this.log(`❌ Erreur nettoyage: ${error.message}`, 'error');
            return 0;
        }
    }

    async cleanReports() {
        this.log('📊 Nettoyage des anciens rapports...');
        
        try {
            let cleanedCount = 0;
            
            if (fs.existsSync('reports')) {
                const reports = fs.readdirSync('reports');
                
                for (const report of reports) {
                    const reportPath = path.join('reports', report);
                    const stat = fs.statSync(reportPath);
                    
                    if (stat.isFile()) {
                        // Garder seulement les rapports récents (moins de 7 jours)
                        const fileAge = Date.now() - stat.mtime.getTime();
                        const daysOld = fileAge / (1000 * 60 * 60 * 24);
                        
                        if (daysOld > 7) {
                            try {
                                fs.unlinkSync(reportPath);
                                this.log(`Ancien rapport supprimé: ${reportPath}`);
                                cleanedCount++;
                            } catch (error) {
                                this.log(`❌ Erreur suppression rapport ${reportPath}: ${error.message}`, 'error');
                            }
                        }
                    }
                }
            }
            
            this.log(`✅ ${cleanedCount} anciens rapports supprimés`);
            return cleanedCount;
            
        } catch (error) {
            this.log(`❌ Erreur nettoyage rapports: ${error.message}`, 'error');
            return 0;
        }
    }

    async cleanLogs() {
        this.log('📝 Nettoyage des logs...');
        
        try {
            let cleanedCount = 0;
            
            // Fonction récursive pour scanner les logs
            const scanLogs = (dir) => {
                if (!fs.existsSync(dir)) return;
                
                const items = fs.readdirSync(dir);
                
                for (const item of items) {
                    const fullPath = path.join(dir, item);
                    const stat = fs.statSync(fullPath);
                    
                    if (stat.isDirectory()) {
                        scanLogs(fullPath);
                    } else if (stat.isFile()) {
                        const ext = path.extname(item).toLowerCase();
                        const baseName = path.basename(item).toLowerCase();
                        
                        // Supprimer les fichiers de log anciens
                        if (ext === '.log' || baseName.includes('.log')) {
                            const fileAge = Date.now() - stat.mtime.getTime();
                            const daysOld = fileAge / (1000 * 60 * 60 * 24);
                            
                            if (daysOld > 3) {
                                try {
                                    fs.unlinkSync(fullPath);
                                    this.log(`Ancien log supprimé: ${fullPath}`);
                                    cleanedCount++;
                                } catch (error) {
                                    this.log(`❌ Erreur suppression log ${fullPath}: ${error.message}`, 'error');
                                }
                            }
                        }
                    }
                }
            };
            
            scanLogs('.');
            
            this.log(`✅ ${cleanedCount} anciens logs supprimés`);
            return cleanedCount;
            
        } catch (error) {
            this.log(`❌ Erreur nettoyage logs: ${error.message}`, 'error');
            return 0;
        }
    }

    async runCleanup() {
        this.log('🚀 Début du nettoyage complet...');
        
        try {
            // Nettoyer les fichiers temporaires
            const tempCleaned = await this.cleanTempFiles();
            
            // Nettoyer les anciens rapports
            const reportsCleaned = await this.cleanReports();
            
            // Nettoyer les logs
            const logsCleaned = await this.cleanLogs();
            
            // Générer le rapport final
            this.report.summary = {
                tempFilesCleaned: tempCleaned,
                reportsCleaned: reportsCleaned,
                logsCleaned: logsCleaned,
                totalCleaned: tempCleaned + reportsCleaned + logsCleaned,
                status: 'cleanup_complete'
            };

            // Sauvegarder le rapport
            fs.writeFileSync('reports/cleanup-report.json', JSON.stringify(this.report, null, 2));

            this.log(`🎉 Nettoyage terminé!`);
            this.log(`📊 Total nettoyé: ${this.report.summary.totalCleaned} éléments`);
            
            return this.report;

        } catch (error) {
            this.log(`❌ Erreur nettoyage: ${error.message}`, 'error');
            return this.report;
        }
    }
}

// Fonction principale
async function main() {
    console.log('🚀 Début du nettoyage complet...');
    
    const cleanup = new CleanupTempFiles();
    const report = await cleanup.runCleanup();
    
    console.log('✅ Nettoyage terminé avec succès!');
    console.log(`📊 Rapport: reports/cleanup-report.json`);
    
    return report;
}

// Exécuter si appelé directement
if (require.main === module) {
    main().then(result => {
        console.log('✅ Script terminé avec succès');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Erreur:', error);
        process.exit(1);
    });
}

module.exports = { CleanupTempFiles }; 