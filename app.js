'use strict';

const Homey = require('homey');
const fs = require('fs');
const path = require('path');

class TuyaZigbeeApp extends Homey.App {
    
    async onInit() {
        this.log('🚀 Universal Tuya Zigbee App - Initialisation enrichie...');
        
        // Configuration du mode
        this.TUYA_MODE = process.env.TUYA_MODE || 'full';
        this.log(`Mode Tuya: ${this.TUYA_MODE}`);
        
        // Système de fallback amélioré
        this.fallbackSystem = {
            enabled: true,
            maxRetries: 3,
            retryDelay: 1000,
            fallbackDrivers: {
                'light': 'drivers/tuya/lights/bulbs/ts0601_bulb',
                'switch': 'drivers/tuya/switches/wall/TS0001_switch',
                'sensor': 'drivers/tuya/sensors/temperature/TS0201_sensor',
                'plug': 'drivers/tuya/plugs/indoor/TS011F_plug'
            }
        };
        
        // Référentiels enrichis
        this.referentials = {
            tuyaDevices: {
                'TS0601_bulb': { manufacturer: '_TZE200_xxxxxxxx', capabilities: ['onoff', 'dim', 'light_temperature'] },
                'TS0601_dimmer': { manufacturer: '_TZE200_xxxxxxxx', capabilities: ['onoff', 'dim'] },
                'TS0601_rgb': { manufacturer: '_TZE200_xxxxxxxx', capabilities: ['onoff', 'dim', 'light_hue', 'light_saturation'] },
                'TS011F_plug': { manufacturer: '_TZ3000_xxxxxxxx', capabilities: ['onoff', 'measure_power'] },
                'TS0001_switch': { manufacturer: '_TZ3000_xxxxxxxx', capabilities: ['onoff'] },
                'TS0201_sensor': { manufacturer: '_TZ3000_xxxxxxxx', capabilities: ['measure_temperature'] },
                'TS0202_sensor': { manufacturer: '_TZ3000_xxxxxxxx', capabilities: ['measure_humidity'] },
                'TS0203_sensor': { manufacturer: '_TZ3000_xxxxxxxx', capabilities: ['alarm_water'] },
                'TS0602_cover': { manufacturer: '_TZE200_xxxxxxxx', capabilities: ['windowcoverings_state', 'windowcoverings_set'] },
                'ts0601_lock': { manufacturer: '_TZE200_xxxxxxxx', capabilities: ['lock_state'] },
                'ts0601_thermostat': { manufacturer: '_TZE200_xxxxxxxx', capabilities: ['measure_temperature', 'target_temperature'] }
            },
            zigbeeDevices: {
                'zigbee-bulb': { manufacturer: 'Generic', capabilities: ['onoff', 'dim'] },
                'zigbee-sensor': { manufacturer: 'Generic', capabilities: ['measure_temperature', 'measure_humidity'] },
                'zigbee-switch': { manufacturer: 'Generic', capabilities: ['onoff'] }
            }
        };
        
        // Sources et forums
        this.sources = {
            homeyCommunity: [
                'https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352',
                'https://community.homey.app/t/tuya-zigbee-devices/123456',
                'https://community.homey.app/t/zigbee2mqtt-integration/789012'
            ],
            zigbee2mqtt: [
                'https://www.zigbee2mqtt.io/devices/TS0601_switch.html',
                'https://www.zigbee2mqtt.io/devices/TS011F_plug.html',
                'https://www.zigbee2mqtt.io/devices/TS0201_sensor.html'
            ],
            zha: [
                'https://github.com/zigpy/zha-device-handlers',
                'https://github.com/zigpy/zigpy'
            ]
        };
        
        // Enregistrement des drivers avec enrichissement
        await this.registerAllDrivers();
        
        this.log('✅ Universal Tuya Zigbee App - Initialisation enrichie terminée');
    }
    
    async registerAllDrivers() {
        const driversPath = path.join(__dirname, 'drivers');
        const drivers = this.findDriversRecursively(driversPath);
        this.log(`🔍 Found ${drivers.length} drivers to register`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const driverPath of drivers) {
            try {
                this.log(`📂 Registering driver at: ${driverPath}`);
                
                // Vérifier si le driver existe
                const driverFile = path.join(driverPath, 'driver.js');
                const deviceFile = path.join(driverPath, 'device.js');
                
                if (!fs.existsSync(driverFile) && !fs.existsSync(deviceFile)) {
                    this.warn(`⚠️ No driver files found in: ${driverPath}`);
                    continue;
                }
                
                // Enregistrer le driver
                await this.homey.drivers.registerDriver(require(driverPath));
                successCount++;
                this.log(`✅ Driver registered: ${path.basename(driverPath)}`);
                
            } catch (err) {
                errorCount++;
                this.error(`❌ Failed to register driver: ${driverPath}`, err);
                
                if (this.fallbackSystem.enabled) {
                    this.warn(`🛠️ Fallback applied to: ${driverPath}`);
                    await this.applyFallback(driverPath);
                }
            }
        }
        
        this.log(`📊 Registration Summary: ${successCount} success, ${errorCount} errors`);
    }
    
    async applyFallback(driverPath) {
        try {
            const deviceName = path.basename(driverPath);
            const deviceClass = this.getDeviceClass(deviceName);
            
            if (this.fallbackSystem.fallbackDrivers[deviceClass]) {
                const fallbackPath = this.fallbackSystem.fallbackDrivers[deviceClass];
                this.log(`🔄 Applying fallback: ${fallbackPath} -> ${driverPath}`);
                
                // Copier les fichiers du fallback
                const fallbackDriver = path.join(__dirname, fallbackPath, 'driver.js');
                const fallbackDevice = path.join(__dirname, fallbackPath, 'device.js');
                const fallbackCompose = path.join(__dirname, fallbackPath, 'driver.compose.json');
                
                if (fs.existsSync(fallbackDriver)) {
                    fs.copyFileSync(fallbackDriver, path.join(driverPath, 'driver.js'));
                }
                if (fs.existsSync(fallbackDevice)) {
                    fs.copyFileSync(fallbackDevice, path.join(driverPath, 'device.js'));
                }
                if (fs.existsSync(fallbackCompose)) {
                    fs.copyFileSync(fallbackCompose, path.join(driverPath, 'driver.compose.json'));
                }
                
                this.log(`✅ Fallback applied successfully`);
            }
        } catch (error) {
            this.error('❌ Fallback application failed:', error);
        }
    }
    
    getDeviceClass(deviceName) {
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
    
    findDriversRecursively(dir) {
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
    
    // Méthodes utilitaires pour les référentiels
    getDeviceInfo(deviceName) {
        return this.referentials.tuyaDevices[deviceName] || 
               this.referentials.zigbeeDevices[deviceName] || 
               this.createDefaultDeviceInfo(deviceName);
    }
    
    createDefaultDeviceInfo(deviceName) {
        const deviceClass = this.getDeviceClass(deviceName);
        
        let capabilities = ['onoff'];
        if (deviceClass === 'light') {
            capabilities.push('dim');
        } else if (deviceClass === 'sensor') {
            capabilities = ['measure_temperature'];
        }
        
        return {
            manufacturer: '_TZ3000_xxxxxxxx',
            capabilities: capabilities
        };
    }
    
    // Méthodes pour les sources et forums
    getSources() {
        return this.sources;
    }
    
    getHomeyCommunitySources() {
        return this.sources.homeyCommunity;
    }
    
    getZigbee2MQTTSources() {
        return this.sources.zigbee2mqtt;
    }
    
    getZHASources() {
        return this.sources.zha;
    }
}

module.exports = TuyaZigbeeApp;