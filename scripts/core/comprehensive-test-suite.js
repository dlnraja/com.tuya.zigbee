#!/usr/bin/env node

/**
 * 🧪 COMPREHENSIVE TEST SUITE
 * 📅 Date: 2025-08-04
 * 🎯 Mode: YOLO COMPREHENSIVE TESTING
 * 📦 Suite de tests complète pour validation finale
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ComprehensiveTestSuite {
    constructor() {
        this.projectRoot = process.cwd();
        this.testResults = {
            timestamp: new Date().toISOString(),
            tests: {},
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                successRate: 0
            }
        };
    }

    async runComprehensiveTests() {
        console.log('🧪 COMPREHENSIVE TEST SUITE - DÉMARRAGE');
        console.log(`📅 Date: ${new Date().toISOString()}`);
        console.log('🎯 Mode: YOLO COMPREHENSIVE TESTING');
        
        try {
            // 1. Tests de structure et fichiers
            await this.testProjectStructure();
            
            // 2. Tests de validation Homey
            await this.testHomeyValidation();
            
            // 3. Tests des drivers
            await this.testAllDrivers();
            
            // 4. Tests des scripts
            await this.testAllScripts();
            
            // 5. Tests de performance
            await this.testPerformance();
            
            // 6. Tests de sécurité
            await this.testSecurity();
            
            // 7. Tests de compatibilité
            await this.testCompatibility();
            
            // 8. Génération du rapport final
            await this.generateTestReport();
            
            console.log('✅ COMPREHENSIVE TEST SUITE TERMINÉE');
            
        } catch (error) {
            console.error('❌ Erreur tests:', error.message);
        }
    }

    async testProjectStructure() {
        console.log('📁 TESTS DE STRUCTURE ET FICHIERS...');
        
        const requiredFiles = [
            'app.json',
            'app.js',
            'README.md',
            'CHANGELOG.md',
            'drivers.json',
            'package.json',
            'assets/icon.svg',
            'assets/images/small.png',
            'assets/images/large.png'
        ];
        
        const requiredDirs = [
            'drivers/',
            'drivers/tuya/',
            'drivers/zigbee/',
            'scripts/',
            'scripts/core/',
            'tools/',
            '.github/',
            '.github/workflows/'
        ];
        
        let structureTests = {
            files: {},
            directories: {},
            summary: { passed: 0, failed: 0 }
        };
        
        // Test des fichiers requis
        for (const file of requiredFiles) {
            const filePath = path.join(this.projectRoot, file);
            const exists = fs.existsSync(filePath);
            structureTests.files[file] = exists;
            structureTests.summary[exists ? 'passed' : 'failed']++;
        }
        
        // Test des répertoires requis
        for (const dir of requiredDirs) {
            const dirPath = path.join(this.projectRoot, dir);
            const exists = fs.existsSync(dirPath);
            structureTests.directories[dir] = exists;
            structureTests.summary[exists ? 'passed' : 'failed']++;
        }
        
        this.testResults.tests.structure = structureTests;
        console.log('✅ Tests de structure terminés');
    }

    async testHomeyValidation() {
        console.log('🏠 TESTS DE VALIDATION HOMEY...');
        
        let validationTests = {
            debug: false,
            publish: false,
            build: false,
            summary: { passed: 0, failed: 0 }
        };
        
        try {
            // Test validation debug
            console.log('🔍 Test validation debug...');
            execSync('npx homey app validate --level debug', { stdio: 'pipe' });
            validationTests.debug = true;
            validationTests.summary.passed++;
        } catch (error) {
            validationTests.summary.failed++;
            console.log('❌ Validation debug échouée');
        }
        
        try {
            // Test validation publish
            console.log('📦 Test validation publish...');
            execSync('npx homey app validate --level publish', { stdio: 'pipe' });
            validationTests.publish = true;
            validationTests.summary.passed++;
        } catch (error) {
            validationTests.summary.failed++;
            console.log('❌ Validation publish échouée');
        }
        
        try {
            // Test build
            console.log('🔨 Test build...');
            execSync('npx homey app build', { stdio: 'pipe' });
            validationTests.build = true;
            validationTests.summary.passed++;
        } catch (error) {
            validationTests.summary.failed++;
            console.log('❌ Build échoué');
        }
        
        this.testResults.tests.homeyValidation = validationTests;
        console.log('✅ Tests de validation Homey terminés');
    }

    async testAllDrivers() {
        console.log('📁 TESTS DE TOUS LES DRIVERS...');
        
        const driverTests = {
            categories: {},
            summary: { total: 0, passed: 0, failed: 0 }
        };
        
        const categories = ['lights', 'plugs', 'sensors', 'switches', 'covers', 'locks', 'thermostats'];
        
        for (const category of categories) {
            const categoryPath = path.join(this.projectRoot, 'drivers', 'tuya', category);
            if (fs.existsSync(categoryPath)) {
                const drivers = fs.readdirSync(categoryPath, { withFileTypes: true })
                    .filter(dirent => dirent.isDirectory())
                    .map(dirent => dirent.name);
                
                driverTests.categories[category] = {
                    drivers: {},
                    summary: { total: drivers.length, passed: 0, failed: 0 }
                };
                
                for (const driver of drivers) {
                    const driverPath = path.join(categoryPath, driver);
                    const testResult = await this.testDriver(driverPath, driver, category);
                    
                    driverTests.categories[category].drivers[driver] = testResult;
                    driverTests.categories[category].summary[testResult.valid ? 'passed' : 'failed']++;
                    driverTests.summary[testResult.valid ? 'passed' : 'failed']++;
                    driverTests.summary.total++;
                }
            }
        }
        
        this.testResults.tests.drivers = driverTests;
        console.log('✅ Tests des drivers terminés');
    }

    async testDriver(driverPath, driverName, category) {
        const requiredFiles = ['device.js', 'driver.compose.json', 'driver.settings.compose.json'];
        const testResult = {
            valid: true,
            files: {},
            errors: []
        };
        
        for (const file of requiredFiles) {
            const filePath = path.join(driverPath, file);
            const exists = fs.existsSync(filePath);
            testResult.files[file] = exists;
            
            if (!exists) {
                testResult.valid = false;
                testResult.errors.push(`Fichier manquant: ${file}`);
            } else {
                // Test de syntaxe JSON pour les fichiers de configuration
                if (file.endsWith('.json')) {
                    try {
                        const content = fs.readFileSync(filePath, 'utf8');
                        JSON.parse(content);
                    } catch (error) {
                        testResult.valid = false;
                        testResult.errors.push(`Erreur JSON dans ${file}: ${error.message}`);
                    }
                }
            }
        }
        
        // Test spécifique pour les nouveaux drivers
        if (['ts0044-smart-switch', 'ts011f-smart-plug', 'smart-knob', 'soil-sensor'].includes(driverName)) {
            const deviceJsPath = path.join(driverPath, 'device.js');
            if (fs.existsSync(deviceJsPath)) {
                const content = fs.readFileSync(deviceJsPath, 'utf8');
                
                // Vérifier les optimisations tuya-light
                if (!content.includes('TUYA-LIGHT OPTIMIZATIONS')) {
                    testResult.valid = false;
                    testResult.errors.push('Optimisations tuya-light manquantes');
                }
                
                if (!content.includes('setupEnhancedPolling')) {
                    testResult.valid = false;
                    testResult.errors.push('Enhanced polling manquant');
                }
            }
        }
        
        return testResult;
    }

    async testAllScripts() {
        console.log('📜 TESTS DE TOUS LES SCRIPTS...');
        
        const scriptTests = {
            scripts: {},
            summary: { total: 0, passed: 0, failed: 0 }
        };
        
        const scriptsPath = path.join(this.projectRoot, 'scripts', 'core');
        if (fs.existsSync(scriptsPath)) {
            const scripts = fs.readdirSync(scriptsPath)
                .filter(file => file.endsWith('.js'))
                .map(file => file);
            
            for (const script of scripts) {
                const scriptPath = path.join(scriptsPath, script);
                const testResult = await this.testScript(scriptPath, script);
                
                scriptTests.scripts[script] = testResult;
                scriptTests.summary[testResult.valid ? 'passed' : 'failed']++;
                scriptTests.summary.total++;
            }
        }
        
        this.testResults.tests.scripts = scriptTests;
        console.log('✅ Tests des scripts terminés');
    }

    async testScript(scriptPath, scriptName) {
        const testResult = {
            valid: true,
            errors: [],
            size: 0,
            hasHeader: false
        };
        
        try {
            const content = fs.readFileSync(scriptPath, 'utf8');
            testResult.size = content.length;
            
            // Vérifier la présence d'un header
            if (content.includes('#!/usr/bin/env node')) {
                testResult.hasHeader = true;
            } else {
                testResult.valid = false;
                testResult.errors.push('Header shebang manquant');
            }
            
            // Test de syntaxe JavaScript
            try {
                require(scriptPath);
            } catch (error) {
                testResult.valid = false;
                testResult.errors.push(`Erreur de syntaxe: ${error.message}`);
            }
            
        } catch (error) {
            testResult.valid = false;
            testResult.errors.push(`Erreur de lecture: ${error.message}`);
        }
        
        return testResult;
    }

    async testPerformance() {
        console.log('⚡ TESTS DE PERFORMANCE...');
        
        const performanceTests = {
            fileCount: 0,
            totalSize: 0,
            averageFileSize: 0,
            largestFiles: [],
            summary: { passed: 0, failed: 0 }
        };
        
        // Compter tous les fichiers
        const countFiles = (dir) => {
            let count = 0;
            let size = 0;
            const files = [];
            
            if (fs.existsSync(dir)) {
                const items = fs.readdirSync(dir, { withFileTypes: true });
                
                for (const item of items) {
                    const itemPath = path.join(dir, item.name);
                    
                    if (item.isDirectory()) {
                        const subResult = countFiles(itemPath);
                        count += subResult.count;
                        size += subResult.size;
                        files.push(...subResult.files);
                    } else {
                        count++;
                        const fileSize = fs.statSync(itemPath).size;
                        size += fileSize;
                        files.push({ path: itemPath, size: fileSize });
                    }
                }
            }
            
            return { count, size, files };
        };
        
        const result = countFiles(this.projectRoot);
        performanceTests.fileCount = result.count;
        performanceTests.totalSize = result.size;
        performanceTests.averageFileSize = result.size / result.count;
        
        // Top 10 des plus gros fichiers
        performanceTests.largestFiles = result.files
            .sort((a, b) => b.size - a.size)
            .slice(0, 10)
            .map(file => ({
                path: path.relative(this.projectRoot, file.path),
                size: file.size
            }));
        
        // Critères de performance
        if (performanceTests.fileCount > 0) {
            performanceTests.summary.passed++;
        }
        
        if (performanceTests.totalSize < 10 * 1024 * 1024) { // < 10MB
            performanceTests.summary.passed++;
        } else {
            performanceTests.summary.failed++;
        }
        
        this.testResults.tests.performance = performanceTests;
        console.log('✅ Tests de performance terminés');
    }

    async testSecurity() {
        console.log('🔒 TESTS DE SÉCURITÉ...');
        
        const securityTests = {
            hasGitignore: false,
            hasLicense: false,
            hasReadme: false,
            noSecrets: true,
            summary: { passed: 0, failed: 0 }
        };
        
        // Vérifier .gitignore
        if (fs.existsSync(path.join(this.projectRoot, '.gitignore'))) {
            securityTests.hasGitignore = true;
            securityTests.summary.passed++;
        } else {
            securityTests.summary.failed++;
        }
        
        // Vérifier LICENSE
        if (fs.existsSync(path.join(this.projectRoot, 'LICENSE'))) {
            securityTests.hasLicense = true;
            securityTests.summary.passed++;
        } else {
            securityTests.summary.failed++;
        }
        
        // Vérifier README
        if (fs.existsSync(path.join(this.projectRoot, 'README.md'))) {
            securityTests.hasReadme = true;
            securityTests.summary.passed++;
        } else {
            securityTests.summary.failed++;
        }
        
        // Vérifier l'absence de secrets
        const sensitivePatterns = [
            /api_key/i,
            /password/i,
            /secret/i,
            /token/i
        ];
        
        const checkForSecrets = (dir) => {
            if (fs.existsSync(dir)) {
                const items = fs.readdirSync(dir, { withFileTypes: true });
                
                for (const item of items) {
                    const itemPath = path.join(dir, item.name);
                    
                    if (item.isDirectory() && !item.name.startsWith('.')) {
                        checkForSecrets(itemPath);
                    } else if (item.isFile() && item.name.endsWith('.js')) {
                        try {
                            const content = fs.readFileSync(itemPath, 'utf8');
                            for (const pattern of sensitivePatterns) {
                                if (pattern.test(content)) {
                                    securityTests.noSecrets = false;
                                    break;
                                }
                            }
                        } catch (error) {
                            // Ignore les erreurs de lecture
                        }
                    }
                }
            }
        };
        
        checkForSecrets(this.projectRoot);
        
        if (securityTests.noSecrets) {
            securityTests.summary.passed++;
        } else {
            securityTests.summary.failed++;
        }
        
        this.testResults.tests.security = securityTests;
        console.log('✅ Tests de sécurité terminés');
    }

    async testCompatibility() {
        console.log('🔧 TESTS DE COMPATIBILITÉ...');
        
        const compatibilityTests = {
            sdkVersion: '3',
            compatibility: '>=6.0.0',
            platforms: ['local'],
            summary: { passed: 0, failed: 0 }
        };
        
        try {
            const appJson = JSON.parse(fs.readFileSync(path.join(this.projectRoot, 'app.json'), 'utf8'));
            
            if (appJson.sdk === 3) {
                compatibilityTests.summary.passed++;
            } else {
                compatibilityTests.summary.failed++;
            }
            
            if (appJson.compatibility === '>=6.0.0') {
                compatibilityTests.summary.passed++;
            } else {
                compatibilityTests.summary.failed++;
            }
            
            if (appJson.platforms && appJson.platforms.includes('local')) {
                compatibilityTests.summary.passed++;
            } else {
                compatibilityTests.summary.failed++;
            }
            
        } catch (error) {
            compatibilityTests.summary.failed++;
        }
        
        this.testResults.tests.compatibility = compatibilityTests;
        console.log('✅ Tests de compatibilité terminés');
    }

    async generateTestReport() {
        console.log('📊 GÉNÉRATION DU RAPPORT DE TESTS...');
        
        // Calculer les statistiques globales
        let totalTests = 0;
        let totalPassed = 0;
        let totalFailed = 0;
        
        for (const [testType, testData] of Object.entries(this.testResults.tests)) {
            if (testData.summary) {
                totalTests += testData.summary.passed + testData.summary.failed;
                totalPassed += testData.summary.passed;
                totalFailed += testData.summary.failed;
            }
        }
        
        this.testResults.summary = {
            total: totalTests,
            passed: totalPassed,
            failed: totalFailed,
            successRate: totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(2) : 0
        };
        
        // Générer le rapport
        const reportPath = path.join(this.projectRoot, 'COMPREHENSIVE_TEST_REPORT.md');
        let reportContent = `# 🧪 RAPPORT DE TESTS COMPLETS - com.tuya.zigbee

## 📅 Date d'exécution
${this.testResults.timestamp}

## 📊 Résumé global
- **Total des tests**: ${this.testResults.summary.total}
- **Tests réussis**: ${this.testResults.summary.passed}
- **Tests échoués**: ${this.testResults.summary.failed}
- **Taux de succès**: ${this.testResults.summary.successRate}%

## 🔍 Détails par catégorie

### 📁 Structure et fichiers
`;

        // Ajouter les détails pour chaque catégorie de tests
        for (const [testType, testData] of Object.entries(this.testResults.tests)) {
            reportContent += `\n#### ${testType.toUpperCase()}\n`;
            
            if (testData.summary) {
                reportContent += `- **Tests réussis**: ${testData.summary.passed}\n`;
                reportContent += `- **Tests échoués**: ${testData.summary.failed}\n`;
            }
            
            // Ajouter des détails spécifiques selon le type de test
            if (testType === 'drivers' && testData.categories) {
                reportContent += '\n**Drivers par catégorie:**\n';
                for (const [category, categoryData] of Object.entries(testData.categories)) {
                    reportContent += `- **${category}**: ${categoryData.summary.passed}/${categoryData.summary.total} drivers valides\n`;
                }
            }
            
            if (testType === 'performance' && testData.fileCount) {
                reportContent += `\n**Performance:**\n`;
                reportContent += `- **Nombre de fichiers**: ${testData.fileCount}\n`;
                reportContent += `- **Taille totale**: ${(testData.totalSize / 1024 / 1024).toFixed(2)} MB\n`;
                reportContent += `- **Taille moyenne**: ${(testData.averageFileSize / 1024).toFixed(2)} KB\n`;
            }
        }
        
        reportContent += `\n## ✅ Recommandations

### 🎯 Actions prioritaires
`;

        // Générer des recommandations basées sur les résultats
        if (this.testResults.summary.successRate < 90) {
            reportContent += `- **Corriger les tests échoués** pour améliorer la stabilité\n`;
        }
        
        if (this.testResults.tests.drivers && this.testResults.tests.drivers.summary.failed > 0) {
            reportContent += `- **Valider tous les drivers** pour assurer la compatibilité\n`;
        }
        
        if (this.testResults.tests.scripts && this.testResults.tests.scripts.summary.failed > 0) {
            reportContent += `- **Corriger les scripts** pour maintenir l'automatisation\n`;
        }
        
        reportContent += `- **Maintenir les tests** pour assurer la qualité continue\n`;
        reportContent += `- **Documenter les changements** pour faciliter la maintenance\n`;
        
        fs.writeFileSync(reportPath, reportContent);
        console.log(`✅ Rapport généré: ${reportPath}`);
        
        // Afficher le résumé final
        console.log('\n📊 RÉSUMÉ FINAL DES TESTS:');
        console.log(`📈 Taux de succès: ${this.testResults.summary.successRate}%`);
        console.log(`✅ Tests réussis: ${this.testResults.summary.passed}`);
        console.log(`❌ Tests échoués: ${this.testResults.summary.failed}`);
    }

    async run() {
        await this.runComprehensiveTests();
    }
}

// Exécution de la suite de tests
const testSuite = new ComprehensiveTestSuite();
testSuite.run().catch(console.error); 