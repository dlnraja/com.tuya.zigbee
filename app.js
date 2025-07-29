'use strict';

const Homey = require('homey');

class TuyaZigbeeApp extends Homey.App {
    async onInit() {
        this.log('Tuya Zigbee App is running...');
        
        // Log des statistiques
        this.log('App initialized with comprehensive Tuya and Zigbee support');
        
        // Émettre un événement pour indiquer que l'app est prête
        this.homey.on('ready', () => {
            this.log('Homey is ready, Tuya Zigbee drivers are available');
        });
    }
    
    async onUninit() {
        this.log('Tuya Zigbee App is shutting down...');
    }
}

module.exports = TuyaZigbeeApp;
