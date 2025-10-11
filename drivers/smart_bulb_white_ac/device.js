'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const TuyaClusterHandler = require('../../utils/tuya-cluster-handler');

class SmartBulbWhiteAcDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('smart_bulb_white_ac initialized');

    // Call parent
    await super.onNodeInit({ zclNode });

    // Auto-detect device type and initialize Tuya cluster handler
    const deviceType = TuyaClusterHandler.detectDeviceType('smart_bulb_white_ac');
    const tuyaInitialized = await TuyaClusterHandler.init(this, zclNode, deviceType);
    
    if (tuyaInitialized) {
      this.log('✅ Tuya cluster handler initialized for type:', deviceType);
    } else {
      this.log('⚠️  No Tuya cluster found, using standard Zigbee');
      
      // Fallback to standard cluster handling if needed
      await this.registerStandardCapabilities();
    }

    // Mark device as available
    await this.setAvailable();
  }

  /**
   * Register standard Zigbee capabilities (fallback)
   */
  async registerStandardCapabilities() {
    // Battery
    if (this.hasCapability('measure_battery')) {
      try {
        this.registerCapability('measure_battery', 'genPowerCfg', {
          get: 'batteryPercentageRemaining',
          report: 'batteryPercentageRemaining',
          reportParser: value => Math.max(0, Math.min(100, value / 2)),
          getParser: value => Math.max(0, Math.min(100, value / 2))
        });
      } catch (err) {
        this.log('Could not register battery capability:', err.message);
      }
    }
  }

  async onDeleted() {
    this.log('smart_bulb_white_ac deleted');
  }

}

module.exports = SmartBulbWhiteAcDevice;
