'use strict';

const Homey = require('homey');

class TuyaZigbeeApp extends Homey.App {
    async onInit() {
        this.log('Tuya Zigbee App initialized - Comprehensive Scraping');
        
        // Register all scraped drivers
        this.registerDeviceClass('light', require('./drivers/tuya/TS0001_forum/device.js'));
        this.registerDeviceClass('light', require('./drivers/tuya/TS0601_forum/device.js'));
        this.registerDeviceClass('light', require('./drivers/tuya/TS0001_zigbee2mqtt/device.js'));
        this.registerDeviceClass('light', require('./drivers/tuya/TS0601_zigbee2mqtt/device.js'));
        this.registerDeviceClass('light', require('./drivers/tuya/TS0001_github/device.js'));
        this.registerDeviceClass('light', require('./drivers/tuya/TS0601_github/device.js'));
        this.registerDeviceClass('light', require('./drivers/tuya/TS0001_appstore/device.js'));
        this.registerDeviceClass('light', require('./drivers/tuya/TS0001_zigbee_db/device.js'));

        this.log('Comprehensive scraping system initialized');
        this.log('All scraped drivers registered and ready for use');
    }
    
    async onUninit() {
        this.log('Tuya Zigbee App uninitialized - Comprehensive Scraping');
    }
}

module.exports = TuyaZigbeeApp;