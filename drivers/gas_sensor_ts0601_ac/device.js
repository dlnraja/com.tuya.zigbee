'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const TuyaClusterHandler = require('../../utils/tuya-cluster-handler');

class GasSensorTs0601AcDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('gas_sensor_ts0601_ac initialized');

    // Call parent
    await super.onNodeInit({ zclNode });

    // Auto-detect device type and initialize Tuya cluster handler
    const deviceType = TuyaClusterHandler.detectDeviceType('gas_sensor_ts0601_ac');
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
    // AC powered device - no battery capability needed
    this.log('AC powered gas sensor - no battery registration needed');
  }

  async onDeleted() {
    this.log('gas_sensor_ts0601_ac deleted');
  }

}

module.exports = GasSensorTs0601AcDevice;
