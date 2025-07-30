const { HomeyApp } = require('homey');

class TuyaZigbeeApp extends HomeyApp {
    async onInit() {
        this.log('Tuya Zigbee App is running...');
        
        // Initialisation des drivers
        await this.initializeDrivers();
        
        // Configuration des événements
        this.homey.on('unload', () => {
            this.log('Tuya Zigbee App is unloading...');
        });
    }
    
    async initializeDrivers() {
        try {
            // Initialisation automatique des drivers
            this.log('Initializing drivers...');
            
            // Chargement des drivers disponibles
            const drivers = this.homey.drivers.getDrivers();
            this.log(`Loaded ${drivers.length} drivers`);
            
        } catch (error) {
            this.log('Error initializing drivers:', error);
        }
    }
}

module.exports = TuyaZigbeeApp;
