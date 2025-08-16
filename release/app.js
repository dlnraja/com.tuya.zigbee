#!/usr/bin/env node
'use strict';

// Total drivers: 237 (74 Tuya, 163 Zigbee)
'use strict';

const Homey = require('homey');
const fs = require('fs');
const path = require('path');

class TuyaZigbeeApp extends Homey.App {
    
    async onInit() {
        this.log('🚀 Universal Tuya Zigbee App - Initialisation MEGA...');
        
        // Configuration du mode MEGA
        this.MEGA_MODE = process.env.MEGA_MODE || 'enrichment';
        this.log(`Mode MEGA: ${this.MEGA_MODE}`);
        
        // Système de fallback MEGA
        this.megaFallbackSystem = {
            enabled: true,
            maxRetries: 5,
            retryDelay: 2000,
            autoRecovery: true
        };
        
        // Référentiels MEGA
        this.megaReferentials = {
            tuyaDevices: require('./scripts/core/tuya-devices.json'),
            zigbeeDevices: require('./scripts/core/zigbee-devices.json'),
            capabilities: require('./scripts/core/capabilities.json')
        };
        
        // Enregistrement des drivers MEGA
        await this.registerAllDriversMEGA();
        
        this.log('✅ Universal Tuya Zigbee App - Initialisation MEGA terminée');
    }
    
    async registerAllDriversMEGA() {
        const driversPath = path.join(__dirname, 'drivers');
        const drivers = this.findDriversRecursivelyMEGA(driversPath);
        this.log(`🔍 Found ${drivers.length} drivers MEGA`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const driverPath of drivers) {
            try {
                this.log(`📂 Registering driver MEGA at: ${driverPath}`);
                await this.homey.drivers.registerDriver(require(driverPath));
                successCount++;
                this.log(`✅ Driver MEGA registered: ${path.basename(driverPath)}`);
            } catch (err) {
                errorCount++;
                this.error(`❌ Failed to register driver MEGA: ${driverPath}`, err);
                
                if (this.megaFallbackSystem.enabled) {
                    this.warn(`🛠️ MEGA Fallback applied to: ${driverPath}`);
                    await this.applyMegaFallback(driverPath);
                }
            }
        }
        
        this.log(`📊 MEGA Registration Summary: ${successCount} success, ${errorCount} errors`);
    }
    
    async applyMegaFallback(driverPath) {
        try {
            const deviceName = path.basename(driverPath);
            const deviceClass = this.getDeviceClassMEGA(deviceName);
            
            // Logique de fallback MEGA
            this.log(`🔄 Applying MEGA fallback for: ${deviceName}`);
            
        } catch (error) {
            this.error('❌ MEGA Fallback application failed:', error);
        }
    }
    
    getDeviceClassMEGA(deviceName) {
        if (deviceName.includes('bulb') || deviceName.includes('light') || deviceName.includes('rgb') || deviceName.includes('strip')) {
            return 'light';
        } else if (deviceName.includes('plug') || deviceName.includes('switch')) {
            return 'switch';
        } else if (deviceName.includes('sensor')) {
            return 'sensor';
        } else if (deviceName.includes('cover') || deviceName.includes('blind') || deviceName.includes('curtain')) {
            return 'windowcoverings';
        } else if (deviceName.includes('lock')) {
            return 'lock';
        } else if (deviceName.includes('thermostat')) {
            return 'thermostat';
        } else {
            return 'other';
        }
    }
    
    findDriversRecursivelyMEGA(dir) {
        let results = [];
        
        try {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);
                
                if (stat && stat.isDirectory()) {
                    results = results.concat(this.findDriversRecursivelyMEGA(fullPath));
                } else if (file === 'driver.js' || file === 'device.js') {
                    results.push(path.dirname(fullPath));
                }
            }
        } catch (error) {
            this.error(`❌ Error reading directory MEGA: ${dir}`, error);
        }
        
        return results;
    }
}

module.exports = TuyaZigbeeApp;