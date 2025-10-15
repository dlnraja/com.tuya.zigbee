'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const IASZoneEnroller = require('../../lib/IASZoneEnroller');

/**
 * HOBEIAN Multisensor (Motion + Temperature + Humidity + Illumination)
 * v2.15.98 - Multi-method IAS Zone enrollment with automatic fallback
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
    
    // Motion via IAS Zone - v2.15.98 Multi-method with automatic fallback
    if (this.hasCapability('alarm_motion')) {
      try {
        const endpoint = zclNode.endpoints[this.getClusterEndpoint(CLUSTER.IAS_ZONE)];
        if (endpoint && endpoint.clusters.iasZone) {
          this.log('🚶 Setting up Motion IAS Zone with multi-method enrollment...');
          
          // Create IAS Zone enroller with automatic fallback
          this.iasZoneEnroller = new IASZoneEnroller(this, endpoint, {
            zoneType: 13, // Motion sensor
            capability: 'alarm_motion',
            flowCard: 'motion_detected',
            flowTokens: {},
            autoResetTimeout: (this.getSetting('motion_timeout') || 60) * 1000,
            pollInterval: 30000, // 30s polling if needed
            enablePolling: true
          });
          
          // Try all enrollment methods automatically
          const enrollMethod = await this.iasZoneEnroller.enroll(zclNode);
          
          if (enrollMethod) {
            this.log(`✅ Motion IAS Zone enrolled successfully via: ${enrollMethod}`);
            this.log('📊 Enrollment status:', this.iasZoneEnroller.getStatus());
            
            // Register capability for reading
            this.registerCapability('alarm_motion', CLUSTER.IAS_ZONE, {
              get: 'zoneStatus',
              report: 'zoneStatus',
              reportParser: value => {
                this.log('Motion IAS Zone status:', value);
                return (value & 1) === 1;
              }
            });
            
            this.log('✅ Motion IAS Zone fully configured with automatic fallback');
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

  /**
   * Flow condition: is_motion_detected
   */
  async isMotionDetected() {
    return this.getCapabilityValue('alarm_motion') || false;
  }

  /**
   * Flow condition: temperature_above
   */
  async isTemperatureAbove(args) {
    const currentTemp = this.getCapabilityValue('measure_temperature') || 0;
    return currentTemp > args.threshold;
  }

  /**
   * Flow condition: humidity_above
   */
  async isHumidityAbove(args) {
    const currentHumidity = this.getCapabilityValue('measure_humidity') || 0;
    return currentHumidity > args.threshold;
  }

  /**
   * Flow condition: luminance_above
   */
  async isLuminanceAbove(args) {
    const currentLuminance = this.getCapabilityValue('measure_luminance') || 0;
    return currentLuminance > args.threshold;
  }

  /**
   * Flow action: reset_motion_alarm
   */
  async resetMotionAlarm() {
    this.log('🔄 Manually resetting motion alarm via flow action');
    
    if (this.motionTimeout) {
      clearTimeout(this.motionTimeout);
      this.motionTimeout = null;
    }
    
    await this.setCapabilityValue('alarm_motion', false);
    
    // Trigger motion_cleared flow
    try {
      await this.homey.flow.getDeviceTriggerCard('motion_cleared').trigger(this);
      this.log('✅ Motion cleared flow triggered from manual reset');
    } catch (err) {
      this.error('⚠️ Motion cleared flow error:', err);
    }
    
    return true;
  }

  /**
   * Flow action: set_motion_timeout
   */
  async setMotionTimeout(args) {
    const newTimeout = args.timeout;
    this.log(`⏱️ Setting motion timeout to ${newTimeout} seconds via flow action`);
    
    await this.setSettings({ motion_timeout: newTimeout });
    this.log('✅ Motion timeout updated successfully');
    
    return true;
  }

  async onDeleted() {
    this.log('motion_temp_humidity_illumination_sensor device deleted');
    
    if (this.motionTimeout) {
      clearTimeout(this.motionTimeout);
    }
    
    // Cleanup IAS Zone enroller
    if (this.iasZoneEnroller) {
      this.iasZoneEnroller.destroy();
      this.iasZoneEnroller = null;
    }
  }
  // ========================================
  // FLOW METHODS - Auto-generated
  // ========================================

  /**
   * Trigger flow with context data
   */
  async triggerFlowCard(cardId, tokens = {}) {
    try {
      const flowCard = this.homey.flow.getDeviceTriggerCard(cardId);
      await flowCard.trigger(this, tokens);
      this.log(`✅ Flow triggered: ${cardId}`, tokens);
    } catch (err) {
      this.error(`❌ Flow trigger error: ${cardId}`, err);
    }
  }

  /**
   * Check if any alarm is active
   */
  async checkAnyAlarm() {
    const capabilities = this.getCapabilities();
    for (const cap of capabilities) {
      if (cap.startsWith('alarm_')) {
        const value = this.getCapabilityValue(cap);
        if (value === true) return true;
      }
    }
    return false;
  }

  /**
   * Get current context data
   */
  getContextData() {
    const context = {
      time_of_day: this.getTimeOfDay(),
      timestamp: new Date().toISOString()
    };
    
    // Add available sensor values
    const caps = this.getCapabilities();
    if (caps.includes('measure_luminance')) {
      context.luminance = this.getCapabilityValue('measure_luminance') || 0;
    }
    if (caps.includes('measure_temperature')) {
      context.temperature = this.getCapabilityValue('measure_temperature') || 0;
    }
    if (caps.includes('measure_humidity')) {
      context.humidity = this.getCapabilityValue('measure_humidity') || 0;
    }
    if (caps.includes('measure_battery')) {
      context.battery = this.getCapabilityValue('measure_battery') || 0;
    }
    
    return context;
  }

  /**
   * Get time of day
   */
  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
  }




  /**
   * INTELLIGENT BATTERY MONITORING
   * Auto-generated by IntelligentBatteryManager
   */
  
  async monitorBattery() {
    try {
      const batteryLevel = this.getCapabilityValue('measure_battery');
      
      if (batteryLevel !== null && batteryLevel !== undefined) {
        // Battery level categorization
        if (batteryLevel <= 10) {
          this.setWarning('⚠️ CRITICAL: Battery ' + batteryLevel + '% - Replace immediately!');
          this.log('Battery CRITICAL:', batteryLevel + '%');
        } else if (batteryLevel <= 20) {
          this.setWarning('Battery low: ' + batteryLevel + '% - Replace soon');
          this.log('Battery LOW:', batteryLevel + '%');
        } else if (batteryLevel <= 30) {
          this.log('Battery WARNING level:', batteryLevel + '%');
        } else {
          this.unsetWarning();
        }
        
        // Battery type info
        const supportedBatteries = ["CR2032","AAA","AA"];
        this.log('Supported batteries:', supportedBatteries.join(', '));
        
        // Estimate remaining time
        if (batteryLevel <= 20) {
          const estimatedDays = Math.floor((batteryLevel / 20) * 30);
          this.log('Estimated remaining: ~' + estimatedDays + ' days');
        }
      }
    } catch (err) {
      this.error('Battery monitoring error:', err);
    }
  }
  
  /**
   * Battery change detection
   */
  async detectBatteryChange(oldValue, newValue) {
    try {
      // Detect battery replacement (jump from low to high)
      if (oldValue < 30 && newValue > 80) {
        this.log('🔋 Battery replaced detected!');
        if (this.homey && this.homey.flow) {
          this.homey.flow.getDeviceTriggerCard('device_battery_changed')
            .trigger(this, { old_battery: oldValue, new_battery: newValue })
            .catch(err => this.error('Flow trigger error:', err));
        }
        
        // Reset warnings
        this.unsetWarning();
      }
    } catch (err) {
      this.error('Battery change detection error:', err);
    }
  }

}

module.exports = MotionTempHumidityIlluminationSensorDevice;
