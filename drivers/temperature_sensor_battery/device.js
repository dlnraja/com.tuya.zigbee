'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const TuyaClusterHandler = require('../../utils/tuya-cluster-handler');
const { fromZclBatteryPercentageRemaining } = require('../../lib/tuya-engine/converters/battery');

class TemperatureSensorBatteryDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('temperature_sensor_battery initialized');

    // Call parent
    await super.onNodeInit({ zclNode });

    // Auto-detect device type and initialize Tuya cluster handler
    const deviceType = TuyaClusterHandler.detectDeviceType('temperature_sensor_battery');
    const tuyaInitialized = await TuyaClusterHandler.init(this, zclNode, deviceType);
    
    if (tuyaInitialized) {
      this.log('✅ Tuya cluster handler initialized for type:', deviceType);
    } else {
      this.log('⚠️  No Tuya cluster found, using standard Zigbee');
      
      // Fallback to standard cluster handling if needed
      await this.registerStandardCapabilities();
    }

    // Force battery read with retry for all devices
    if (this.hasCapability('measure_battery')) {
      this.forceBatteryRead();
    }

    // Mark device as available
    await this.setAvailable();
  }

  /**
   * Register standard Zigbee capabilities
   * Fallback when Tuya cluster not available
   */
  async registerStandardCapabilities() {
    this.log('🔧 Registering standard capabilities...');
    
    // Temperature
    if (this.hasCapability('measure_temperature')) {
      this.registerCapability('measure_temperature', 'msTemperatureMeasurement', {
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => value / 100,
        getParser: value => value / 100
      });
      this.log('✅ Temperature capability registered');
    }

    // Humidity
    if (this.hasCapability('measure_humidity')) {
      this.registerCapability('measure_humidity', 'msRelativeHumidity', {
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => value / 100,
        getParser: value => value / 100
      });
      this.log('✅ Humidity capability registered');
    }

    // Battery - Using standard converter
    if (this.hasCapability('measure_battery')) {
      this.registerCapability('measure_battery', 1, {
        get: 'batteryPercentageRemaining',
        report: 'batteryPercentageRemaining',
        reportParser: value => {
          this.log('Battery raw value:', value);
          return fromZclBatteryPercentageRemaining(value);
        },
        getParser: value => fromZclBatteryPercentageRemaining(value)
      });
      this.log('✅ Battery capability registered with converter');
    }

    // Configure attribute reporting with improved intervals
    try {
      const reportingConfigs = [];
      
      if (this.hasCapability('measure_temperature')) {
        reportingConfigs.push({
          endpointId: 1,
          cluster: 'msTemperatureMeasurement',
          attributeName: 'measuredValue',
          minInterval: 60,
          maxInterval: 3600,
          minChange: 50
        });
      }
      
      if (this.hasCapability('measure_humidity')) {
        reportingConfigs.push({
          endpointId: 1,
          cluster: 'msRelativeHumidity',
          attributeName: 'measuredValue',
          minInterval: 60,
          maxInterval: 3600,
          minChange: 100
        });
      }
      
      if (this.hasCapability('measure_battery')) {
        reportingConfigs.push({
          endpointId: 1,
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 300,
          maxInterval: 3600,
          minChange: 2
        });
      }
      
      if (reportingConfigs.length > 0) {
        await this.configureAttributeReporting(reportingConfigs);
        this.log('✅ Attribute reporting configured');
      }
    } catch (error) {
      this.error('Failed to configure reporting:', error);
    }
  }

  /**
   * Force battery read with retry logic
   * Diagnostic Fix: Many users report battery not updating
   */
  async forceBatteryRead(retries = 3) {
    if (!this.hasCapability('measure_battery')) return;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        this.log(`🔋 Attempting battery read (attempt ${attempt}/${retries})...`);
        
        const batteryValue = await this.zclNode.endpoints[1].clusters.genPowerCfg.readAttributes('batteryPercentageRemaining');
        
        if (batteryValue && batteryValue.batteryPercentageRemaining !== undefined) {
          const rawValue = batteryValue.batteryPercentageRemaining;
          const percentage = fromZclBatteryPercentageRemaining(rawValue);
          
          await this.setCapabilityValue('measure_battery', percentage);
          this.log(`✅ Battery read successful: ${percentage}% (raw: ${rawValue})`);
          return;
        }
      } catch (error) {
        this.log(`⚠️  Battery read attempt ${attempt} failed:`, error.message);
        if (attempt < retries) {
          await this.wait(2000 * attempt);
        }
      }
    }
    
    this.log('❌ All battery read attempts failed - will retry on next report');
  }

  /**
   * Wait utility
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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


}

module.exports = TemperatureSensorBatteryDevice;
