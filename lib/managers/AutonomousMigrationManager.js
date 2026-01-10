'use strict';

/**
 * AutonomousMigrationManager - Automatic Driver Adaptation System
 *
 * SDK3 LIMITATION: Cannot programmatically change driver (setDriver() not available)
 * SOLUTION: Dynamically adapt current driver to behave like correct driver
 *
 * Features:
 * - Auto-detect correct driver based on device clusters
 * - Add missing capabilities dynamically
 * - Configure correct cluster bindings
 * - Apply correct data parsers
 * - 100% autonomous - no user intervention needed
 */

const { getRecommendedDriver } = require('../utils/DriverMappingLoader');

class AutonomousMigrationManager {

  constructor(device) {
    this.device = device;
    this.homey = device.homey;
    this.adapted = false;
    this.adaptations = [];
  }

  /**
   * v5.2.73: Check if device is still available (not deleted/removed)
   * @returns {boolean} - True if device is available
   */
  _isDeviceAvailable() {
    try {
      // Check multiple indicators of device availability
      if (!this.device) return false;
      if (!this.device.zclNode) return false;

      // Check if device has getAvailable method and use it
      if (typeof this.device.getAvailable === 'function') {
        return this.device.getAvailable();
      }

      // Fallback: check if device has basic properties
      return Boolean(this.device.getData && this.device.getData());
    } catch (err) {
      return false;
    }
  }

  /**
   * Run autonomous adaptation at device init
   * Call this from onNodeInit() or onInit()
   */
  async autoAdapt() {
    const startTime = Date.now();

    try {
      this.device.log('═══════════════════════════════════════════════════════════');
      this.device.log('🤖 [AUTONOMOUS] Starting automatic driver adaptation...');
      this.device.log('═══════════════════════════════════════════════════════════');

      // Step 1: Analyze device
      const analysis = await this._analyzeDevice();

      // Step 2: Detect recommended driver
      const recommendation = await this._getRecommendation(analysis);

      // v5.3.15: SAFETY CHECK - Never recommend migration if:
      // - Current driver is undefined
      // - Target driver is undefined/null
      // - Current and target are the same
      if (!recommendation.currentDriver) {
        this.device.log('⚠️ [AUTONOMOUS] Cannot determine current driver - skipping migration');
        return { adapted: false, reason: 'Current driver undefined' };
      }

      if (!recommendation.targetDriver) {
        this.device.log('⚠️ [AUTONOMOUS] No target driver recommended - keeping current');
        return { adapted: false, reason: 'No target driver' };
      }

      if (recommendation.currentDriver === recommendation.targetDriver) {
        this.device.log('✅ [AUTONOMOUS] Already using correct driver');
        return { adapted: false, reason: 'Already correct driver' };
      }

      // Step 3: Check if adaptation needed
      if (!recommendation.needsAdaptation) {
        this.device.log('✅ [AUTONOMOUS] Driver is correct - no adaptation needed');
        return { adapted: false, reason: 'Driver correct' };
      }

      // Step 4: Apply adaptations
      this.device.log(`🔄 [AUTONOMOUS] Adapting: ${this.device.driver.id} → ${recommendation.targetDriver}`);
      await this._applyAdaptations(recommendation);

      // Step 5: Configure clusters
      await this._configureClusterBindings(recommendation);

      // Step 6: Set up data routing
      await this._setupDataRouting(recommendation);

      const duration = Date.now() - startTime;
      this.device.log('═══════════════════════════════════════════════════════════');
      this.device.log(`✅ [AUTONOMOUS] Adaptation complete in ${duration}ms`);
      this.device.log(`   Adaptations applied: ${this.adaptations.length}`);
      this.device.log('═══════════════════════════════════════════════════════════');

      this.adapted = true;
      return {
        adapted: true,
        adaptations: this.adaptations,
        from: this.device.driver.id,
        to: recommendation.targetDriver
      };

    } catch (err) {
      this.device.error('[AUTONOMOUS] Adaptation error:', err.message);
      return { adapted: false, error: err.message };
    }
  }

  /**
   * Analyze device clusters and capabilities
   */
  async _analyzeDevice() {
    const data = this.device.getData() || {};
    const zclNode = this.device.zclNode;

    const analysis = {
      modelId: data.modelId || data.zb_product_id || '',
      manufacturer: data.manufacturerName || data.zb_manufacturer_name || '',
      currentDriver: this.device.driver.id,
      currentCapabilities: this.device.getCapabilities(),
      clusters: {
        input: [],
        output: []
      },
      deviceType: 'unknown',
      powerSource: 'unknown',
      isTuyaDP: false
    };

    // Detect Tuya DP
    if (analysis.modelId?.startsWith('TS0601') ||
      analysis.manufacturer?.startsWith('_TZE')) {
      analysis.isTuyaDP = true;
      analysis.deviceType = 'tuya_dp';
    }

    // CRITICAL: Detect USB outlets that were wrongly assigned to switch drivers
    // TS0002 with _TZ3000_h1ipgkwn is a USB outlet, NOT a switch!
    if (analysis.modelId === 'TS0002' && analysis.manufacturer === '_TZ3000_h1ipgkwn') {
      analysis.deviceType = 'usb_outlet';
      analysis.isUSBOutlet = true;
      analysis.recommendedDriver = 'usb_outlet_advanced';
      this.device.log('[AUTONOMOUS] ⚡ USB OUTLET DETECTED (TS0002/_TZ3000_h1ipgkwn)');
    }

    // Analyze clusters
    if (zclNode && zclNode.endpoints) {
      for (const [epId, endpoint] of Object.entries(zclNode.endpoints)) {
        if (endpoint.clusters) {
          for (const [clusterId, cluster] of Object.entries(endpoint.clusters)) {
            if (cluster.isClient) {
              analysis.clusters.output.push(clusterId);
            } else {
              analysis.clusters.input.push(clusterId);
            }
          }
        }
      }
    }

    // Detect device type from clusters
    analysis.deviceType = this._detectDeviceType(analysis.clusters.input);

    // Detect power source
    analysis.powerSource = this._detectPowerSource(analysis);

    this.device.log('[AUTONOMOUS] Analysis:', JSON.stringify(analysis, null, 2));

    return analysis;
  }

  /**
   * Detect device type from cluster list
   * v5.5.271: FIXED - Check for sensors/buttons BEFORE switches!
   * Buttons have onOff cluster but also iasZone - they are NOT switches!
   */
  _detectDeviceType(clusters) {
    const clusterSet = new Set(clusters.map(c => c.toLowerCase()));

    // v5.5.271: CRITICAL FIX - Check sensors FIRST!
    // Buttons/sensors have iasZone AND onOff - they should NOT be detected as switches!
    if (clusterSet.has('iaszone') || clusterSet.has('ssiasze')) {
      return 'sensor';  // This includes buttons with IAS Zone
    }

    // Switches - only if NO iasZone (already checked above)
    if (clusterSet.has('onoff') || clusterSet.has('genonoff')) {
      if (clusterSet.has('levelcontrol') || clusterSet.has('genlevelctrl')) {
        return 'dimmer';
      }
      return 'switch';
    }

    if (clusterSet.has('occupancysensing')) {
      return 'motion_sensor';
    }

    if (clusterSet.has('temperaturemeasurement')) {
      if (clusterSet.has('relativehumidity')) {
        return 'climate_sensor';
      }
      return 'temperature_sensor';
    }

    // Covers
    if (clusterSet.has('windowcovering') || clusterSet.has('closureswindowcovering')) {
      return 'cover';
    }

    // Lighting
    if (clusterSet.has('colorcontrol') || clusterSet.has('lightingcolorctrl')) {
      return 'light_color';
    }

    if (clusterSet.has('levelcontrol')) {
      return 'light_dim';
    }

    // Energy
    if (clusterSet.has('electricalmeasurement') || clusterSet.has('haelectricalmeasurement')) {
      return 'energy_monitor';
    }

    if (clusterSet.has('metering') || clusterSet.has('seMetering')) {
      return 'meter';
    }

    return 'unknown';
  }

  /**
   * Detect power source
   */
  _detectPowerSource(analysis) {
    const clusters = new Set(analysis.clusters.input.map(c => c.toLowerCase()));

    if (clusters.has('powerconfiguration') || clusters.has('genpowercfg')) {
      return 'battery';
    }

    if (analysis.deviceType === 'switch' ||
      analysis.deviceType === 'dimmer' ||
      analysis.deviceType === 'energy_monitor') {
      return 'mains';
    }

    if (analysis.deviceType === 'sensor' ||
      analysis.deviceType === 'motion_sensor') {
      return 'battery';
    }

    return 'unknown';
  }

  /**
   * Get driver recommendation
   */
  async _getRecommendation(analysis) {
    const currentDriver = this.device.driver.id;

    // Use centralized mapping
    let recommended;
    try {
      recommended = await getRecommendedDriver(analysis.modelId, analysis.manufacturer);
    } catch (err) {
      recommended = null;
    }

    // Fallback: infer from device type
    if (!recommended) {
      recommended = this._inferDriverFromType(analysis.deviceType);
    }

    // v5.5.271: CRITICAL SAFEGUARD - Never convert button drivers to switches!
    // Button drivers should NEVER be recommended to become switch drivers
    // v5.5.356: EXTENDED - Also block conversion to contact_sensor!
    const buttonDrivers = ['button_wireless', 'button_wireless_1', 'button_wireless_2',
      'button_wireless_3', 'button_wireless_4', 'button_wireless_6', 'button_wireless_8',
      'button_emergency_sos', 'button_scene', 'remote_control', 'dimmer_switch',
      'scene_switch_1', 'scene_switch_2', 'scene_switch_3', 'scene_switch_4',
      'scene_switch_6', 'scene_switch_8'];
    const switchDrivers = ['switch_1gang', 'switch_2gang', 'switch_3gang', 'switch_4gang',
      'plug_smart', 'plug_outlet'];
    const sensorDrivers = ['contact_sensor', 'door_sensor', 'window_sensor'];

    if (buttonDrivers.includes(currentDriver) && switchDrivers.includes(recommended)) {
      this.device.log(`⚠️ [AUTONOMOUS] BLOCKED: Will not convert button driver (${currentDriver}) to switch (${recommended})`);
      recommended = null;  // Keep current driver
    }

    // v5.5.356: NEW SAFEGUARD - Never convert buttons to contact sensors!
    if (buttonDrivers.includes(currentDriver) && sensorDrivers.includes(recommended)) {
      this.device.log(`⚠️ [AUTONOMOUS] BLOCKED: Will not convert button driver (${currentDriver}) to sensor (${recommended})`);
      recommended = null;  // Keep current driver
    }

    // Get required capabilities for target driver
    const requiredCapabilities = this._getRequiredCapabilities(recommended || currentDriver, analysis);

    // Check what's missing
    const currentCaps = new Set(analysis.currentCapabilities);
    const missingCapabilities = requiredCapabilities.filter(cap => !currentCaps.has(cap));
    const extraCapabilities = analysis.currentCapabilities.filter(cap =>
      !requiredCapabilities.includes(cap) &&
      !['measure_battery', 'alarm_battery'].includes(cap)  // Keep battery caps
    );

    const needsAdaptation = missingCapabilities.length > 0 ||
      (recommended && recommended !== currentDriver);

    return {
      currentDriver,
      targetDriver: recommended || currentDriver,
      needsAdaptation,
      requiredCapabilities,
      missingCapabilities,
      extraCapabilities,
      analysis
    };
  }

  /**
   * Infer driver from device type
   * v5.5.356: CRITICAL FIX - Don't convert buttons to contact sensors!
   */
  _inferDriverFromType(deviceType) {
    const mapping = {
      'switch': 'switch_1gang',
      'dimmer': 'dimmer_1gang',
      'sensor': null,  // v5.5.356: FIXED - Don't auto-convert sensors, keep current driver
      'motion_sensor': 'motion_sensor',
      'climate_sensor': 'climate_monitor_temp_humidity',
      'temperature_sensor': 'temperature_sensor',
      'cover': 'curtain_motor',
      'light_color': 'light_rgb',
      'light_dim': 'light_dimmable',
      'energy_monitor': 'plug_energy_monitor',
      'meter': 'plug_power_meter',
      'tuya_dp': null,  // Keep current driver for Tuya DP
      'usb_outlet': 'usb_outlet_advanced'  // USB outlets
    };

    return mapping[deviceType] || null;
  }

  /**
   * Get required capabilities for a driver type
   */
  _getRequiredCapabilities(driverId, analysis) {
    // Base capabilities by driver type
    const capabilityMap = {
      // Switches
      'switch_1gang': ['onoff'],
      'switch_2gang': ['onoff', 'onoff.1'],
      'switch_3gang': ['onoff', 'onoff.1', 'onoff.2'],
      'switch_4gang': ['onoff', 'onoff.1', 'onoff.2', 'onoff.3'],

      // Dimmers
      'dimmer_1gang': ['onoff', 'dim'],
      'light_dimmable': ['onoff', 'dim'],
      'light_rgb': ['onoff', 'dim', 'light_hue', 'light_saturation'],

      // Sensors
      'contact_sensor': ['alarm_contact'],
      'motion_sensor': ['alarm_motion'],
      'presence_sensor_radar': ['alarm_motion'],
      'water_leak_sensor': ['alarm_water'],
      'smoke_detector': ['alarm_smoke'],

      // Climate
      'temperature_sensor': ['measure_temperature'],
      'climate_monitor_temp_humidity': ['measure_temperature', 'measure_humidity'],

      // Covers
      'curtain_motor': ['windowcoverings_set', 'windowcoverings_state'],

      // Energy
      'plug_energy_monitor': ['onoff', 'measure_power', 'meter_power'],
      'plug_power_meter': ['onoff', 'measure_power', 'meter_power', 'measure_voltage', 'measure_current'],

      // Plugs
      'plug_smart': ['onoff'],
      'plug_outlet': ['onoff'],

      // USB Outlets
      'usb_outlet_advanced': ['onoff', 'onoff.usb2'],
      'usb_outlet_1gang': ['onoff'],
      'usb_outlet_3gang': ['onoff', 'onoff.usb2', 'onoff.usb3']
    };

    // Override for USB outlets detected from analysis
    if (analysis.isUSBOutlet) {
      return ['onoff', 'onoff.usb2'];
    }

    let caps = capabilityMap[driverId] || ['onoff'];

    // Add battery if detected
    if (analysis.powerSource === 'battery') {
      if (!caps.includes('measure_battery')) {
        caps = [...caps, 'measure_battery'];
      }
    }

    return caps;
  }

  /**
   * Apply capability adaptations
   * v5.2.73: Added guard for deleted/unavailable devices
   */
  async _applyAdaptations(recommendation) {
    const { missingCapabilities, extraCapabilities } = recommendation;

    // v5.2.73: Guard against deleted/unavailable devices
    if (!this._isDeviceAvailable()) {
      this.device.log('[AUTONOMOUS] ⚠️ Device not available - skipping capability adaptations');
      return;
    }

    // Add missing capabilities
    for (const cap of missingCapabilities) {
      try {
        // v5.2.73: Re-check availability before each capability add
        if (!this._isDeviceAvailable()) {
          this.device.log('[AUTONOMOUS] ⚠️ Device became unavailable - aborting adaptations');
          return;
        }

        if (!this.device.hasCapability(cap)) {
          await this.device.addCapability(cap);
          this.device.log(`[AUTONOMOUS] ✅ Added capability: ${cap}`);
          this.adaptations.push({ type: 'add_capability', capability: cap });
        }
      } catch (err) {
        // v5.2.73: Handle "Not Found" errors gracefully
        if (String(err.message).includes('Not Found: Device with ID')) {
          this.device.log(`[AUTONOMOUS] ℹ️ Device removed - stopping adaptations for ${cap}`);
          return;
        }
        this.device.error(`[AUTONOMOUS] ❌ Failed to add ${cap}:`, err.message);
      }
    }

    // Log extra capabilities (don't remove - might break things)
    if (extraCapabilities.length > 0) {
      this.device.log(`[AUTONOMOUS] ℹ️ Extra capabilities (kept): ${extraCapabilities.join(', ')}`);
    }
  }

  /**
   * Configure cluster bindings based on recommendation
   */
  async _configureClusterBindings(recommendation) {
    const { targetDriver, analysis } = recommendation;

    if (!this.device.zclNode) {
      this.device.log('[AUTONOMOUS] No ZCL node - skipping cluster config');
      return;
    }

    try {
      // Configure based on device type
      switch (analysis.deviceType) {
        case 'switch':
        case 'dimmer':
          await this._configureOnOffBindings();
          break;
        case 'sensor':
        case 'motion_sensor':
          await this._configureSensorBindings();
          break;
        case 'climate_sensor':
        case 'temperature_sensor':
          await this._configureClimateBindings();
          break;
        case 'energy_monitor':
        case 'meter':
          await this._configureEnergyBindings();
          break;
      }

      this.device.log('[AUTONOMOUS] ✅ Cluster bindings configured');
      this.adaptations.push({ type: 'cluster_config', deviceType: analysis.deviceType });

    } catch (err) {
      this.device.error('[AUTONOMOUS] Cluster config error:', err.message);
    }
  }

  async _configureOnOffBindings() {
    const ep = this.device.zclNode?.endpoints?.[1];
    if (!ep?.clusters?.onOff) return;

    try {
      await ep.clusters.onOff.configureReporting({
        onOff: { minInterval: 0, maxInterval: 3600, minChange: 0 }
      });
    } catch (err) {
      // Ignore - some devices don't support reporting
    }
  }

  async _configureSensorBindings() {
    const ep = this.device.zclNode?.endpoints?.[1];
    if (!ep?.clusters?.iasZone) return;

    try {
      // IAS Zone auto-enroll
      const status = await ep.clusters.iasZone.readAttributes(['zoneState', 'zoneType']);
      this.device.log('[AUTONOMOUS] IAS Zone status:', status);
    } catch (err) {
      // Ignore
    }
  }

  async _configureClimateBindings() {
    const ep = this.device.zclNode?.endpoints?.[1];

    try {
      if (ep?.clusters?.temperatureMeasurement) {
        await ep.clusters.temperatureMeasurement.configureReporting({
          measuredValue: { minInterval: 60, maxInterval: 3600, minChange: 10 }
        });
      }

      if (ep?.clusters?.relativeHumidity) {
        await ep.clusters.relativeHumidity.configureReporting({
          measuredValue: { minInterval: 60, maxInterval: 3600, minChange: 100 }
        });
      }
    } catch (err) {
      // Ignore
    }
  }

  async _configureEnergyBindings() {
    const ep = this.device.zclNode?.endpoints?.[1];

    try {
      if (ep?.clusters?.electricalMeasurement) {
        await ep.clusters.electricalMeasurement.configureReporting({
          activePower: { minInterval: 10, maxInterval: 300, minChange: 1 }
        });
      }
    } catch (err) {
      // Ignore
    }
  }

  /**
   * Set up automatic data routing
   */
  async _setupDataRouting(recommendation) {
    const { analysis } = recommendation;

    // Register attribute report listeners
    this._registerOnOffListener();
    this._registerSensorListener();
    this._registerClimateListener();
    this._registerEnergyListener();
    this._registerBatteryListener();

    this.device.log('[AUTONOMOUS] ✅ Data routing configured');
    this.adaptations.push({ type: 'data_routing' });
  }

  _registerOnOffListener() {
    try {
      const ep = this.device.zclNode?.endpoints?.[1];
      if (!ep?.clusters?.onOff) return;

      ep.clusters.onOff.on('attr.onOff', async (value) => {
        this.device.log('[AUTONOMOUS] OnOff report:', value);
        if (this.device.hasCapability('onoff')) {
          await this.device.setCapabilityValue('onoff', value).catch(() => { });
        }
      });
    } catch (err) { }
  }

  _registerSensorListener() {
    try {
      const ep = this.device.zclNode?.endpoints?.[1];
      if (!ep?.clusters?.iasZone) return;

      ep.clusters.iasZone.on('attr.zoneStatus', async (status) => {
        this.device.log('[AUTONOMOUS] IAS Zone status:', status);

        const alarm = (status.alarm1 || status.alarm2);

        if (this.device.hasCapability('alarm_motion')) {
          await this.device.setCapabilityValue('alarm_motion', alarm).catch(() => { });
        }
        if (this.device.hasCapability('alarm_contact')) {
          await this.device.setCapabilityValue('alarm_contact', alarm).catch(() => { });
        }
        if (this.device.hasCapability('alarm_water')) {
          await this.device.setCapabilityValue('alarm_water', alarm).catch(() => { });
        }
      });
    } catch (err) { }
  }

  _registerClimateListener() {
    try {
      const ep = this.device.zclNode?.endpoints?.[1];

      if (ep?.clusters?.temperatureMeasurement) {
        ep.clusters.temperatureMeasurement.on('attr.measuredValue', async (value) => {
          const temp = value / 100;  // Convert from centidegrees
          this.device.log('[AUTONOMOUS] Temperature:', temp);
          if (this.device.hasCapability('measure_temperature')) {
            await this.device.setCapabilityValue('measure_temperature', parseFloat(temp)).catch(() => { });
          }
        });
      }

      if (ep?.clusters?.relativeHumidity) {
        ep.clusters.relativeHumidity.on('attr.measuredValue', async (value) => {
          const humidity = value / 100;  // Convert from 0.01%
          this.device.log('[AUTONOMOUS] Humidity:', humidity);
          if (this.device.hasCapability('measure_humidity')) {
            await this.device.setCapabilityValue('measure_humidity', parseFloat(humidity)).catch(() => { });
          }
        });
      }
    } catch (err) { }
  }

  _registerEnergyListener() {
    try {
      const ep = this.device.zclNode?.endpoints?.[1];

      if (ep?.clusters?.electricalMeasurement) {
        ep.clusters.electricalMeasurement.on('attr.activePower', async (value) => {
          const power = value / 10;  // Convert to W
          this.device.log('[AUTONOMOUS] Power:', power, 'W');
          if (this.device.hasCapability('measure_power')) {
            await this.device.setCapabilityValue('measure_power', parseFloat(power)).catch(() => { });
          }
        });

        ep.clusters.electricalMeasurement.on('attr.rmsVoltage', async (value) => {
          const voltage = value / 10;
          if (this.device.hasCapability('measure_voltage')) {
            await this.device.setCapabilityValue('measure_voltage', parseFloat(voltage)).catch(() => { });
          }
        });

        ep.clusters.electricalMeasurement.on('attr.rmsCurrent', async (value) => {
          const current = value / 1000;  // Convert to A
          if (this.device.hasCapability('measure_current')) {
            await this.device.setCapabilityValue('measure_current', parseFloat(current)).catch(() => { });
          }
        });
      }
    } catch (err) { }
  }

  _registerBatteryListener() {
    try {
      const ep = this.device.zclNode?.endpoints?.[1];
      if (!ep?.clusters?.powerConfiguration) return;

      ep.clusters.powerConfiguration.on('attr.batteryPercentageRemaining', async (value) => {
        const percent = Math.min(100, Math.round(value / 2));
        this.device.log('[AUTONOMOUS] Battery:', percent, '%');
        if (this.device.hasCapability('measure_battery')) {
          await this.device.setCapabilityValue('measure_battery', parseFloat(percent)).catch(() => { });
        }
      });

      ep.clusters.powerConfiguration.on('attr.batteryVoltage', async (value) => {
        const voltage = value / 10;
        this.device.log('[AUTONOMOUS] Battery voltage:', voltage, 'V');
        // Can infer percentage from voltage if needed
      });
    } catch (err) { }
  }

  /**
   * Get adaptation summary
   */
  getSummary() {
    return {
      adapted: this.adapted,
      adaptations: this.adaptations,
      driver: this.device.driver.id,
      capabilities: this.device.getCapabilities()
    };
  }
}

module.exports = AutonomousMigrationManager;
