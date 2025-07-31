'use strict';

const Homey = require('homey');

class TuyaZigbeeApp extends Homey.App {
    async onInit() {
        this.log('Tuya Zigbee App initialized - Ultimate Comprehensive Pipeline');
        
        // Register all drivers from comprehensive scraping and analysis
        this.registerDeviceClass('light', require('./drivers/tuya/-tz3000-light/device.js'));
        this.registerDeviceClass('light', require('./drivers/tuya/-tz3210-rgb/device.js'));
        this.registerDeviceClass('light', require('./drivers/tuya/-tz3400-switch/device.js'));
        this.registerDeviceClass('sensor', require('./drivers/tuya/-tz3500-sensor/device.js'));
        this.registerDeviceClass('light', require('./drivers/tuya/ts0001/device.js'));
        this.registerDeviceClass('light', require('./drivers/tuya/ts0001-switch/device.js'));
        this.registerDeviceClass('light', require('./drivers/tuya/TS0001_appstore/device.js'));
        this.registerDeviceClass('light', require('./drivers/tuya/TS0001_forum/device.js'));
        this.registerDeviceClass('light', require('./drivers/tuya/TS0001_github/device.js'));
        this.registerDeviceClass('light', require('./drivers/tuya/TS0001_zigbee2mqtt/device.js'));
        this.registerDeviceClass('light', require('./drivers/tuya/TS0001_zigbee_db/device.js'));
        this.registerDeviceClass('light', require('./drivers/tuya/ts0002/device.js'));
        this.registerDeviceClass('light', require('./drivers/tuya/ts0002-switch/device.js'));
        this.registerDeviceClass('light', require('./drivers/tuya/ts0003/device.js'));
        this.registerDeviceClass('light', require('./drivers/tuya/ts0003-switch/device.js'));
        this.registerDeviceClass('light', require('./drivers/tuya/ts0004/device.js'));
        this.registerDeviceClass('light', require('./drivers/tuya/TS0005/device.js'));
        this.registerDeviceClass('light', require('./drivers/tuya/TS0006/device.js'));
        this.registerDeviceClass('socket', require('./drivers/tuya/ts011f/device.js'));
        this.registerDeviceClass('socket', require('./drivers/tuya/ts011f-plug/device.js'));
        this.registerDeviceClass('socket', require('./drivers/tuya/TS011F_2/device.js'));
        this.registerDeviceClass('socket', require('./drivers/tuya/ts0121/device.js'));
        this.registerDeviceClass('socket', require('./drivers/tuya/TS0121_2/device.js'));
        this.registerDeviceClass('light', require('./drivers/tuya/ts0601/device.js'));
        this.registerDeviceClass('curtain', require('./drivers/tuya/ts0601-blind/device.js'));
        this.registerDeviceClass('sensor', require('./drivers/tuya/ts0601-contact/device.js'));
        this.registerDeviceClass('curtain', require('./drivers/tuya/ts0601-curtain/device.js'));
        this.registerDeviceClass('light', require('./drivers/tuya/ts0601-dimmer/device.js'));
        this.registerDeviceClass('fan', require('./drivers/tuya/ts0601-fan/device.js'));
        this.registerDeviceClass('garage', require('./drivers/tuya/ts0601-garage/device.js'));
        this.registerDeviceClass('sensor', require('./drivers/tuya/ts0601-motion/device.js'));
        this.registerDeviceClass('light', require('./drivers/tuya/ts0601-rgb/device.js'));
        this.registerDeviceClass('sensor', require('./drivers/tuya/ts0601-sensor/device.js'));
        this.registerDeviceClass('sensor', require('./drivers/tuya/ts0601-smoke/device.js'));
        this.registerDeviceClass('light', require('./drivers/tuya/ts0601-switch/device.js'));
        this.registerDeviceClass('thermostat', require('./drivers/tuya/ts0601-thermostat/device.js'));
        this.registerDeviceClass('valve', require('./drivers/tuya/ts0601-valve/device.js'));
        this.registerDeviceClass('sensor', require('./drivers/tuya/ts0601-water/device.js'));
        this.registerDeviceClass('sensor', require('./drivers/tuya/TS0601_contact_2/device.js'));
        this.registerDeviceClass('light', require('./drivers/tuya/TS0601_forum/device.js'));
        this.registerDeviceClass('light', require('./drivers/tuya/TS0601_github/device.js'));
        this.registerDeviceClass('sensor', require('./drivers/tuya/TS0601_motion_2/device.js'));
        this.registerDeviceClass('light', require('./drivers/tuya/TS0601_rgb_2/device.js'));
        this.registerDeviceClass('sensor', require('./drivers/tuya/TS0601_sensor_2/device.js'));
        this.registerDeviceClass('light', require('./drivers/tuya/TS0601_switch_2/device.js'));
        this.registerDeviceClass('thermostat', require('./drivers/tuya/TS0601_thermostat_2/device.js'));
        this.registerDeviceClass('light', require('./drivers/tuya/TS0601_zigbee2mqtt/device.js'));

        this.log('Ultimate comprehensive pipeline system initialized');
        this.log('All drivers registered and ready for use');
        this.log('Total drivers: 47');
    }
    
    async onUninit() {
        this.log('Tuya Zigbee App uninitialized - Ultimate Comprehensive Pipeline');
    }
}

module.exports = TuyaZigbeeApp;