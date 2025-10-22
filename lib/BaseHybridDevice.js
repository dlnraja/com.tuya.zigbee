'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * BaseHybridDevice - Universal base class for hybrid power devices
 * Supports AC, DC, and Battery power sources with auto-detection
 * SDK3 Compliant - NO alarm_battery, uses measure_battery only
 */
class BaseHybridDevice extends ZigBeeDevice {

  /**
   * Initialize hybrid device with power detection
   */
  async onNodeInit() {
    this.log('BaseHybridDevice initializing...');
    
    // Initialize power detection state
    this.powerType = 'UNKNOWN';
    this.batteryType = null;
    
    // Step 1: Detect power source
    await this.detectPowerSource();
    
    // Step 2: Configure capabilities based on detected power
    await this.configurePowerCapabilities();
    
    // Step 3: Setup monitoring and reporting
    await this.setupMonitoring();
    
    // Step 4: Mark as available
    await this.setAvailable().catch(err => this.error('setAvailable failed:', err));
    
    this.log(`BaseHybridDevice initialized - Power: ${this.powerType}`);
  }

  /**
   * Detect power source from device
   * Reads powerSource attribute from Basic cluster
   * SDK3 Method: Uses numeric cluster IDs
   */
  async detectPowerSource() {
    this.log('🔍 Detecting power source...');
    
    try {
      // Try to read powerSource attribute (Basic cluster 0x0000, attribute 0x0007)
      const basicCluster = this.zclNode.endpoints[1]?.clusters?.basic;
      
      if (basicCluster) {
        const attributes = await basicCluster.readAttributes(['powerSource']).catch(() => null);
        
        if (attributes?.powerSource !== undefined) {
          const powerSource = attributes.powerSource;
          this.log('📡 PowerSource attribute:', powerSource);
          
          // Zigbee PowerSource values:
          // 0x00 = Unknown
          // 0x01 = Mains (single phase)
          // 0x02 = Mains (3 phase)
          // 0x03 = Battery
          // 0x04 = DC Source
          // 0x05 = Emergency Mains Constantly Powered
          // 0x06 = Emergency Mains and Transfer Switch
          
          switch (powerSource) {
            case 0x01:
            case 0x02:
            case 0x05:
            case 0x06:
              this.powerType = 'AC';
              this.log('✅ Detected: AC Mains Power');
              break;
              
            case 0x03:
              this.powerType = 'BATTERY';
              this.log('✅ Detected: Battery Power');
              await this.detectBatteryType();
              break;
              
            case 0x04:
              this.powerType = 'DC';
              this.log('✅ Detected: DC Power');
              break;
              
            default:
              this.log('⚠️  Unknown power source, using fallback detection');
              await this.fallbackPowerDetection();
          }
          
          // Store power type for future reference
          await this.setStoreValue('power_type', this.powerType);
          await this.setStoreValue('battery_type', this.batteryType);
          
        } else {
          this.log('⚠️  PowerSource attribute not available, using fallback');
          await this.fallbackPowerDetection();
        }
      } else {
        this.log('⚠️  Basic cluster not available, using fallback');
        await this.fallbackPowerDetection();
      }
      
    } catch (err) {
      this.error('Power detection failed:', err.message);
      await this.fallbackPowerDetection();
    }
  }

  /**
   * Fallback power detection using driver configuration
   * Checks energy.batteries array and capabilities
   */
  async fallbackPowerDetection() {
    this.log('🔄 Using fallback power detection...');
    
    // Check if driver has battery configuration
    const driverManifest = this.driver.manifest;
    
    if (driverManifest.energy?.batteries) {
      this.powerType = 'BATTERY';
      const batteries = driverManifest.energy.batteries;
      this.batteryType = batteries[0]; // Use first battery type as default
      this.log(`✅ Fallback: Battery (${this.batteryType})`);
      
    } else if (driverManifest.capabilities?.includes('measure_power')) {
      this.powerType = 'AC';
      this.log('✅ Fallback: AC Mains');
      
    } else if (driverManifest.capabilities?.includes('measure_voltage')) {
      this.powerType = 'DC';
      this.log('✅ Fallback: DC Power');
      
    } else {
      // Default to battery for safety (won't try to read AC attributes)
      this.powerType = 'BATTERY';
      this.batteryType = 'CR2032';
      this.log('⚠️  Fallback: Assuming Battery (CR2032)');
    }
  }

  /**
   * Detect battery type from voltage
   * Different batteries have different voltage ranges
   */
  async detectBatteryType() {
    this.log('🔋 Detecting battery type from voltage...');
    
    try {
      const powerCluster = this.zclNode.endpoints[1]?.clusters?.powerConfiguration;
      
      if (powerCluster) {
        const batteryVoltage = await powerCluster.readAttributes(['batteryVoltage'])
          .catch(() => ({ batteryVoltage: null }));
        
        if (batteryVoltage?.batteryVoltage) {
          const voltage = batteryVoltage.batteryVoltage / 10; // Convert to V
          this.log('📊 Battery voltage:', voltage, 'V');
          
          // Voltage ranges for common battery types:
          // CR2032: 2.0-3.0V (3V nominal)
          // CR2450: 2.0-3.0V (3V nominal, same as CR2032)
          // CR123A: 2.0-3.0V (3V nominal)
          // AAA: 2.4-3.0V (3x 1.5V = 4.5V for 3xAAA or 1.5V for 1xAAA)
          // AA: Similar to AAA
          
          if (voltage >= 2.5 && voltage <= 3.3) {
            this.batteryType = 'CR2032'; // Most common
            this.log('✅ Detected: CR2032/CR2450 battery');
          } else if (voltage >= 4.0 && voltage <= 5.0) {
            this.batteryType = 'AAA'; // 3x batteries
            this.log('✅ Detected: AAA batteries (3x)');
          } else if (voltage >= 1.0 && voltage <= 1.8) {
            this.batteryType = 'AAA'; // Single battery
            this.log('✅ Detected: AAA battery (1x)');
          } else {
            this.batteryType = 'CR2032'; // Default
            this.log('⚠️  Unknown voltage, defaulting to CR2032');
          }
        } else {
          // Use driver config
          const batteries = this.driver.manifest.energy?.batteries || ['CR2032'];
          this.batteryType = batteries[0];
          this.log(`⚠️  Voltage not available, using config: ${this.batteryType}`);
        }
      }
    } catch (err) {
      this.error('Battery type detection failed:', err.message);
      this.batteryType = 'CR2032'; // Safe default
    }
  }

  /**
   * Configure capabilities based on detected power type
   * Dynamically add/remove capabilities
   * SDK3 Compliant: NO alarm_battery
   */
  async configurePowerCapabilities() {
    this.log('⚙️  Configuring power-specific capabilities...');
    
    try {
      if (this.powerType === 'AC') {
        // AC Mains: Add power monitoring if not present
        if (!this.hasCapability('measure_power')) {
          await this.addCapability('measure_power').catch(() => {});
          this.log('✅ Added measure_power capability');
        }
        if (!this.hasCapability('meter_power')) {
          await this.addCapability('meter_power').catch(() => {});
          this.log('✅ Added meter_power capability');
        }
        
        // Remove battery if present (shouldn't be for AC)
        if (this.hasCapability('measure_battery')) {
          await this.removeCapability('measure_battery').catch(() => {});
          this.log('🗑️  Removed measure_battery (AC device)');
        }
        
      } else if (this.powerType === 'BATTERY') {
        // Battery: Ensure measure_battery is present
        if (!this.hasCapability('measure_battery')) {
          await this.addCapability('measure_battery').catch(() => {});
          this.log('✅ Added measure_battery capability');
        }
        
        // Remove AC capabilities if present
        if (this.hasCapability('measure_power')) {
          await this.removeCapability('measure_power').catch(() => {});
          this.log('🗑️  Removed measure_power (battery device)');
        }
        if (this.hasCapability('meter_power')) {
          await this.removeCapability('meter_power').catch(() => {});
          this.log('🗑️  Removed meter_power (battery device)');
        }
        
      } else if (this.powerType === 'DC') {
        // DC: Add voltage monitoring
        if (!this.hasCapability('measure_voltage')) {
          await this.addCapability('measure_voltage').catch(() => {});
          this.log('✅ Added measure_voltage capability');
        }
      }
      
      this.log('✅ Power capabilities configured');
      
    } catch (err) {
      this.error('Capability configuration failed:', err.message);
    }
  }

  /**
   * Setup monitoring based on power type
   * SDK3 Compliant battery monitoring
   */
  async setupMonitoring() {
    this.log('📊 Setting up power monitoring...');
    
    if (this.powerType === 'BATTERY') {
      await this.setupBatteryMonitoring();
    } else if (this.powerType === 'AC') {
      await this.setupACMonitoring();
    } else if (this.powerType === 'DC') {
      await this.setupDCMonitoring();
    }
  }

  /**
   * Setup battery monitoring
   * SDK3 Compliant: Uses measure_battery only, NO alarm_battery
   */
  async setupBatteryMonitoring() {
    this.log('🔋 Setting up battery monitoring...');
    
    try {
      // Configure battery reporting
      await this.configureAttributeReporting([{
        endpointId: 1,
        cluster: 1, // powerConfiguration
        attributeName: 'batteryPercentageRemaining',
        minInterval: 3600, // 1 hour
        maxInterval: 43200, // 12 hours
        minChange: 5 // 5% change
      }]).catch(err => {
        this.log('Battery reporting config failed (non-critical):', err.message);
      });
      
      // Register battery capability with parser
      this.registerCapability('measure_battery', 1, { // Cluster 1 = powerConfiguration
        endpoint: 1,
        get: 'batteryPercentageRemaining',
        report: 'batteryPercentageRemaining',
        reportParser: (value) => {
          if (value === null || value === undefined) return null;
          // Zigbee reports 0-200, convert to 0-100%
          const percentage = Math.round(value / 2);
          return Math.max(0, Math.min(100, percentage));
        },
        getParser: (value) => {
          if (value === null || value === undefined) return null;
          const percentage = Math.round(value / 2);
          return Math.max(0, Math.min(100, percentage));
        }
      });
      
      // Setup low battery notifications
      this.registerCapabilityListener('measure_battery', async (value) => {
        const threshold = this.getSetting('battery_low_threshold') || 20;
        
        if (value <= threshold && value > 0) {
          this.log(`⚠️  Low battery: ${value}%`);
          
          if (this.getSetting('battery_notification') !== false) {
            await this.homey.notifications.createNotification({
              excerpt: `${this.getName()} battery low (${value}%)`
            }).catch(() => {});
          }
        }
        
        if (value <= 10 && value > 0) {
          this.log(`🔴 Critical battery: ${value}%`);
          await this.homey.notifications.createNotification({
            excerpt: `${this.getName()} battery critical (${value}%) - replace soon!`
          }).catch(() => {});
        }
      });
      
      this.log('✅ Battery monitoring configured');
      
    } catch (err) {
      this.error('Battery monitoring setup failed:', err.message);
    }
  }

  /**
   * Setup AC power monitoring
   */
  async setupACMonitoring() {
    this.log('⚡ Setting up AC monitoring...');
    
    try {
      // Register power measurement if available
      if (this.hasCapability('measure_power')) {
        this.registerCapability('measure_power', 2820, { // electricalMeasurement
          endpoint: 1,
          get: 'activePower',
          report: 'activePower',
          reportParser: value => value / 10 // Convert to W
        });
      }
      
      // Register meter if available
      if (this.hasCapability('meter_power')) {
        this.registerCapability('meter_power', 1794, { // metering
          endpoint: 1,
          get: 'currentSummationDelivered',
          report: 'currentSummationDelivered',
          reportParser: value => value / 1000 // Convert to kWh
        });
      }
      
      this.log('✅ AC monitoring configured');
      
    } catch (err) {
      this.log('AC monitoring setup failed (non-critical):', err.message);
    }
  }

  /**
   * Setup DC power monitoring
   */
  async setupDCMonitoring() {
    this.log('🔌 Setting up DC monitoring...');
    
    try {
      if (this.hasCapability('measure_voltage')) {
        this.registerCapability('measure_voltage', 2820, { // electricalMeasurement
          endpoint: 1,
          get: 'rmsVoltage',
          report: 'rmsVoltage',
          reportParser: value => value / 10 // Convert to V
        });
      }
      
      this.log('✅ DC monitoring configured');
      
    } catch (err) {
      this.log('DC monitoring setup failed (non-critical):', err.message);
    }
  }

  /**
   * Get power type for use in child classes
   */
  getPowerType() {
    return this.powerType;
  }

  /**
   * Get battery type for use in child classes
   */
  getBatteryType() {
    return this.batteryType;
  }

  /**
   * Check if device is battery powered
   */
  isBatteryPowered() {
    return this.powerType === 'BATTERY';
  }

  /**
   * Check if device is AC powered
   */
  isACPowered() {
    return this.powerType === 'AC';
  }

  /**
   * Check if device is DC powered
   */
  isDCPowered() {
    return this.powerType === 'DC';
  }
}

module.exports = BaseHybridDevice;
