'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * HOBEIAN Multisensor (Motion + Temperature + Humidity + Illumination)
 * v2.15.12 - Enhanced IAS Zone enrollment for motion detection (2025-10-12)
 */
class MotionTempHumidityIlluminationSensorDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('motion_temp_humidity_illumination_sensor device initialized');

    // Debug: Log all endpoints and clusters
    this.log('=== DEVICE DEBUG INFO ===');
    this.log('Node:', zclNode.ieeeAddr);
    this.log('Endpoints:', Object.keys(zclNode.endpoints));
    for (const [epId, endpoint] of Object.entries(zclNode.endpoints)) {
      const clusterIds = Object.keys(endpoint.clusters).map(id => `${id} (0x${parseInt(id).toString(16)})`);
      this.log(`  Endpoint ${epId} clusters:`, clusterIds.join(', '));
    }
    this.log('========================');

    // Call parent
    await super.onNodeInit({ zclNode });

    // Auto-detect Tuya cluster on any endpoint
    let tuyaCluster = null;
    let tuyaEndpoint = null;
    
    for (const [epId, endpoint] of Object.entries(zclNode.endpoints)) {
      if (endpoint.clusters[61184]) {
        tuyaCluster = endpoint.clusters[61184];
        tuyaEndpoint = epId;
        this.log(`✅ Tuya cluster 61184 found on endpoint ${epId}`);
        break;
      }
    }
    
    if (tuyaCluster) {
      // Tuya cluster found - use datapoint method
      this.log('Setting up Tuya datapoint listeners...');
      
      tuyaCluster.on('response', this._handleTuyaData.bind(this));
      tuyaCluster.on('reporting', this._handleTuyaData.bind(this));
      
      // Configure attribute reporting for Tuya cluster
      try {
        await tuyaCluster.configureReporting([{
          attributeId: 0, // dataPoints
          minimumReportInterval: 60, // 1 minute
          maximumReportInterval: 3600, // 1 hour
        }]);
        this.log('✅ Tuya reporting configured');
      } catch (err) {
        this.log('Tuya reporting configuration failed (might be OK):', err.message);
      }
      
      // Request initial data
      try {
        await tuyaCluster.read('dataPoints');
        this.log('✅ Initial Tuya data requested');
      } catch (err) {
        this.log('Initial Tuya data read failed:', err.message);
      }
    } else {
      // No Tuya cluster - use standard Zigbee clusters
      this.log('⚠️  No Tuya cluster found, using standard Zigbee clusters');
      await this.registerStandardClusters(zclNode);
    }

    // Battery from standard cluster (works with both modes)
    if (this.hasCapability('measure_battery')) {
      try {
        this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
          get: 'batteryPercentageRemaining',
          report: 'batteryPercentageRemaining',
          reportParser: value => {
            this.log('Battery raw value:', value);
            if (value <= 100) {
              return Math.max(0, Math.min(100, value));
            } else {
              return Math.max(0, Math.min(100, value / 2));
            }
          }
        });
        this.log('✅ Battery capability registered');
      } catch (err) {
        this.log('Battery registration failed:', err.message);
      }
    }

    // Mark device as available
    await this.setAvailable();
  }

  /**
   * Register standard Zigbee clusters (fallback when no Tuya cluster)
   */
  async registerStandardClusters(zclNode) {
    this.log('Registering standard Zigbee clusters...');
    
    // Temperature Measurement
    if (this.hasCapability('measure_temperature')) {
      try {
        this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT);
        this.log('✅ Temperature cluster registered');
      } catch (err) {
        this.log('Temperature cluster failed:', err.message);
      }
    }
    
    // Relative Humidity Measurement
    if (this.hasCapability('measure_humidity')) {
      try {
        this.registerCapability('measure_humidity', CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT);
        this.log('✅ Humidity cluster registered');
      } catch (err) {
        this.log('Humidity cluster failed:', err.message);
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
    
    // Motion via IAS Zone - CRITICAL FIX v2.15.50
    // Fixed: Use correct IAS Zone enrollment sequence with attribute 0x0010
    if (this.hasCapability('alarm_motion')) {
      try {
        const endpoint = zclNode.endpoints[this.getClusterEndpoint(CLUSTER.IAS_ZONE)];
        if (endpoint && endpoint.clusters.iasZone) {
          this.log('🚶 Setting up Motion IAS Zone...');
          
          // CRITICAL: Write IAS CIE Address for enrollment using correct attribute ID
          try {
            // Method 1: Direct attribute write with ID 0x0010
            await endpoint.clusters.iasZone.write(0x0010, zclNode.ieeeAddr, 'ieeeAddr');
            this.log('✅ IAS CIE address written (method 1: direct write)');
          } catch (err1) {
            this.log('⚠️ Method 1 failed, trying method 2:', err1.message);
            try {
              // Method 2: Write with Buffer format
              const ieeeBuffer = Buffer.from(zclNode.ieeeAddr.split(':').reverse().join(''), 'hex');
              await endpoint.clusters.iasZone.write(0x0010, ieeeBuffer);
              this.log('✅ IAS CIE address written (method 2: buffer)');
            } catch (err2) {
              this.log('⚠️ Method 2 failed, trying method 3:', err2.message);
              try {
                // Method 3: Use read to trigger auto-enrollment
                const currentCie = await endpoint.clusters.iasZone.read(0x0010);
                this.log('📋 Current CIE address:', currentCie);
              } catch (err3) {
                this.log('⚠️ All CIE write methods failed, device may auto-enroll:', err3.message);
              }
            }
          }
          
          // Wait for potential enrollment
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Skip configureReporting - many Tuya IAS devices don't support it
          // Instead, rely purely on zoneStatusChangeNotification
          
          // CRITICAL: Listen for motion notifications (v2.15.50 enhanced)
          endpoint.clusters.iasZone.on('zoneStatusChangeNotification', async (payload) => {
            this.log('🚶 ===== MOTION NOTIFICATION RECEIVED =====');
            this.log('Full payload:', JSON.stringify(payload));
            
            try {
              // Parse zoneStatus - handle both object and number formats
              let motionDetected = false;
              
              if (typeof payload.zoneStatus === 'object') {
                motionDetected = payload.zoneStatus.alarm1 || payload.zoneStatus.alarm2 || false;
                this.log('ZoneStatus (object):', payload.zoneStatus);
              } else if (typeof payload.zoneStatus === 'number') {
                motionDetected = (payload.zoneStatus & 1) === 1;
                this.log('ZoneStatus (number):', payload.zoneStatus, '→ motion:', motionDetected);
              } else {
                this.log('⚠️ Unknown zoneStatus type:', typeof payload.zoneStatus);
              }
              
              this.log('🚶 Motion state:', motionDetected ? '✅ DETECTED' : '⭕ Clear');
              await this.setCapabilityValue('alarm_motion', motionDetected).catch(this.error);
              
              // Auto-reset motion after timeout (configurable)
              if (motionDetected) {
                const timeout = this.getSetting('motion_timeout') || 60;
                this.log(`⏱️ Motion will auto-reset in ${timeout} seconds`);
                
                if (this.motionTimeout) clearTimeout(this.motionTimeout);
                this.motionTimeout = setTimeout(async () => {
                  await this.setCapabilityValue('alarm_motion', false).catch(this.error);
                  this.log('✅ Motion auto-reset');
                }, timeout * 1000);
              }
            } catch (parseErr) {
              this.error('❌ Motion notification parse error:', parseErr);
            }
          });
          
          // ADDITIONAL: Also listen for standard attribute reports as fallback
          endpoint.clusters.iasZone.on('attr.zoneStatus', async (value) => {
            this.log('🚶 Motion attribute report (fallback):', value);
            const motionDetected = typeof value === 'number' ? (value & 1) === 1 : false;
            if (motionDetected) {
              await this.setCapabilityValue('alarm_motion', true).catch(this.error);
              
              // Auto-reset
              const timeout = this.getSetting('motion_timeout') || 60;
              if (this.motionTimeout) clearTimeout(this.motionTimeout);
              this.motionTimeout = setTimeout(async () => {
                await this.setCapabilityValue('alarm_motion', false).catch(this.error);
              }, timeout * 1000);
            }
          });
          
          // Register capability for reading
          this.registerCapability('alarm_motion', CLUSTER.IAS_ZONE, {
            get: 'zoneStatus',
            report: 'zoneStatus',
            reportParser: value => {
              this.log('Motion IAS Zone status:', value);
              return (value & 1) === 1;
            }
          });
          
          this.log('✅ Motion IAS Zone registered with notification listener');
        } else {
          this.log('⚠️ IAS Zone cluster not found, trying Occupancy Sensing fallback...');
          
          // Fallback to Occupancy Sensing
          try {
            this.registerCapability('alarm_motion', CLUSTER.OCCUPANCY_SENSING, {
              get: 'occupancy',
              report: 'occupancy',
              reportParser: value => {
                this.log('Motion occupancy value:', value);
                const occupied = (value & 1) === 1;
                
                // Auto-reset after timeout
                if (occupied) {
                  const timeout = this.getSetting('motion_timeout') || 60;
                  if (this.motionTimeout) clearTimeout(this.motionTimeout);
                  this.motionTimeout = setTimeout(async () => {
                    await this.setCapabilityValue('alarm_motion', false);
                  }, timeout * 1000);
                }
                
                return occupied;
              }
            });
            this.log('✅ Motion registered (Occupancy Sensing fallback)');
          } catch (occErr) {
            this.error('❌ Motion fallback also failed:', occErr);
          }
        }
      } catch (err) {
        this.error('❌ IAS Zone motion setup failed:', err);
      }
    }
  }

  /**
   * Handle Tuya datapoint reports
   * Based on Zigbee2MQTT converter for ZG-204ZV
   * Enhanced logging for HOBEIAN troubleshooting
   */
  _handleTuyaData(data) {
    this.log('📦 Tuya data received (raw):', JSON.stringify(data));
    
    if (!data) {
      this.log('⚠️  No data received from Tuya cluster');
      return;
    }
    
    if (!data.dataPoints) {
      this.log('⚠️  No dataPoints in Tuya data, available keys:', Object.keys(data));
      return;
    }
    
    this.log('✅ DataPoints found:', Object.keys(data.dataPoints).join(', '));
    
    // Tuya datapoints for ZG-204ZV:
    // DP 1: motion (bool)
    // DP 2: battery (0-100)
    // DP 4: temperature (int, divide by 10)
    // DP 5: humidity (int)
    // DP 9: illuminance (int, lux)
    
    Object.entries(data.dataPoints).forEach(([dp, value]) => {
      const dpNum = parseInt(dp);
      this.log(`🔍 Processing DP ${dpNum}:`, value, `(type: ${typeof value})`);
      
      switch(dpNum) {
        case 1: // Motion
          if (this.hasCapability('alarm_motion')) {
            this.setCapabilityValue('alarm_motion', value === true || value === 1).catch(this.error);
            this.log('✅ Motion:', value);
          }
          break;
          
        case 2: // Battery
          if (this.hasCapability('measure_battery')) {
            const battery = Math.max(0, Math.min(100, parseInt(value)));
            this.setCapabilityValue('measure_battery', battery).catch(this.error);
            this.log('✅ Battery:', battery + '%');
          }
          break;
          
        case 4: // Temperature
          if (this.hasCapability('measure_temperature')) {
            const temp = parseInt(value) / 10;
            this.setCapabilityValue('measure_temperature', temp).catch(this.error);
            this.log('✅ Temperature:', temp + '°C');
          }
          break;
          
        case 5: // Humidity
          if (this.hasCapability('measure_humidity')) {
            const humidity = Math.max(0, Math.min(100, parseInt(value)));
            this.setCapabilityValue('measure_humidity', humidity).catch(this.error);
            this.log('✅ Humidity:', humidity + '%');
          }
          break;
          
        case 9: // Illuminance (lux)
          if (this.hasCapability('measure_luminance')) {
            const lux = parseInt(value);
            this.setCapabilityValue('measure_luminance', lux).catch(this.error);
            this.log('✅ Luminance:', lux + ' lux');
          }
          break;
          
        default:
          this.log(`⚠️  Unknown datapoint ${dp}:`, value);
      }
    });
  }

  async onDeleted() {
    this.log('motion_temp_humidity_illumination_sensor device deleted');
  }

}

module.exports = MotionTempHumidityIlluminationSensorDevice;
