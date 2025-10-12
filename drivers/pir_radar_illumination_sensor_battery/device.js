'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const TuyaClusterHandler = require('../../utils/tuya-cluster-handler');

class PirRadarIlluminationSensorBatteryDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('pir_radar_illumination_sensor_battery initialized');

    // Call parent
    await super.onNodeInit({ zclNode });

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

  /**
   * Register standard Zigbee capabilities (fallback)
   * Fixed v2.15.17 - Added motion + illuminance + IAS Zone enrollment
   */
  async registerStandardCapabilities() {
    const { zclNode } = this;
    
    // Battery - Smart calculation
    if (this.hasCapability('measure_battery')) {
      try {
        this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
          get: 'batteryPercentageRemaining',
          report: 'batteryPercentageRemaining',
          reportParser: value => {
            this.log('Battery raw value:', value);
            // Smart calculation: check if value is already 0-100 or 0-200
            if (value <= 100) {
              return Math.max(0, Math.min(100, value));
            } else {
              return Math.max(0, Math.min(100, value / 2));
            }
          },
          getParser: value => {
            if (value <= 100) {
              return Math.max(0, Math.min(100, value));
            } else {
              return Math.max(0, Math.min(100, value / 2));
            }
          }
        });
        this.log('✅ Battery capability registered');
      } catch (err) {
        this.log('Battery capability failed:', err.message);
      }
    }

    // Illuminance Measurement
    if (this.hasCapability('measure_luminance')) {
      try {
        this.registerCapability('measure_luminance', CLUSTER.ILLUMINANCE_MEASUREMENT);
        this.log('✅ Illuminance cluster registered');
      } catch (err) {
        this.log('Illuminance cluster failed:', err.message);
      }
    }

    // Motion via IAS Zone - FIXED v2.15.17
    if (this.hasCapability('alarm_motion')) {
      try {
        this.registerCapability('alarm_motion', CLUSTER.IAS_ZONE, {
          get: 'zoneStatus',
          report: 'zoneStatus',
          reportParser: value => {
            this.log('Motion IAS Zone status:', value);
            return (value & 1) === 1;
          }
        });
        
        // IAS Zone enrollment - Use correct Homey Zigbee API
        const endpoint = zclNode.endpoints[this.getClusterEndpoint(CLUSTER.IAS_ZONE)];
        if (endpoint && endpoint.clusters.iasZone) {
          try {
            // Method 1: Write IAS CIE Address
            this.log('Writing IAS CIE address for motion...');
            await endpoint.clusters.iasZone.writeAttributes({
              iasCieAddress: zclNode.ieeeAddress
            });
            this.log('✅ IAS CIE address written');
            
            // Method 2: Configure reporting
            await endpoint.clusters.iasZone.configureReporting({
              zoneStatus: {
                minInterval: 0,
                maxInterval: 300,
                minChange: 1
              }
            });
            this.log('✅ IAS Zone reporting configured');
            
            // Method 3: Listen for notifications
            endpoint.clusters.iasZone.on('zoneStatusChangeNotification', (payload) => {
              this.log('IAS Zone motion notification:', payload);
              if (this.hasCapability('alarm_motion')) {
                const motionDetected = (payload.zoneStatus & 1) === 1;
                this.setCapabilityValue('alarm_motion', motionDetected).catch(this.error);
              }
            });
            this.log('✅ IAS Zone motion listener registered');
            
          } catch (enrollErr) {
            this.log('IAS Zone enrollment failed:', enrollErr.message);
          }
        }
      } catch (err) {
        this.log('IAS Zone motion failed:', err.message);
      }
    }
  }

  async onDeleted() {
    this.log('pir_radar_illumination_sensor_battery deleted');
  }

}

module.exports = PirRadarIlluminationSensorBatteryDevice;
