const Homey = require('homey');

class TuyaZigbeeApp extends Homey.App {
    async onInit() {
        this.log('Tuya Zigbee App is running...');
    }
    
    async onUninit() {
        this.log('Tuya Zigbee App is stopping...');
    }
}

module.exports = TuyaZigbeeApp;