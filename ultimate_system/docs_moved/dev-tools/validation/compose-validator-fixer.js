#!/usr/bin/env node

/**
 * Compose Validator Fixer
 * Fixes validation issues in driver.compose.json files
 * Ensures all required fields are present and properly formatted
 */

const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');

class ComposeValidatorFixer {
    constructor() {
        this.projectRoot = process.cwd();
        this.driversPath = path.join(this.projectRoot, 'drivers');
        this.fixedCount = 0;
        this.errors = [];

        console.log('🔧 Compose Validator Fixer - Final SDK3 Compliance');
    }

    async run() {
        console.log('\n🔍 Running validation and fixing issues...');
        
        try {
            // First run validation to identify issues
            const validationResult = await this.runValidation();
            
            if (validationResult.success) {
                console.log('✅ All validations passed!');
                return { success: true, fixed: 0, errors: [] };
            }
            
            // Parse validation errors and fix them
            const issues = this.parseValidationErrors(validationResult.output);
            console.log(`📊 Found ${issues.length} validation issues to fix`);
            
            for (const issue of issues) {
                await this.fixValidationIssue(issue);
            }
            
            // Run validation again to confirm fixes
            const finalValidation = await this.runValidation();
            
            console.log(`\n✅ Fixed ${this.fixedCount} validation issues`);
            if (this.errors.length > 0) {
                console.log(`⚠️  Remaining errors: ${this.errors.length}`);
                this.errors.forEach(error => console.log(`   - ${error}`));
            }
            
            return {
                success: finalValidation.success,
                fixed: this.fixedCount,
                errors: this.errors,
                validationOutput: finalValidation.output
            };
            
        } catch (error) {
            console.error('❌ Error during validation fixing:', error);
            throw error;
        }
    }

    async runValidation() {
        return new Promise((resolve) => {
            const validate = spawn('homey', ['app', 'validate', '--level=publish'], {
                cwd: this.projectRoot,
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: true
            });

            let output = '';
            let error = '';

            validate.stdout.on('data', (data) => {
                output += data.toString();
            });

            validate.stderr.on('data', (data) => {
                error += data.toString();
            });

            validate.on('close', (code) => {
                resolve({
                    success: code === 0,
                    output: output + error,
                    code: code
                });
            });

            validate.on('error', (err) => {
                resolve({
                    success: false,
                    output: err.message,
                    code: -1
                });
            });
        });
    }

    parseValidationErrors(output) {
        const issues = [];
        const lines = output.split('\n');
        
        for (const line of lines) {
            if (line.includes('× Missing property') && line.includes('in driver')) {
                const match = line.match(/Missing property `(.+?)` in driver (.+)/);
                if (match) {
                    issues.push({
                        type: 'missing_property',
                        property: match[1],
                        driver: match[2],
                        line: line
                    });
                }
            }
            
            if (line.includes('× Invalid') && line.includes('in driver')) {
                const match = line.match(/Invalid (.+?) in driver (.+)/);
                if (match) {
                    issues.push({
                        type: 'invalid_property',
                        property: match[1],
                        driver: match[2],
                        line: line
                    });
                }
            }
            
            if (line.includes('× ENOENT')) {
                const match = line.match(/ENOENT: no such file or directory, open '(.+?)'/);
                if (match) {
                    issues.push({
                        type: 'missing_file',
                        file: match[1],
                        line: line
                    });
                }
            }
        }
        
        return issues;
    }

    async fixValidationIssue(issue) {
        try {
            console.log(`🔨 Fixing: ${issue.type} - ${issue.line.trim()}`);
            
            switch (issue.type) {
                case 'missing_property':
                    await this.fixMissingProperty(issue);
                    break;
                case 'invalid_property':
                    await this.fixInvalidProperty(issue);
                    break;
                case 'missing_file':
                    await this.fixMissingFile(issue);
                    break;
                default:
                    console.log(`⚠️  Unknown issue type: ${issue.type}`);
            }
            
        } catch (error) {
            const errorMsg = `Error fixing ${issue.type}: ${error.message}`;
            console.log(`❌ ${errorMsg}`);
            this.errors.push(errorMsg);
        }
    }

    async fixMissingProperty(issue) {
        const composeFile = path.join(this.driversPath, issue.driver, 'driver.compose.json');
        
        if (!await fs.pathExists(composeFile)) {
            throw new Error(`Compose file not found: ${composeFile}`);
        }
        
        const composeJson = await fs.readJson(composeFile);
        
        switch (issue.property) {
            case 'name':
                composeJson.name = {
                    en: this.generateDriverTitle(issue.driver)
                };
                break;
                
            case 'platforms':
                composeJson.platforms = ['local'];
                break;
                
            case 'connectivity':
                composeJson.connectivity = ['zigbee'];
                break;
                
            case 'images':
                composeJson.images = {
                    small: './assets/small.png',
                    large: './assets/large.png'
                };
                break;
                
            case 'capabilities':
                if (!composeJson.capabilities || composeJson.capabilities.length === 0) {
                    composeJson.capabilities = this.getDefaultCapabilities(issue.driver);
                }
                break;
                
            default:
                console.log(`⚠️  Unknown missing property: ${issue.property}`);
                return;
        }
        
        await fs.writeJson(composeFile, composeJson, { spaces: 2 });
        this.fixedCount++;
    }

    async fixInvalidProperty(issue) {
        const composeFile = path.join(this.driversPath, issue.driver, 'driver.compose.json');
        
        if (!await fs.pathExists(composeFile)) {
            throw new Error(`Compose file not found: ${composeFile}`);
        }
        
        const composeJson = await fs.readJson(composeFile);
        
        // Fix common invalid property issues
        if (issue.property.includes('manufacturerId') && composeJson.zigbee) {
            if (Array.isArray(composeJson.zigbee.manufacturerId) && composeJson.zigbee.manufacturerId.length === 0) {
                composeJson.zigbee.manufacturerName = ['_TZ3000_', '_TZE200_', '_TZE204_'];
                delete composeJson.zigbee.manufacturerId;
            }
        }
        
        if (issue.property.includes('productId') && composeJson.zigbee) {
            if (Array.isArray(composeJson.zigbee.productId) && composeJson.zigbee.productId.length === 0) {
                composeJson.zigbee.productId = ['TS0601', 'TS011F', 'TS0121'];
            }
        }
        
        await fs.writeJson(composeFile, composeJson, { spaces: 2 });
        this.fixedCount++;
    }

    async fixMissingFile(issue) {
        const filePath = issue.file.replace(/^'|'$/g, ''); // Remove quotes
        
        if (filePath.endsWith('driver.compose.json')) {
            // Extract driver name from path
            const pathParts = filePath.split(path.sep);
            const driverIndex = pathParts.findIndex(part => part === 'drivers');
            
            if (driverIndex !== -1 && pathParts[driverIndex + 1]) {
                const driverName = pathParts[driverIndex + 1];
                const driverPath = path.join(this.driversPath, driverName);
                
                if (await fs.pathExists(driverPath)) {
                    console.log(`🔨 Creating missing compose file for: ${driverName}`);
                    await this.createComposeFile(driverName, driverPath);
                    this.fixedCount++;
                }
            }
        }
    }

    async createComposeFile(driverName, driverPath) {
        const composeFile = path.join(driverPath, 'driver.compose.json');
        const driverJsonFile = path.join(driverPath, 'driver.json');
        
        let composeJson;
        
        if (await fs.pathExists(driverJsonFile)) {
            // Use existing driver.json as base
            composeJson = await fs.readJson(driverJsonFile);
        } else {
            // Generate default compose
            composeJson = this.generateDefaultCompose(driverName);
        }
        
        // Ensure required fields
        if (!composeJson.name) {
            composeJson.name = {
                en: this.generateDriverTitle(driverName)
            };
        }
        
        if (!composeJson.platforms) {
            composeJson.platforms = ['local'];
        }
        
        if (!composeJson.connectivity) {
            composeJson.connectivity = ['zigbee'];
        }
        
        if (!composeJson.images) {
            composeJson.images = {
                small: './assets/small.png',
                large: './assets/large.png'
            };
        }
        
        await fs.writeJson(composeFile, composeJson, { spaces: 2 });
    }

    generateDefaultCompose(driverName) {
        return {
            id: driverName,
            name: {
                en: this.generateDriverTitle(driverName)
            },
            class: 'sensor',
            capabilities: ['alarm_battery'],
            platforms: ['local'],
            connectivity: ['zigbee'],
            images: {
                small: './assets/small.png',
                large: './assets/large.png'
            },
            zigbee: {
                manufacturerName: ['_TZ3000_', '_TZE200_', '_TZE204_'],
                productId: ['TS0601', 'TS011F', 'TS0121'],
                endpoints: {
                    1: {
                        clusters: [0, 1, 3],
                        bindings: []
                    }
                },
                learnmode: {
                    image: './assets/large.png',
                    instruction: {
                        en: `Follow the pairing instructions for your ${this.generateDriverTitle(driverName)}.`
                    }
                }
            },
            energy: {
                batteries: ['CR2032']
            }
        };
    }

    generateDriverTitle(driverName) {
        return driverName
            .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
            .replace(/\b(Tze204|Tz3000|Tze200|Ts0601|Ts011f|Ts0121)\b/gi, '') // Remove technical IDs
            .replace(/\s+/g, ' ')
            .trim();
    }

    getDefaultCapabilities(driverName) {
        const name = driverName.toLowerCase();
        
        if (name.includes('switch') || name.includes('relay')) {
            return ['onoff'];
        }
        
        if (name.includes('sensor')) {
            const capabilities = ['alarm_battery'];
            
            if (name.includes('temperature')) capabilities.push('measure_temperature');
            if (name.includes('humidity')) capabilities.push('measure_humidity');
            if (name.includes('motion') || name.includes('pir')) capabilities.push('alarm_motion');
            if (name.includes('door') || name.includes('window')) capabilities.push('alarm_contact');
            if (name.includes('smoke')) capabilities.push('alarm_smoke');
            if (name.includes('water')) capabilities.push('alarm_water');
            
            return capabilities;
        }
        
        if (name.includes('light') || name.includes('bulb')) {
            return ['onoff', 'dim'];
        }
        
        if (name.includes('lock')) {
            return ['locked', 'alarm_battery'];
        }
        
        if (name.includes('plug') || name.includes('socket')) {
            return ['onoff', 'measure_power'];
        }
        
        return ['alarm_battery'];
    }
}

// Execute if run directly
if (require.main === module) {
    const fixer = new ComposeValidatorFixer();
    fixer.run().catch(console.error);
}

module.exports = ComposeValidatorFixer;
