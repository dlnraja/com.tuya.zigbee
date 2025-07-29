#!/usr/bin/env node
/**
 * Script de validation Homey CLI
 * Pour tester la compatibilité et la structure
 * Version: 1.0.12-20250729-1645
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    version: '1.0.12-20250729-1645',
    logFile: './logs/validate-homey-cli.log',
    validationDataFile: './data/homey-cli-validation.json'
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

// Fonction pour vérifier si Homey CLI est installé
function checkHomeyCLI() {
    log('🔍 === VÉRIFICATION HOMEY CLI ===');
    
    try {
        const version = execSync('homey --version', { stdio: 'pipe' }).toString().trim();
        log(`Homey CLI détecté: ${version}`);
        return { installed: true, version };
    } catch (error) {
        log('Homey CLI non installé', 'WARN');
        return { installed: false, version: null };
    }
}

// Fonction pour valider l'app avec Homey CLI
function validateAppWithCLI() {
    log('🏠 === VALIDATION APP AVEC HOMEY CLI ===');
    
    try {
        const result = execSync('homey app validate', { stdio: 'pipe' }).toString();
        log('Validation Homey CLI réussie');
        return { success: true, output: result };
    } catch (error) {
        log(`Validation Homey CLI échouée: ${error.message}`, 'ERROR');
        return { success: false, error: error.message };
    }
}

// Fonction pour tester l'installation
function testInstallation() {
    log('📦 === TEST D\'INSTALLATION ===');
    
    try {
        // Créer un dossier temporaire pour le test
        const tempDir = './temp-install-test';
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Copier les fichiers essentiels
        const essentialFiles = ['app.json', 'app.js'];
        essentialFiles.forEach(file => {
            if (fs.existsSync(`./${file}`)) {
                fs.copyFileSync(`./${file}`, `${tempDir}/${file}`);
            }
        });
        
        // Copier le dossier drivers
        if (fs.existsSync('./drivers')) {
            execSync(`xcopy ".\\drivers" "${tempDir}\\drivers" /E /I /Y`, { shell: 'cmd' });
        }
        
        // Tester l'installation dans le dossier temporaire
        const currentDir = process.cwd();
        process.chdir(tempDir);
        
        try {
            const result = execSync('homey app install', { stdio: 'pipe' }).toString();
            log('Test d\'installation réussi');
            
            // Nettoyer
            process.chdir(currentDir);
            execSync(`rmdir /S /Q "${tempDir}"`, { shell: 'cmd' });
            
            return { success: true, output: result };
        } catch (error) {
            log(`Test d'installation échoué: ${error.message}`, 'ERROR');
            
            // Nettoyer
            process.chdir(currentDir);
            execSync(`rmdir /S /Q "${tempDir}"`, { shell: 'cmd' });
            
            return { success: false, error: error.message };
        }
        
    } catch (error) {
        log(`Erreur test installation: ${error.message}`, 'ERROR');
        return { success: false, error: error.message };
    }
}

// Fonction pour analyser les erreurs de validation
function analyzeValidationErrors(validationResult) {
    log('🔍 === ANALYSE DES ERREURS DE VALIDATION ===');
    
    const analysis = {
        hasErrors: false,
        errorTypes: [],
        recommendations: []
    };
    
    if (!validationResult.success) {
        analysis.hasErrors = true;
        const error = validationResult.error;
        
        // Analyser les types d'erreurs courants
        if (error.includes('app.json')) {
            analysis.errorTypes.push('app_json_issue');
            analysis.recommendations.push('Fix app.json structure and required fields');
        }
        
        if (error.includes('app.js')) {
            analysis.errorTypes.push('app_js_issue');
            analysis.recommendations.push('Create or fix app.js file');
        }
        
        if (error.includes('drivers')) {
            analysis.errorTypes.push('drivers_issue');
            analysis.recommendations.push('Check driver.compose.json files');
        }
        
        if (error.includes('not found')) {
            analysis.errorTypes.push('file_not_found');
            analysis.recommendations.push('Check file paths and structure');
        }
        
        if (error.includes('JSON')) {
            analysis.errorTypes.push('json_syntax');
            analysis.recommendations.push('Fix JSON syntax errors');
        }
    }
    
    return analysis;
}

// Fonction pour générer un rapport de compatibilité
function generateCompatibilityReport(cliStatus, validationResult, installationResult, errorAnalysis) {
    log('📊 === GÉNÉRATION RAPPORT COMPATIBILITÉ ===');
    
    const report = {
        timestamp: new Date().toISOString(),
        cliStatus,
        validationResult,
        installationResult,
        errorAnalysis,
        overallStatus: 'unknown',
        score: 0,
        recommendations: []
    };
    
    // Calculer le score de compatibilité
    let score = 0;
    
    if (cliStatus.installed) {
        score += 25;
    }
    
    if (validationResult.success) {
        score += 50;
    }
    
    if (installationResult.success) {
        score += 25;
    }
    
    report.score = score;
    
    // Déterminer le statut global
    if (score >= 90) {
        report.overallStatus = 'excellent';
    } else if (score >= 75) {
        report.overallStatus = 'good';
    } else if (score >= 50) {
        report.overallStatus = 'fair';
    } else {
        report.overallStatus = 'poor';
    }
    
    // Générer des recommandations
    if (!cliStatus.installed) {
        report.recommendations.push('Install Homey CLI: npm install -g @homey/homey-cli');
    }
    
    if (!validationResult.success) {
        report.recommendations.push('Fix app structure issues');
        report.recommendations.push(...errorAnalysis.recommendations);
    }
    
    if (!installationResult.success) {
        report.recommendations.push('Check app.json and driver structure');
    }
    
    return report;
}

// Fonction principale
function validateHomeyCLI() {
    log('🚀 === DÉMARRAGE VALIDATION HOMEY CLI ===');
    
    try {
        // 1. Vérifier si Homey CLI est installé
        const cliStatus = checkHomeyCLI();
        
        if (!cliStatus.installed) {
            log('⚠️ Homey CLI non installé - validation limitée', 'WARN');
            
            const limitedReport = {
                timestamp: new Date().toISOString(),
                cliStatus,
                validationResult: { success: false, error: 'Homey CLI not installed' },
                installationResult: { success: false, error: 'Homey CLI not installed' },
                errorAnalysis: { hasErrors: true, errorTypes: ['cli_not_installed'], recommendations: ['Install Homey CLI'] },
                overallStatus: 'cli_missing',
                score: 0,
                recommendations: ['Install Homey CLI: npm install -g @homey/homey-cli']
            };
            
            // Sauvegarder le rapport
            const dataDir = path.dirname(CONFIG.validationDataFile);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            fs.writeFileSync(CONFIG.validationDataFile, JSON.stringify(limitedReport, null, 2));
            
            log('📊 === RAPPORT VALIDATION LIMITÉ ===');
            log(`Homey CLI: ${cliStatus.installed ? '✅' : '❌'}`);
            log(`Score: 0/100`);
            log(`Statut: CLI manquant`);
            
            return limitedReport;
        }
        
        // 2. Valider l'app
        const validationResult = validateAppWithCLI();
        
        // 3. Tester l'installation
        const installationResult = testInstallation();
        
        // 4. Analyser les erreurs
        const errorAnalysis = analyzeValidationErrors(validationResult);
        
        // 5. Générer le rapport
        const report = generateCompatibilityReport(cliStatus, validationResult, installationResult, errorAnalysis);
        
        // 6. Sauvegarder le rapport
        const dataDir = path.dirname(CONFIG.validationDataFile);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(CONFIG.validationDataFile, JSON.stringify(report, null, 2));
        
        // 7. Rapport final
        log('📊 === RAPPORT FINAL VALIDATION HOMEY CLI ===');
        log(`Homey CLI: ${cliStatus.installed ? '✅' : '❌'} (${cliStatus.version})`);
        log(`Validation: ${validationResult.success ? '✅' : '❌'}`);
        log(`Installation: ${installationResult.success ? '✅' : '❌'}`);
        log(`Score: ${report.score}/100`);
        log(`Statut: ${report.overallStatus}`);
        log(`Recommandations: ${report.recommendations.length}`);
        
        report.recommendations.forEach((rec, index) => {
            log(`  ${index + 1}. ${rec}`);
        });
        
        log('✅ Validation Homey CLI terminée avec succès');
        
        return report;
        
    } catch (error) {
        log(`Erreur validation Homey CLI: ${error.message}`, 'ERROR');
        return null;
    }
}

// Exécution si appelé directement
if (require.main === module) {
    validateHomeyCLI();
}

module.exports = { validateHomeyCLI }; 