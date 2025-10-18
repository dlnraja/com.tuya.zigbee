'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const IASZoneEnroller = require('../../lib/IASZoneEnroller');
const { CLUSTER } = require('zigbee-clusters');
const TuyaClusterHandler = require('../../utils/tuya-cluster-handler');
const { fromZclBatteryPercentageRemaining } = require('../../lib/tuya-engine/converters/battery');

class TemperatureSensorBatteryDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // IAS Zone enrollment (motion/contact sensors)
    if (this.hasCapability('alarm_motion') || this.hasCapability('alarm_contact') || 
        this.hasCapability('alarm_water') || this.hasCapability('alarm_smoke')) {
      this.iasZoneEnroller = new IASZoneEnroller(this, zclNode);
      await this.iasZoneEnroller.enroll().catch(err => {
        this.error('IAS Zone enrollment failed:', err);
      });
    }

    // Configure battery reporting (min 1h, max 24h, delta 5%)
    try {
    await this.configureAttributeReporting([{
    } catch (err) { this.error('Await error:', err); }
      endpointId: 1,
      cluster: 'powerConfiguration',
      attributeName: 'batteryPercentageRemaining',
      minInterval: 3600,
      maxInterval: 86400,
      minChange: 10 // 5% (0-200 scale)
    }]).catch(err => this.log('Battery report config failed (ignorable):', err.message));

    // Force initial read après pairing (résout données non visibles)
    setTimeout(() => {
      this.pollAttributes().catch(err => this.error('Initial poll failed:', err));
    }, 5000);

    // Poll attributes régulièrement pour assurer visibilité données
    this.registerPollInterval(async () => {
      try {
        // Force read de tous les attributes critiques
        await this.pollAttributes();
      } catch (err) {
        this.error('Poll failed:', err);
      }
    }, 300000); // 5 minutes
  
    this.log('temperature_sensor_battery initialized');

    // Call parent
    try {
    await super.onNodeInit({ zclNode });
    } catch (err) { this.error('Await error:', err); }

    // Auto-detect device type and initialize Tuya cluster handler
    const deviceType = TuyaClusterHandler.detectDeviceType('temperature_sensor_battery');
    const tuyaInitialized = await TuyaClusterHandler.init(this, zclNode, deviceType);
    
    if (tuyaInitialized) {
      this.log('✅ Tuya cluster handler initialized for type:', deviceType);
    } else {
      this.log('⚠️  No Tuya cluster found, using standard Zigbee');
      
      // Fallback to standard cluster handling if needed
      try {
      await this.registerStandardCapabilities();
      } catch (err) { this.error('Await error:', err); }
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
        try {
        await this.configureAttributeReporting(reportingConfigs);
        } catch (err) { this.error('Await error:', err); }
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
          try {
          await this.wait(2000 * attempt);
          } catch (err) { this.error('Await error:', err); }
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



  /**
   * Poll tous les attributes pour forcer mise à jour
   * Résout: Données non visibles après pairing (Peter + autres)
   */
  async pollAttributes() {
    const promises = [];
    
    // Battery
    if (this.hasCapability('measure_battery')) {
      promises.push(
        this.zclNode.endpoints[1]?.clusters.powerConfiguration?.readAttributes('batteryPercentageRemaining')
          .catch(err => this.log('Battery read failed (ignorable):', err.message))
      );
    }
    
    // Temperature
    if (this.hasCapability('measure_temperature')) {
      promises.push(
        this.zclNode.endpoints[1]?.clusters.temperatureMeasurement?.readAttributes('measuredValue')
          .catch(err => this.log('Temperature read failed (ignorable):', err.message))
      );
    }
    
    // Humidity
    if (this.hasCapability('measure_humidity')) {
      promises.push(
        this.zclNode.endpoints[1]?.clusters.relativeHumidity?.readAttributes('measuredValue')
          .catch(err => this.log('Humidity read failed (ignorable):', err.message))
      );
    }
    
    // Illuminance
    if (this.hasCapability('measure_luminance')) {
      promises.push(
        this.zclNode.endpoints[1]?.clusters.illuminanceMeasurement?.readAttributes('measuredValue')
          .catch(err => this.log('Illuminance read failed (ignorable):', err.message))
      );
    }
    
    // Alarm status (IAS Zone)
    if (this.hasCapability('alarm_motion') || this.hasCapability('alarm_contact')) {
      promises.push(
        this.zclNode.endpoints[1]?.clusters.iasZone?.readAttributes('zoneStatus')
          .catch(err => this.log('IAS Zone read failed (ignorable):', err.message))
      );
    }
    
    try {
    await Promise.allSettled(promises);
    } catch (err) { this.error('Await error:', err); }
    this.log('✅ Poll attributes completed');
  }

}

module.exports = TemperatureSensorBatteryDevice;
