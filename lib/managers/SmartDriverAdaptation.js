'use strict';
const CI = require('../utils/CaseInsensitiveMatcher');
const { safeDivide, safeMultiply } = require('../utils/tuyaUtils.js');

const { CLUSTERS } = require('../constants/ZigbeeConstants.js');


const {
  safeAddCapability,
  detectMultiGang,
  mapPresenceFallback,
  getDeviceOverride,
  detectPowerSource,
  isTuyaDP,
  preserveBatteryCapability,
  detectRecommendedDriver,
  autoMigrateDriver
} = require('../helpers/device_helpers');

// NEW: Safe driver management utilities
const { getUserPreferredDriver, setUserPreferredDriver } = require('../utils/driver-preference');
const { ensureDriverAssignment, isSwitchSafe } = require('../utils/driver-switcher');
const { readBattery, readEnergy } = require('../utils/battery-reader');

// NEW v4.9.321: Safe guards & migration queue
const { safeGetDeviceOverride } = require('../utils/safe-guards');
const { queueMigration } = require('../utils/migration-queue');

// NEW v4.9.313: Data collection & KPI
const { autoConfigureReporting } = require('../utils/cluster-configurator');
const { registerReportListeners, startPeriodicPolling } = require('../utils/data-collector');
const { pushEnergySample, getDeviceKpi } = require('../utils/energy-kpi');

// NEW v4.9.325: Centralized driver mapping database
const { getDeviceInfo, getRecommendedDriver, checkDeprecated } = require('../utils/DriverMappingLoader');

/**
 * SmartDriverAdaptation - SystÃ¨me d'adaptation intelligente de driver
 *
 * DÃ©tecte automatiquement si le mauvais driver est chargÃ© et s'adapte
 * dynamiquement aux capacitÃ©s rÃ©elles du device Zigbee
 */

class SmartDriverAdaptation {

  constructor(device, identificationDatabase = null) {
    this.device = device;
    this.log = device.log.bind(device);
    this.error = device.error.bind(device);
    this.identificationDatabase = identificationDatabase;
  }

  /**
   * Analyse complÃ¨te du device et adaptation intelligente
   */
  async analyzeAndAdapt() {
    this.log('');
    this.log(''.repeat(70));
    this.log(' [SMART ADAPT] INTELLIGENT DRIVER ADAPTATION START');
    this.log(''.repeat(70));

    // NEW P2: Check if dynamic adaptation is enabled
    const adaptMode = this.device.getSetting('smart_adapt_mode') || 'diagnostic_only';
    this.log(`[SMART ADAPT] Mode: ${adaptMode}`);

    if (adaptMode === 'diagnostic_only') {
      this.log(' [DIAGNOSTIC MODE] Analysis only - no capability changes');
    }

    try {
      // 1. Collecter toutes les informations du device
      const deviceInfo = await this.collectDeviceInfo();

      // 2. Analyser les clusters disponibles
      const clusterAnalysis = await this.analyzeClusters(deviceInfo);

      // 3. DÃ©tecter les capabilities rÃ©elles
      const realCapabilities = await this.detectRealCapabilities(clusterAnalysis, deviceInfo);

      // 4. Comparer avec le driver actuel
      const comparison = await this.compareWithCurrentDriver(realCapabilities);

      // 4.5  CRITICAL SAFETY CHECKS before adapting
      const driverId = this.device.driver?.id || '';const confidence = clusterAnalysis.confidence || 0;

      // WHITELIST: Drivers to NEVER auto-adapt (user chose these specifically!)
      const protectedDrivers = [
        'soil_sensor',               // Soil sensors (Tuya DP protocol)
        'climate_monitor',           // Climate monitors
        'presence_sensor_radar',     // Radar presence sensors
        'thermostat',                // Thermostats
        'irrigation_controller',     // Irrigation controllers
        'doorbell',                  // Doorbells
        'siren',                     //Sirens/alarms
        'lock',                      // Smart locks
        'button_emergency_sos',      // v5.5.18: SOS buttons use IAS Zone alarm_contact!
        'emergency'                  // v5.5.18: All emergency devices
      ];

      // Check if driver is protected
      const isProtected = protectedDrivers.some(pd => driverId.includes(pd));

      // Check if driver is a sensor/monitor (NEVER turn into switch/outlet!)
      const isSensorOrMonitor = driverId.includes('sensor') ||
        driverId.includes('monitor') ||
        driverId.includes('climate') ||
        driverId.includes('thermostat') ||
        driverId.includes('soil');

      // SAFETY CHECKS
      let canAdapt = comparison.needsAdaptation;
      let skipReason = '';

      // Check 1: Tuya DP devices (highest priority)
      if (clusterAnalysis.isTuyaDP) {
        this.log('  [SMART ADAPT] TUYA DP DEVICE - Adaptation disabled');
        this.log(`      Model: ${deviceInfo.modelId || 'Unknown'}`);
        this.log(`      Manufacturer: ${deviceInfo.manufacturer || 'Unknown'}`);
        this.log('        Cluster CLUSTERS.TUYA_EF00 not visible - cluster analysis unreliable');
        this.log(`       Current driver will be preserved: ${driverId}`);
        skipReason = 'Tuya DP device (cluster analysis unreliable)';
        canAdapt = false;
      } else if (isProtected) {
        this.log('  [SMART ADAPT] Driver is PROTECTED - Adaptation disabled');
        this.log(`      Protected driver: ${driverId}`);
        skipReason = 'Driver is in protected list';
        canAdapt = false;
      } else if (isSensorOrMonitor && clusterAnalysis.deviceType === 'switch') {
        this.log('  [SMART ADAPT] SAFETY: Sensor/Monitor cannot become Switch!');
        this.log(`      Current driver: ${driverId}`);
        this.log(`      Detected type: ${clusterAnalysis.deviceType} (confidence: ${(confidence*100).toFixed(0)}%)`);
        this.log('        This is a FALSE POSITIVE - keeping current driver');
        this.log('      Reason: Tuya DP devices show only basic+onOff clusters');
        skipReason = 'Sensor cannot become switch (likely Tuya DP device)';
        canAdapt = false;
      } else if (isSensorOrMonitor && clusterAnalysis.deviceType === 'outlet') {
        this.log('  [SMART ADAPT] SAFETY: Sensor/Monitor cannot become Outlet!');
        this.log(`      Current driver: ${driverId}`);
        this.log(`      Detected type: ${clusterAnalysis.deviceType}`);
        this.log('        FALSE POSITIVE - keeping current driver');
        skipReason = 'Sensor cannot become outlet';
        canAdapt = false;
      } else if (confidence < 0.95) {
        this.log('  [SMART ADAPT] Confidence too low for auto-adaptation');
        this.log(`      Confidence: ${(confidence*100).toFixed(0)}% (need 95%+)`);
        this.log(`      Current driver: ${driverId}`);
        this.log(`      Suggested type: ${clusterAnalysis.deviceType}`);
        this.log('        Manual driver change recommended if incorrect');
        skipReason = `Confidence too low (${(confidence*100).toFixed(0)}%)`;
        canAdapt = false;
      }

      // 5. Adapter si nÃ©cessaire ET sÃ»r
      if (canAdapt) {
        this.log(' [SMART ADAPT] Safety checks passed - proceeding with adaptation');
        await this.adaptDriver(comparison, realCapabilities);
      } else if (comparison.needsAdaptation) {
        this.log('  [SMART ADAPT] Adaptation NEEDED but UNSAFE - skipping');
        this.log(`      Reason: ${skipReason}`);
        this.log('        Current driver will be preserved');
      } else {
        this.log(' [SMART ADAPT] Driver is CORRECT - No adaptation needed');
      }

      // 6. Configuration automatique des capacitÃ©s
      await this.autoConfigureCapabilities(realCapabilities);

      // 7.  SAFE DRIVER ASSIGNMENT (NEW v4.9.312)
      this.log(' [SMART ADAPT] Checking driver assignment (SAFE mode)...');

      // Get user preference first (HIGHEST PRIORITY)
      const userPref = await getUserPreferredDriver(this.device.getData().id);
      if (userPref) {
        this.log(` [SAFE-SWITCH] User preferred driver: ${userPref}`);
        this.log(' [SAFE-SWITCH] User preference LOCKS driver - auto-migration DISABLED');
      }

      const migrationCheck = detectRecommendedDriver(this.device, deviceInfo);

      // v5.3.15: SAFETY CHECK - Never migrate if current/recommended is undefined
      if (!migrationCheck.currentDriver || migrationCheck.currentDriver === 'undefined') {
        this.log(' [SAFE-SWITCH] Cannot determine current driver - skipping migration check');
        // v5.5.18: Return valid result instead of undefined
        return { success: true, deviceInfo, realCapabilities, comparison, migration, skipped: 'no_current_driver' };
      }

      if (!migrationCheck.recommendedDriver || migrationCheck.recommendedDriver === 'undefined') {
        this.log(' [SAFE-SWITCH] No valid recommended driver - keeping current');
        // v5.5.18: Return valid result instead of undefined
        return { success: true, deviceInfo, realCapabilities, comparison, migration, skipped: 'no_recommended_driver' };
      }

      if (migrationCheck.shouldMigrate) {
        this.log('  [SAFE-SWITCH] Driver mismatch detected!');
        this.log(`      Current: ${migrationCheck.currentDriver}`);
        this.log(`      Recommended: ${migrationCheck.recommendedDriver}`);
        this.log(`      Confidence: ${migrationCheck.confidence*100}%`);
        this.log(`      Reason: ${migrationCheck.reason}`);

        // NEW: Safety checks before migration
        const switchDecision = await ensureDriverAssignment(
          this.device,
          migrationCheck.currentDriver,
          migrationCheck.recommendedDriver,
          { ...deviceInfo, ...clusterAnalysis, driverConfidence: migrationCheck.confidence }
        );

        this.log(`[SAFE-SWITCH] Decision: ${switchDecision.action}`);
        this.log(`[SAFE-SWITCH] Reason: ${switchDecision.reason}`);

        if (switchDecision.action === 'recommended') {
          // Safety checks passed - attempt migration
          this.log(' [SAFE-SWITCH] All safety checks PASSED - attempting migration...');

          const migrationResult = await autoMigrateDriver(this.device, migrationCheck.recommendedDriver);

          // v5.2.77: Handle different migration result types
          // - true (legacy) or { queued: true, requiresManualAction: false } = auto migrated
          // - { queued: true, requiresManualAction: true } = queued for manual action
          // - false or { queued: false } = failed
          if (migrationResult === true || (migrationResult?.queued && !migrationResult?.requiresManualAction)) {
            this.log(' [SAFE-SWITCH] SUCCESS - Device migrated automatically!');
          } else if (migrationResult?.queued && migrationResult?.requiresManualAction) {
            // Migration queued but requires manual action - DON'T say "SUCCESS auto"
            this.log(' [SAFE-SWITCH] Migration QUEUED - Manual action required');
            this.log('  SDK3 limitation: Device must be removed and re-paired');
          } else {
            this.log('  [SAFE-SWITCH] FAILED - Manual migration required');
            this.log('  User action needed: Remove device and re-pair with correct driver');
          }
        } else if (switchDecision.action === 'blocked_by_user_preference') {
          this.log(' [SAFE-SWITCH] BLOCKED by user preference - respecting user choice');
          this.log('  User explicitly chose this driver - not overriding');
        } else {
          this.log('  [SAFE-SWITCH] Migration NOT SAFE - keeping current driver');
          this.log(`  ${switchDecision.reason}`);
        }
      } else {
        this.log(' [SAFE-SWITCH] Driver is correct - No migration needed');
      }

      // 8.  DATA COLLECTION & KPI (NEW v4.9.313)
      this.log(' [SMART ADAPT] Configuring data collection & KPI...');

      try {
        // Configure attribute reporting (battery, power, climate, etc.)
        if (this.device.zclNode) {
          this.log(' [CLUSTER-CONFIG] Auto-configuring attribute reporting...');
          const reportingConfig = await autoConfigureReporting(this.device, this.device.zclNode);
          this.log(' [CLUSTER-CONFIG] Configuration complete:', reportingConfig);

          // Register report listeners
          this.log(' [DATA-COLLECTOR] Registering attribute report listeners...');
          await registerReportListeners(this.device, this.device.zclNode);
          this.log(' [DATA-COLLECTOR] Listeners registered');

          // Start periodic polling (fallback, 5 minutes)
          this.log(' [DATA-COLLECTOR] Starting periodic polling (5min interval)...');
          const pollingInterval = startPeriodicPolling(this.device, this.device.zclNode, 300000);

          // Store interval handle for cleanup
          this.device.setStoreValue('pollingInterval', pollingInterval).catch(() => { });
          this.log(' [DATA-COLLECTOR] Polling started');

          // Log current KPI if available
          const kpi = await getDeviceKpi(this.device.homey, this.device.getData().id);
          if (kpi) {
            this.log(' [ENERGY-KPI] Current KPI:', kpi);
          }
        } else {
          this.log('  [DATA-COLLECTOR] No ZCL node - skipping data collection setup');
        }
      } catch (err) {
        this.error(' [DATA-COLLECTOR] Setup error:', err.message);
      }

      this.log(''.repeat(70));
      this.log(' [SMART ADAPT] ADAPTATION COMPLETE');
      this.log(''.repeat(70));
      this.log('');

      return {
        success: true,
        deviceInfo,
        realCapabilities,
        comparison,
        migration: migrationCheck
      };

    } catch (err) {
      this.error(' [SMART ADAPT] Adaptation failed:', err.message);
      this.error('   Stack:', err.stack);
      return { success: false, error: err };
    }
  }

  /**
   * Collecte les informations sur le device (ENRICHED VERSION)
   * BasÃ© sur: athombv/node-homey-zigbeedriver & node-zigbee-clusters
   * Lit: node descriptor, server/client clusters, attributes, commands
   */
  async collectDeviceInfo() {
    this.log(' [SMART ADAPT] Collecting device information (enriched)...');

    const info = {
      name: this.device.getName(),
      driverId: this.device.driver.id,
      class: this.device.getClass(),
      data: this.device.getData(),
      settings: this.device.getSettings(),
      capabilities: this.device.getCapabilities(),
      manufacturer,
      modelId,
      nodeDescriptor,
      powerSource: 'unknown',
      endpoints: {},
      clusters: {}
    };

    // Get manufacturer/model from multiple sources
    const deviceData = this.device.getData() || {};

    // ZCL Node info
    if (this.device.zclNode) {
      info.manufacturer = deviceData.manufacturerName ||
        this.device.zclNode.manufacturerName ||
        this.device.getStoreValue('manufacturerName') ||
        null;
      info.modelId = deviceData.productId ||
        deviceData.modelId ||
        this.device.zclNode.modelId ||
        this.device.getStoreValue('modelId') ||
        null;

      //  v4.9.325: Check centralized driver mapping database
      if (info.modelId && info.manufacturer) {
        const dbInfo = getDeviceInfo(info.modelId, info.manufacturer);
        if (dbInfo) {
          this.log(`    [DATABASE] Found device: ${dbInfo.name}`);
          this.log(`      Recommended driver: ${dbInfo.driver}`);
          this.log(`      Type: ${dbInfo.type}`);
          info.databaseInfo = dbInfo;

          // Check if current driver is deprecated
          const deprecation = checkDeprecated(this.device.driver.id);
          if (deprecation.deprecated) {
            this.log('     [DATABASE] Current driver is DEPRECATED!');
            this.log(`      Reason: ${deprecation.reason}`);
            if (deprecation.mapTo) {
              this.log(`      Should use: ${deprecation.mapTo}`);
              info.deprecatedDriverReplacement = deprecation.mapTo;
            }
          }
        } else {
          this.log('     [DATABASE] Device not in database (using detection fallback)');
        }
      }

      //  READ NODE DESCRIPTOR (contains power source!)
      try {
        const node = await this.device.homey.zigbee.getNode(this.device).catch(() => null);
        if (node && node.nodeDescriptor) {
          info.nodeDescriptor = {
            type: node.nodeDescriptor.type || 'unknown',
            manufacturerCode: node.nodeDescriptor.manufacturerCode || null,
            powerSource: node.nodeDescriptor.receiverOnWhenIdle ? 'mains' : 'battery'
          };

          // Set power source from node descriptor (ACCURATE!)
          info.powerSource = info.nodeDescriptor.powerSource;

          this.log(`    Node descriptor: type=${info.nodeDescriptor.type}, powerSource=${info.powerSource}`);
        }
      } catch (err) {
        this.error('     Failed to read node descriptor:', err.message);
      }

      // Enumerate endpoints with DETAILED cluster information
      const endpointIds = Object.keys(this.device.zclNode.endpoints || {});
      this.log(`    Found ${endpointIds.length} endpoint(s): ${endpointIds.join(', ')}`);

      for (const epId of endpointIds) {
        const endpoint = this.device.zclNode.endpoints[epId];
        if (!endpoint) continue;

        info.endpoints[epId] = {
          deviceId: endpoint.deviceId,
          profileId: endpoint.profileId,
          inputClusters: [],    //  Server clusters
          outputClusters: [],   //  Client clusters
          clusterDetails: {}
        };

        // Get cluster names
        const clusterNames = Object.keys(endpoint.clusters || {});

        for (const clusterName of clusterNames) {
          const cluster = endpoint.clusters[clusterName];
          if (!cluster) continue;

          const clusterInfo = {
            name: clusterName,
            id: cluster.id,
            isServer: false,
            isClient: false,
            attributes: [],
            commands: []
          };

          //  Distinguish SERVER vs CLIENT clusters
          // Based on zigbee-clusters library architecture
          try {
            const hasAttributes = cluster.attributes && Object.keys(cluster.attributes).length > 0;
            const hasCommands = cluster.commands && Object.keys(cluster.commands).length > 0;

            if (hasAttributes) {
              clusterInfo.isServer = true;
              info.endpoints[epId].inputClusters.push(clusterName);
            }

            if (hasCommands) {
              clusterInfo.isClient = true;
              info.endpoints[epId].outputClusters.push(clusterName);
            }
          } catch (err) {
            // Silent fail
          }

          //  Read attribute names AND metadata
          const attributeNames = Object.keys(cluster.attributes || {});
          for (const attrName of attributeNames) {
            const attr = cluster.attributes[attrName];
            clusterInfo.attributes.push({
              name: attrName,
              id: attr?.id,
              reportable: attr?.reportable || false,
              readable: attr?.readable !== false,
              writable: attr?.writable || false
            });
          }

          //  List available commands
          const commandNames = Object.keys(cluster.commands || {});
          clusterInfo.commands = commandNames;

          // Store cluster details
          info.endpoints[epId].clusterDetails[clusterName] = clusterInfo;

          // Also store in global clusters map (backward compatibility)
          if (!info.clusters[clusterName]) {
            info.clusters[clusterName] = [];
          }
          info.clusters[clusterName].push({
            endpoint: epId,
            id: cluster.id,
            isServer: clusterInfo.isServer,
            isClient: clusterInfo.isClient,
            attributes: attributeNames,
            commands: commandNames
          });
        }
      }
    }

    //  READ BATTERY & ENERGY (v4.9.312)
    if (this.device.zclNode) {
      this.log('    [BATTERY-READER] Attempting enhanced battery/energy read...');

      try {
        // Read battery with fallbacks
        const batteryData = await readBattery(this.device, this.device.zclNode);
        if (batteryData.percent !== null || batteryData.voltage !== null) {
          info.battery = batteryData;
          this.log(`    Battery read: ${batteryData.percent !== null ? batteryData.percent + '%' : 'N/A'} (${batteryData.voltage !== null ? batteryData.voltage + 'V' : 'N/A'}) [${batteryData.source}]`);

          // Store for future reference
          if (batteryData.percent !== null) {
            await this.device.setStoreValue('last_battery_percent', batteryData.percent).catch(() => { });
          }
        } else {
          this.log(`     Battery read: No data (source: ${batteryData.source})`);
          info.battery = null;
        }
      } catch (err) {
        this.error('     Battery read failed:', err.message);
        info.battery = null;
      }

      try {
        // Read energy for mains-powered devices
        if (info.powerSource === 'mains') {
          const energyData = await readEnergy(this.device, this.device.zclNode);
          if (energyData.power !== null || energyData.voltage !== null || energyData.current !== null) {
            info.energy = energyData;
            this.log(`    Energy read: ${energyData.power !== null ? energyData.power + 'W' : 'N/A'}, ${energyData.voltage !== null ? energyData.voltage + 'V' : 'N/A'}, ${energyData.current !== null ? energyData.current + 'A' : 'N/A'} [${energyData.source}]`);
          } else {
            this.log(`     Energy read: No data (source: ${energyData.source})`);
            info.energy = null;
          }
        }
      } catch (err) {
        this.error('     Energy read failed:', err.message);
        info.energy = null;
      }
    }

    this.log('    Device info collected (enriched)');
    this.log(`      Manufacturer: ${info.manufacturer || 'Unknown'}`);
    this.log(`      Model: ${info.modelId || 'Unknown'}`);
    this.log(`      Power Source: ${info.powerSource}`);
    this.log(`      Endpoints: ${Object.keys(info.endpoints).length}`);
    this.log(`      Clusters: ${Object.keys(info.clusters).length}`);
    if (info.battery) {
      this.log(`      Battery: ${info.battery.percent !== null ? info.battery.percent + '%' : 'N/A'} [${info.battery.source}]`);
    }
    if (info.energy) {
      this.log(`      Energy: ${info.energy.power !== null ? info.energy.power + 'W' : 'N/A'} [${info.energy.source}]`);
    }

    return info;
  }

  /**
   * Analyse les clusters pour dÃ©terminer le type de device
   */
  async analyzeClusters(deviceInfo) {
    this.log(' [SMART ADAPT] Analyzing clusters...');

    const analysis = {
      deviceType: 'unknown',
      powerSource: 'unknown',
      features: [],
      confidence: 0,
      isTuyaDP: false
    };

    //  PRIORITY 0: Check device overrides FIRST
    const override = getDeviceOverride(deviceInfo.modelId, deviceInfo.manufacturer);
    const dbInfo = deviceInfo.databaseInfo; // Loaded in collectDeviceInfo

    if (override) {
      this.log(`    OVERRIDE FOUND: ${override.name || override.modelId}`);

      if (override.preventAdaptation) {
        this.log('     preventAdaptation = true  Skipping analysis');
        analysis.deviceType = override.deviceType;
        analysis.powerSource = override.powerSource;
        analysis.confidence = 0.0; // Prevent adaptation
        this.log(`      Device Type: ${analysis.deviceType} (override)`);
        this.log(`      Power Source: ${analysis.powerSource} (override)`);
        return analysis;
      }
    }

    //  PRIORITY 0b: Use Database Hints (leveraging Z2M enrichment)
    if (dbInfo && dbInfo.type && dbInfo.type !== 'other') {
      this.log(`    [DATABASE HINT] Device is listed as: ${dbInfo.type}`);
      analysis.deviceTypeHint = dbInfo.type;
      analysis.descriptionHint = dbInfo.description;
    }

    // Use power source from node descriptor if available
    if (deviceInfo.nodeDescriptor) {
      analysis.powerSource = detectPowerSource(deviceInfo.nodeDescriptor);
      this.log(`    Power source from node descriptor: ${analysis.powerSource}`);
    }

    const clusters = deviceInfo.clusters;

    //  CRITICAL: Detect Tuya DP devices (TS0601) FIRST
    // These devices use cluster CLUSTERS.TUYA_EF00 which is NOT visible in standard cluster analysis
    // They show ONLY basic+onOff clusters, but have sensors/KPIs via DP protocol
    const isTuyaDPDevice = isTuyaDP(deviceInfo);

    if (isTuyaDPDevice) {
      this.log('     TUYA DP DEVICE DETECTED (TS0601/_TZE*)');
      this.log('     Cluster analysis will be UNRELIABLE!');
      this.log('     Device uses cluster CLUSTERS.TUYA_EF00 (not visible in standard list)');
      this.log('     Will trust current driver instead of cluster analysis');

      analysis.isTuyaDP = true;
      analysis.confidence = 0.0; // Force low confidence to prevent adaptation

      // Get current driver info to preserve it
      const currentDriver = this.device?.driver?.id || '';

      // Infer device type from current driver name
      if (currentDriver.includes('climate') || currentDriver.includes('sensor') || currentDriver.includes('soil')) {
        analysis.deviceType = 'sensor';
        analysis.powerSource = 'battery'; // Most sensors are battery-powered
        this.log('    Inferred from driver: sensor (battery)');
      } else if (currentDriver.includes('presence') || currentDriver.includes('radar')) {
        analysis.deviceType = 'presence';
        analysis.powerSource = 'battery';
        this.log('    Inferred from driver: presence (battery)');
      } else if (currentDriver.includes('thermostat')) {
        analysis.deviceType = 'thermostat';
        analysis.powerSource = 'ac';
        this.log('    Inferred from driver: thermostat (ac)');
      } else {
        // Unknown Tuya DP device - trust current driver
        analysis.deviceType = 'tuya_dp_unknown';
        analysis.powerSource = 'unknown';
        this.log('     Unknown Tuya DP device - trusting current driver');
      }

      // Return early - don't do cluster analysis for Tuya DP devices
      this.log('    Cluster analysis complete (Tuya DP bypass)');
      this.log(`      Device Type: ${analysis.deviceType} (confidence: ${analysis.confidence})`);
      this.log(`      Power Source: ${analysis.powerSource}`);
      this.log('      Note: Tuya DP devices require current driver preservation');

      return analysis;
    }

    // Standard ZCL clusters mapping for ANY device
    this.clusterToCapMap = {
      'genOnOff': ['onoff'],
      'genLevelCtrl': ['dim'],
      'msTemperatureMeasurement': ['measure_temperature'],
      'msRelativeHumidity': ['measure_humidity'],
      'msIlluminanceMeasurement': ['measure_luminance'],
      'msOccupancySensing': ['alarm_motion'],
      'ssIasZone': ['alarm_contact', 'alarm_motion', 'alarm_water'], 
      'genPowerCfg': ['measure_battery'],
      'seMetering': ['measure_power', 'meter_power'],
      'haElectricalMeasurement': ['measure_power', 'measure_voltage', 'measure_current'],
      'lightingColorCtrl': ['light_hue', 'light_saturation', 'light_temperature']
    };

    // PRIORITÃ‰ 1: USB Outlet detection (AVANT switch/dimmer!)
    // Use intelligent database if available, otherwise fallback to hardcoded list
    let usbOutletManufacturers = [
      '_TZ3000_1obwwnmq', '_TZ3000_w0qqde0g', '_TZ3000_gjnozsaz',
      '_TZ3000_8gs8h2e4', '_TZ3000_vzopcetz', '_TZ3000_g5xawfcq',
      '_TZ3000_h1ipgkwn', '_TZ3000_rdtixbnu', '_TZ3000_2xlvlnvp',
      '_TZ3000_typdpbpg', '_TZ3000_cymsnfvf', '_TZ3000_okaz9tjs',
      '_TZ3000_9hpxg80k', '_TZ3000_wxtp7c5y', '_TZ3000_o005nuxx',
      '_TZ3000_ksw8qtmt', '_TZ3000_7ysdnebc', '_TZ3000_cphmq0q7'
    ];

    let usbOutletProductIds = [
      'TS011F', 'TS0121', 'TS011E', 'TS0001', 'TS0002'
    ];

    //  INTELLIGENT DATABASE: Use live data from all drivers
    if (this.identificationDatabase) {
      const dbManufacturers = this.identificationDatabase.getManufacturerIds('usb_outlet');
      const dbProductIds = this.identificationDatabase.getProductIds('usb_outlet');

      if (dbManufacturers.length > 0) {
        usbOutletManufacturers = dbManufacturers;
        this.log(`    [SMART ADAPT] Using intelligent database: ${dbManufacturers.length} USB outlet manufacturer IDs`);
      }
      if (dbProductIds.length > 0) {
        usbOutletProductIds = dbProductIds;
        this.log(`    [SMART ADAPT] Using intelligent database: ${dbProductIds.length} USB outlet product IDs`);
      }
    }

    const isUsbOutlet = (
      (deviceInfo.modelId && usbOutletProductIds.some(id => CI.containsCI(deviceInfo.modelId, id))) ||
      (deviceInfo.manufacturer && usbOutletManufacturers.some(id => CI.containsCI(deviceInfo.manufacturer, id))) ||
      (Object.keys(deviceInfo.endpoints).length >= 2 && clusters.onOff && (clusters.seMetering || clusters.haElectricalMeasurement))
    );

    //  SUPER CRITICAL: Button/Remote detection FIRST - BEFORE EVERYTHING!
    // Buttons have onOff cluster but NO onoff capability (they SEND commands, not receive)
    const hasOnOffCluster = clusters.onOff;
    const hasPowerConfig = clusters.genPowerCfg || clusters.power || clusters.powerConfiguration;
    const currentDriverName = this.device?.driver?.id || '';
    const currentCapabilities = this.device?.capabilities || [];const hasOnOffCapability = currentCapabilities.includes('onoff');
    const hasBatteryCapability = currentCapabilities.includes('measure_battery');

    // Button indicators (STRONGEST priority):
    // 1. Driver name contains "button" or "remote" or "wireless" or "scene"
    // 2. Has battery cluster (buttons are ALWAYS battery powered)
    // 3. Does NOT have onoff capability (buttons send, not receive)
    const isButtonDriver = (
      currentDriverName.includes('button') ||
      currentDriverName.includes('remote') ||
      currentDriverName.includes('wireless') ||
      currentDriverName.includes('scene')
    );

    // CRITICAL: If driver name suggests button, it IS a button!
    if (isButtonDriver) {
      analysis.deviceType = 'button';
      analysis.powerSource = 'battery';
      // Buttons DON'T have onoff capability - they SEND commands
      // They ONLY need measure_battery
      if (hasBatteryCapability) {
        analysis.features.push('battery');
      }
      analysis.confidence = 0.99;  // HIGHEST confidence!
      this.log('    BUTTON/REMOTE DETECTED (from driver name) - Controller device, NOT controllable!');
      this.log('    CRITICAL: Will NOT add onoff capability (buttons send commands, not receive)');

      // RETURN immediately to prevent switch detection!
      return analysis;
    }

    // USB Outlet detection (SECOND priority)
    //  FIX: Use switch drivers instead of non-existent usb_outlet driver!
    if (isUsbOutlet) {
      analysis.features.push('onoff');

      //  DÃ‰TECTION MULTI-ENDPOINT (using helper)
      const multiGangInfo = detectMultiGang(deviceInfo);

      this.log('    USB Outlet multi-gang detection:');
      this.log(`      isMultiGang: ${multiGangInfo.isMultiGang}`);
      this.log(`      gangCount: ${multiGangInfo.gangCount}`);
      this.log(`      endpoints: ${multiGangInfo.endpoints.join(', ')}`);

      if (multiGangInfo.isMultiGang) {
        //  FIX: Map to existing switch_X_gang drivers!
        analysis.deviceType = 'switch';
        analysis.subType = `${multiGangInfo.gangCount}gang`;
        analysis.features.push('multi_endpoint');

        // Generate capabilities for each gang
        analysis.requiredCapabilities = [];
        for (let i = 1; i <= multiGangInfo.gangCount; i++) {
          if (i === 1) {
            analysis.requiredCapabilities.push('onoff');
          } else {
            analysis.requiredCapabilities.push(`onoff.gang${i}`);
          }
        }

        this.log(`     USB OUTLET ${multiGangInfo.gangCount}-GANG  switch_${multiGangInfo.gangCount}_gang`);
      } else {
        //  FIX: Map to switch_1_gang driver!
        analysis.deviceType = 'switch';
        analysis.subType = '1gang';
        analysis.requiredCapabilities = ['onoff'];
        this.log('     USB OUTLET 1-GANG  switch_1_gang');
      }

      analysis.features.push('measure_power');
      if (clusters.haElectricalMeasurement) {
        analysis.features.push('measure_voltage');
        analysis.features.push('measure_current');
      }
      analysis.confidence = 0.98;
      this.log('    USB OUTLET DETECTED - Mapped to switch driver (usb_outlet driver does not exist)');
    }
    // Switch/Outlet detection (ONLY if NOT a button!)
    else if (hasOnOffCluster) {
      analysis.features.push('onoff');

      // DÃ©tection de dimmer
      if (clusters.levelControl) {
        analysis.deviceType = 'dimmer';
        analysis.features.push('dim');
      } else {
        analysis.deviceType = 'switch';
      }

      // DÃ©tection de outlets avec mesure de puissance
      if (clusters.seMetering || clusters.haElectricalMeasurement) {
        analysis.deviceType = 'outlet';
        analysis.features.push('measure_power');
        if (clusters.haElectricalMeasurement) {
          analysis.features.push('measure_voltage');
          analysis.features.push('measure_current');
        }
      }

      //  MULTI-GANG DETECTION (for regular switches too!)
      const endpointCount = Object.keys(deviceInfo.endpoints).length;
      const hasMultipleOnOffEndpoints = Object.values(deviceInfo.endpoints).filter(
        ep => ep.clusters && (ep.clusters.includes('onOff') || ep.clusters.includes('0x0006'))
      ).length >= 2;

      if (hasMultipleOnOffEndpoints || endpointCount >= 2) {
        analysis.subType = '2gang';
        analysis.features.push('multi_endpoint');
        // Note: Don't add onoff.usb2 for regular switches - that's USB outlet specific
        // Regular 2-gang switches use different capability mapping
        this.log(`    Multi-gang switch detected (${endpointCount} endpoints)`);
        this.log('     Should use switch_basic_2gang or outlet_2gang driver');
      } else {
        analysis.subType = '1gang';
      }

      analysis.confidence = 0.9;
    }

    // Light detection
    if (clusters.lightingColorCtrl) {
      analysis.deviceType = 'light';
      analysis.features.push('onoff', 'dim');

      // RGB/RGBW detection
      if (clusters.lightingColorCtrl[0]?.attributes?.currentHue !== undefined) {
        analysis.features.push('light_hue', 'light_saturation');
      }
      if (clusters.lightingColorCtrl[0]?.attributes?.colorTemperature !== undefined) {
        analysis.features.push('light_temperature');
      }

      analysis.confidence = 0.95;
    }

    // Sensor detection
    if (clusters.msTemperatureMeasurement ||
      clusters.msRelativeHumidity ||
      clusters.msIlluminanceMeasurement ||
      clusters.msOccupancySensing ||
      clusters.ssIasZone) {

      analysis.deviceType = 'sensor';

      if (clusters.msTemperatureMeasurement) {
        analysis.features.push('measure_temperature');
      }
      if (clusters.msRelativeHumidity) {
        analysis.features.push('measure_humidity');
      }
      if (clusters.msIlluminanceMeasurement) {
        analysis.features.push('measure_luminance');
      }
      if (clusters.msOccupancySensing) {
        analysis.features.push('alarm_motion');
      }
      if (clusters.ssIasZone) {
        // DÃ©tection du type IAS
        analysis.features.push('alarm_contact'); // ou alarm_motion, alarm_smoke, etc.
      }

      analysis.confidence = 0.85;
    }

    // Button/Remote detection
    if (clusters.genOnOff && !clusters.onOff) {
      // GenOnOff sans OnOff = probablement un button
      analysis.deviceType = 'button';
      analysis.features.push('button');
      analysis.confidence = 0.8;
    }

    // Thermostat detection
    if (clusters.hvacThermostat) {
      analysis.deviceType = 'thermostat';
      analysis.features.push('target_temperature', 'measure_temperature');
      analysis.confidence = 0.95;
    }

    // Lock detection
    if (clusters.closuresDoorLock) {
      analysis.deviceType = 'lock';
      analysis.features.push('locked');
      analysis.confidence = 0.95;
    }

    // Window covering detection
    if (clusters.closuresWindowCovering) {
      analysis.deviceType = 'windowcoverings';
      analysis.features.push('windowcoverings_state');
      analysis.confidence = 0.95;
    }

    // Power source detection
    if (clusters.genPowerCfg) {
      const powerCfg = clusters.genPowerCfg[0];
      if (powerCfg && powerCfg.attributes) {
        if (powerCfg.attributes.batteryVoltage !== undefined ||
          powerCfg.attributes.batteryPercentageRemaining !== undefined) {
          analysis.powerSource = 'battery';
          analysis.features.push('measure_battery');
        } else if (powerCfg.attributes.mainsVoltage !== undefined) {
          analysis.powerSource = 'ac';
        }
      }
    }

    // Si pas de genPowerCfg et c'est un switch/outlet = probablement AC
    if (analysis.powerSource === 'unknown' &&
      (analysis.deviceType === 'switch' || analysis.deviceType === 'outlet' || analysis.deviceType === 'dimmer')) {
      analysis.powerSource = 'ac';
    }

    // Si c'est un sensor sans indication = probablement battery
    if (analysis.powerSource === 'unknown' &&
      (analysis.deviceType === 'sensor' || analysis.deviceType === 'button')) {
      analysis.powerSource = 'battery';
      if (!analysis.features.includes('measure_battery')) {
        analysis.features.push('measure_battery');
      }
    }

    this.log('    Cluster analysis complete');
    this.log(`      Device Type: ${analysis.deviceType} (confidence: ${analysis.confidence})`);
    this.log(`      Power Source: ${analysis.powerSource}`);
    this.log(`      Features: ${analysis.features.join(', ')}`);

    return analysis;
  }

  /**
   * Detect real capabilities based on clusters (UNIVERSAL VERSION)
   */
  async detectRealCapabilities(clusterAnalysis, deviceInfo) {
    this.log(' [SMART ADAPT] Detecting real capabilities (Universal)...');

    const caps = new Set();
    const clusters = deviceInfo.clusters;

    // 1. Map standard ZCL clusters to capabilities
    if (this.clusterToCapMap) {
      for (const [cluster, targetCaps] of Object.entries(this.clusterToCapMap)) {
        if (clusters[cluster]) {
          targetCaps.forEach(c => caps.add(c));
        }
      }
    }

    const capabilities = {
      required: Array.from(caps),
      optional: [],
      forbidden: []
    };

    //  Check device override for capability specification
    const override = getDeviceOverride(deviceInfo.modelId, deviceInfo.manufacturer);
    if (override && override.capabilities) {
      this.log(`    Override capabilities specified: ${override.capabilities.join(', ')}`);
      capabilities.required = [...override.capabilities];

      // Check fallback for presence sensors
      if (override.fallbackCapability) {
        await mapPresenceFallback(this.device, deviceInfo);
      }

      // Preserve battery for battery devices
      if (override.preventRemoveBattery) {
        await preserveBatteryCapability(this.device, override.powerSource);
      }

      return capabilities;
    }

    // Mapping des features vers capabilities Homey
    const featureMapping = {
      'onoff': 'onoff',
      'dim': 'dim',
      'measure_power': 'measure_power',
      'measure_voltage': 'measure_voltage',
      'measure_current': 'measure_current',
      'meter_power': 'meter_power',
      'measure_temperature': 'measure_temperature',
      'measure_humidity': 'measure_humidity',
      'measure_luminance': 'measure_luminance',
      'alarm_motion': 'alarm_motion',
      'alarm_contact': 'alarm_contact',
      'measure_battery': 'measure_battery',
      'alarm_battery': 'alarm_battery',
      'button': 'button',
      'target_temperature': 'target_temperature',
      'locked': 'locked',
      'windowcoverings_state': 'windowcoverings_state',
      'light_hue': 'light_hue',
      'light_saturation': 'light_saturation',
      'light_temperature': 'light_temperature'
    };

    //  CRITICAL: Button/Remote special handling
    if (clusterAnalysis.deviceType === 'button') {
      this.log('    BUTTON DEVICE - Special capability rules:');
      this.log('       Buttons ONLY need: measure_battery');
      this.log('       Buttons MUST NOT have: onoff, dim, alarm_motion, etc.');

      // Buttons ONLY need battery
      if (clusterAnalysis.features.includes('battery')) {
        capabilities.required.push('measure_battery');
      }

      // Buttons MUST NOT have control capabilities
      capabilities.forbidden.push(
        'onoff',           // Buttons send commands, don't receive them!
        'dim',             // Not dimmable
        'alarm_motion',    // Not a sensor
        'alarm_contact',   // Not a sensor
        'measure_power',   // Not powered monitoring
        'measure_voltage', // Not voltage monitoring
        'measure_current'  // Not current monitoring
      );

      this.log('    Button capabilities configured correctly');
    } else {
      // Normal devices - convert features to capabilities
      for (const feature of clusterAnalysis.features) {
        const capability = featureMapping[feature];
        if (capability) {
          capabilities.required.push(capability);
        }
      }

      // Ajouter alarm_battery si measure_battery est prÃ©sent
      if (capabilities.required.includes('measure_battery') &&
        !capabilities.required.includes('alarm_battery')) {
        capabilities.optional.push('alarm_battery');
      }

      // Capabilities Ã NE PAS avoir
      if (clusterAnalysis.powerSource === 'ac') {
        capabilities.forbidden.push('measure_battery', 'alarm_battery');
      }

      if (clusterAnalysis.deviceType === 'switch' || clusterAnalysis.deviceType === 'outlet') {
        capabilities.forbidden.push('dim'); // Sauf si dimmer dÃ©tectÃ©
      }
    }

    // Supprimer les forbidden des required
    capabilities.required = capabilities.required.filter(c => !capabilities.forbidden.includes(c));

    this.log('    Real capabilities detected');
    this.log(`      Required: ${capabilities.required.join(', ') || 'none'}`);
    this.log(`      Optional: ${capabilities.optional.join(', ') || 'none'}`);
    this.log(`      Forbidden: ${capabilities.forbidden.join(', ') || 'none'}`);

    return capabilities;
  }

  /**
   * Compare avec le driver actuel
   */
  async compareWithCurrentDriver(realCapabilities) {
    this.log('  [SMART ADAPT] Comparing with current driver...');

    const currentCapabilities = this.device.getCapabilities();

    const comparison = {
      needsAdaptation: false,
      missing: [],
      incorrect: [],
      correct: []
    };

    // Capabilities manquantes
    for (const cap of realCapabilities.required) {
      if (!currentCapabilities.includes(cap)) {
        comparison.missing.push(cap);
        comparison.needsAdaptation = true;
      } else {
        comparison.correct.push(cap);
      }
    }

    // Capabilities incorrectes (forbidden mais prÃ©sentes)
    for (const cap of realCapabilities.forbidden) {
      if (currentCapabilities.includes(cap)) {
        comparison.incorrect.push(cap);
        comparison.needsAdaptation = true;
      }
    }

    this.log('    Comparison complete');
    this.log(`      Needs Adaptation: ${comparison.needsAdaptation ? 'YES' : 'NO'}`);

    if (comparison.needsAdaptation) {
      this.log(`        Missing: ${comparison.missing.join(', ') || 'none'}`);
      this.log(`       Incorrect: ${comparison.incorrect.join(', ') || 'none'}`);
    }
    this.log(`       Correct: ${comparison.correct.join(', ') || 'all'}`);

    return comparison;
  }

  /**
   * Adapte le driver aux capabilities rÃ©elles
   */
  async adaptDriver(comparison, realCapabilities) {
    // P2: Check mode before making changes
    const adaptMode = this.device.getSetting('smart_adapt_mode') || 'diagnostic_only';

    if (adaptMode === 'diagnostic_only') {
      this.log(' [DIAGNOSTIC MODE] Would make these changes:');
      if (comparison.incorrect.length > 0) {
        this.log(`    Would remove: ${comparison.incorrect.join(', ')}`);
      }
      if (comparison.missing.length > 0) {
        this.log(`    Would add: ${comparison.missing.join(', ')}`);
      }
      this.log('     Set smart_adapt_mode=active to enable automatic changes');
      return;
    }

    this.log(' [SMART ADAPT] Adapting driver to real capabilities...');

    let adapted = 0;

    // Supprimer les capabilities incorrectes
    for (const cap of comparison.incorrect) {
      try {
        if (this.device.hasCapability(cap)) {
          await this.device.removeCapability(cap);
          this.log(`       Removed incorrect capability: ${cap}`);
          adapted++;
        }
      } catch (err) {
        this.error(`        Failed to remove ${cap}:`, err.message);
      }
    }

    // Ajouter les capabilities manquantes (using safeAddCapability helper)
    for (const cap of comparison.missing) {
      const success = await safeAddCapability(this.device, cap);
      if (success) {
        adapted++;
      }
    }

    this.log(`    Driver adapted: ${adapted} changes made`);
  }

  /**
   * Configuration automatique des capacitÃ©s
   */
  async autoConfigureCapabilities(realCapabilities) {
    this.log('  [SMART ADAPT] Auto-configuring capabilities...');

    // Enregistrer des listeners pour chaque capability
    for (const cap of realCapabilities.required) {
      if (this.device.hasCapability(cap)) {
        await this.configureCapabilityListener(cap);
      }
    }

    this.log('    Capabilities auto-configured');
  }

  /**
   * Get metadata mapping for a capability (FOR UNIVERSAL DRIVER)
   */
  getCapabilityMapping(capability) {
    const mappings = {
      'onoff': {
        cluster: 'genOnOff',
        attribute: 'onOff',
        reportable: true,
        setCommand: async (val) => {
          const cluster = this.device.zclNode.endpoints[1].clusters.genOnOff || this.device.zclNode.endpoints[1].clusters.onOff;
          return await cluster[val ? 'setOn' : 'setOff']();
        }
      },
      'dim': {
        cluster: 'genLevelCtrl',
        attribute: 'currentLevel',
        reportable: true,
        minChange: 5,
        setCommand: async (val) => {
          const cluster = this.device.zclNode.endpoints[1].clusters.genLevelCtrl || this.device.zclNode.endpoints[1].clusters.levelControl;
          return await cluster.moveToLevelWithOnOff({ level: Math.round(val * 254), transitionTime: 0 });
        }
      },
      'measure_temperature': {
        cluster: 'msTemperatureMeasurement',
        attribute: 'measuredValue',
        reportable: true,
        minChange: 10 // 0.1 degree
      },
      'measure_humidity': {
        cluster: 'msRelativeHumidity',
        attribute: 'measuredValue',
        reportable: true,
        minChange: 100 // 1%
      },
      'measure_battery': {
        cluster: 'genPowerCfg',
        attribute: 'batteryPercentageRemaining',
        reportable: true,
        minChange: 2
      },
      'measure_power': {
        cluster: 'seMetering',
        attribute: 'instantaneousDemand',
        reportable: true,
        minChange: 1
      },
      'meter_power': {
        cluster: 'seMetering',
        attribute: 'currentSummationDelivered',
        reportable: true,
        minChange: 1
      },
      'alarm_motion': {
        cluster: 'ssIasZone',
        attribute: 'zoneStatus',
        reportable: true
      },
      'alarm_contact': {
        cluster: 'ssIasZone',
        attribute: 'zoneStatus',
        reportable: true
      }
    };
    return mappings[capability] || null;
  }

  /**
   * Configure un listener pour une capability spÃ©cifique
   */
  async configureCapabilityListener(capability) {
    try {
      // Si le device a dÃ©jÃ un listener, ne pas le remplacer
      if (this.device.capabilityListeners && this.device.capabilityListeners[capability]) {
        this.log(`       Listener already exists for: ${capability}`);
        return;
      }

      const mapping = this.getCapabilityMapping(capability);
      if (mapping && mapping.setCommand) {
        this.device.registerCapabilityListener(capability, mapping.setCommand);
        this.log(`       Configured listener for: ${capability}`);
      }
    } catch (err) {
      this.error(`        Failed to configure ${capability}:`, err.message);
    }
  }

  /**
   * GÃ©nÃ¨re un rapport d'adaptation
   */
  generateReport(result) {
    // v5.5.18: Handle undefined/null result
    if (!result) {
      return ' Adaptation failed: No result returned';
    }
    if (!result.success) {
      return ` Adaptation failed: ${result.error?.message || 'Unknown error'}`;
    }

    const report = [];
    report.push(''.repeat(70));
    report.push(' SMART DRIVER ADAPTATION REPORT');
    report.push(''.repeat(70));
    report.push('');
    report.push(` Device: ${result.deviceInfo.name}`);
    report.push(` Driver: ${result.deviceInfo.driverId}`);
    report.push(` Manufacturer: ${result.deviceInfo.manufacturer || 'Unknown'}`);
    report.push(` Model: ${result.deviceInfo.modelId || 'Unknown'}`);
    report.push('');
    report.push(' Real Capabilities Detected:');
    report.push(`   Required: ${result.realCapabilities.required.join(', ')}`);
    report.push(`   Optional: ${result.realCapabilities.optional.join(', ')}`);
    report.push(`   Forbidden: ${result.realCapabilities.forbidden.join(', ')}`);
    report.push('');
    report.push('  Comparison:');
    report.push(`   Status: ${result.comparison.needsAdaptation ? '  NEEDS ADAPTATION' : ' CORRECT'}`);

    if (result.comparison.needsAdaptation) {
      report.push(`   Missing: ${result.comparison.missing.join(', ') || 'none'}`);
      report.push(`   Incorrect: ${result.comparison.incorrect.join(', ') || 'none'}`);
    }

    report.push('');
    report.push(''.repeat(70));

    return report.join('\n');
  }
}

module.exports = SmartDriverAdaptation;



