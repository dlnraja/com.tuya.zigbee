#!/usr/bin/env node
/**
 * Script d'analyse des anciens README pour deviner les drivers manquants
 * Version: 1.0.12-20250729-1525
 * Objectif: Analyser les anciens README et extraire les informations sur les drivers manquants
 * Spécificités: Analyse historique, extraction intelligente, organisation automatique
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    version: '1.0.12-20250729-1525',
    commits: [
        'c736301a', // README récent
        'e112726a', // README ancien
        'e8936adf', // README très ancien
        '11ba9044', // README format correction
        '70bef195', // README correction complète
        'dd775b54', // README correction projet
        'c944894b'  // README structure modification
    ],
    branches: [
        'master',
        'tuya-light',
        'beta',
        'main',
        'jules-repair'
    ],
    logFile: './logs/analyze-historical-readme.log',
    backupPath: './backups/historical-readme'
};

// Logging
function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);
    
    // Écrire dans le fichier de log
    try {
        fs.appendFileSync(CONFIG.logFile, logMessage + '\n');
    } catch (error) {
        console.error(`Erreur écriture log: ${error.message}`);
    }
}

// Créer les dossiers nécessaires
function ensureDirectories() {
    const dirs = [
        CONFIG.backupPath,
        path.dirname(CONFIG.logFile),
        './logs',
        './reports',
        './drivers/tuya',
        './drivers/zigbee'
    ];
    
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            log(`Dossier créé: ${dir}`);
        }
    });
}

// Extraire le contenu d'un README depuis un commit
function extractReadmeFromCommit(commitHash) {
    try {
        log(`=== EXTRACTION README DEPUIS ${commitHash} ===`);
        
        const readmeContent = execSync(`git show ${commitHash}:README.md`, { encoding: 'utf8' });
        
        // Sauvegarder le contenu
        const backupFile = `${CONFIG.backupPath}/readme-${commitHash}.md`;
        fs.writeFileSync(backupFile, readmeContent);
        log(`README sauvegardé: ${backupFile}`);
        
        return readmeContent;
        
    } catch (error) {
        log(`Erreur extraction README ${commitHash}: ${error.message}`, 'ERROR');
        return null;
    }
}

// Analyser le contenu d'un README pour extraire les drivers
function analyzeReadmeContent(content, commitHash) {
    try {
        log(`=== ANALYSE README ${commitHash} ===`);
        
        const drivers = [];
        const lines = content.split('\n');
        
        // Chercher les sections de drivers
        let inDriverSection = false;
        let currentProtocol = '';
        let currentCategory = '';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Détecter les sections de protocoles
            if (line.includes('Tuya Drivers') || line.includes('Tuya Controllers') || line.includes('🔌 Tuya')) {
                currentProtocol = 'tuya';
                inDriverSection = true;
                log(`Section Tuya détectée dans ${commitHash}`);
            } else if (line.includes('Zigbee Drivers') || line.includes('Zigbee Controllers') || line.includes('📡 Zigbee')) {
                currentProtocol = 'zigbee';
                inDriverSection = true;
                log(`Section Zigbee détectée dans ${commitHash}`);
            }
            
            // Détecter les catégories
            if (line.includes('Controllers') || line.includes('controllers')) {
                currentCategory = 'controllers';
            } else if (line.includes('Sensors') || line.includes('sensors')) {
                currentCategory = 'sensors';
            } else if (line.includes('Security') || line.includes('security')) {
                currentCategory = 'security';
            } else if (line.includes('Climate') || line.includes('climate')) {
                currentCategory = 'climate';
            } else if (line.includes('Automation') || line.includes('automation')) {
                currentCategory = 'automation';
            }
            
            // Extraire les noms de drivers
            if (inDriverSection && line.includes('-') && !line.startsWith('#')) {
                const driverMatch = line.match(/\*\*([^*]+)\*\*/);
                if (driverMatch) {
                    const driverName = driverMatch[1].trim();
                    
                    // Déterminer la catégorie basée sur le nom
                    let category = currentCategory || 'generic';
                    if (driverName.includes('sensor')) {
                        category = 'sensors';
                    } else if (driverName.includes('switch') || driverName.includes('light') || driverName.includes('plug')) {
                        category = 'controllers';
                    } else if (driverName.includes('motion') || driverName.includes('contact') || driverName.includes('lock')) {
                        category = 'security';
                    } else if (driverName.includes('thermostat') || driverName.includes('hvac') || driverName.includes('valve')) {
                        category = 'climate';
                    }
                    
                    drivers.push({
                        name: driverName,
                        protocol: currentProtocol,
                        category: category,
                        source: `README-${commitHash}`,
                        commit: commitHash,
                        line: i + 1
                    });
                    
                    log(`Driver extrait: ${driverName} (${currentProtocol}/${category})`);
                }
            }
            
            // Sortir de la section si on trouve une nouvelle section
            if (line.startsWith('##') && inDriverSection) {
                inDriverSection = false;
            }
        }
        
        log(`Drivers extraits de ${commitHash}: ${drivers.length}`);
        return drivers;
        
    } catch (error) {
        log(`Erreur analyse README ${commitHash}: ${error.message}`, 'ERROR');
        return [];
    }
}

// Analyser les branches pour trouver des drivers supplémentaires
function analyzeBranches() {
    try {
        log('=== ANALYSE DES BRANCHES ===');
        
        const branchDrivers = [];
        
        for (const branch of CONFIG.branches) {
            try {
                log(`Analyse de la branche: ${branch}`);
                
                // Vérifier si la branche existe
                const branchExists = execSync(`git branch -a | grep ${branch}`, { encoding: 'utf8' });
                
                if (branchExists) {
                    // Extraire les drivers de cette branche
                    const branchContent = execSync(`git show ${branch}:README.md`, { encoding: 'utf8' });
                    const drivers = analyzeReadmeContent(branchContent, branch);
                    
                    drivers.forEach(driver => {
                        driver.source = `BRANCH-${branch}`;
                        branchDrivers.push(driver);
                    });
                    
                    log(`Drivers extraits de la branche ${branch}: ${drivers.length}`);
                }
                
            } catch (error) {
                log(`Erreur analyse branche ${branch}: ${error.message}`, 'WARN');
            }
        }
        
        return branchDrivers;
        
    } catch (error) {
        log(`Erreur analyse branches: ${error.message}`, 'ERROR');
        return [];
    }
}

// Créer un driver complet basé sur les informations extraites
function createDriverFromHistoricalInfo(driverInfo) {
    try {
        const { name, protocol, category, source, commit } = driverInfo;
        const driverPath = `./drivers/${protocol}/${category}/${name}`;
        
        // Créer le dossier du driver
        fs.mkdirSync(driverPath, { recursive: true });
        
        // Créer le dossier assets/images
        const assetsPath = `${driverPath}/assets/images`;
        fs.mkdirSync(assetsPath, { recursive: true });
        
        // Déterminer les capabilities basées sur le nom
        let capabilities = ['onoff'];
        if (name.includes('light') || name.includes('dim')) {
            capabilities.push('dim', 'light_temperature');
        }
        if (name.includes('sensor') && name.includes('temperature')) {
            capabilities.push('measure_temperature');
        }
        if (name.includes('sensor') && name.includes('humidity')) {
            capabilities.push('measure_humidity');
        }
        if (name.includes('motion')) {
            capabilities.push('alarm_motion');
        }
        if (name.includes('contact')) {
            capabilities.push('alarm_contact');
        }
        if (name.includes('plug') || name.includes('switch')) {
            capabilities.push('measure_power');
        }
        
        // Déterminer les clusters
        let clusters = ['genBasic'];
        if (capabilities.includes('onoff')) {
            clusters.push('genOnOff');
        }
        if (capabilities.includes('dim')) {
            clusters.push('genLevelCtrl');
        }
        if (capabilities.includes('measure_temperature')) {
            clusters.push('msTemperatureMeasurement');
        }
        if (capabilities.includes('measure_humidity')) {
            clusters.push('msRelativeHumidity');
        }
        if (capabilities.includes('alarm_motion') || capabilities.includes('alarm_contact')) {
            clusters.push('ssIasZone');
        }
        
        // Créer driver.compose.json
        const composeJson = {
            id: name,
            title: {
                en: `${name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
                fr: `${name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
                nl: `${name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
                ta: `${name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`
            },
            description: {
                en: `${protocol.toUpperCase()} driver for ${name} (recovered from historical README)`,
                fr: `Driver ${protocol.toUpperCase()} pour ${name} (récupéré depuis README historique)`,
                nl: `${protocol.toUpperCase()} driver voor ${name} (hersteld van historische README)`,
                ta: `${name} க்கான ${protocol.toUpperCase()} டிரைவர் (வரலாற்று README இலிருந்து மீட்டெடுக்கப்பட்டது)`
            },
            category: category,
            protocol: protocol,
            manufacturer: 'Historical Recovery',
            source: source,
            commit: commit,
            capabilities: capabilities,
            clusters: clusters,
            version: '1.0.0',
            author: 'dlnraja <dylan.rajasekaram+homey@gmail.com>',
            createdAt: new Date().toISOString(),
            recoveredFrom: 'Historical README Analysis'
        };
        
        fs.writeFileSync(`${driverPath}/driver.compose.json`, JSON.stringify(composeJson, null, 2));
        
        // Créer device.js
        const deviceJs = `'use strict';

const { ${protocol === 'tuya' ? 'TuyaDevice' : 'ZigbeeDevice'} } = require('homey-${protocol === 'tuya' ? 'tuya' : 'meshdriver'}');

class ${name.replace(/-/g, '').replace(/\b\w/g, l => l.toUpperCase())}Device extends ${protocol === 'tuya' ? 'TuyaDevice' : 'ZigbeeDevice'} {
    
    async onInit() {
        await super.onInit();
        
        // Initialize device (recovered from historical README)
        this.log('${name} device initialized (historical recovery)');
        
        // Register capabilities
        ${capabilities.map(cap => `this.registerCapability('${cap}', true);`).join('\n        ')}
        
        // Register flows
        this.registerFlowCards();
    }
    
    async onUninit() {
        await super.onUninit();
        this.log('${name} device uninitialized');
    }
    
    registerFlowCards() {
        // Register flow cards if needed
    }
    
    async onSettings({ oldSettings, newSettings, changedKeys }) {
        await super.onSettings({ oldSettings, newSettings, changedKeys });
        this.log('${name} settings updated');
    }
}

module.exports = ${name.replace(/-/g, '').replace(/\b\w/g, l => l.toUpperCase())}Device;`;
        
        fs.writeFileSync(`${driverPath}/device.js`, deviceJs);
        
        // Créer driver.settings.compose.json
        const settingsJson = {
            id: `${name}-settings`,
            title: {
                en: `${name} Settings`,
                fr: `Paramètres ${name}`,
                nl: `${name} Instellingen`,
                ta: `${name} அமைப்புகள்`
            },
            settings: [
                {
                    id: 'polling_interval',
                    type: 'number',
                    title: {
                        en: 'Polling Interval',
                        fr: 'Intervalle de sondage',
                        nl: 'Polling interval',
                        ta: 'போலிங் இடைவெளி'
                    },
                    default: 30,
                    min: 5,
                    max: 300
                }
            ]
        };
        
        fs.writeFileSync(`${driverPath}/driver.settings.compose.json`, JSON.stringify(settingsJson, null, 2));
        
        // Créer une icône SVG
        const iconSvg = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FF9800;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#F57C00;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="20" fill="url(#grad1)"/>
  <text x="50" y="60" font-family="Arial" font-size="12" fill="white" text-anchor="middle">${name.substring(0, 8).toUpperCase()}</text>
</svg>`;
        
        fs.writeFileSync(`${assetsPath}/icon.svg`, iconSvg);
        
        return true;
        
    } catch (error) {
        log(`Erreur création driver ${driverInfo.name}: ${error.message}`, 'ERROR');
        return false;
    }
}

// Organiser les drivers récupérés
function organizeHistoricalDrivers(drivers) {
    try {
        log('=== ORGANISATION DES DRIVERS HISTORIQUES ===');
        
        let organized = 0;
        let errors = 0;
        
        drivers.forEach(driver => {
            try {
                if (createDriverFromHistoricalInfo(driver)) {
                    organized++;
                } else {
                    errors++;
                }
            } catch (error) {
                log(`Erreur organisation driver ${driver.name}: ${error.message}`, 'ERROR');
                errors++;
            }
        });
        
        log(`Drivers historiques organisés: ${organized}`);
        log(`Erreurs: ${errors}`);
        
        return { organized, errors };
        
    } catch (error) {
        log(`Erreur organisation: ${error.message}`, 'ERROR');
        return { organized: 0, errors: drivers.length };
    }
}

// Créer un rapport d'analyse historique
function createHistoricalAnalysisReport(allDrivers, organization) {
    try {
        log('=== CRÉATION DU RAPPORT D\'ANALYSE HISTORIQUE ===');
        
        const report = {
            timestamp: new Date().toISOString(),
            version: CONFIG.version,
            commitsAnalyzed: CONFIG.commits.length,
            branchesAnalyzed: CONFIG.branches.length,
            driversRecovered: allDrivers.length,
            organization: organization,
            summary: {
                totalDrivers: allDrivers.length,
                organized: organization.organized,
                errors: organization.errors,
                successRate: Math.round((organization.organized / allDrivers.length) * 100)
            },
            sources: {},
            protocols: {},
            categories: {}
        };
        
        // Compter par source
        allDrivers.forEach(driver => {
            if (!report.sources[driver.source]) {
                report.sources[driver.source] = 0;
            }
            report.sources[driver.source]++;
            
            if (!report.protocols[driver.protocol]) {
                report.protocols[driver.protocol] = 0;
            }
            report.protocols[driver.protocol]++;
            
            if (!report.categories[driver.category]) {
                report.categories[driver.category] = 0;
            }
            report.categories[driver.category]++;
        });
        
        // Sauvegarder le rapport
        const reportPath = `./reports/historical-analysis-report-${Date.now()}.json`;
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        log(`Rapport créé: ${reportPath}`);
        
        return report;
        
    } catch (error) {
        log(`Erreur création rapport: ${error.message}`, 'ERROR');
        return null;
    }
}

// Point d'entrée principal
async function analyzeHistoricalReadmeScript() {
    try {
        log('🚀 === ANALYSE DES README HISTORIQUES ===');
        log(`Version: ${CONFIG.version}`);
        log(`Commits à analyser: ${CONFIG.commits.length}`);
        log(`Branches à analyser: ${CONFIG.branches.length}`);
        
        // Créer les dossiers nécessaires
        ensureDirectories();
        
        // Analyser tous les commits
        const allDrivers = [];
        
        for (const commit of CONFIG.commits) {
            try {
                const readmeContent = extractReadmeFromCommit(commit);
                if (readmeContent) {
                    const drivers = analyzeReadmeContent(readmeContent, commit);
                    allDrivers.push(...drivers);
                }
            } catch (error) {
                log(`Erreur analyse commit ${commit}: ${error.message}`, 'ERROR');
            }
        }
        
        // Analyser les branches
        const branchDrivers = analyzeBranches();
        allDrivers.push(...branchDrivers);
        
        // Supprimer les doublons
        const uniqueDrivers = [];
        const seen = new Set();
        
        allDrivers.forEach(driver => {
            const key = `${driver.name}-${driver.protocol}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueDrivers.push(driver);
            }
        });
        
        log(`Total drivers uniques récupérés: ${uniqueDrivers.length}`);
        
        // Organiser les drivers
        const organization = organizeHistoricalDrivers(uniqueDrivers);
        
        // Créer le rapport final
        const report = createHistoricalAnalysisReport(uniqueDrivers, organization);
        
        // Résumé final
        log('=== RÉSUMÉ ANALYSE HISTORIQUE ===');
        log(`Drivers récupérés: ${uniqueDrivers.length}`);
        log(`Drivers organisés: ${organization.organized}`);
        log(`Erreurs: ${organization.errors}`);
        log(`Taux de succès: ${report.summary.successRate}%`);
        
        log('🎉 Analyse des README historiques terminée!');
        
        return report;
        
    } catch (error) {
        log(`Erreur fatale: ${error.message}`, 'ERROR');
        throw error;
    }
}

// Point d'entrée
if (require.main === module) {
    analyzeHistoricalReadmeScript().catch(error => {
        log(`Erreur fatale: ${error.message}`, 'ERROR');
        process.exit(1);
    });
}

module.exports = {
    analyzeHistoricalReadmeScript,
    extractReadmeFromCommit,
    analyzeReadmeContent,
    analyzeBranches,
    createDriverFromHistoricalInfo,
    organizeHistoricalDrivers,
    createHistoricalAnalysisReport
};