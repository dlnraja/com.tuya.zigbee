'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const BatteryManager = require('./BatteryManager');
const PowerManager = require('./PowerManager');
const ZigbeeHelpers = require('./ZigbeeHelpers');
const ZigbeeTimeout = require('./ZigbeeTimeout');
const ReportingConfig = require('./ReportingConfig');

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
    // 🚨 EMERGENCY LOG: This should ALWAYS appear if device initializes
    try {
      const name = this.getName ? this.getName() : 'unknown';
      const data = this.getData ? this.getData() : {};
      const id = data.id || data.ieee || 'no-id';
      console.log('🚨 [DEVICE START]', name, '|', id);
    } catch (err) {
      console.log('🚨 [DEVICE START] Error getting info:', err.message);
    }
    
    try {
      this.log('BaseHybridDevice initializing...');
      this.log('═'.repeat(80));
      this.log('🔍 DIAGNOSTIC MODE - Detailed Device Information');
      this.log('═'.repeat(80));
    } catch (err) {
      console.error('⚠️ [LOG] Error logging init:', err.message);
    }
    
    // Initialize with safe defaults FIRST
    try {
      this.powerType = 'BATTERY'; // Safe default
      this.batteryType = 'CR2032'; // Safe default
      this._initializationComplete = false;
      console.log('✅ [INIT] Defaults set:', { powerType: this.powerType, batteryType: this.batteryType });
    } catch (err) {
      console.error('⚠️ [INIT] Error setting defaults:', err.message);
    }
    
    // Log device identity (wrapped in try-catch)
    try {
      console.log('🔍 [IDENTITY] Starting device identity check...');
      this.log('📱 DEVICE IDENTITY:');
      this.log('  - Driver ID:', this.driver?.id || 'unknown');
      this.log('  - Device Name:', this.getName() || 'unknown');
      this.log('  - Device ID:', this.getData()?.id || 'unknown');
      
      // Log Zigbee node information
      if (this.zclNode) {
        this.log('  - IEEE Address:', this.zclNode.ieeeAddr || 'unknown');
        this.log('  - Network Address:', this.zclNode.networkAddress || 'unknown');
        this.log('  - Manufacturer:', this.zclNode.manufacturerName || 'unknown');
        this.log('  - Model ID:', this.zclNode.modelId || 'unknown');
        this.log('  - Endpoints:', Object.keys(this.zclNode.endpoints || {}).join(', '));
        
        // Log available clusters per endpoint
        this.log('\n🔌 AVAILABLE CLUSTERS PER ENDPOINT:');
        for (const [epId, endpoint] of Object.entries(this.zclNode.endpoints || {})) {
          this.log(`  Endpoint ${epId}:`);
          if (endpoint.clusters) {
            const clusterNames = Object.keys(endpoint.clusters).map(name => {
              const cluster = endpoint.clusters[name];
              return `${name} (ID: ${cluster?.id || '?'})`;
            });
            this.log(`    Clusters: ${clusterNames.join(', ')}`);
          } else {
            this.log('    No clusters found');
          }
        }
      } else {
        this.log('  ⚠️ zclNode not available!');
      }
    } catch (err) {
      this.error('Failed to log device identity:', err.message);
    }
    
    // CRITICAL FIX: Mark device as available IMMEDIATELY with safe defaults
    // This prevents hanging and allows device to work while detection runs in background
    try {
      console.log('⚡ [AVAILABILITY] Setting device available...');
      await this.setAvailable().catch(err => {
        console.error('⚠️ [AVAILABILITY] setAvailable failed:', err.message);
        this.error('setAvailable failed:', err);
      });
      this.log('[OK] ✅ Device available (using safe defaults, background init starting...)');
      console.log('✅ [AVAILABILITY] Device marked available');
    } catch (err) {
      console.error('❌ [AVAILABILITY] Failed to set available:', err.message);
      this.error('Failed to set available:', err);
    }
    
    // Run power detection and configuration in BACKGROUND (non-blocking)
    // This prevents any slow/hanging operation from blocking device initialization
    try {
      this.log('\n⚡ POWER DETECTION (Background):');
      console.log('🔄 [BACKGROUND] Starting background initialization...');
      this._runBackgroundInitialization().catch(err => {
        console.error('⚠️ [BACKGROUND] Background init failed:', err.message);
        this.error('Background initialization failed:', err.message);
        this.log('[WARN] Device will use safe defaults (Battery/CR2032)');
      });
    } catch (err) {
      console.error('❌ [BACKGROUND] Failed to start background init:', err.message);
    }
    
    try {
      this.log(`BaseHybridDevice initialized immediately with safe defaults`);
      this.log(`Background detection started for intelligent power management`);
      console.log('✅ [COMPLETE] onNodeInit complete - device ready');
    } catch (err) {
      console.error('⚠️ [COMPLETE] Error logging completion:', err.message);
    }
  }

  /**
   * Run power detection and configuration in background
   * Non-blocking, won't prevent device from working
   */
  async _runBackgroundInitialization() {
    try {
      // Step 1: Detect power source (with timeout)
      this.log('[BACKGROUND] Step 1/3: Detecting power source...');
      await this.detectPowerSource();
      this.log(`[BACKGROUND] Power source detected: ${this.powerType}`);
      
      // Step 2: Configure capabilities based on detected power
      this.log('[BACKGROUND] Step 2/3: Configuring power capabilities...');
      await this.configurePowerCapabilities();
      this.log('[BACKGROUND] Power capabilities configured');
      
      // Step 3: Setup monitoring and reporting
      this.log('[BACKGROUND] Step 3/3: Setting up monitoring...');
      await this.setupMonitoring();
      this.log('[BACKGROUND] Monitoring configured');
      
      this._initializationComplete = true;
      this.log('[OK] ✅ Background initialization complete!');
      this.log(`   Final power type: ${this.powerType}`);
      this.log(`   Battery type: ${this.batteryType || 'N/A'}`);
      
    } catch (err) {
      this.error('[BACKGROUND] Initialization failed:', err.message);
      this.log('[WARN] Device continues with safe defaults');
    }
  }

  /**
   * Detect power source from device
   * Reads powerSource attribute from Basic cluster
   * SDK3 Method: Uses numeric cluster IDs
   * Enhanced: Checks manual override settings first
   */
  async detectPowerSource() {
    this.log('[SEARCH] Detecting power source...');
    this.log('  Expected: Cluster POWER_CONFIGURATION (ID: 1) or attribute powerSource');
    
    // Check for manual override in settings
    const manualPowerSource = this.getSetting('power_source');
    if (manualPowerSource && manualPowerSource !== 'auto') {
      this.log(`[TARGET] Manual power source override: ${manualPowerSource}`);
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
      // CRITICAL FIX: Add timeout to prevent infinite hang
      const basicCluster = this.zclNode.endpoints[1]?.clusters?.basic;
      
      if (basicCluster) {
        this.log('[SEARCH] Reading powerSource attribute (5s timeout)...');
        const attributes = await ZigbeeTimeout.readAttributes(basicCluster, ['powerSource'], 5000);
        
        if (attributes?.powerSource !== undefined) {
          const powerSource = attributes; // Already read above with timeout
          this.log(`📡 PowerSource attribute read:`);
          this.log(`  - Raw value: ${JSON.stringify(powerSource)}`);
          this.log(`  - powerSource: ${powerSource.powerSource}`);
          this.log(`  - Type: ${typeof powerSource.powerSource}`);
          this.log(`  - Is battery string: ${powerSource.powerSource === 'battery'}`);
          this.log(`  - Is battery numeric: ${powerSource.powerSource === 3}`);
          
          // Handle both numeric AND string values (different Zigbee implementations)
          // Numeric: 0x00=Unknown, 0x01=Mains, 0x02=Mains 3-phase, 0x03=Battery, 0x04=DC
          // String: "unknown", "mains", "battery", "dc"
          
          const powerSourceStr = typeof powerSource === 'string' ? powerSource.toLowerCase() : null;
          
          if (powerSource.powerSource === 'battery' || powerSource.powerSource === 3) {
            this.powerType = 'BATTERY';
            this.log('[OK] Detected: Battery Power');
            await this.detectBatteryType();
            
          } else if (powerSource.powerSource === 0x01 || powerSource.powerSource === 0x02 || powerSource.powerSource === 0x05 || powerSource.powerSource === 0x06 ||
              powerSourceStr === 'mains' || powerSourceStr === 'ac') {
            this.powerType = 'AC';
            this.log('[OK] Detected: AC Mains Power');
            
          } else if (powerSource.powerSource === 0x04 || powerSourceStr === 'dc') {
            this.powerType = 'DC';
            this.log('[OK] Detected: DC Power');
            
          } else {
            this.log('[WARN]  Unknown power source value, using fallback detection');
            await this.fallbackPowerDetection();
          }
          
          // Store power type for future reference
          await this.setStoreValue('power_type', this.powerType);
          await this.setStoreValue('battery_type', this.batteryType);
          
        } else {
          this.log('[WARN]  PowerSource attribute not available, using fallback');
          await this.fallbackPowerDetection();
        }
      } else {
        this.log('[WARN]  Basic cluster not available, using fallback');
        await this.fallbackPowerDetection();
      }
      
    } catch (err) {
      this.log('[WARN]  Could not read powerSource:', err.message);
      this.log(`  Error details: ${err.stack || err}`);
      this.log('[INFO] Falling back to cluster detection...');
      this.log('  Checking for presence of powerConfiguration cluster...');
      
      // Fallback: Check for battery cluster presence
      const endpoint1 = this.zclNode.endpoints[1];
      this.log('  Endpoint 1 clusters:', Object.keys(endpoint1?.clusters || {}).join(', '));
      
      const hasBatteryCluster = endpoint1?.clusters?.powerConfiguration || endpoint1?.clusters?.genPowerCfg;
      this.log(`  - Has powerConfiguration: ${!!endpoint1?.clusters?.powerConfiguration}`);
      this.log(`  - Has genPowerCfg: ${!!endpoint1?.clusters?.genPowerCfg}`);
      this.log(`  - Battery cluster found: ${!!hasBatteryCluster}`);
      
      if (hasBatteryCluster) {
        await this.fallbackPowerDetection();
      } else {
        this.log('[WARN]  No battery cluster found, using driver configuration');
        await this.fallbackPowerDetection();
      }
    }
  }

  /**
   * Fallback power detection using driver configuration
   * Checks energy.batteries array and capabilities
   * CRITICAL: Checks manual override settings FIRST
   */
  async fallbackPowerDetection() {
    this.log('[SYNC] Using fallback power detection...');
    
    // CRITICAL FIX: Check manual override FIRST (before any fallback logic)
    const manualPowerSource = this.getSetting('power_source');
    if (manualPowerSource && manualPowerSource !== 'auto') {
      this.log(`[OVERRIDE] ⚡ Manual power source: ${manualPowerSource}`);
      this.powerType = manualPowerSource.toUpperCase();
      
      if (this.powerType === 'BATTERY') {
        const manualBatteryType = this.getSetting('battery_type');
        if (manualBatteryType && manualBatteryType !== 'auto') {
          this.batteryType = manualBatteryType;
          this.log(`[OVERRIDE] 🔋 Manual battery type: ${this.batteryType}`);
        } else {
          await this.detectBatteryType();
        }
      }
      
      await this.setStoreValue('power_type', this.powerType);
      await this.setStoreValue('battery_type', this.batteryType);
      return; // STOP HERE - manual override takes precedence over all auto-detection
    }
    
    // Only use automatic detection if NO manual override
    const driverManifest = this.driver.manifest;
    
    if (driverManifest.energy?.batteries) {
      this.powerType = 'BATTERY';
      const batteries = driverManifest.energy.batteries;
      this.batteryType = batteries[0]; // Use first battery type as default
      this.log(`[OK] Fallback: Battery (${this.batteryType})`);
      
    } else if (driverManifest.capabilities?.includes('measure_power')) {
      this.powerType = 'AC';
      this.log('[OK] Fallback: AC Mains');
      
    } else if (driverManifest.capabilities?.includes('measure_voltage')) {
      this.powerType = 'DC';
      this.log('[OK] Fallback: DC Power');
      
    } else {
      // Default to battery for safety (won't try to read AC attributes)
      this.powerType = 'BATTERY';
      this.batteryType = 'CR2032';
      this.log('[WARN]  Fallback: Assuming Battery (CR2032)');
    }
  }

  /**
   * Detect battery type from voltage
   * Different batteries have different voltage ranges
   * Enhanced: Checks manual override first
   */
  async detectBatteryType() {
    this.log('[BATTERY] Detecting battery type from voltage...');
    
    // Check for manual override in settings
    const manualBatteryType = this.getSetting('battery_type');
    if (manualBatteryType && manualBatteryType !== 'auto') {
      this.log(`[TARGET] Manual battery type override: ${manualBatteryType}`);
      this.batteryType = manualBatteryType;
      return;
    }
    
    try {
      const powerCluster = this.zclNode.endpoints[1]?.clusters?.powerConfiguration;
      
      if (powerCluster) {
        this.log('[BATTERY] Reading battery voltage (5s timeout)...');
        const batteryVoltage = await ZigbeeTimeout.readAttributes(powerCluster, ['batteryVoltage'], 5000);
        
        if (batteryVoltage?.batteryVoltage) {
          const voltage = batteryVoltage.batteryVoltage / 10; // Convert to V
          this.log('[DATA] Battery voltage:', voltage, 'V');
          
          // Store voltage for display and health monitoring
          await this.setStoreValue('battery_voltage', voltage);
          
          // Use intelligent battery type detection
          this.batteryType = BatteryManager.detectBatteryTypeFromVoltage(voltage);
          this.log(`[OK] Intelligent detection: ${this.batteryType} (voltage: ${voltage}V)`);
          
          // Get battery health assessment
          const rawPercentage = this.hasCapability('measure_battery') 
            ? this.getCapabilityValue('measure_battery') 
            : null;
          if (rawPercentage !== null && typeof rawPercentage === 'number') {
            const health = BatteryManager.getBatteryHealth(rawPercentage, voltage, this.batteryType);
            this.log(`🏥 Battery health: ${health.status} - ${health.recommendation}`);
            await this.setStoreValue('battery_health', health);
          }
        } else {
          // Use driver config
          const batteries = this.driver.manifest.energy?.batteries || ['CR2032'];
          this.batteryType = batteries[0];
          this.log(`[WARN]  Voltage not available, using config: ${this.batteryType}`);
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
        this.log(`[DATA] Power capabilities detected:`, available);
        
        // Store for later use
        await this.setStoreValue('power_capabilities', available);
        
        // Get recommended capabilities
        const recommended = PowerManager.getRecommendedCapabilities(available, this.powerType);
        this.log(`[OK] Recommended capabilities:`, recommended);
        
        // Add available capabilities
        for (const capability of recommended) {
          if (!this.hasCapability(capability)) {
            await this.addCapability(capability).catch(err => {
              this.log(`Failed to add ${capability}:`, err.message);
            });
            this.log(`[OK] Added ${capability}`);
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
              this.log(`[LOCK] Hidden ${capability} (no data available)`);
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
          this.log('[OK] Added measure_battery capability');
        }
        
        // Remove AC/DC capabilities if present
        for (const capability of ['measure_power', 'meter_power', 'measure_voltage', 'measure_current']) {
          if (this.hasCapability(capability)) {
            await this.removeCapability(capability).catch(() => {});
            this.log(`🗑️  Removed ${capability} (battery device)`);
          }
        }
      }
      
      this.log('[OK] Power capabilities configured intelligently');
      
    } catch (err) {
      this.error('Capability configuration failed:', err.message);
    }
  }

  /**
   * Setup monitoring based on power type
   * SDK3 Compliant battery monitoring
   * ENHANCED: Also configures real-time reporting for all sensor data
   */
  async setupMonitoring() {
    this.log('[DATA] Setting up power monitoring...');
    
    if (this.powerType === 'BATTERY') {
      await this.setupBatteryMonitoring();
    } else if (this.powerType === 'AC') {
      await this.setupACMonitoring();
    } else if (this.powerType === 'DC') {
      await this.setupDCMonitoring();
    }
    
    // CRITICAL FIX: Setup real-time reporting for ALL data types
    await this.setupRealtimeReporting();
  }
  
  /**
   * Setup real-time reporting for all sensor data
   * Configures Zigbee attribute reporting so data updates immediately
   * User can control intervals via settings
   */
  async setupRealtimeReporting() {
    this.log('[REALTIME] \ud83d\udcca Setting up real-time data reporting...');
    
    try {
      // Check if real-time reporting is enabled
      const enableRealtime = this.getSetting('enable_realtime_reporting');
      if (enableRealtime === false) {
        this.log('[INFO] Real-time reporting disabled by user');
        return;
      }
      
      // Get reporting intervals from settings (user configurable!)
      const reportInterval = this.getSetting('report_interval') || 60; // seconds
      const minInterval = Math.max(1, Math.floor(reportInterval / 2));
      const maxInterval = reportInterval * 2;
      
      this.log(`[CONFIG] Report intervals: min=${minInterval}s, max=${maxInterval}s`);
      
      const endpoint = this.zclNode.endpoints[1];
      if (!endpoint) {
        this.log('[WARN] No endpoint 1, skipping reporting setup');
        return;
      }
      
      // Configure reporting for each data type
      let configured = 0;
      configured += await this._setupTemperatureReporting(endpoint, minInterval, maxInterval) ? 1 : 0;
      configured += await this._setupHumidityReporting(endpoint, minInterval, maxInterval) ? 1 : 0;
      configured += await this._setupOccupancyReporting(endpoint, minInterval, maxInterval) ? 1 : 0;
      configured += await this._setupIlluminanceReporting(endpoint, minInterval, maxInterval) ? 1 : 0;
      configured += await this._setupOnOffReporting(endpoint, minInterval, maxInterval) ? 1 : 0;
      configured += await this._setupContactReporting(endpoint, minInterval, maxInterval) ? 1 : 0;
      
      this.log(`[OK] \u2705 Real-time reporting configured (${configured} data types)`);
      
    } catch (err) {
      this.error('[ERROR] Real-time reporting setup failed:', err.message);
    }
  }
  
  /**
   * Setup temperature reporting (temps réel!)
   */
  async _setupTemperatureReporting(endpoint, minInterval, maxInterval) {
    if (!this.hasCapability('measure_temperature')) return false;
    
    const cluster = endpoint.clusters?.temperatureMeasurement || endpoint.clusters?.msTemperatureMeasurement;
    if (!cluster) return false;
    
    try {
      await cluster.configureReporting({
        measuredValue: {
          minInterval,
          maxInterval,
          minChange: 10 // 0.1°C
        }
      });
      this.log('[OK] \ud83c\udf21\ufe0f Temperature reporting configured');
      return true;
    } catch (err) {
      this.log('[WARN] Temperature reporting failed (non-critical):', err.message);
      return false;
    }
  }
  
  /**
   * Setup humidity reporting (temps réel!)
   */
  async _setupHumidityReporting(endpoint, minInterval, maxInterval) {
    if (!this.hasCapability('measure_humidity')) return false;
    
    const cluster = endpoint.clusters?.relativeHumidity || endpoint.clusters?.msRelativeHumidity;
    if (!cluster) return false;
    
    try {
      await cluster.configureReporting({
        measuredValue: {
          minInterval,
          maxInterval,
          minChange: 100 // 1%
        }
      });
      this.log('[OK] \ud83d\udca7 Humidity reporting configured');
      return true;
    } catch (err) {
      this.log('[WARN] Humidity reporting failed (non-critical):', err.message);
      return false;
    }
  }
  
  /**
   * Setup occupancy (motion) reporting (temps réel!)
   */
  async _setupOccupancyReporting(endpoint, minInterval, maxInterval) {
    if (!this.hasCapability('alarm_motion')) return false;
    
    const cluster = endpoint.clusters?.occupancySensing || endpoint.clusters?.msOccupancySensing;
    if (!cluster) return false;
    
    try {
      await cluster.configureReporting({
        occupancy: {
          minInterval: 1, // IMMEDIATE for motion!
          maxInterval: 300, // 5 min max
          minChange: 1
        }
      });
      this.log('[OK] \ud83d\udeb6 Motion reporting configured (immediate)');
      return true;
    } catch (err) {
      this.log('[WARN] Motion reporting failed (non-critical):', err.message);
      return false;
    }
  }
  
  /**
   * Setup illuminance reporting (temps réel!)
   */
  async _setupIlluminanceReporting(endpoint, minInterval, maxInterval) {
    if (!this.hasCapability('measure_luminance')) return false;
    
    const cluster = endpoint.clusters?.illuminanceMeasurement || endpoint.clusters?.msIlluminanceMeasurement;
    if (!cluster) return false;
    
    try {
      await cluster.configureReporting({
        measuredValue: {
          minInterval,
          maxInterval,
          minChange: 500 // ~5 lux
        }
      });
      this.log('[OK] \ud83d\udca1 Luminance reporting configured');
      return true;
    } catch (err) {
      this.log('[WARN] Luminance reporting failed (non-critical):', err.message);
      return false;
    }
  }
  
  /**
   * Setup on/off reporting (temps réel!)
   */
  async _setupOnOffReporting(endpoint, minInterval, maxInterval) {
    if (!this.hasCapability('onoff')) return false;
    
    const cluster = endpoint.clusters?.onOff;
    if (!cluster) return false;
    
    try {
      await cluster.configureReporting({
        onOff: {
          minInterval: 0, // IMMEDIATE!
          maxInterval: 300,
          minChange: 1
        }
      });
      this.log('[OK] \u26a1 OnOff reporting configured (immediate)');
      return true;
    } catch (err) {
      this.log('[WARN] OnOff reporting failed (non-critical):', err.message);
      return false;
    }
  }
  
  /**
   * Setup contact sensor reporting (temps réel!)
   */
  async _setupContactReporting(endpoint, minInterval, maxInterval) {
    if (!this.hasCapability('alarm_contact')) return false;
    
    // Contact sensors typically use IAS Zone cluster
    const iasZone = endpoint.clusters?.iasZone;
    if (iasZone) {
      this.log('[INFO] Contact uses IAS Zone (events, not reporting)');
      return false; // IAS Zone uses events, not attribute reporting
    }
    
    // Alternative: onOff cluster for some contacts
    const cluster = endpoint.clusters?.onOff;
    if (!cluster) return false;
    
    try {
      await cluster.configureReporting({
        onOff: {
          minInterval: 0, // IMMEDIATE!
          maxInterval: 300,
          minChange: 1
        }
      });
      this.log('[OK] \ud83d\udeaa Contact reporting configured (immediate)');
      return true;
    } catch (err) {
      this.log('[WARN] Contact reporting failed (non-critical):', err.message);
      return false;
    }
  }

  /**
   * Setup battery monitoring (SDK3 compliant)
   * Direct cluster listeners instead of registerCapability
   * Enhanced: Supports Tuya custom clusters
   */
  async setupBatteryMonitoring() {
    this.log('[BATTERY] Setting up battery monitoring...');
    
    // Try multiple methods for Tuya device compatibility
    if (await this.setupStandardBatteryMonitoring()) {
      this.log('[OK] Standard battery monitoring configured');
      return;
    }
    
    if (await this.setupTuyaBatteryMonitoring()) {
      this.log('[OK] Tuya battery monitoring configured');
      return;
    }
    
    if (await this.setupAlternativeEndpointBattery()) {
      this.log('[OK] Alternative endpoint battery configured');
      return;
    }
    
    this.log('[WARN]  No battery monitoring available (device may not support it)');
  }
        this.log('[WARN] Battery reporting config failed (non-critical):', err.message);
      }
      
      this.log('[OK] Standard battery monitoring configured (SDK3)');
      return true;
      
    } catch (err) {
      this.error('Standard battery monitoring failed:', err.message);
      return false;
    }
  }

  /**
   * Setup Tuya custom battery monitoring (cluster 0xEF00)
   * Tuya devices use proprietary DP (Data Point) system
   */
  async setupTuyaBatteryMonitoring() {
    try {
      const endpoint = this.zclNode.endpoints[1];
      
      // Check for Tuya manuSpecificTuya cluster
      const tuyaCluster = endpoint?.clusters?.manuSpecificTuya || endpoint?.clusters?.['0xEF00'];
      
      if (!tuyaCluster) {
        return false;
      }
      
      this.log('📱 Tuya custom cluster (0xEF00) detected');
      
      // Listen for Tuya DP reporting
      tuyaCluster.on('reporting', async (data) => {
        try {
          // DP 15 is typically battery percentage in Tuya devices
          if (data.dp === 15 || data.datapoint === 15) {
            const battery = data.value || data.data;
            if (typeof battery === 'number' && battery >= 0 && battery <= 100) {
              this.log(`[BATTERY] Tuya battery update: ${battery}%`);
              if (this.hasCapability('measure_battery')) {
                await this.setCapabilityValue('measure_battery', battery).catch(this.error);
              }
            }
          }
          
          // DP 14 is sometimes used for battery state
          if (data.dp === 14 || data.datapoint === 14) {
            this.log(`[BATTERY] Tuya battery state: ${data.value}`);
          }
        } catch (err) {
          this.error('Tuya battery reporting error:', err.message);
        }
      });
      
      // Also try to read initial battery value
      try {
        const batteryData = await tuyaCluster.read('dp', 15).catch(() => null);
        if (batteryData?.value) {
          this.log(`[BATTERY] Tuya initial battery: ${batteryData.value}%`);
          if (this.hasCapability('measure_battery')) {
            await this.setCapabilityValue('measure_battery', batteryData.value).catch(this.error);
          }
        }
      } catch (err) {
        // Reading may not be supported, only reporting
        this.log('Tuya battery read not supported (will use reporting only)');
      }
      
      return true;
      
    } catch (err) {
      this.error('Tuya battery monitoring failed:', err.message);
      return false;
    }
  }

  /**
   * Setup battery monitoring on alternative endpoints
   * Some Tuya devices report battery on endpoint 2 or 3
   */
  async setupAlternativeEndpointBattery() {
    try {
      // Try endpoints 2 and 3
      for (const epId of [2, 3]) {
        const endpoint = this.zclNode.endpoints[epId];
        const endpoint1 = this.zclNode.endpoints[1];
        this.log('  Endpoint 1 clusters:', Object.keys(endpoint1?.clusters || {}).join(', '));
        
        const hasBatteryCluster = endpoint1?.clusters?.powerConfiguration || endpoint1?.clusters?.genPowerCfg;
        this.log(`  - Has powerConfiguration: ${!!endpoint1?.clusters?.powerConfiguration}`);
        this.log(`  - Has genPowerCfg: ${!!endpoint1?.clusters?.genPowerCfg}`);
        this.log(`  - Battery cluster found: ${!!hasBatteryCluster}`);
        
        if (hasBatteryCluster) {
          this.log(`📱 Battery cluster found on endpoint ${epId}`);
          
          // Setup monitoring on this endpoint
          powerCluster.on('attr.batteryPercentageRemaining', async (value) => {
            const battery = Math.round(value / 2);
            this.log(`[BATTERY] Battery (ep${epId}): ${battery}%`);
            if (this.hasCapability('measure_battery')) {
              await this.setCapabilityValue('measure_battery', battery).catch(this.error);
            }
          });
          
          // Configure attribute reporting
          try {
            await super.configureAttributeReporting([{
              endpointId: epId,
              cluster: CLUSTER.POWER_CONFIGURATION,
              attributeName: 'batteryPercentageRemaining',
              minInterval: 0,
              maxInterval: 3600,
              minChange: 1
            }]);
            this.log(`[OK] Battery reporting configured for endpoint ${epId}`);
          } catch (err) {
            this.log(`[WARN] Battery reporting failed for endpoint ${epId}:`, err.message);
          }
          
          return true;
        }
      }
      
      return false;
      
    } catch (err) {
      this.error('Alternative endpoint battery monitoring failed:', err.message);
      return false;
    }
  }

  /**
   * Setup AC power monitoring with intelligent measurement and estimation
   */
  async setupACMonitoring() {
    this.log('⚡ Setting up AC monitoring with intelligent power management...');
    
    try {
      // TODO: Refactor to SDK3 cluster listeners
      // For now, AC/DC power monitoring is disabled to avoid deprecated API errors
      // Battery monitoring is prioritized as it affects more devices
      
      this.log('[WARN]  AC monitoring temporarily disabled - needs SDK3 refactoring');
      this.log('[BULB] AC devices will work, but power measurements need manual SDK3 implementation');
      
      // const endpoint = this.zclNode.endpoints[1];
      // if (!endpoint?.clusters?.haElectricalMeasurement) {
      //   this.log('[WARN]  haElectricalMeasurement cluster not available');
      //   return;
      // }
      //
      // // SDK3: Would use endpoint.clusters.haElectricalMeasurement.on('attr.rmsVoltage', ...)
      // // SDK3: Would use endpoint.clusters.haElectricalMeasurement.on('attr.rmsCurrent', ...)
      // // SDK3: Would use endpoint.clusters.haElectricalMeasurement.on('attr.activePower', ...)
      
    } catch (err) {
      this.log('AC monitoring setup failed (non-critical):', err.message);
    }
  }

  /**
   * Setup DC power monitoring with intelligent measurement
   */
  async setupDCMonitoring() {
    this.log('[POWER] Setting up DC monitoring with intelligent power management...');
    
    try {
      // TODO: Refactor to SDK3 cluster listeners
      // For now, DC power monitoring is disabled to avoid deprecated API errors
      // Battery monitoring is prioritized as it affects more devices
      
      this.log('[WARN]  DC monitoring temporarily disabled - needs SDK3 refactoring');
      this.log('[BULB] DC devices will work, but power measurements need manual SDK3 implementation');
      
      // const endpoint = this.zclNode.endpoints[1];
      // if (!endpoint?.clusters?.haElectricalMeasurement) {
      //   this.log('[WARN]  haElectricalMeasurement cluster not available');
      //   return;
      // }
      //
      // // SDK3: Would use endpoint.clusters.haElectricalMeasurement.on('attr.rmsVoltage', ...)
      // // SDK3: Would use endpoint.clusters.haElectricalMeasurement.on('attr.rmsCurrent', ...)
      // // SDK3: Would use endpoint.clusters.haElectricalMeasurement.on('attr.activePower', ...)
      
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
        this.log(`[BULB] Power estimation: ${deviceClass}/${deviceType} = ${estimated}W`);
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
   * REMOVED: configureAttributeReporting override (caused infinite recursion)
   * 
   * Drivers now call super.configureAttributeReporting() directly with numeric cluster IDs
   */

  /**
   * Get IEEE Address with fallbacks
   * Uses official SDK v3 getNode() method with fallback to getData()
   */
  async getIeeeAddress() {
    return ZigbeeHelpers.getIeeeAddress(this);
  }

  /**
   * Helper to setup cluster listener with auto-conversion
   */
  setupClusterListener(endpoint, clusterSpec, attribute, callback) {
    return ZigbeeHelpers.setupClusterListener(endpoint, clusterSpec, attribute, callback, this);
  }

  /**
   * Helper to get cluster with fallbacks
   */
  getCluster(endpoint, clusterSpec) {
    return ZigbeeHelpers.getCluster(endpoint, clusterSpec);
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
      this.log(`[WARN] Battery LOW: ${batteryLevel}% (threshold: ${lowThreshold}%)`);
      
      const voltage = this.getStoreValue('battery_voltage') || 0;
      
      this.homey.flow.getDeviceTriggerCard('battery_low')
        .trigger(this, { battery: batteryLevel, voltage })
        .catch(err => this.error('Failed to trigger battery_low:', err));
    }
    
    // Check for critical battery (crossing threshold)
    if (previousLevel > criticalThreshold && batteryLevel <= criticalThreshold && enableNotifications) {
      this.log(`[ALARM] Battery CRITICAL: ${batteryLevel}% (threshold: ${criticalThreshold}%)`);
      
      const voltage = this.getStoreValue('battery_voltage') || 0;
      
      this.homey.flow.getDeviceTriggerCard('battery_critical')
        .trigger(this, { battery: batteryLevel, voltage })
        .catch(err => this.error('Failed to trigger battery_critical:', err));
    }
    
    // Check for fully charged
    if (previousLevel < 100 && batteryLevel === 100 && enableNotifications) {
      this.log(`[OK] Battery fully charged: 100%`);
      
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
    this.log(`[BATTERY] Applying energy optimization: ${mode}`);
    
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
        
        this.log(`[OK] Energy optimization applied: ${mode}`);
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
          await this.setCapabilityValue('measure_battery', parseFloat(level));
          await this.monitorBatteryThresholds(level);
          
          this.log(`[OK] Battery updated: ${level}%`);
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

