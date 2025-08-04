'use strict';

const { HomeyAPI } = require('athom-api');

class TuyaZigbeeApp extends Homey.App {
    async onInit() {
        this.log('Tuya Zigbee Universal App is running...');
        
        // Initialisation des managers
        this.homey.on('unload', () => {
            this.log('Tuya Zigbee Universal App is unloading...');
        });
    }
}

module.exports = TuyaZigbeeApp;