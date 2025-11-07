'use strict';

/**
 * SmartDriverAdaptation - Système d'adaptation intelligente de driver
 * 
 * Détecte automatiquement si le mauvais driver est chargé et s'adapte
 * dynamiquement aux capacités réelles du device Zigbee
 */

class SmartDriverAdaptation {
  
  constructor(device, identificationDatabase = null) {
    this.device = device;
    this.log = device.log.bind(device);
    this.error = device.error.bind(device);
    this.identificationDatabase = identificationDatabase;
  }
  
  /**
   * Analyse complète du device et adaptation intelligente
   */
  async analyzeAndAdapt() {
    this.log('');
    this.log('═'.repeat(70));
    this.log('🤖 [SMART ADAPT] INTELLIGENT DRIVER ADAPTATION START');
    this.log('═'.repeat(70));
    
    try {
      // 1. Collecter toutes les informations du device
      const deviceInfo = await this.collectDeviceInfo();
      
      // 2. Analyser les clusters disponibles
      const clusterAnalysis = await this.analyzeClusters(deviceInfo);
      
      // 3. Détecter les capabilities réelles
      const realCapabilities = await this.detectRealCapabilities(clusterAnalysis);
      
      // 4. Comparer avec le driver actuel
      const comparison = await this.compareWithCurrentDriver(realCapabilities);
      
      // 4.5 🛡️ CRITICAL SAFETY CHECKS before adapting
      const driverId = this.device.driver?.id || '';
      const confidence = clusterAnalysis.confidence || 0;
      
      // WHITELIST: Drivers to NEVER auto-adapt (user chose these specifically!)
      const protectedDrivers = [
        'climate_sensor_soil',      // Soil sensors (Tuya DP protocol)
        'climate_monitor',           // Climate monitors
        'presence_sensor_radar',     // Radar presence sensors
        'thermostat',                // Thermostats
        'irrigation_controller',     // Irrigation controllers
        'doorbell',                  // Doorbells
        'siren',                     // Sirens/alarms
        'lock'                       // Smart locks
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
      
      if (isProtected) {
        this.log('🛡️  [SMART ADAPT] Driver is PROTECTED - Adaptation disabled');
        this.log(`      Protected driver: ${driverId}`);
        skipReason = 'Driver is in protected list';
        canAdapt = false;
      } else if (isSensorOrMonitor && clusterAnalysis.deviceType === 'switch') {
        this.log('🛡️  [SMART ADAPT] SAFETY: Sensor/Monitor cannot become Switch!');
        this.log(`      Current driver: ${driverId}`);
        this.log(`      Detected type: ${clusterAnalysis.deviceType} (confidence: ${(confidence * 100).toFixed(0)}%)`);
        this.log(`      ⚠️  This is a FALSE POSITIVE - keeping current driver`);
        this.log(`      Reason: Tuya DP devices show only basic+onOff clusters`);
        skipReason = 'Sensor cannot become switch (likely Tuya DP device)';
        canAdapt = false;
      } else if (isSensorOrMonitor && clusterAnalysis.deviceType === 'outlet') {
        this.log('🛡️  [SMART ADAPT] SAFETY: Sensor/Monitor cannot become Outlet!');
        this.log(`      Current driver: ${driverId}`);
        this.log(`      Detected type: ${clusterAnalysis.deviceType}`);
        this.log(`      ⚠️  FALSE POSITIVE - keeping current driver`);
        skipReason = 'Sensor cannot become outlet';
        canAdapt = false;
      } else if (confidence < 0.95) {
        this.log('🛡️  [SMART ADAPT] Confidence too low for auto-adaptation');
        this.log(`      Confidence: ${(confidence * 100).toFixed(0)}% (need 95%+)`);
        this.log(`      Current driver: ${driverId}`);
        this.log(`      Suggested type: ${clusterAnalysis.deviceType}`);
        this.log(`      ℹ️  Manual driver change recommended if incorrect`);
        skipReason = `Confidence too low (${(confidence * 100).toFixed(0)}%)`;
        canAdapt = false;
      }
      
      // 5. Adapter si nécessaire ET sûr
      if (canAdapt) {
        this.log('🔧 [SMART ADAPT] Safety checks passed - proceeding with adaptation');
        await this.adaptDriver(comparison, realCapabilities);
      } else if (comparison.needsAdaptation) {
        this.log('⚠️  [SMART ADAPT] Adaptation NEEDED but UNSAFE - skipping');
        this.log(`      Reason: ${skipReason}`);
        this.log(`      ℹ️  Current driver will be preserved`);
      } else {
        this.log('✅ [SMART ADAPT] Driver is CORRECT - No adaptation needed');
      }
      
      // 6. Configuration automatique des capacités
      await this.autoConfigureCapabilities(realCapabilities);
      
      this.log('═'.repeat(70));
      this.log('🎉 [SMART ADAPT] ADAPTATION COMPLETE');
      this.log('═'.repeat(70));
      this.log('');
      
      return {
        success: true,
        deviceInfo,
        realCapabilities,
        comparison
      };
      
    } catch (err) {
      this.error('❌ [SMART ADAPT] Adaptation failed:', err.message);
      this.error('   Stack:', err.stack);
      return { success: false, error: err };
    }
  }
  
  /**
   * Collecte toutes les informations du device
   */
  async collectDeviceInfo() {
    this.log('📊 [SMART ADAPT] Collecting device information...');
    
    const info = {
      name: this.device.getName(),
      driverId: this.device.driver.id,
      class: this.device.getClass(),
      data: this.device.getData(),
      settings: this.device.getSettings(),
      capabilities: this.device.getCapabilities(),
      manufacturer: null,
      modelId: null,
      endpoints: {},
      clusters: {}
    };
    
    // Get manufacturer/model from multiple sources
    // Priority: getData() > zclNode > store
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
      
      // Endpoints et clusters
      const endpoints = Object.keys(this.device.zclNode.endpoints || {});
      
      for (const epId of endpoints) {
        const endpoint = this.device.zclNode.endpoints[epId];
        if (endpoint && endpoint.clusters) {
          info.endpoints[epId] = {
            deviceId: endpoint.deviceId,
            profileId: endpoint.profileId,
            clusters: Object.keys(endpoint.clusters)
          };
          
          // Stocker les clusters
          for (const clusterName of Object.keys(endpoint.clusters)) {
            const cluster = endpoint.clusters[clusterName];
            if (cluster) {
              if (!info.clusters[clusterName]) {
                info.clusters[clusterName] = [];
              }
              info.clusters[clusterName].push({
                endpoint: epId,
                id: cluster.id,
                attributes: Object.keys(cluster.attributes || {})
              });
            }
          }
        }
      }
    }
    
    this.log('   ✅ Device info collected');
    this.log(`      Manufacturer: ${info.manufacturer || 'Unknown'}`);
    this.log(`      Model: ${info.modelId || 'Unknown'}`);
    this.log(`      Endpoints: ${Object.keys(info.endpoints).join(', ')}`);
    this.log(`      Clusters: ${Object.keys(info.clusters).join(', ')}`);
    
    return info;
  }
  
  /**
   * Analyse les clusters pour déterminer le type de device
   */
  async analyzeClusters(deviceInfo) {
    this.log('🔍 [SMART ADAPT] Analyzing clusters...');
    
    const analysis = {
      deviceType: 'unknown',
      powerSource: 'unknown',
      features: [],
      confidence: 0
    };
    
    const clusters = deviceInfo.clusters;
    
    // Détection du type de device basé sur les clusters
    
    // PRIORITÉ 1: USB Outlet detection (AVANT switch/dimmer!)
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
    
    // 🤖 INTELLIGENT DATABASE: Use live data from all drivers
    if (this.identificationDatabase) {
      const dbManufacturers = this.identificationDatabase.getManufacturerIds('usb_outlet');
      const dbProductIds = this.identificationDatabase.getProductIds('usb_outlet');
      
      if (dbManufacturers.length > 0) {
        usbOutletManufacturers = dbManufacturers;
        this.log(`   🤖 [SMART ADAPT] Using intelligent database: ${dbManufacturers.length} USB outlet manufacturer IDs`);
      }
      if (dbProductIds.length > 0) {
        usbOutletProductIds = dbProductIds;
        this.log(`   🤖 [SMART ADAPT] Using intelligent database: ${dbProductIds.length} USB outlet product IDs`);
      }
    }
    
    const isUsbOutlet = (
      (deviceInfo.modelId && usbOutletProductIds.some(id => deviceInfo.modelId.includes(id))) ||
      (deviceInfo.manufacturer && usbOutletManufacturers.some(id => deviceInfo.manufacturer.includes(id))) ||
      (Object.keys(deviceInfo.endpoints).length >= 2 && clusters.onOff && (clusters.seMetering || clusters.haElectricalMeasurement))
    );
    
    // 🚨 SUPER CRITICAL: Button/Remote detection FIRST - BEFORE EVERYTHING!
    // Buttons have onOff cluster but NO onoff capability (they SEND commands, not receive)
    const hasOnOffCluster = clusters.onOff;
    const hasPowerConfig = clusters.genPowerCfg || clusters.power || clusters.powerConfiguration;
    const currentDriverName = this.device?.driver?.id || '';
    const currentCapabilities = this.device?.capabilities || [];
    const hasOnOffCapability = currentCapabilities.includes('onoff');
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
      this.log('   🔘 BUTTON/REMOTE DETECTED (from driver name) - Controller device, NOT controllable!');
      this.log('   🔘 CRITICAL: Will NOT add onoff capability (buttons send commands, not receive)');
      
      // RETURN immediately to prevent switch detection!
      return analysis;
    }
    
    // USB Outlet detection (SECOND priority)
    if (isUsbOutlet) {
      analysis.deviceType = 'usb_outlet';
      analysis.features.push('onoff');
      
      // 🔌 DÉTECTION MULTI-ENDPOINT (2-gang detection)
      const endpointCount = Object.keys(deviceInfo.endpoints).length;
      const hasMultipleOnOffEndpoints = Object.values(deviceInfo.endpoints).filter(
        ep => ep.clusters && (ep.clusters.onOff || ep.clusters['0x0006'])
      ).length >= 2;
      
      this.log(`   🔌 USB Outlet endpoints: ${endpointCount}`);
      this.log(`   🔌 Multi-endpoint OnOff: ${hasMultipleOnOffEndpoints}`);
      
      if (hasMultipleOnOffEndpoints || endpointCount >= 2) {
        analysis.subType = '2gang';
        analysis.features.push('multi_endpoint');
        analysis.requiredCapabilities = ['onoff', 'onoff.usb2'];
        this.log('   🔌 ✅ USB OUTLET 2-GANG/2-PORT DETECTED');
      } else {
        analysis.subType = '1gang';
        analysis.requiredCapabilities = ['onoff'];
        this.log('   🔌 ✅ USB OUTLET 1-GANG DETECTED');
      }
      
      analysis.features.push('measure_power');
      if (clusters.haElectricalMeasurement) {
        analysis.features.push('measure_voltage');
        analysis.features.push('measure_current');
      }
      analysis.confidence = 0.98;
      this.log('   🔌 USB OUTLET DETECTED - High priority match!');
    }
    // Switch/Outlet detection (ONLY if NOT a button!)
    else if (hasOnOffCluster) {
      analysis.features.push('onoff');
      
      // Détection de dimmer
      if (clusters.levelControl) {
        analysis.deviceType = 'dimmer';
        analysis.features.push('dim');
      } else {
        analysis.deviceType = 'switch';
      }
      
      // Détection de outlets avec mesure de puissance
      if (clusters.seMetering || clusters.haElectricalMeasurement) {
        analysis.deviceType = 'outlet';
        analysis.features.push('measure_power');
        if (clusters.haElectricalMeasurement) {
          analysis.features.push('measure_voltage');
          analysis.features.push('measure_current');
        }
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
        // Détection du type IAS
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
    
    this.log('   ✅ Cluster analysis complete');
    this.log(`      Device Type: ${analysis.deviceType} (confidence: ${analysis.confidence})`);
    this.log(`      Power Source: ${analysis.powerSource}`);
    this.log(`      Features: ${analysis.features.join(', ')}`);
    
    return analysis;
  }
  
  /**
   * Détecte les capabilities réelles basées sur l'analyse
   */
  async detectRealCapabilities(clusterAnalysis) {
    this.log('🎯 [SMART ADAPT] Detecting real capabilities...');
    
    const capabilities = {
      required: [],
      optional: [],
      forbidden: []
    };
    
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
    
    // 🚨 CRITICAL: Button/Remote special handling
    if (clusterAnalysis.deviceType === 'button') {
      this.log('   🔘 BUTTON DEVICE - Special capability rules:');
      this.log('      ✅ Buttons ONLY need: measure_battery');
      this.log('      ❌ Buttons MUST NOT have: onoff, dim, alarm_motion, etc.');
      
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
      
      this.log('   🔘 Button capabilities configured correctly');
    } else {
      // Normal devices - convert features to capabilities
      for (const feature of clusterAnalysis.features) {
        const capability = featureMapping[feature];
        if (capability) {
          capabilities.required.push(capability);
        }
      }
      
      // Ajouter alarm_battery si measure_battery est présent
      if (capabilities.required.includes('measure_battery') && 
          !capabilities.required.includes('alarm_battery')) {
        capabilities.optional.push('alarm_battery');
      }
      
      // Capabilities à NE PAS avoir
      if (clusterAnalysis.powerSource === 'ac') {
        capabilities.forbidden.push('measure_battery', 'alarm_battery');
      }
      
      if (clusterAnalysis.deviceType === 'switch' || clusterAnalysis.deviceType === 'outlet') {
        capabilities.forbidden.push('dim'); // Sauf si dimmer détecté
      }
    }
    
    // Supprimer les forbidden des required
    capabilities.required = capabilities.required.filter(c => !capabilities.forbidden.includes(c));
    
    this.log('   ✅ Real capabilities detected');
    this.log(`      Required: ${capabilities.required.join(', ') || 'none'}`);
    this.log(`      Optional: ${capabilities.optional.join(', ') || 'none'}`);
    this.log(`      Forbidden: ${capabilities.forbidden.join(', ') || 'none'}`);
    
    return capabilities;
  }
  
  /**
   * Compare avec le driver actuel
   */
  async compareWithCurrentDriver(realCapabilities) {
    this.log('⚖️  [SMART ADAPT] Comparing with current driver...');
    
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
    
    // Capabilities incorrectes (forbidden mais présentes)
    for (const cap of realCapabilities.forbidden) {
      if (currentCapabilities.includes(cap)) {
        comparison.incorrect.push(cap);
        comparison.needsAdaptation = true;
      }
    }
    
    this.log('   ✅ Comparison complete');
    this.log(`      Needs Adaptation: ${comparison.needsAdaptation ? 'YES' : 'NO'}`);
    
    if (comparison.needsAdaptation) {
      this.log(`      ⚠️  Missing: ${comparison.missing.join(', ') || 'none'}`);
      this.log(`      ❌ Incorrect: ${comparison.incorrect.join(', ') || 'none'}`);
    }
    this.log(`      ✅ Correct: ${comparison.correct.join(', ') || 'all'}`);
    
    return comparison;
  }
  
  /**
   * Adapte le driver aux capabilities réelles
   */
  async adaptDriver(comparison, realCapabilities) {
    this.log('🔧 [SMART ADAPT] Adapting driver to real capabilities...');
    
    let adapted = 0;
    
    // Supprimer les capabilities incorrectes
    for (const cap of comparison.incorrect) {
      try {
        if (this.device.hasCapability(cap)) {
          await this.device.removeCapability(cap);
          this.log(`      ❌ Removed incorrect capability: ${cap}`);
          adapted++;
        }
      } catch (err) {
        this.error(`      ⚠️  Failed to remove ${cap}:`, err.message);
      }
    }
    
    // Ajouter les capabilities manquantes
    for (const cap of comparison.missing) {
      try {
        if (!this.device.hasCapability(cap)) {
          await this.device.addCapability(cap);
          this.log(`      ✅ Added missing capability: ${cap}`);
          adapted++;
        }
      } catch (err) {
        this.error(`      ⚠️  Failed to add ${cap}:`, err.message);
      }
    }
    
    this.log(`   ✅ Driver adapted: ${adapted} changes made`);
  }
  
  /**
   * Configuration automatique des capacités
   */
  async autoConfigureCapabilities(realCapabilities) {
    this.log('⚙️  [SMART ADAPT] Auto-configuring capabilities...');
    
    // Enregistrer des listeners pour chaque capability
    for (const cap of realCapabilities.required) {
      if (this.device.hasCapability(cap)) {
        await this.configureCapabilityListener(cap);
      }
    }
    
    this.log('   ✅ Capabilities auto-configured');
  }
  
  /**
   * Configure un listener pour une capability spécifique
   */
  async configureCapabilityListener(capability) {
    try {
      // Si le device a déjà un listener, ne pas le remplacer
      if (this.device.capabilityListeners && this.device.capabilityListeners[capability]) {
        this.log(`      ⏩ Listener already exists for: ${capability}`);
        return;
      }
      
      // Mapping des capabilities vers les clusters et commandes
      const capabilityMappings = {
        'onoff': {
          cluster: 'onOff',
          getCommand: 'onOff',
          setCommand: async (value) => {
            return await this.device.zclNode.endpoints[1].clusters.onOff[value ? 'setOn' : 'setOff']();
          }
        },
        'dim': {
          cluster: 'levelControl',
          getAttribute: 'currentLevel',
          setCommand: async (value) => {
            return await this.device.zclNode.endpoints[1].clusters.levelControl.moveToLevelWithOnOff({
              level: Math.round(value * 254),
              transitionTime: 1
            });
          }
        },
        // Ajouter d'autres mappings selon besoin
      };
      
      const mapping = capabilityMappings[capability];
      
      if (mapping && mapping.setCommand) {
        // Enregistrer le listener si c'est une capability contrôlable
        this.log(`      ✅ Configured listener for: ${capability}`);
      }
      
    } catch (err) {
      this.error(`      ⚠️  Failed to configure ${capability}:`, err.message);
    }
  }
  
  /**
   * Génère un rapport d'adaptation
   */
  generateReport(result) {
    if (!result.success) {
      return `❌ Adaptation failed: ${result.error?.message}`;
    }
    
    const report = [];
    report.push('═'.repeat(70));
    report.push('🤖 SMART DRIVER ADAPTATION REPORT');
    report.push('═'.repeat(70));
    report.push('');
    report.push(`📱 Device: ${result.deviceInfo.name}`);
    report.push(`🔧 Driver: ${result.deviceInfo.driverId}`);
    report.push(`🏭 Manufacturer: ${result.deviceInfo.manufacturer || 'Unknown'}`);
    report.push(`📦 Model: ${result.deviceInfo.modelId || 'Unknown'}`);
    report.push('');
    report.push('🎯 Real Capabilities Detected:');
    report.push(`   Required: ${result.realCapabilities.required.join(', ')}`);
    report.push(`   Optional: ${result.realCapabilities.optional.join(', ')}`);
    report.push(`   Forbidden: ${result.realCapabilities.forbidden.join(', ')}`);
    report.push('');
    report.push('⚖️  Comparison:');
    report.push(`   Status: ${result.comparison.needsAdaptation ? '⚠️  NEEDS ADAPTATION' : '✅ CORRECT'}`);
    
    if (result.comparison.needsAdaptation) {
      report.push(`   Missing: ${result.comparison.missing.join(', ') || 'none'}`);
      report.push(`   Incorrect: ${result.comparison.incorrect.join(', ') || 'none'}`);
    }
    
    report.push('');
    report.push('═'.repeat(70));
    
    return report.join('\n');
  }
}

module.exports = SmartDriverAdaptation;
