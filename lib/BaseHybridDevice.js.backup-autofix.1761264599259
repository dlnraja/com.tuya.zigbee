'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const BatteryManager = require('./BatteryManager');
const PowerManager = require('./PowerManager');

/**
 * BaseHybridDevice - Universal base class for hybrid power devices
 * Supports AC, DC, and Battery power sources with auto-detection
 * SDK3 Compliant - NO alarm_battery, uses measure_battery only
 * Enhanced with intelligent battery management and accurate calculations
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
   * Enhanced: Checks manual override settings first
   */
  async detectPowerSource() {
    this.log('🔍 Detecting power source...');
    
    // Check for manual override in settings
    const manualPowerSource = this.getSetting('power_source');
    if (manualPowerSource && manualPowerSource !== 'auto') {
      this.log(`🎯 Manual power source override: ${manualPowerSource}`);
      this.powerType = manualPowerSource.toUpperCase();
      
      if (this.powerType === 'BATTERY') {
        await this.detectBatteryType();
      }
      
      await this.setStoreValue('power_type', this.powerType);
      await this.setStoreValue('battery_type', this.batteryType);
      return;
    }
    
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
   * Enhanced: Checks manual override first
   */
  async detectBatteryType() {
    this.log('🔋 Detecting battery type from voltage...');
    
    // Check for manual override in settings
    const manualBatteryType = this.getSetting('battery_type');
    if (manualBatteryType && manualBatteryType !== 'auto') {
      this.log(`🎯 Manual battery type override: ${manualBatteryType}`);
      this.batteryType = manualBatteryType;
      return;
    }
    
    try {
      const powerCluster = this.zclNode.endpoints[1]?.clusters?.powerConfiguration;
      
      if (powerCluster) {
        const batteryVoltage = await powerCluster.readAttributes(['batteryVoltage'])
          .catch(() => ({ batteryVoltage: null }));
        
        if (batteryVoltage?.batteryVoltage) {
          const voltage = batteryVoltage.batteryVoltage / 10; // Convert to V
          this.log('📊 Battery voltage:', voltage, 'V');
          
          // Store voltage for display and health monitoring
          await this.setStoreValue('battery_voltage', voltage);
          
          // Use intelligent battery type detection
          this.batteryType = BatteryManager.detectBatteryTypeFromVoltage(voltage);
          this.log(`✅ Intelligent detection: ${this.batteryType} (voltage: ${voltage}V)`);
          
          // Get battery health assessment
          const rawPercentage = await this.getCapabilityValue('measure_battery').catch(() => null);
          if (rawPercentage !== null) {
            const health = BatteryManager.getBatteryHealth(rawPercentage, voltage, this.batteryType);
            this.log(`🏥 Battery health: ${health.status} - ${health.recommendation}`);
            await this.setStoreValue('battery_health', health);
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
    this.log('⚙️  Configuring power-specific capabilities with intelligent detection...');
    
    try {
      if (this.powerType === 'AC' || this.powerType === 'DC') {
        // Detect available power measurement capabilities
        const available = await PowerManager.detectPowerCapabilities(this.zclNode);
        this.log(`📊 Power capabilities detected:`, available);
        
        // Store for later use
        await this.setStoreValue('power_capabilities', available);
        
        // Get recommended capabilities
        const recommended = PowerManager.getRecommendedCapabilities(available, this.powerType);
        this.log(`✅ Recommended capabilities:`, recommended);
        
        // Add available capabilities
        for (const capability of recommended) {
          if (!this.hasCapability(capability)) {
            await this.addCapability(capability).catch(err => {
              this.log(`Failed to add ${capability}:`, err.message);
            });
            this.log(`✅ Added ${capability}`);
          }
        }
        
        // Remove capabilities that should be hidden (no data and can't estimate)
        const canEstimate = this.getSetting('enable_power_estimation') !== false;
        
        // Check each power capability
        for (const capability of ['measure_voltage', 'measure_current', 'measure_power', 'meter_power']) {
          if (this.hasCapability(capability)) {
            const shouldHide = PowerManager.shouldHideCapability(capability, available, canEstimate);
            
            if (shouldHide) {
              await this.removeCapability(capability).catch(() => {});
              this.log(`🔒 Hidden ${capability} (no data available)`);
            }
          }
        }
        
        // Remove battery if present (shouldn't be for AC/DC)
        if (this.hasCapability('measure_battery')) {
          await this.removeCapability('measure_battery').catch(() => {});
          this.log('🗑️  Removed measure_battery (AC/DC device)');
        }
        
      } else if (this.powerType === 'BATTERY') {
        // Battery: Ensure measure_battery is present
        if (!this.hasCapability('measure_battery')) {
          await this.addCapability('measure_battery').catch(() => {});
          this.log('✅ Added measure_battery capability');
        }
        
        // Remove AC/DC capabilities if present
        for (const capability of ['measure_power', 'meter_power', 'measure_voltage', 'measure_current']) {
          if (this.hasCapability(capability)) {
            await this.removeCapability(capability).catch(() => {});
            this.log(`🗑️  Removed ${capability} (battery device)`);
          }
        }
      }
      
      this.log('✅ Power capabilities configured intelligently');
      
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
      
      // Register battery capability with intelligent parser
      this.registerCapability('measure_battery', 1, { // Cluster 1 = powerConfiguration
        endpoint: 1,
        get: 'batteryPercentageRemaining',
        report: 'batteryPercentageRemaining',
        reportParser: (value) => {
          if (value === null || value === undefined) return null;
          
          // Get current voltage for validation
          const voltage = this.getStoreValue('battery_voltage') || null;
          const batteryType = this.batteryType || 'CR2032';
          
          // Use intelligent validation and correction
          let percentage = BatteryManager.validateAndCorrectPercentage(
            value,
            voltage,
            batteryType
          );
          
          // Smooth percentage to avoid jumps
          const oldPercentage = this.getCapabilityValue('measure_battery');
          if (oldPercentage !== null) {
            percentage = BatteryManager.smoothPercentage(percentage, oldPercentage, 5);
          }
          
          this.log(`🔋 Battery: ${percentage}% (raw: ${value}, voltage: ${voltage}V, type: ${batteryType})`);
          
          // Update health assessment (non-blocking)
          if (voltage) {
            const health = BatteryManager.getBatteryHealth(percentage, voltage, batteryType);
            this.setStoreValue('battery_health', health).catch(err => 
              this.error('Failed to store battery health:', err)
            );
            
            if (health.status === 'critical') {
              this.log(`🚨 Battery health CRITICAL: ${health.recommendation}`);
            }
          }
          
          // Monitor thresholds for flow cards (non-blocking)
          this.monitorBatteryThresholds(percentage).catch(err => 
            this.error('Battery threshold monitoring failed:', err)
          );
          
          return percentage;
        },
        getParser: (value) => {
          if (value === null || value === undefined) return null;
          
          const voltage = this.getStoreValue('battery_voltage') || null;
          const batteryType = this.batteryType || 'CR2032';
          
          // Use intelligent validation
          return BatteryManager.validateAndCorrectPercentage(value, voltage, batteryType);
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
   * Setup AC power monitoring with intelligent measurement and estimation
   */
  async setupACMonitoring() {
    this.log('⚡ Setting up AC monitoring with intelligent power management...');
    
    try {
      const available = this.getStoreValue('power_capabilities') || {};
      
      // Register voltage if available
      if (this.hasCapability('measure_voltage')) {
        this.registerCapability('measure_voltage', 2820, {
          endpoint: 1,
          get: 'rmsVoltage',
          report: 'rmsVoltage',
          reportParser: (value) => {
            if (value === null || value === undefined) return null;
            const voltage = value / 10; // Convert to V
            this.log(`📊 Voltage: ${voltage}V`);
            this.setStoreValue('last_voltage', voltage).catch(() => {});
            return Math.round(voltage * 10) / 10;
          }
        });
      }
      
      // Register current if available
      if (this.hasCapability('measure_current')) {
        this.registerCapability('measure_current', 2820, {
          endpoint: 1,
          get: 'rmsCurrent',
          report: 'rmsCurrent',
          reportParser: (value) => {
            if (value === null || value === undefined) return null;
            const current = value / 1000; // Convert to A
            this.log(`📊 Current: ${current}A`);
            this.setStoreValue('last_current', current).catch(() => {});
            
            // Try to calculate power if we have voltage
            const voltage = this.getStoreValue('last_voltage');
            if (voltage && !available.power) {
              const calculatedPower = PowerManager.calculatePower(voltage, current);
              if (calculatedPower && this.hasCapability('measure_power')) {
                this.setCapabilityValue('measure_power', calculatedPower).catch(() => {});
                this.log(`🔢 Calculated power: ${calculatedPower}W (from V×I)`);
              }
            }
            
            return Math.round(current * 1000) / 1000;
          }
        });
      }
      
      // Register power measurement if available
      if (this.hasCapability('measure_power')) {
        this.registerCapability('measure_power', 2820, {
          endpoint: 1,
          get: 'activePower',
          report: 'activePower',
          reportParser: (value) => {
            if (value === null || value === undefined) {
              // No measurement available - try estimation
              const canEstimate = this.getSetting('enable_power_estimation') !== false;
              if (canEstimate) {
                const estimated = this.estimatePowerConsumption();
                if (estimated !== null) {
                  this.log(`🔮 Estimated power: ${estimated}W`);
                  return estimated;
                }
              }
              return null;
            }
            
            const rawPower = value / 10; // Convert to W
            
            // Validate with voltage and current if available
            const voltage = this.getStoreValue('last_voltage');
            const current = this.getStoreValue('last_current');
            
            const validated = PowerManager.validatePowerReadings({
              voltage,
              current,
              power: rawPower
            });
            
            this.log(`📊 Power: ${validated.power}W ${validated.power !== rawPower ? '(corrected)' : ''}`);
            
            return validated.power;
          }
        });
      }
      
      // Register meter if available
      if (this.hasCapability('meter_power')) {
        this.registerCapability('meter_power', 1794, {
          endpoint: 1,
          get: 'currentSummationDelivered',
          report: 'currentSummationDelivered',
          reportParser: (value) => {
            if (value === null || value === undefined) return null;
            const energy = value / 1000; // Convert to kWh
            this.log(`📊 Energy: ${energy}kWh`);
            return Math.round(energy * 100) / 100;
          }
        });
      }
      
      this.log('✅ AC monitoring configured with intelligent power management');
      
    } catch (err) {
      this.log('AC monitoring setup failed (non-critical):', err.message);
    }
  }

  /**
   * Setup DC power monitoring with intelligent measurement
   */
  async setupDCMonitoring() {
    this.log('🔌 Setting up DC monitoring with intelligent power management...');
    
    try {
      const available = this.getStoreValue('power_capabilities') || {};
      
      // Register voltage if available
      if (this.hasCapability('measure_voltage')) {
        this.registerCapability('measure_voltage', 2820, {
          endpoint: 1,
          get: 'rmsVoltage',
          report: 'rmsVoltage',
          reportParser: (value) => {
            if (value === null || value === undefined) return null;
            const voltage = value / 10; // Convert to V
            this.log(`📊 DC Voltage: ${voltage}V`);
            
            // Detect power type from voltage
            const detectedType = PowerManager.detectPowerType(voltage);
            if (detectedType !== this.powerType && detectedType !== 'UNKNOWN') {
              this.log(`⚠️  Power type mismatch: expected ${this.powerType}, detected ${detectedType}`);
            }
            
            this.setStoreValue('last_voltage', voltage).catch(() => {});
            return Math.round(voltage * 10) / 10;
          }
        });
      }
      
      // Register current if available
      if (this.hasCapability('measure_current')) {
        this.registerCapability('measure_current', 2820, {
          endpoint: 1,
          get: 'rmsCurrent',
          report: 'rmsCurrent',
          reportParser: (value) => {
            if (value === null || value === undefined) return null;
            const current = value / 1000; // Convert to A
            this.log(`📊 DC Current: ${current}A`);
            this.setStoreValue('last_current', current).catch(() => {});
            
            // Try to calculate power if we have voltage
            const voltage = this.getStoreValue('last_voltage');
            if (voltage && !available.power) {
              const calculatedPower = PowerManager.calculatePower(voltage, current);
              if (calculatedPower && this.hasCapability('measure_power')) {
                this.setCapabilityValue('measure_power', calculatedPower).catch(() => {});
                this.log(`🔢 Calculated DC power: ${calculatedPower}W (from V×I)`);
              }
            }
            
            return Math.round(current * 1000) / 1000;
          }
        });
      }
      
      // Register power if available
      if (this.hasCapability('measure_power')) {
        this.registerCapability('measure_power', 2820, {
          endpoint: 1,
          get: 'activePower',
          report: 'activePower',
          reportParser: (value) => {
            if (value === null || value === undefined) {
              // No measurement - try estimation
              const canEstimate = this.getSetting('enable_power_estimation') !== false;
              if (canEstimate) {
                const estimated = this.estimatePowerConsumption();
                if (estimated !== null) {
                  this.log(`🔮 Estimated DC power: ${estimated}W`);
                  return estimated;
                }
              }
              return null;
            }
            
            const rawPower = value / 10;
            const voltage = this.getStoreValue('last_voltage');
            const current = this.getStoreValue('last_current');
            
            const validated = PowerManager.validatePowerReadings({
              voltage,
              current,
              power: rawPower
            });
            
            this.log(`📊 DC Power: ${validated.power}W ${validated.power !== rawPower ? '(corrected)' : ''}`);
            
            return validated.power;
          }
        });
      }
      
      this.log('✅ DC monitoring configured with intelligent power management');
      
    } catch (err) {
      this.log('DC monitoring setup failed (non-critical):', err.message);
    }
  }

  /**
   * Estimate power consumption based on device type and state
   * Used when no real measurement is available
   */
  estimatePowerConsumption() {
    try {
      // Get device class from manifest
      const deviceClass = this.driver?.manifest?.class || 'other';
      
      // Detect device type from driver ID
      let deviceType = 'basic';
      const driverId = this.driver?.id || '';
      
      if (driverId.includes('bulb')) {
        if (driverId.includes('rgb')) deviceType = 'bulb_rgb';
        else if (driverId.includes('tunable')) deviceType = 'bulb_tunable';
        else deviceType = 'bulb';
      } else if (driverId.includes('led_strip')) {
        deviceType = 'led_strip';
      } else if (driverId.includes('spot')) {
        deviceType = 'spot';
      } else if (driverId.includes('dimmer')) {
        deviceType = 'dimmer';
      } else if (driverId.includes('switch')) {
        deviceType = 'relay';
      } else if (driverId.includes('plug') || driverId.includes('socket')) {
        deviceType = 'basic';
      } else if (driverId.includes('thermostat') || driverId.includes('valve')) {
        deviceType = 'valve';
      } else if (driverId.includes('curtain') || driverId.includes('blind')) {
        deviceType = 'motor';
      } else if (driverId.includes('fan')) {
        deviceType = 'ceiling';
      }
      
      // Get current state
      const state = {
        onoff: this.getCapabilityValue('onoff'),
        dim: this.getCapabilityValue('dim'),
        moving: this.getCapabilityValue('windowcoverings_state') === 'up' || 
                this.getCapabilityValue('windowcoverings_state') === 'down'
      };
      
      // Estimate using PowerManager
      const estimated = PowerManager.estimatePower(deviceClass, deviceType, state);
      
      if (estimated !== null) {
        this.log(`💡 Power estimation: ${deviceClass}/${deviceType} = ${estimated}W`);
      }
      
      return estimated;
      
    } catch (err) {
      this.error('Power estimation failed:', err.message);
      return null;
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

  /**
   * Enhanced battery monitoring with threshold alerts
   * Triggers flow cards when thresholds are reached
   */
  async monitorBatteryThresholds(batteryLevel) {
    if (!batteryLevel || !this.isBatteryPowered()) return;
    
    const lowThreshold = this.getSetting('battery_low_threshold') || 20;
    const criticalThreshold = this.getSetting('battery_critical_threshold') || 10;
    const enableNotifications = this.getSetting('enable_battery_notifications') !== false;
    
    const previousLevel = this.getStoreValue('previous_battery_level') || 100;
    
    // Check for low battery (crossing threshold)
    if (previousLevel > lowThreshold && batteryLevel <= lowThreshold && enableNotifications) {
      this.log(`⚠️ Battery LOW: ${batteryLevel}% (threshold: ${lowThreshold}%)`);
      
      const voltage = this.getStoreValue('battery_voltage') || 0;
      
      this.homey.flow.getDeviceTriggerCard('battery_low')
        .trigger(this, { battery: batteryLevel, voltage })
        .catch(err => this.error('Failed to trigger battery_low:', err));
    }
    
    // Check for critical battery (crossing threshold)
    if (previousLevel > criticalThreshold && batteryLevel <= criticalThreshold && enableNotifications) {
      this.log(`🚨 Battery CRITICAL: ${batteryLevel}% (threshold: ${criticalThreshold}%)`);
      
      const voltage = this.getStoreValue('battery_voltage') || 0;
      
      this.homey.flow.getDeviceTriggerCard('battery_critical')
        .trigger(this, { battery: batteryLevel, voltage })
        .catch(err => this.error('Failed to trigger battery_critical:', err));
    }
    
    // Check for fully charged
    if (previousLevel < 100 && batteryLevel === 100 && enableNotifications) {
      this.log(`✅ Battery fully charged: 100%`);
      
      this.homey.flow.getDeviceTriggerCard('battery_charged')
        .trigger(this, {})
        .catch(err => this.error('Failed to trigger battery_charged:', err));
    }
    
    // Store current level for next comparison
    await this.setStoreValue('previous_battery_level', batteryLevel);
  }

  /**
   * Handle settings changes
   * Re-detect power/battery when manual settings change
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Settings changed:', changedKeys);
    
    // Power source manually changed
    if (changedKeys.includes('power_source')) {
      this.log('Power source setting changed, re-detecting...');
      await this.detectPowerSource();
      await this.configurePowerCapabilities();
      
      // Trigger power source changed flow
      this.homey.flow.getDeviceTriggerCard('power_source_changed')
        .trigger(this, { power_source: this.powerType.toLowerCase() })
        .catch(err => this.error('Failed to trigger power_source_changed:', err));
    }
    
    // Battery type manually changed
    if (changedKeys.includes('battery_type') && this.isBatteryPowered()) {
      this.log('Battery type setting changed, re-detecting...');
      await this.detectBatteryType();
    }
    
    // Energy optimization mode changed
    if (changedKeys.includes('optimization_mode')) {
      this.log('Energy optimization changed:', newSettings.optimization_mode);
      await this.applyEnergyOptimization(newSettings.optimization_mode);
    }
    
    return true;
  }

  /**
   * Apply energy optimization settings
   * Adjusts polling intervals and reporting
   */
  async applyEnergyOptimization(mode) {
    this.log(`🔋 Applying energy optimization: ${mode}`);
    
    // Different modes affect polling frequency
    const reportInterval = this.getSetting('battery_report_interval') || 24;
    
    try {
      if (this.isBatteryPowered() && this.zclNode.endpoints[1]?.clusters?.powerConfiguration) {
        const powerCluster = this.zclNode.endpoints[1].clusters.powerConfiguration;
        
        // Configure reporting based on mode
        let minInterval, maxInterval;
        
        switch (mode) {
          case 'performance':
            minInterval = reportInterval * 1800; // Half of interval
            maxInterval = reportInterval * 3600; // Full interval
            break;
          case 'balanced':
            minInterval = reportInterval * 3600; // Full interval
            maxInterval = reportInterval * 7200; // Double interval
            break;
          case 'power_saving':
            minInterval = reportInterval * 7200; // Double interval
            maxInterval = reportInterval * 14400; // Quadruple interval
            break;
          default:
            minInterval = reportInterval * 3600;
            maxInterval = reportInterval * 7200;
        }
        
        await powerCluster.configureReporting({
          batteryPercentageRemaining: {
            minInterval,
            maxInterval,
            minChange: mode === 'performance' ? 1 : (mode === 'balanced' ? 5 : 10)
          }
        }).catch(err => this.log('Configure reporting failed (non-critical):', err.message));
        
        this.log(`✅ Energy optimization applied: ${mode}`);
      }
    } catch (err) {
      this.error('Energy optimization failed:', err.message);
    }
  }

  /**
   * Request immediate battery update (for flow action)
   */
  async requestBatteryUpdate() {
    if (!this.isBatteryPowered()) {
      throw new Error('Device is not battery powered');
    }
    
    this.log('📡 Requesting battery update...');
    
    try {
      const powerCluster = this.zclNode.endpoints[1]?.clusters?.powerConfiguration;
      if (powerCluster) {
        const battery = await powerCluster.readAttributes(['batteryPercentageRemaining']);
        
        if (battery?.batteryPercentageRemaining !== undefined) {
          const level = Math.round(battery.batteryPercentageRemaining / 2);
          await this.setCapabilityValue('measure_battery', level);
          await this.monitorBatteryThresholds(level);
          
          this.log(`✅ Battery updated: ${level}%`);
          return level;
        }
      }
    } catch (err) {
      this.error('Battery update failed:', err.message);
      throw err;
    }
  }
}

module.exports = BaseHybridDevice;

