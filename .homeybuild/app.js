const Homey = require('homey');

class TuyaZigbeeApp extends Homey.App {
  
  async onInit() {
    this.log('🚀 Tuya Zigbee App is running...');
    
    // In a driver-based app, most logic resides within the drivers themselves.
    // This onInit is kept simple. For more complex apps, you might initialize
    // global services or APIs here.
  }
  
}

module.exports = TuyaZigbeeApp;