'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const TuyaClusterHandler = require('../../utils/tuya-cluster-handler');

class PirRadarIlluminationSensorBatteryDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('pir_radar_illumination_sensor_battery initialized');

    // Call parent
    await super.onNodeInit({ zclNode });
    
    // Initialiser le système de batterie intelligent V2 (Homey Persistent Storage)
    try {
      const BatteryIntelligenceSystemV2 = require('../../utils/battery-intelligence-system-v2');
      this.batterySystem = new BatteryIntelligenceSystemV2(this);
      await this.batterySystem.load();
      this.log('✅ Battery Intelligence System V2 loaded (Homey Storage)');
    } catch (err) {
      this.log('⚠️  Battery Intelligence System V2 not available:', err.message);
      this.log('   → Fallback to basic mode will be used');
    }

    // Auto-detect device type and initialize Tuya cluster handler
    const deviceType = TuyaClusterHandler.detectDeviceType('pir_radar_illumination_sensor_battery');
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

   catch (err) {
      this.error('Battery change detection error:', err);
    }
  }

}

module.exports = PirRadarIlluminationSensorBatteryDevice;
