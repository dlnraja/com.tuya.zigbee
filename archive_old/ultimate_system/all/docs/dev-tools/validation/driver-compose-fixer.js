#!/usr/bin/env node

/**
 * Driver Compose Fixer
 * Creates missing driver.compose.json files for all drivers
 * Ensures SDK3 compliance and proper validation
 */

const fs = require('fs-extra');
const path = require('path');

class DriverComposeFixer {
    constructor() {
        this.projectRoot = process.cwd();
        this.driversPath = path.join(this.projectRoot, 'drivers');
        this.fixedCount = 0;
        this.errors = [];

        console.log('🔧 Driver Compose Fixer - Ensuring SDK3 Compliance');
    }

    async run() {
        console.log('\n🔍 Scanning for missing driver.compose.json files...');
        
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
            console.error('❌ Error during driver fixing:', error);
            throw error;
        }
    }

    async processDriver(driverName, driverPath) {
        try {
            const composeFile = path.join(driverPath, 'driver.compose.json');
            const driverJsonFile = path.join(driverPath, 'driver.json');
            
            // Check if compose file is missing
            if (!await fs.pathExists(composeFile)) {
                console.log(`🔨 Creating driver.compose.json for: ${driverName}`);
                
                // Read existing driver.json if it exists
                let driverJson = null;
                if (await fs.pathExists(driverJsonFile)) {
                    driverJson = await fs.readJson(driverJsonFile);
                }
                
                // Create compose.json based on driver.json or generate default
                const composeJson = driverJson || this.generateDefaultCompose(driverName);
                
                // Write the compose file
                await fs.writeJson(composeFile, composeJson, { spaces: 2 });
                
                this.fixedCount++;
            }
            
        } catch (error) {
            const errorMsg = `Error processing ${driverName}: ${error.message}`;
            console.log(`❌ ${errorMsg}`);
            this.errors.push(errorMsg);
        }
    }

    generateDefaultCompose(driverName) {
        const category = this.categorizeDriver(driverName);
        
        return {
            id: driverName,
            name: {
                en: this.generateDriverTitle(driverName)
            },
            class: category.class,
            capabilities: category.capabilities,
            platforms: ["local"],
            connectivity: ["zigbee"],
            images: {
                small: "./assets/small.png",
                large: "./assets/large.png"
            },
            zigbee: {
                manufacturerName: ["_TZ3000_", "_TZE200_", "_TZE204_"],
                productId: ["TS0601", "TS011F", "TS0121"],
                endpoints: category.endpoints,
                learnmode: {
                    image: "./assets/large.png",
                    instruction: {
                        en: `Follow the pairing instructions for your ${this.generateDriverTitle(driverName)}.`
                    }
                }
            },
            energy: category.energy,
            settings: []
        };
    }

    categorizeDriver(driverName) {
        const name = driverName.toLowerCase();
        
        // Switches
        if (name.includes('switch') || name.includes('relay')) {
            return {
                class: 'socket',
                capabilities: ['onoff'],
                endpoints: {
                    1: {
                        clusters: [0, 3, 4, 5, 6, 1794, 57344],
                        bindings: [6]
                    }
                },
                energy: name.includes('battery') || name.includes('cr2032') 
                    ? { batteries: ['CR2032'] } 
                    : undefined
            };
        }
        
        // Sensors
        if (name.includes('sensor') || name.includes('detector')) {
            const capabilities = ['alarm_battery'];
            
            if (name.includes('temperature') || name.includes('temp')) {
                capabilities.push('measure_temperature');
            }
            if (name.includes('humidity')) {
                capabilities.push('measure_humidity');
            }
            if (name.includes('motion') || name.includes('pir')) {
                capabilities.push('alarm_motion');
            }
            if (name.includes('door') || name.includes('window') || name.includes('contact')) {
                capabilities.push('alarm_contact');
            }
            if (name.includes('smoke')) {
                capabilities.push('alarm_smoke');
            }
            if (name.includes('water') || name.includes('leak')) {
                capabilities.push('alarm_water');
            }
            if (name.includes('co2')) {
                capabilities.push('measure_co2');
            }
            if (name.includes('lux') || name.includes('light')) {
                capabilities.push('measure_luminance');
            }
            if (name.includes('pressure')) {
                capabilities.push('measure_pressure');
            }
            
            return {
                class: 'sensor',
                capabilities: capabilities,
                endpoints: {
                    1: {
                        clusters: [0, 1, 3, 1026, 1029, 1030],
                        bindings: [1026, 1029, 1030]
                    }
                },
                energy: { batteries: ['CR2032', 'AA'] }
            };
        }
        
        // Lighting
        if (name.includes('light') || name.includes('bulb') || name.includes('strip')) {
            const capabilities = ['onoff'];
            
            if (name.includes('dim') || name.includes('brightness')) {
                capabilities.push('dim');
            }
            if (name.includes('rgb') || name.includes('color')) {
                capabilities.push('light_hue', 'light_saturation');
            }
            if (name.includes('tunable') || name.includes('white')) {
                capabilities.push('light_temperature');
            }
            
            return {
                class: 'light',
                capabilities: capabilities,
                endpoints: {
                    1: {
                        clusters: [0, 3, 4, 5, 6, 8, 768],
                        bindings: [6, 8, 768]
                    }
                }
            };
        }
        
        // Climate
        if (name.includes('thermostat') || name.includes('climate') || name.includes('temperature_controller')) {
            return {
                class: 'thermostat',
                capabilities: ['target_temperature', 'measure_temperature'],
                endpoints: {
                    1: {
                        clusters: [0, 3, 513, 1026],
                        bindings: [513, 1026]
                    }
                }
            };
        }
        
        // Covers
        if (name.includes('curtain') || name.includes('blind') || name.includes('cover') || name.includes('shade')) {
            return {
                class: 'windowcoverings',
                capabilities: ['windowcoverings_state', 'windowcoverings_set'],
                endpoints: {
                    1: {
                        clusters: [0, 3, 4, 5, 258],
                        bindings: [258]
                    }
                }
            };
        }
        
        // Locks
        if (name.includes('lock') || name.includes('keypad')) {
            return {
                class: 'lock',
                capabilities: ['locked', 'alarm_battery'],
                endpoints: {
                    1: {
                        clusters: [0, 1, 3, 257],
                        bindings: [257]
                    }
                },
                energy: { batteries: ['AA', 'CR2032'] }
            };
        }
        
        // Power/Plugs
        if (name.includes('plug') || name.includes('socket') || name.includes('outlet')) {
            return {
                class: 'socket',
                capabilities: ['onoff', 'measure_power', 'meter_power'],
                endpoints: {
                    1: {
                        clusters: [0, 3, 4, 5, 6, 1794, 2820],
                        bindings: [6, 1794, 2820]
                    }
                }
            };
        }
        
        // Remotes/Buttons
        if (name.includes('remote') || name.includes('button') || name.includes('scene')) {
            return {
                class: 'button',
                capabilities: ['alarm_battery'],
                endpoints: {
                    1: {
                        clusters: [0, 1, 3],
                        bindings: []
                    }
                },
                energy: { batteries: ['CR2032'] }
            };
        }
        
        // Default fallback - sensor
        return {
            class: 'sensor',
            capabilities: ['alarm_battery'],
            endpoints: {
                1: {
                    clusters: [0, 1, 3],
                    bindings: []
                }
            },
            energy: { batteries: ['CR2032'] }
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
}

// Execute if run directly
if (require.main === module) {
    const fixer = new DriverComposeFixer();
    fixer.run().catch(console.error);
}

module.exports = DriverComposeFixer;
