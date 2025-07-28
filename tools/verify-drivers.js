#!/usr/bin/env node

/**
 * Tuya Zigbee Driver Verification Tool
 * Validates all drivers in the project for SDK3 compatibility
 *
 * @author dlnraja
 * @version 1.0.0
 * @license MIT
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DriverVerifier {
    constructor() {
        this.driversPath = path.join(__dirname, '..', 'drivers');
        this.reportPath = path.join(__dirname, '..', 'docs', 'validation-reports');
        this.errors = [];
        this.warnings = [];
        this.success = [];
    }

    /**
     * Main verification process
     */
    async verifyAllDrivers() {
        console.log('🔍 Starting driver verification...');

        try {
            // Ensure validation reports directory exists
            if (!fs.existsSync(this.reportPath)) {
                fs.mkdirSync(this.reportPath, { recursive: true });
            }

            const drivers = this.findDrivers();
            console.log(`📦 Found ${drivers.length} drivers to verify`);

            for (const driver of drivers) {
                await this.verifyDriver(driver);
            }

            this.generateReport();
            this.displaySummary();

        } catch (error) {
            console.error('❌ Verification failed:', error.message);
            process.exit(1);
        }
    }

    /**
     * Find all driver directories
     */
    findDrivers() {
        const drivers = [];

        if (!fs.existsSync(this.driversPath)) {
            throw new Error('Drivers directory not found');
        }

        const sdk3Path = path.join(this.driversPath, 'sdk3');
        if (fs.existsSync(sdk3Path)) {
            const sdk3Drivers = fs.readdirSync(sdk3Path, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => path.join(sdk3Path, dirent.name));
            drivers.push(...sdk3Drivers);
        }

        return drivers;
    }

    /**
     * Verify a single driver
     */
    async verifyDriver(driverPath) {
        const driverName = path.basename(driverPath);
        console.log(`\n🔍 Verifying driver: ${driverName}`);

        const composePath = path.join(driverPath, 'driver.compose.json');

        if (!fs.existsSync(composePath)) {
            this.errors.push({
                driver: driverName,
                type: 'MISSING_COMPOSE',
                message: 'driver.compose.json not found'
            });
            return;
        }

        try {
            const composeContent = fs.readFileSync(composePath, 'utf8');
            const compose = JSON.parse(composeContent);

            // Validate required fields
            this.validateComposeFields(compose, driverName);

            // Validate Zigbee configuration
            this.validateZigbeeConfig(compose, driverName);

            // Validate device capabilities
            this.validateDeviceCapabilities(compose, driverName);

            this.success.push({
                driver: driverName,
                path: driverPath
            });

        } catch (error) {
            this.errors.push({
                driver: driverName,
                type: 'PARSE_ERROR',
                message: error.message
            });
        }
    }

    /**
     * Validate compose.json required fields
     */
    validateComposeFields(compose, driverName) {
        const requiredFields = ['id', 'version', 'category', 'name'];

        for (const field of requiredFields) {
            if (!compose[field]) {
                this.errors.push({
                    driver: driverName,
                    type: 'MISSING_FIELD',
                    message: `Missing required field: ${field}`
                });
            }
        }

        // Validate zigbee configuration
        if (!compose.zigbee) {
            this.errors.push({
                driver: driverName,
                type: 'MISSING_ZIGBEE',
                message: 'Missing zigbee configuration'
            });
        }
    }

    /**
     * Validate Zigbee configuration
     */
    validateZigbeeConfig(compose, driverName) {
        if (!compose.zigbee) return;

        const zigbee = compose.zigbee;

        // Check for endpoint configuration
        if (!zigbee.endpoint) {
            this.warnings.push({
                driver: driverName,
                type: 'MISSING_ENDPOINT',
                message: 'Zigbee endpoint not specified'
            });
        }

        // Check for manufacturer and model
        if (!zigbee.manufacturer) {
            this.warnings.push({
                driver: driverName,
                type: 'MISSING_MANUFACTURER',
                message: 'Manufacturer ID not specified'
            });
        }

        if (!zigbee.modelId) {
            this.warnings.push({
                driver: driverName,
                type: 'MISSING_MODEL',
                message: 'Model ID not specified'
            });
        }
    }

    /**
     * Validate device capabilities
     */
    validateDeviceCapabilities(compose, driverName) {
        if (!compose.capabilities) {
            this.warnings.push({
                driver: driverName,
                type: 'NO_CAPABILITIES',
                message: 'No device capabilities defined'
            });
            return;
        }

        // Check for basic capabilities
        const basicCapabilities = ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature'];
        const foundCapabilities = Object.keys(compose.capabilities);

        if (foundCapabilities.length === 0) {
            this.warnings.push({
                driver: driverName,
                type: 'EMPTY_CAPABILITIES',
                message: 'Capabilities object is empty'
            });
        }
    }

    /**
     * Generate verification report
     */
    generateReport() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportFile = path.join(this.reportPath, `driver-verification-${timestamp}.md`);

        const report = this.formatReport();
        fs.writeFileSync(reportFile, report);

        console.log(`📊 Report generated: ${reportFile}`);
    }

    /**
     * Format verification report
     */
    formatReport() {
        const timestamp = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });

        let report = `# Driver Verification Report

**Generated:** ${timestamp}  
**Total Drivers:** ${this.success.length + this.errors.length}  
**Successful:** ${this.success.length}  
**Errors:** ${this.errors.length}  
**Warnings:** ${this.warnings.length}

## ✅ Successful Drivers (${this.success.length})

${this.success.map(driver => `- **${driver.driver}**`).join('\n')}

## ❌ Errors (${this.errors.length})

${this.errors.map(error =>
    `### ${error.driver}
- **Type:** ${error.type}
- **Message:** ${error.message}`
).join('\n\n')}

## ⚠️ Warnings (${this.warnings.length})

${this.warnings.map(warning =>
    `### ${warning.driver}
- **Type:** ${warning.type}
- **Message:** ${warning.message}`
).join('\n\n')}

## 📊 Summary

- **Success Rate:** ${((this.success.length / (this.success.length + this.errors.length)) * 100).toFixed(1)}%
- **Drivers with Warnings:** ${new Set(this.warnings.map(w => w.driver)).size}
- **Critical Issues:** ${this.errors.length}

---

*Report generated by Tuya Zigbee Driver Verification Tool*
`;

        return report;
    }

    /**
     * Display summary in console
     */
    displaySummary() {
        console.log('\n📊 Verification Summary:');
        console.log(`✅ Successful: ${this.success.length}`);
        console.log(`❌ Errors: ${this.errors.length}`);

        if (this.errors.length > 0) {
            console.log('\n❌ Critical Issues:');
            this.errors.forEach(error => {
                console.log(`  - ${error.driver}: ${error.message}`);
            });
        }

        if (this.warnings.length > 0) {
            console.log('\n⚠️  Warnings:');
            this.warnings.forEach(warning => {
                console.log(`  - ${warning.driver}: ${warning.message}`);
            });
        }
    }
}

// CLI Interface
if (require.main === module) {
    const verifier = new DriverVerifier();

    const args = process.argv.slice(2);
    const command = args[0] || 'verify';

    switch (command) {
        case 'verify':
            verifier.verifyAllDrivers();
            break;
        case 'help':
            console.log(`
Tuya Zigbee Driver Verification Tool

Usage:
  node verify-drivers.js [command]

Commands:
  verify    Verify all drivers (default)
  help      Show this help message

Examples:
  node verify-drivers.js verify
  node verify-drivers.js help
            `);
            break;
        default:
            console.error(`Unknown command: ${command}`);
            console.log('Use "help" for available commands');
            process.exit(1);
    }
}

module.exports = DriverVerifier; 