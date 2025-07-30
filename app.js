/**
 * Tuya Zigbee App
 * Version: 1.0.12-20250729-1700
 */

const { HomeyApp } = require('homey');

class TuyaZigbeeApp extends HomeyApp {
    
    async onInit() {
        this.log('🚀 Tuya Zigbee App initialisé');
        
        // Initialisation des drivers
        await this.initializeDrivers();
        
        // Configuration des événements
        this.setupEventHandlers();
        
        this.log('✅ Tuya Zigbee App prêt');
    }
    
    async initializeDrivers() {
        try {
            // Initialisation automatique des drivers
            const drivers = await this.getDrivers();
            this.log(`📦 ${drivers.length} drivers initialisés`);
        } catch (error) {
            this.error('❌ Erreur initialisation drivers:', error);
        }
    }
    
    setupEventHandlers() {
        // Gestion des événements de l'app
        this.on('unload', () => {
            this.log('🔄 Tuya Zigbee App déchargé');
        });
    }
    
    async onUninit() {
        this.log('👋 Tuya Zigbee App terminé');
    }
}

module.exports = TuyaZigbeeApp;
