#!/usr/bin/env node
/**
 * Script d'analyse des anciens README pour récupérer les drivers manquants
 * Version: 1.0.12-20250729-1700
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    version: '1.0.12-20250729-1700',
    logFile: './logs/analyze-historical-readme.log',
    resultsFile: './data/historical-readme-analysis.json'
};

// Fonction de logging
function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);
    
    const logDir = path.dirname(CONFIG.logFile);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(CONFIG.logFile, logMessage + '\n');
}

// Fonction pour analyser les branches Git
function analyzeGitBranches() {
    log('🔍 === ANALYSE DES BRANCHES GIT ===');
    
    try {
        // Lister toutes les branches
        const branches = execSync('git branch -a', { encoding: 'utf8' });
        log('Branches disponibles:');
        log(branches);
        
        const branchList = branches.split('\n').filter(branch => branch.trim());
        log(`Total branches: ${branchList.length}`);
        
        return branchList;
        
    } catch (error) {
        log(`❌ Erreur analyse branches: ${error.message}`, 'ERROR');
        return [];
    }
}

// Fonction pour analyser un README spécifique
function analyzeReadmeFile(filePath) {
    log(`📖 === ANALYSE README: ${filePath} ===`);
    
    try {
        if (!fs.existsSync(filePath)) {
            log(`⚠️ Fichier non trouvé: ${filePath}`, 'WARN');
            return null;
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Extraire les informations de drivers
        const drivers = [];
        
        // Patterns pour détecter les drivers
        const patterns = [
            /driver[:\s]+([^\n]+)/gi,
            /device[:\s]+([^\n]+)/gi,
            /tuya[:\s]+([^\n]+)/gi,
            /zigbee[:\s]+([^\n]+)/gi,
            /manufacturer[:\s]+([^\n]+)/gi,
            /model[:\s]+([^\n]+)/gi
        ];
        
        patterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const driverInfo = match.replace(pattern, '$1').trim();
                    if (driverInfo && driverInfo.length > 3) {
                        drivers.push({
                            source: filePath,
                            info: driverInfo,
                            pattern: pattern.source
                        });
                    }
                });
            }
        });
        
        log(`✅ Drivers trouvés dans ${filePath}: ${drivers.length}`);
        return { filePath, content: content.substring(0, 500), drivers };
        
    } catch (error) {
        log(`❌ Erreur analyse ${filePath}: ${error.message}`, 'ERROR');
        return null;
    }
}

// Fonction pour analyser tous les README
function analyzeAllReadmes() {
    log('📚 === ANALYSE DE TOUS LES README ===');
    
    try {
        // Chercher tous les fichiers README
        const readmeFiles = execSync('Get-ChildItem -Path "." -Recurse -Include "*README*"', { shell: 'powershell', encoding: 'utf8' });
        
        const files = readmeFiles.split('\n').filter(file => file.trim());
        log(`Fichiers README trouvés: ${files.length}`);
        
        const results = [];
        
        files.forEach(file => {
            if (file.trim()) {
                const result = analyzeReadmeFile(file.trim());
                if (result) {
                    results.push(result);
                }
            }
        });
        
        log(`✅ Analyse terminée: ${results.length} fichiers traités`);
        return results;
        
    } catch (error) {
        log(`❌ Erreur analyse README: ${error.message}`, 'ERROR');
        return [];
    }
}

// Fonction pour créer des drivers depuis les informations trouvées
function createDriversFromInfo(readmeAnalysis) {
    log('🔧 === CRÉATION DE DRIVERS DEPUIS LES INFOS ===');
    
    try {
        let createdDrivers = 0;
        const driverTemplates = [];
        
        readmeAnalysis.forEach(analysis => {
            analysis.drivers.forEach(driver => {
                // Créer un template de driver basé sur les informations
                const driverId = driver.info.toLowerCase()
                    .replace(/[^a-z0-9]/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '');
                
                if (driverId.length > 3) {
                    const template = {
                        id: `historical-${driverId}`,
                        name: {
                            en: driver.info,
                            fr: driver.info,
                            nl: driver.info,
                            ta: driver.info
                        },
                        description: {
                            en: `Driver recovered from historical README: ${driver.source}`,
                            fr: `Driver récupéré depuis README historique: ${driver.source}`,
                            nl: `Driver hersteld van historische README: ${driver.source}`,
                            ta: `வரலாற்று README இலிருந்து மீட்டெடுக்கப்பட்ட driver: ${driver.source}`
                        },
                        source: driver.source,
                        originalInfo: driver.info,
                        category: 'historical-recovery'
                    };
                    
                    driverTemplates.push(template);
                    createdDrivers++;
                }
            });
        });
        
        log(`✅ Templates de drivers créés: ${createdDrivers}`);
        return driverTemplates;
        
    } catch (error) {
        log(`❌ Erreur création drivers: ${error.message}`, 'ERROR');
        return [];
    }
}

// Fonction pour sauvegarder les résultats
function saveResults(readmeAnalysis, driverTemplates) {
    log('💾 === SAUVEGARDE DES RÉSULTATS ===');
    
    try {
        const results = {
            timestamp: new Date().toISOString(),
            version: CONFIG.version,
            summary: {
                readmeFilesAnalyzed: readmeAnalysis.length,
                totalDriversFound: readmeAnalysis.reduce((sum, analysis) => sum + analysis.drivers.length, 0),
                driverTemplatesCreated: driverTemplates.length
            },
            readmeAnalysis,
            driverTemplates
        };
        
        const dataDir = path.dirname(CONFIG.resultsFile);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        fs.writeFileSync(CONFIG.resultsFile, JSON.stringify(results, null, 2));
        log(`✅ Résultats sauvegardés: ${CONFIG.resultsFile}`);
        
        return results;
        
    } catch (error) {
        log(`❌ Erreur sauvegarde: ${error.message}`, 'ERROR');
        return null;
    }
}

// Fonction principale
function analyzeHistoricalReadme() {
    log('🚀 === ANALYSE DES ANCIENS README ===');
    
    const startTime = Date.now();
    
    try {
        // 1. Analyser les branches Git
        const branches = analyzeGitBranches();
        
        // 2. Analyser tous les README
        const readmeAnalysis = analyzeAllReadmes();
        
        // 3. Créer des drivers depuis les informations
        const driverTemplates = createDriversFromInfo(readmeAnalysis);
        
        // 4. Sauvegarder les résultats
        const results = saveResults(readmeAnalysis, driverTemplates);
        
        // Rapport final
        const duration = Date.now() - startTime;
        log('📊 === RAPPORT FINAL ANALYSE README ===');
        log(`Fichiers README analysés: ${readmeAnalysis.length}`);
        log(`Drivers trouvés: ${results.summary.totalDriversFound}`);
        log(`Templates créés: ${driverTemplates.length}`);
        log(`Durée: ${duration}ms`);
        
        log('✅ Analyse des anciens README terminée avec succès');
        
        return results;
        
    } catch (error) {
        log(`❌ ERREUR CRITIQUE ANALYSE: ${error.message}`, 'ERROR');
        throw error;
    }
}

// Exécution si appelé directement
if (require.main === module) {
    try {
        const results = analyzeHistoricalReadme();
        log('✅ Analyse terminée avec succès', 'SUCCESS');
    } catch (error) {
        log(`❌ Analyse échouée: ${error.message}`, 'ERROR');
        process.exit(1);
    }
}

module.exports = { analyzeHistoricalReadme };