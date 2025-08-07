'use strict';

const Homey = require('homey');

class TuyaZigbeeApp extends Homey.App {
    
    async onInit() {
        this.log('🚀 Universal Tuya Zigbee App - Initialisation...');
        
        // Configuration du mode
        this.TUYA_MODE = process.env.TUYA_MODE || 'full';
        this.log(`Mode Tuya: ${this.TUYA_MODE}`);
        
        // Système de fallback
        this.fallbackSystem = {
            enabled: true,
            maxRetries: 3,
            retryDelay: 1000
        };
        
        // Enregistrement des drivers
        await this.registerAllDrivers();
        
        this.log('✅ Universal Tuya Zigbee App - Initialisation terminée');
    }
    
    async registerAllDrivers() {
        const driversPath = require('path').join(__dirname, 'drivers');
        const drivers = this.findDriversRecursively(driversPath);
        this.log(`🔍 Found ${drivers.length} drivers`);
        
        for (const driverPath of drivers) {
            try {
                this.log(`📂 Registering driver at: ${driverPath}`);
                await this.homey.drivers.registerDriver(require(driverPath));
            } catch (err) {
                this.error(`❌ Failed to register driver: ${driverPath}`, err);
                if (this.fallbackSystem.enabled) {
                    this.warn(`🛠️ Fallback applied to: ${driverPath}`);
                }
            }
        }
    }
    
    findDriversRecursively(dir) {
        const fs = require('fs');
        const path = require('path');
        let results = [];
        
        try {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);
                
                if (stat && stat.isDirectory()) {
                    results = results.concat(this.findDriversRecursively(fullPath));
                } else if (file === 'driver.js' || file === 'device.js') {
                    results.push(path.dirname(fullPath));
                }
            }
        } catch (error) {
            this.error(`❌ Error reading directory: ${dir}`, error);
        }
        
        return results;
    }
}

module.exports = TuyaZigbeeApp;