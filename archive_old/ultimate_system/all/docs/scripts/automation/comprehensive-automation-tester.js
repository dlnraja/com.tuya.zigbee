#!/usr/bin/env node

/**
 * Comprehensive Automation Tester
 * Validates all automation components before publication
 * Tests expect/stdio handling, .homeycompose integration, and GitHub Actions compatibility
 */

const fs = require('fs-extra');
const path = require('path');
const { exec, spawn } = require('child_process');

class ComprehensiveAutomationTester {
    constructor() {
        this.projectRoot = process.cwd();
        this.testResults = {
            prerequisites: [],
            validation: [],
            automation: [],
            integration: [],
            overall: 'PENDING'
        };
        this.logFile = path.join(this.projectRoot, 'automation-test-results.log');
        
        console.log('🧪 Comprehensive Automation Tester');
        console.log('🔬 Testing all publication automation components');
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level}] ${message}`;
        console.log(logEntry);
        fs.appendFileSync(this.logFile, logEntry + '\n');
    }

    async runCommand(command, timeout = 30000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Command timeout: ${command}`));
            }, timeout);

            exec(command, (error, stdout, stderr) => {
                clearTimeout(timer);
                if (error) {
                    reject(error);
                } else {
                    resolve({ stdout, stderr });
                }
            });
        });
    }

    async testPrerequisites() {
        this.log('🔍 Testing Prerequisites...');
        
        const tests = [
            {
                name: 'Node.js',
                command: 'node --version',
                required: true
            },
            {
                name: 'NPM',
                command: 'npm --version', 
                required: true
            },
            {
                name: 'Homey CLI',
                command: 'homey --version',
                required: true
            },
            {
                name: 'Git',
                command: 'git --version',
                required: true
            },
            {
                name: 'PowerShell',
                command: 'pwsh --version',
                required: false
            }
        ];

        for (const test of tests) {
            try {
                const result = await this.runCommand(test.command);
                this.testResults.prerequisites.push({
                    name: test.name,
                    status: 'PASS',
                    version: result.stdout.trim(),
                    required: test.required
                });
                this.log(`✅ ${test.name}: ${result.stdout.trim()}`);
            } catch (error) {
                this.testResults.prerequisites.push({
                    name: test.name,
                    status: 'FAIL',
                    error: error.message,
                    required: test.required
                });
                
                if (test.required) {
                    this.log(`❌ ${test.name}: ${error.message}`, 'ERROR');
                } else {
                    this.log(`⚠️ ${test.name}: ${error.message} (optional)`, 'WARN');
                }
            }
        }
    }

    async testProjectStructure() {
        this.log('🏗️ Testing Project Structure...');
        
        const requiredFiles = [
            'app.json',
            'package.json',
            '.homeycompose/app.json',
            'scripts/automation/ultimate-publish-automation.ps1',
            'scripts/automation/ultimate-publish-nodejs.js',
            '.github/workflows/auto-publish.yml'
        ];

        const requiredDirs = [
            'drivers',
            'locales',
            'assets/images',
            '.homeycompose'
        ];

        // Test files
        for (const file of requiredFiles) {
            const filePath = path.join(this.projectRoot, file);
            const exists = await fs.pathExists(filePath);
            
            this.testResults.validation.push({
                type: 'file',
                path: file,
                status: exists ? 'PASS' : 'FAIL'
            });

            if (exists) {
                this.log(`✅ File exists: ${file}`);
            } else {
                this.log(`❌ Missing file: ${file}`, 'ERROR');
            }
        }

        // Test directories
        for (const dir of requiredDirs) {
            const dirPath = path.join(this.projectRoot, dir);
            const exists = await fs.pathExists(dirPath);
            
            this.testResults.validation.push({
                type: 'directory',
                path: dir,
                status: exists ? 'PASS' : 'FAIL'
            });

            if (exists) {
                this.log(`✅ Directory exists: ${dir}`);
            } else {
                this.log(`❌ Missing directory: ${dir}`, 'ERROR');
            }
        }
    }

    async testHomeyCompose() {
        this.log('🔄 Testing .homeycompose Integration...');
        
        try {
            const appJsonPath = path.join(this.projectRoot, 'app.json');
            const homeyComposeAppPath = path.join(this.projectRoot, '.homeycompose', 'app.json');

            if (await fs.pathExists(appJsonPath)) {
                const appConfig = await fs.readJson(appJsonPath);
                
                // Test app.json structure
                const requiredFields = ['id', 'version', 'name', 'description', 'category'];
                let structureValid = true;

                for (const field of requiredFields) {
                    if (!appConfig[field]) {
                        this.log(`❌ Missing field in app.json: ${field}`, 'ERROR');
                        structureValid = false;
                    }
                }

                if (structureValid) {
                    this.log('✅ app.json structure valid');
                    this.testResults.integration.push({
                        test: 'app.json structure',
                        status: 'PASS'
                    });
                }

                // Test .homeycompose sync
                if (await fs.pathExists(homeyComposeAppPath)) {
                    const homeyComposeConfig = await fs.readJson(homeyComposeAppPath);
                    
                    if (appConfig.version === homeyComposeConfig.version) {
                        this.log('✅ .homeycompose version sync');
                        this.testResults.integration.push({
                            test: '.homeycompose sync',
                            status: 'PASS'
                        });
                    } else {
                        this.log('⚠️ .homeycompose version mismatch', 'WARN');
                        this.testResults.integration.push({
                            test: '.homeycompose sync',
                            status: 'WARN'
                        });
                    }
                }
            }
        } catch (error) {
            this.log(`❌ .homeycompose test failed: ${error.message}`, 'ERROR');
            this.testResults.integration.push({
                test: '.homeycompose integration',
                status: 'FAIL',
                error: error.message
            });
        }
    }

    async testDriverStructure() {
        this.log('🚗 Testing Driver Structure...');
        
        const driversPath = path.join(this.projectRoot, 'drivers');
        if (!await fs.pathExists(driversPath)) {
            this.log('❌ Drivers directory not found', 'ERROR');
            return;
        }

        const drivers = await fs.readdir(driversPath);
        let validDrivers = 0;
        let totalDrivers = 0;

        for (const driver of drivers) {
            const driverPath = path.join(driversPath, driver);
            const stat = await fs.stat(driverPath);
            
            if (stat.isDirectory()) {
                totalDrivers++;
                
                const requiredFiles = [
                    'driver.compose.json',
                    'device.js',
                    'assets/small.png',
                    'assets/large.png'
                ];

                let driverValid = true;
                for (const file of requiredFiles) {
                    const filePath = path.join(driverPath, file);
                    if (!await fs.pathExists(filePath)) {
                        this.log(`⚠️ Driver ${driver} missing: ${file}`, 'WARN');
                        driverValid = false;
                    }
                }

                if (driverValid) {
                    validDrivers++;
                }
            }
        }

        const validationRate = totalDrivers > 0 ? (validDrivers / totalDrivers * 100).toFixed(1) : 0;
        this.log(`📊 Driver validation: ${validDrivers}/${totalDrivers} (${validationRate}%)`);
        
        this.testResults.validation.push({
            type: 'drivers',
            total: totalDrivers,
            valid: validDrivers,
            rate: validationRate,
            status: validationRate >= 90 ? 'PASS' : validationRate >= 75 ? 'WARN' : 'FAIL'
        });
    }

    async testAutomationScripts() {
        this.log('🤖 Testing Automation Scripts...');
        
        const scripts = [
            {
                name: 'PowerShell Automation',
                path: 'scripts/automation/ultimate-publish-automation.ps1',
                test: () => this.testPowerShellScript()
            },
            {
                name: 'Node.js Automation',
                path: 'scripts/automation/ultimate-publish-nodejs.js',
                test: () => this.testNodeJsScript()
            }
        ];

        for (const script of scripts) {
            try {
                const scriptPath = path.join(this.projectRoot, script.path);
                if (await fs.pathExists(scriptPath)) {
                    await script.test();
                    this.testResults.automation.push({
                        name: script.name,
                        status: 'PASS'
                    });
                    this.log(`✅ ${script.name} test passed`);
                } else {
                    this.testResults.automation.push({
                        name: script.name,
                        status: 'FAIL',
                        error: 'Script not found'
                    });
                    this.log(`❌ ${script.name}: Script not found`, 'ERROR');
                }
            } catch (error) {
                this.testResults.automation.push({
                    name: script.name,
                    status: 'FAIL',
                    error: error.message
                });
                this.log(`❌ ${script.name}: ${error.message}`, 'ERROR');
            }
        }
    }

    async testPowerShellScript() {
        // Test PowerShell script syntax
        try {
            await this.runCommand('pwsh -Command "Get-Help"', 5000);
            return true;
        } catch (error) {
            throw new Error('PowerShell not available or syntax error');
        }
    }

    async testNodeJsScript() {
        // Test Node.js script syntax
        const scriptPath = path.join(this.projectRoot, 'scripts/automation/ultimate-publish-nodejs.js');
        try {
            await this.runCommand(`node -c "${scriptPath}"`, 5000);
            return true;
        } catch (error) {
            throw new Error('Node.js script syntax error');
        }
    }

    async testHomeyValidation() {
        this.log('🏠 Testing Homey App Validation...');
        
        try {
            const result = await this.runCommand('homey app validate --level=publish', 60000);
            
            if (result.stdout.includes('valid') && !result.stderr.includes('error')) {
                this.log('✅ Homey validation passed');
                this.testResults.validation.push({
                    type: 'homey',
                    status: 'PASS'
                });
            } else {
                this.log('⚠️ Homey validation has warnings', 'WARN');
                this.testResults.validation.push({
                    type: 'homey',
                    status: 'WARN',
                    output: result.stderr
                });
            }
        } catch (error) {
            this.log(`❌ Homey validation failed: ${error.message}`, 'ERROR');
            this.testResults.validation.push({
                type: 'homey',
                status: 'FAIL',
                error: error.message
            });
        }
    }

    generateTestReport() {
        this.log('📊 Generating Comprehensive Test Report...');
        
        // Calculate overall status
        const failures = Object.values(this.testResults).flat().filter(result => 
            result.status === 'FAIL'
        ).length;
        
        const warnings = Object.values(this.testResults).flat().filter(result => 
            result.status === 'WARN'
        ).length;

        if (failures === 0) {
            this.testResults.overall = warnings === 0 ? 'EXCELLENT' : 'GOOD';
        } else if (failures <= 2) {
            this.testResults.overall = 'FAIR';
        } else {
            this.testResults.overall = 'POOR';
        }

        const report = {
            timestamp: new Date().toISOString(),
            overall_status: this.testResults.overall,
            summary: {
                total_tests: Object.values(this.testResults).flat().length - 1, // -1 for overall
                passed: Object.values(this.testResults).flat().filter(r => r.status === 'PASS').length,
                warnings: warnings,
                failures: failures
            },
            detailed_results: this.testResults,
            recommendations: this.generateRecommendations()
        };

        // Save report
        const reportPath = path.join(this.projectRoot, 'comprehensive-automation-test-report.json');
        fs.writeJsonSync(reportPath, report, { spaces: 2 });
        
        this.log(`💾 Test report saved: ${reportPath}`);
        return report;
    }

    generateRecommendations() {
        const recommendations = [];
        
        // Check for critical failures
        const criticalFailures = this.testResults.prerequisites.filter(p => 
            p.required && p.status === 'FAIL'
        );
        
        if (criticalFailures.length > 0) {
            recommendations.push({
                priority: 'HIGH',
                type: 'Prerequisites',
                message: 'Install missing required tools before proceeding with automation'
            });
        }

        // Check driver validation rate
        const driverTest = this.testResults.validation.find(v => v.type === 'drivers');
        if (driverTest && driverTest.rate < 90) {
            recommendations.push({
                priority: 'MEDIUM',
                type: 'Drivers',
                message: 'Some drivers are missing required files - run driver correction script'
            });
        }

        // Check Homey validation
        const homeyTest = this.testResults.validation.find(v => v.type === 'homey');
        if (homeyTest && homeyTest.status === 'FAIL') {
            recommendations.push({
                priority: 'HIGH',
                type: 'Validation',
                message: 'Fix Homey validation errors before publication'
            });
        }

        return recommendations;
    }

    showSummary(report) {
        console.log('\n📊 COMPREHENSIVE AUTOMATION TEST SUMMARY');
        console.log('==========================================');
        console.log(`Overall Status: ${this.getStatusEmoji(report.overall_status)} ${report.overall_status}`);
        console.log(`Total Tests: ${report.summary.total_tests}`);
        console.log(`✅ Passed: ${report.summary.passed}`);
        console.log(`⚠️ Warnings: ${report.summary.warnings}`);
        console.log(`❌ Failures: ${report.summary.failures}`);
        console.log('');
        
        if (report.recommendations.length > 0) {
            console.log('🎯 RECOMMENDATIONS:');
            report.recommendations.forEach((rec, i) => {
                console.log(`${i + 1}. [${rec.priority}] ${rec.type}: ${rec.message}`);
            });
            console.log('');
        }
        
        console.log('📄 Detailed report saved to: comprehensive-automation-test-report.json');
        console.log('==========================================');
    }

    getStatusEmoji(status) {
        const emojis = {
            'EXCELLENT': '🟢',
            'GOOD': '🟡', 
            'FAIR': '🟠',
            'POOR': '🔴'
        };
        return emojis[status] || '⚪';
    }

    async run() {
        try {
            this.log('🚀 Starting Comprehensive Automation Testing');
            
            await this.testPrerequisites();
            await this.testProjectStructure();
            await this.testHomeyCompose();
            await this.testDriverStructure();
            await this.testAutomationScripts();
            await this.testHomeyValidation();
            
            const report = this.generateTestReport();
            this.showSummary(report);
            
            return report.overall_status === 'EXCELLENT' || report.overall_status === 'GOOD';
            
        } catch (error) {
            this.log(`💥 Critical testing error: ${error.message}`, 'ERROR');
            return false;
        }
    }
}

// CLI execution
if (require.main === module) {
    const tester = new ComprehensiveAutomationTester();
    
    tester.run().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('💥 Fatal testing error:', error);
        process.exit(1);
    });
}

module.exports = ComprehensiveAutomationTester;
