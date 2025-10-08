#!/usr/bin/env node

/**
 * FINAL STRUCTURE VALIDATOR
 * Validation complète de la structure finale avec 98 drivers
 * Vérifie cohérence, manufacturer IDs préservés, SDK3 compliance
 */

const fs = require('fs-extra');
const path = require('path');

class FinalStructureValidator {
    constructor() {
        this.projectRoot = process.cwd();
        this.driversPath = path.join(this.projectRoot, 'drivers');
        this.reportsPath = path.join(this.projectRoot, 'project-data', 'analysis-results');
        this.localesPath = path.join(this.projectRoot, 'locales');
        this.homeyComposePath = path.join(this.projectRoot, '.homeycompose');
        
        this.validationResults = {
            drivers: [],
            summary: {
                totalDrivers: 0,
                validDrivers: 0,
                invalidDrivers: 0,
                missingFiles: 0,
                manufacturerIdsPreserved: 0,
                sdk3Compliant: 0
            },
            issues: [],
            manufacturerAnalysis: {},
            categoryBreakdown: {}
        };
    }

    async run() {
        console.log('🔍 Final Structure Validator');
        console.log('   Comprehensive validation of 98 drivers structure');
        
        // Charger les drivers
        const drivers = await this.loadAllDrivers();
        console.log(`\n📊 Found ${drivers.length} drivers to validate`);
        
        // Valider chaque driver
        for (const driver of drivers) {
            await this.validateDriver(driver);
        }
        
        // Valider la structure globale
        await this.validateGlobalStructure();
        
        // Analyser les manufacturer IDs
        await this.analyzeManufacturerIds();
        
        // Générer le rapport final
        await this.generateValidationReport();
        
        console.log(`\n✅ Final validation complete!`);
        console.log(`   Valid drivers: ${this.validationResults.summary.validDrivers}/${this.validationResults.summary.totalDrivers}`);
        console.log(`   SDK3 compliant: ${this.validationResults.summary.sdk3Compliant}`);
        console.log(`   Manufacturer IDs preserved: ${this.validationResults.summary.manufacturerIdsPreserved}`);
        
        if (this.validationResults.issues.length > 0) {
            console.log(`   Issues found: ${this.validationResults.issues.length}`);
        }
    }

    async loadAllDrivers() {
        const drivers = [];
        
        if (!await fs.pathExists(this.driversPath)) {
            console.log('❌ Drivers directory not found');
            return drivers;
        }
        
        const items = await fs.readdir(this.driversPath);
        
        for (const item of items) {
            const itemPath = path.join(this.driversPath, item);
            const stat = await fs.stat(itemPath);
            
            if (stat.isDirectory()) {
                drivers.push({
                    name: item,
                    path: itemPath,
                    category: this.determineCategory(item)
                });
            }
        }
        
        this.validationResults.summary.totalDrivers = drivers.length;
        return drivers;
    }

    async validateDriver(driver) {
        console.log(`\n🔍 Validating: ${driver.name}`);
        
        const validation = {
            name: driver.name,
            category: driver.category,
            isValid: true,
            files: {
                driverJson: false,
                deviceJs: false,
                smallPng: false,
                largePng: false
            },
            sdk3Compliant: false,
            manufacturerIds: [],
            issues: [],
            scores: {
                completeness: 0,
                compliance: 0,
                coherence: 0
            }
        };

        // Vérifier les fichiers requis
        await this.checkRequiredFiles(driver, validation);
        
        // Valider driver.json
        await this.validateDriverJson(driver, validation);
        
        // Valider device.js
        await this.validateDeviceJs(driver, validation);
        
        // Vérifier les images
        await this.validateImages(driver, validation);
        
        // Calculer les scores
        this.calculateValidationScores(validation);
        
        // Marquer comme valide/invalide
        validation.isValid = validation.issues.length === 0 && 
                           validation.files.driverJson && 
                           validation.files.deviceJs &&
                           validation.files.smallPng &&
                           validation.files.largePng;
        
        if (validation.isValid) {
            this.validationResults.summary.validDrivers++;
            console.log(`  ✅ Valid - Score: ${Math.round((validation.scores.completeness + validation.scores.compliance + validation.scores.coherence) / 3)}%`);
        } else {
            this.validationResults.summary.invalidDrivers++;
            console.log(`  ❌ Invalid - ${validation.issues.length} issues`);
            validation.issues.forEach(issue => console.log(`      - ${issue.message}`));
        }
        
        if (validation.sdk3Compliant) {
            this.validationResults.summary.sdk3Compliant++;
        }
        
        if (validation.manufacturerIds.length > 0) {
            this.validationResults.summary.manufacturerIdsPreserved++;
        }
        
        this.validationResults.drivers.push(validation);
        
        // Collecter pour l'analyse globale
        if (!this.validationResults.categoryBreakdown[validation.category]) {
            this.validationResults.categoryBreakdown[validation.category] = 0;
        }
        this.validationResults.categoryBreakdown[validation.category]++;
    }

    async checkRequiredFiles(driver, validation) {
        const requiredFiles = [
            { key: 'driverJson', file: 'driver.json' },
            { key: 'deviceJs', file: 'device.js' },
            { key: 'smallPng', file: 'assets/small.png' },
            { key: 'largePng', file: 'assets/large.png' }
        ];

        for (const required of requiredFiles) {
            const filePath = path.join(driver.path, required.file);
            
            if (await fs.pathExists(filePath)) {
                validation.files[required.key] = true;
                validation.scores.completeness += 25;
            } else {
                validation.issues.push({
                    type: 'missing_file',
                    severity: 'high',
                    message: `Missing required file: ${required.file}`,
                    file: required.file
                });
                this.validationResults.summary.missingFiles++;
            }
        }
    }

    async validateDriverJson(driver, validation) {
        const driverJsonPath = path.join(driver.path, 'driver.json');
        
        if (!await fs.pathExists(driverJsonPath)) {
            return;
        }
        
        try {
            const driverJson = await fs.readJson(driverJsonPath);
            
            // Vérifications SDK3
            if (driverJson.zigbee) {
                validation.sdk3Compliant = true;
                validation.scores.compliance += 50;
                
                // Vérifier les manufacturer IDs
                if (driverJson.zigbee.manufacturerName && driverJson.zigbee.productId) {
                    validation.manufacturerIds.push({
                        manufacturerName: driverJson.zigbee.manufacturerName,
                        productId: driverJson.zigbee.productId,
                        manufacturerId: driverJson.zigbee.manufacturerId
                    });
                }
                
                if (Array.isArray(driverJson.zigbee.manufacturerName)) {
                    driverJson.zigbee.manufacturerName.forEach((name, idx) => {
                        validation.manufacturerIds.push({
                            manufacturerName: name,
                            productId: Array.isArray(driverJson.zigbee.productId) ? driverJson.zigbee.productId[idx] : driverJson.zigbee.productId,
                            manufacturerId: Array.isArray(driverJson.zigbee.manufacturerId) ? driverJson.zigbee.manufacturerId[idx] : driverJson.zigbee.manufacturerId
                        });
                    });
                }
            } else {
                validation.issues.push({
                    type: 'sdk3_compliance',
                    severity: 'high',
                    message: 'Missing zigbee configuration for SDK3',
                    file: 'driver.json'
                });
            }
            
            // Vérifier la structure basique
            const requiredFields = ['id', 'name', 'class', 'capabilities'];
            for (const field of requiredFields) {
                if (!driverJson[field]) {
                    validation.issues.push({
                        type: 'structure',
                        severity: 'medium',
                        message: `Missing required field: ${field}`,
                        file: 'driver.json'
                    });
                } else {
                    validation.scores.compliance += 10;
                }
            }
            
            // Vérifier la cohérence du nom avec le dossier
            if (driverJson.id !== driver.name) {
                validation.issues.push({
                    type: 'coherence',
                    severity: 'medium',
                    message: `Driver ID "${driverJson.id}" doesn't match folder name "${driver.name}"`,
                    file: 'driver.json'
                });
            } else {
                validation.scores.coherence += 30;
            }
            
            // Vérifier les capabilities appropriées pour la catégorie
            this.validateCapabilities(driver, driverJson, validation);
            
        } catch (error) {
            validation.issues.push({
                type: 'json_parse',
                severity: 'high',
                message: `Invalid JSON syntax: ${error.message}`,
                file: 'driver.json'
            });
        }
    }

    async validateDeviceJs(driver, validation) {
        const deviceJsPath = path.join(driver.path, 'device.js');
        
        if (!await fs.pathExists(deviceJsPath)) {
            return;
        }
        
        try {
            const deviceJs = await fs.readFile(deviceJsPath, 'utf8');
            
            // Vérifications de base
            const requiredElements = [
                { pattern: /class.*Device/, name: 'Device class definition' },
                { pattern: /onNodeInit.*async|async.*onNodeInit|onInit.*async|async.*onInit/, name: 'onNodeInit/onInit method' },
                { pattern: /module\.exports/, name: 'Module export' }
            ];
            
            for (const element of requiredElements) {
                if (element.pattern.test(deviceJs)) {
                    validation.scores.compliance += 10;
                } else {
                    validation.issues.push({
                        type: 'device_structure',
                        severity: 'medium',
                        message: `Missing or invalid ${element.name}`,
                        file: 'device.js'
                    });
                }
            }
            
            // Vérifier SDK3 imports
            if (deviceJs.includes('homey:zigbeedriver') || deviceJs.includes('ZigBeeDevice')) {
                validation.scores.compliance += 20;
                validation.scores.coherence += 20;
            } else {
                validation.issues.push({
                    type: 'sdk3_compliance',
                    severity: 'medium',
                    message: 'Missing SDK3 ZigBee imports',
                    file: 'device.js'
                });
            }
            
        } catch (error) {
            validation.issues.push({
                type: 'file_read',
                severity: 'medium',
                message: `Could not read device.js: ${error.message}`,
                file: 'device.js'
            });
        }
    }

    async validateImages(driver, validation) {
        const images = ['small.png', 'large.png'];
        const expectedSizes = {
            'small.png': { width: 75, height: 75 },
            'large.png': { width: 500, height: 500 }
        };
        
        for (const image of images) {
            const imagePath = path.join(driver.path, 'assets', image);
            
            if (await fs.pathExists(imagePath)) {
                try {
                    const stats = await fs.stat(imagePath);
                    
                    if (stats.size > 0) {
                        validation.scores.coherence += 25;
                        
                        // Vérification basique de la taille de fichier
                        const expectedSize = expectedSizes[image];
                        if (expectedSize) {
                            // Images plus grandes devraient avoir des fichiers plus volumineux
                            const expectedMinSize = image === 'large.png' ? 5000 : 1000; // bytes
                            if (stats.size >= expectedMinSize) {
                                validation.scores.coherence += 10;
                            } else {
                                validation.issues.push({
                                    type: 'image_quality',
                                    severity: 'low',
                                    message: `${image} seems too small (${stats.size} bytes)`,
                                    file: `assets/${image}`
                                });
                            }
                        }
                    } else {
                        validation.issues.push({
                            type: 'empty_file',
                            severity: 'medium',
                            message: `${image} is empty`,
                            file: `assets/${image}`
                        });
                    }
                    
                } catch (error) {
                    validation.issues.push({
                        type: 'file_access',
                        severity: 'low',
                        message: `Could not analyze ${image}: ${error.message}`,
                        file: `assets/${image}`
                    });
                }
            }
        }
    }

    validateCapabilities(driver, driverJson, validation) {
        const expectedCapabilities = {
            switches: ['onoff'],
            sensors: ['measure_temperature', 'measure_humidity', 'alarm_motion'],
            lighting: ['onoff', 'dim'],
            security: ['locked', 'alarm_generic'],
            energy: ['onoff', 'measure_power'],
            climate: ['target_temperature', 'measure_temperature']
        };
        
        const categoryExpected = expectedCapabilities[driver.category];
        if (!categoryExpected) {
            return; // Pas de vérification pour cette catégorie
        }
        
        if (!driverJson.capabilities || !Array.isArray(driverJson.capabilities)) {
            validation.issues.push({
                type: 'capabilities',
                severity: 'medium',
                message: 'Missing or invalid capabilities array',
                file: 'driver.json'
            });
            return;
        }
        
        // Vérifier qu'au moins une capability attendue est présente
        const hasExpectedCapability = categoryExpected.some(cap => 
            driverJson.capabilities.includes(cap)
        );
        
        if (hasExpectedCapability) {
            validation.scores.coherence += 20;
        } else {
            validation.issues.push({
                type: 'capabilities_mismatch',
                severity: 'low',
                message: `No expected capabilities for ${driver.category} category found`,
                file: 'driver.json'
            });
        }
    }

    calculateValidationScores(validation) {
        // Normaliser les scores sur 100
        validation.scores.completeness = Math.min(100, validation.scores.completeness);
        validation.scores.compliance = Math.min(100, validation.scores.compliance);
        validation.scores.coherence = Math.min(100, validation.scores.coherence);
        
        // Pénalités pour les issues
        const penalties = {
            high: 20,
            medium: 10,
            low: 5
        };
        
        validation.issues.forEach(issue => {
            const penalty = penalties[issue.severity] || 5;
            validation.scores.completeness -= penalty / 3;
            validation.scores.compliance -= penalty / 3;
            validation.scores.coherence -= penalty / 3;
        });
        
        // Ensure scores don't go below 0
        Object.keys(validation.scores).forEach(key => {
            validation.scores[key] = Math.max(0, validation.scores[key]);
        });
    }

    async validateGlobalStructure() {
        console.log('\n🌍 Validating global structure...');
        
        // Vérifier .homeycompose/app.json
        await this.validateHomeyCompose();
        
        // Vérifier locales/en.json
        await this.validateLocales();
        
        // Vérifier app.json
        await this.validateAppJson();
    }

    async validateHomeyCompose() {
        const appJsonPath = path.join(this.homeyComposePath, 'app.json');
        
        if (await fs.pathExists(appJsonPath)) {
            try {
                const appJson = await fs.readJson(appJsonPath);
                
                if (appJson.version && appJson.version.includes('2.1.5')) {
                    console.log('  ✅ .homeycompose/app.json version updated');
                } else {
                    this.validationResults.issues.push({
                        type: 'version_mismatch',
                        severity: 'medium',
                        message: 'Version not updated to 2.1.5',
                        file: '.homeycompose/app.json'
                    });
                }
                
            } catch (error) {
                this.validationResults.issues.push({
                    type: 'json_parse',
                    severity: 'high',
                    message: `Invalid .homeycompose/app.json: ${error.message}`,
                    file: '.homeycompose/app.json'
                });
            }
        }
    }

    async validateLocales() {
        const enJsonPath = path.join(this.localesPath, 'en.json');
        
        if (await fs.pathExists(enJsonPath)) {
            try {
                const enJson = await fs.readJson(enJsonPath);
                
                // Vérifier qu'il y a des traductions pour nos drivers
                const driverCount = Object.keys(enJson.drivers || {}).length;
                console.log(`  ✅ Found translations for ${driverCount} drivers`);
                
                if (driverCount < this.validationResults.summary.totalDrivers * 0.5) {
                    this.validationResults.issues.push({
                        type: 'missing_translations',
                        severity: 'low',
                        message: 'Many drivers may be missing translations',
                        file: 'locales/en.json'
                    });
                }
                
            } catch (error) {
                this.validationResults.issues.push({
                    type: 'json_parse',
                    severity: 'medium',
                    message: `Invalid locales/en.json: ${error.message}`,
                    file: 'locales/en.json'
                });
            }
        }
    }

    async validateAppJson() {
        const appJsonPath = path.join(this.projectRoot, 'app.json');
        
        if (await fs.pathExists(appJsonPath)) {
            try {
                const appJson = await fs.readJson(appJsonPath);
                
                if (appJson.version && appJson.version.includes('2.1.5')) {
                    console.log('  ✅ app.json version updated');
                } else {
                    console.log('  ⚠️  app.json version may need update');
                }
                
            } catch (error) {
                this.validationResults.issues.push({
                    type: 'json_parse',
                    severity: 'high',
                    message: `Invalid app.json: ${error.message}`,
                    file: 'app.json'
                });
            }
        }
    }

    async analyzeManufacturerIds() {
        console.log('\n🏭 Analyzing manufacturer IDs...');
        
        const manufacturerCount = {};
        const productCount = {};
        
        this.validationResults.drivers.forEach(driver => {
            driver.manufacturerIds.forEach(id => {
                if (id.manufacturerName) {
                    manufacturerCount[id.manufacturerName] = (manufacturerCount[id.manufacturerName] || 0) + 1;
                }
                if (id.productId) {
                    productCount[id.productId] = (productCount[id.productId] || 0) + 1;
                }
            });
        });
        
        this.validationResults.manufacturerAnalysis = {
            totalManufacturers: Object.keys(manufacturerCount).length,
            totalProducts: Object.keys(productCount).length,
            manufacturerBreakdown: manufacturerCount,
            productBreakdown: productCount,
            topManufacturers: Object.entries(manufacturerCount)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([name, count]) => ({ name, count }))
        };
        
        console.log(`  📊 Manufacturer Analysis:`);
        console.log(`     Total manufacturers: ${this.validationResults.manufacturerAnalysis.totalManufacturers}`);
        console.log(`     Total products: ${this.validationResults.manufacturerAnalysis.totalProducts}`);
        console.log(`     Top manufacturers: ${this.validationResults.manufacturerAnalysis.topManufacturers.slice(0, 3).map(m => m.name).join(', ')}`);
    }

    async generateValidationReport() {
        console.log('\n📊 Generating final validation report...');
        
        const overallScore = Math.round(
            (this.validationResults.summary.validDrivers / this.validationResults.summary.totalDrivers) * 100
        );
        
        const report = {
            timestamp: new Date().toISOString(),
            validation: 'final_structure_validation',
            version: '2.1.5',
            summary: this.validationResults.summary,
            overallScore,
            categoryBreakdown: this.validationResults.categoryBreakdown,
            manufacturerAnalysis: this.validationResults.manufacturerAnalysis,
            qualityMetrics: {
                structuralIntegrity: Math.round((this.validationResults.summary.validDrivers / this.validationResults.summary.totalDrivers) * 100),
                sdk3Compliance: Math.round((this.validationResults.summary.sdk3Compliant / this.validationResults.summary.totalDrivers) * 100),
                manufacturerPreservation: Math.round((this.validationResults.summary.manufacturerIdsPreserved / this.validationResults.summary.totalDrivers) * 100),
                fileCompleteness: Math.round(((this.validationResults.summary.totalDrivers * 4 - this.validationResults.summary.missingFiles) / (this.validationResults.summary.totalDrivers * 4)) * 100)
            },
            drivers: this.validationResults.drivers,
            globalIssues: this.validationResults.issues,
            readinessAssessment: {
                readyForCommit: overallScore >= 95 && this.validationResults.issues.filter(i => i.severity === 'high').length === 0,
                readyForPublication: overallScore >= 98 && this.validationResults.issues.length < 5,
                recommendedActions: this.generateRecommendedActions(overallScore)
            }
        };
        
        await fs.ensureDir(this.reportsPath);
        await fs.writeJson(
            path.join(this.reportsPath, 'final-structure-validation-report.json'),
            report,
            { spaces: 2 }
        );
        
        console.log(`  📄 Final validation report saved`);
        console.log(`  🎯 Quality Metrics:`);
        console.log(`     Overall score: ${overallScore}%`);
        console.log(`     Structural integrity: ${report.qualityMetrics.structuralIntegrity}%`);
        console.log(`     SDK3 compliance: ${report.qualityMetrics.sdk3Compliance}%`);
        console.log(`     Manufacturer preservation: ${report.qualityMetrics.manufacturerPreservation}%`);
        console.log(`     File completeness: ${report.qualityMetrics.fileCompleteness}%`);
        
        console.log(`\n📋 Readiness Assessment:`);
        console.log(`   Ready for commit: ${report.readinessAssessment.readyForCommit ? '✅ YES' : '❌ NO'}`);
        console.log(`   Ready for publication: ${report.readinessAssessment.readyForPublication ? '✅ YES' : '❌ NO'}`);
        
        if (report.readinessAssessment.recommendedActions.length > 0) {
            console.log(`   Recommended actions:`);
            report.readinessAssessment.recommendedActions.forEach(action => {
                console.log(`     - ${action}`);
            });
        }
        
        return report;
    }

    generateRecommendedActions(overallScore) {
        const actions = [];
        
        if (overallScore < 90) {
            actions.push('Fix critical validation issues before proceeding');
        }
        
        if (this.validationResults.summary.missingFiles > 0) {
            actions.push(`Create ${this.validationResults.summary.missingFiles} missing files`);
        }
        
        const highSeverityIssues = this.validationResults.issues.filter(i => i.severity === 'high').length;
        if (highSeverityIssues > 0) {
            actions.push(`Resolve ${highSeverityIssues} high severity issues`);
        }
        
        if (this.validationResults.summary.sdk3Compliant < this.validationResults.summary.totalDrivers * 0.9) {
            actions.push('Improve SDK3 compliance for more drivers');
        }
        
        if (overallScore >= 95) {
            actions.push('Structure is ready for commit and push');
            actions.push('Proceed with GitHub Actions publication');
        }
        
        return actions;
    }

    determineCategory(driverName) {
        const name = driverName.toLowerCase();
        
        if (name.includes('switch') || name.includes('button')) return 'switches';
        if (name.includes('sensor')) return 'sensors';
        if (name.includes('bulb') || name.includes('light')) return 'lighting';
        if (name.includes('plug') || name.includes('outlet')) return 'energy';
        if (name.includes('lock')) return 'security';
        if (name.includes('thermostat') || name.includes('climate')) return 'climate';
        if (name.includes('detector')) return 'security';
        if (name.includes('remote') || name.includes('controller')) return 'automation';
        
        return 'other';
    }
}

// Exécution
if (require.main === module) {
    new FinalStructureValidator().run().catch(console.error);
}

module.exports = FinalStructureValidator;
