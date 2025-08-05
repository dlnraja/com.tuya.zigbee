'use strict';

const { Homey } = require('homey');
const fs = require('fs');
const path = require('path');

class TuyaZigbeeApp extends Homey.App {
    async onInit() {
        this.log('🚀 Tuya Zigbee App - Initialisation');
        
        // Statistiques
        this.stats = {
            tuyaDriversLoaded: 0,
            zigbeeDriversLoaded: 0,
            driversRegistered: 0,
            errors: 0
        };
        
        // Chargement dynamique des drivers
        await this.loadTuyaDrivers();
        await this.loadZigbeeDrivers();
        
        this.log('✅ Tuya Zigbee App - Initialisation terminée');
        this.logStatistics();
    }
    
    async loadTuyaDrivers() {
        console.log('📦 Chargement des drivers Tuya...');
        
        const categories = ['controls', 'covers', 'historical', 'lights', 'locks', 'plugs', 'sensors', 'smart-life', 'switches', 'thermostats'];
        
        for (const category of categories) {
            await this.loadDriversFromCategory('tuya', category);
        }
    }
    
    async loadZigbeeDrivers() {
        console.log('🔗 Chargement des drivers Zigbee...');
        
        const categories = ['onoff', 'dimmers', 'sensors', 'switches', 'buttons'];
        
        for (const category of categories) {
            await this.loadDriversFromCategory('zigbee', category);
        }
    }
    
    async loadDriversFromCategory(type, category) {
        const categoryPath = `drivers/${type}/${category}`;
        
        if (!fs.existsSync(categoryPath)) {
            return;
        }
        
        const items = fs.readdirSync(categoryPath);
        
        for (const item of items) {
            await this.loadDriver(type, category, item);
        }
    }
    
    async loadDriver(type, category, driverName) {
        try {
            const driverPath = `drivers/${type}/${category}/${driverName}/device.js`;
            
            if (fs.existsSync(driverPath)) {
                const DriverClass = require(`./${driverPath}`);
                this.homey.drivers.registerDriver(DriverClass);
                
                this.log(`✅ Loaded driver: ${type}/${category}/${driverName}`);
                
                if (type === 'tuya') {
                    this.stats.tuyaDriversLoaded++;
                } else {
                    this.stats.zigbeeDriversLoaded++;
                }
                
                this.stats.driversRegistered++;
            }
        } catch (error) {
            this.log(`❌ Erreur chargement driver ${type}/${category}/${driverName}:`, error.message);
            this.stats.errors++;
        }
    }
    
    logStatistics() {
        this.log('📊 Statistiques:');
        this.log('   📦 Drivers Tuya chargés: ' + this.stats.tuyaDriversLoaded);
        this.log('   🔗 Drivers Zigbee chargés: ' + this.stats.zigbeeDriversLoaded);
        this.log('   ✅ Drivers enregistrés: ' + this.stats.driversRegistered);
        this.log('   ❌ Erreurs: ' + this.stats.errors);
    }
}

module.exports = TuyaZigbeeApp;
