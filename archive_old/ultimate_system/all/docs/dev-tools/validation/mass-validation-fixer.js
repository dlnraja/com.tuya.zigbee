#!/usr/bin/env node

/**
 * Mass Validation Fixer
 * Fixes all validation issues in driver.compose.json files in batch
 * Ensures complete SDK3 compliance across all drivers
 */

const fs = require('fs-extra');
const path = require('path');

class MassValidationFixer {
    constructor() {
        this.projectRoot = process.cwd();
        this.driversPath = path.join(this.projectRoot, 'drivers');
        this.fixedCount = 0;
        this.errors = [];

        console.log('🔧 Mass Validation Fixer - Complete SDK3 Compliance');
    }

    async run() {
        console.log('\n🔍 Scanning all drivers for validation issues...');
        
        try {
            const drivers = await fs.readdir(this.driversPath);
            
            for (const driverName of drivers) {
                const driverPath = path.join(this.driversPath, driverName);
                const stat = await fs.stat(driverPath);
                
                if (stat.isDirectory()) {
                    await this.processDriver(driverName, driverPath);
                }
            }
            
            console.log(`\n✅ Fixed ${this.fixedCount} drivers`);
            if (this.errors.length > 0) {
                console.log(`⚠️  Errors: ${this.errors.length}`);
                this.errors.forEach(error => console.log(`   - ${error}`));
            }
            
            return {
                fixed: this.fixedCount,
                errors: this.errors.length
            };
            
        } catch (error) {
            console.error('❌ Error during mass validation fixing:', error);
            throw error;
        }
    }

    async processDriver(driverName, driverPath) {
        try {
            const composeFile = path.join(driverPath, 'driver.compose.json');
            
            if (!await fs.pathExists(composeFile)) {
                console.log(`⚠️  No compose file found for: ${driverName}`);
                return;
            }
            
            const composeJson = await fs.readJson(composeFile);
            let wasModified = false;
            
            // Fix missing name property
            if (!composeJson.name) {
                composeJson.name = {
                    en: this.generateDriverTitle(driverName)
                };
                wasModified = true;
                console.log(`🔨 Added name to: ${driverName}`);
            }
            
            // Fix ID mismatch
            if (composeJson.id !== driverName) {
                composeJson.id = driverName;
                wasModified = true;
                console.log(`🔨 Fixed ID for: ${driverName}`);
            }
            
            // Ensure required properties
            if (!composeJson.platforms) {
                composeJson.platforms = ['local'];
                wasModified = true;
            }
            
            if (!composeJson.connectivity) {
                composeJson.connectivity = ['zigbee'];
                wasModified = true;
            }
            
            if (!composeJson.images) {
                composeJson.images = {
                    small: './assets/small.png',
                    large: './assets/large.png'
                };
                wasModified = true;
            }
            
            // Fix zigbee configuration
            if (composeJson.zigbee) {
                if (composeJson.zigbee.manufacturerId && Array.isArray(composeJson.zigbee.manufacturerId) && composeJson.zigbee.manufacturerId.length === 0) {
                    composeJson.zigbee.manufacturerName = ['_TZ3000_', '_TZE200_', '_TZE204_'];
                    delete composeJson.zigbee.manufacturerId;
                    wasModified = true;
                }
                
                if (composeJson.zigbee.productId && Array.isArray(composeJson.zigbee.productId) && composeJson.zigbee.productId.length === 0) {
                    composeJson.zigbee.productId = ['TS0601', 'TS011F', 'TS0121'];
                    wasModified = true;
                }
                
                // Fix image paths in learnmode
                if (composeJson.zigbee.learnmode && composeJson.zigbee.learnmode.image) {
                    const currentPath = composeJson.zigbee.learnmode.image;
                    if (currentPath.includes('/drivers/') && !currentPath.includes(driverName)) {
                        composeJson.zigbee.learnmode.image = './assets/large.png';
                        wasModified = true;
                    }
                }
            }
            
            // Fix image paths
            if (composeJson.images) {
                if (composeJson.images.small && composeJson.images.small.includes('/drivers/') && !composeJson.images.small.includes(driverName)) {
                    composeJson.images.small = './assets/small.png';
                    wasModified = true;
                }
                
                if (composeJson.images.large && composeJson.images.large.includes('/drivers/') && !composeJson.images.large.includes(driverName)) {
                    composeJson.images.large = './assets/large.png';
                    wasModified = true;
                }
            }
            
            // Save if modified
            if (wasModified) {
                await fs.writeJson(composeFile, composeJson, { spaces: 2 });
                this.fixedCount++;
            }
            
        } catch (error) {
            const errorMsg = `Error processing ${driverName}: ${error.message}`;
            console.log(`❌ ${errorMsg}`);
            this.errors.push(errorMsg);
        }
    }

    generateDriverTitle(driverName) {
        return driverName
            .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
            .replace(/^for_/, '') // Remove 'for_' prefix
            .replace(/_and_/g, ' And ') // Replace _and_ with And
            .replace(/_httpswww.*$/, '') // Remove URL suffixes
            .replace(/_resolves_\d+.*$/, '') // Remove issue references
            .replace(/adds_support_for.*$/, '') // Remove support descriptions
            .split('_')
            .map(word => {
                // Don't capitalize technical terms
                if (/^(tze204|tz3000|tze200|ts0601|ts011f|ts0121|pir|ac|dc|cr2032|co2|pm25|tvoc|rgb|hvac|usb)$/i.test(word)) {
                    return word.toUpperCase();
                }
                return word.charAt(0).toUpperCase() + word.slice(1);
            })
            .join(' ')
            .replace(/\b(Tze204|Tz3000|Tze200|Ts0601|Ts011f|Ts0121)\b/gi, '') // Remove technical IDs from final result
            .replace(/\s+/g, ' ')
            .trim();
    }
}

// Execute if run directly
if (require.main === module) {
    const fixer = new MassValidationFixer();
    fixer.run().catch(console.error);
}

module.exports = MassValidationFixer;
