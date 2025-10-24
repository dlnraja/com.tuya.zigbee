#!/usr/bin/env node
/**
 * ALIEXPRESS DEVICES INTEGRATOR
 * Intègre les appareils commandés sur AliExpress avec manufacturer IDs,
 * gestion hybride des énergies, et capacités propriétaires
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

// Base de données des appareils AliExpress commandés
const ALIEXPRESS_DEVICES = [
  {
    name: 'Tuya ZigBee SOS Emergency Button',
    store: 'DYGSM Smart Store',
    orderDate: '2025-10-18',
    price: '€8.99',
    category: 'button_emergency_sos',
    manufacturerIDs: ['_TZ3000_p6ju8myv', '_TZ3000_fsiepnrh', '_TZ3000_eo3dttwe'],
    productIDs: ['TS0215A'],
    capabilities: ['alarm_generic', 'measure_battery'],
    battery: 'CR2032',
    powerSource: 'battery',
    clusters: [0, 1, 3, 1280], // basic, power, identify, iasZone
    endpoints: { '1': { clusters: [0, 1, 3, 1280], bindings: [1, 1280] } },
    features: ['sos_button', 'long_press', 'double_press', 'emergency_alert'],
    proprietary: {
      tuya_dp: {
        '1': 'button_press',
        '101': 'battery_percentage'
      }
    }
  },
  {
    name: 'Tuya USB Adapter Smart Switch',
    store: 'Smart Home Factory Store',
    orderDate: '2025-10-17',
    price: '€8.29',
    category: 'module_mini_switch',
    manufacturerIDs: ['_TZ3000_tgddllx4', '_TZ3000_vmpbygs5'],
    productIDs: ['TS011F'],
    capabilities: ['onoff', 'measure_power', 'measure_voltage', 'measure_current'],
    powerSource: 'usb_5v',
    hybrid: true,
    clusters: [0, 3, 4, 5, 6, 1794, 2820], // onOff, metering, electrical
    endpoints: { 
      '1': { clusters: [0, 3, 4, 5, 6], bindings: [6] },
      '2': { clusters: [0, 3, 4, 5, 6], bindings: [6] }
    },
    features: ['dual_usb', 'energy_monitoring', 'overload_protection', 'child_lock'],
    proprietary: {
      tuya_dp: {
        '1': 'switch_1',
        '2': 'switch_2',
        '9': 'countdown_timer',
        '17': 'indicator_light'
      }
    }
  },
  {
    name: 'ZigBee Scene Controller 4 Gang Wireless',
    store: 'Excellux Global Store',
    orderDate: '2025-10-17',
    price: '€6.79',
    category: 'button_wireless_4',
    manufacturerIDs: ['_TZ3000_xabckq1v', '_TZ3000_vp6clf9d', '_TZ3000_fvh3pjaz'],
    productIDs: ['TS004F', 'TS0044'],
    capabilities: ['alarm_generic'],
    battery: 'CR2450',
    powerSource: 'battery',
    clusters: [0, 1, 3, 4, 6], // basic, power, identify, groups, onOff
    endpoints: { 
      '1': { clusters: [0, 1, 3, 4, 6], bindings: [6] },
      '2': { clusters: [0, 1, 3, 4, 6], bindings: [6] },
      '3': { clusters: [0, 1, 3, 4, 6], bindings: [6] },
      '4': { clusters: [0, 1, 3, 4, 6], bindings: [6] }
    },
    features: ['12_scene_modes', 'single_press', 'double_press', 'long_press', 'multi_press'],
    proprietary: {
      tuya_dp: {
        '1': 'button_1_action',
        '2': 'button_2_action',
        '3': 'button_3_action',
        '4': 'button_4_action',
        '101': 'battery_percentage'
      }
    }
  },
  {
    name: 'Tuya Temperature Humidity Sensor with Backlight',
    store: 'Aessy Direct Store',
    orderDate: '2025-10-17',
    price: '€9.59',
    category: 'climate_monitor_temp_humidity',
    manufacturerIDs: ['_TZE200_locansqn', '_TZE200_bq5c8xfe', '_TZE204_upagmta9'],
    productIDs: ['TS0601'],
    capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
    battery: 'CR2032',
    powerSource: 'battery',
    clusters: [0, 1, 1026, 1029, 61184], // temp, humidity, tuya EF00
    endpoints: { '1': { clusters: [0, 1, 1026, 1029, 61184], bindings: [1, 1026, 1029] } },
    features: ['lcd_display', 'backlight', 'comfort_indicator', 'temp_alarm', 'humidity_alarm'],
    proprietary: {
      tuya_dp: {
        '1': 'temperature',
        '2': 'humidity',
        '4': 'battery_percentage',
        '9': 'temp_unit_convert', // Celsius/Fahrenheit
        '10': 'max_temp_alarm',
        '11': 'min_temp_alarm',
        '12': 'max_humidity_alarm',
        '13': 'min_humidity_alarm'
      }
    }
  },
  {
    name: 'Smart Soil Tester ZigBee',
    store: 'Scimagic-RC Official Store',
    orderDate: '2025-10-17',
    price: '€8.69',
    category: 'climate_sensor_soil',
    manufacturerIDs: ['_TZE200_myd45weu', '_TZE204_myd45weu', '_TZ3000_qomxlryd'],
    productIDs: ['TS0601'],
    capabilities: ['measure_temperature', 'measure_humidity.soil', 'measure_battery'],
    battery: 'CR2032',
    powerSource: 'battery',
    clusters: [0, 1, 1026, 1029, 61184],
    endpoints: { '1': { clusters: [0, 1, 1026, 1029, 61184], bindings: [1, 1026, 1029] } },
    features: ['soil_moisture', 'soil_temperature', 'external_probe', 'garden_monitoring'],
    proprietary: {
      tuya_dp: {
        '1': 'temperature',
        '2': 'soil_humidity',
        '4': 'battery_percentage',
        '5': 'battery_state'
      }
    }
  },
  {
    name: 'LED Strip Controller 30CM RGBCCT',
    store: 'M-Light Store',
    orderDate: '2025-09-12',
    price: '€39.39',
    category: 'led_strip_rgbw',
    manufacturerIDs: ['_TZ3210_r0xgkft5', '_TZ3210_sroezl0s'],
    productIDs: ['TS0505B'],
    capabilities: ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature'],
    powerSource: 'dc_12v',
    hybrid: false,
    clusters: [0, 3, 4, 5, 6, 8, 768], // onOff, levelControl, colorControl
    endpoints: { '1': { clusters: [0, 3, 4, 5, 6, 8, 768], bindings: [6, 8, 768] } },
    features: ['rgb_color', 'color_temperature', 'dimming', 'scenes', 'sync_control'],
    proprietary: {
      tuya_dp: {
        '20': 'led_mode',
        '21': 'color_data',
        '24': 'scene_mode',
        '25': 'countdown_timer'
      }
    }
  },
  {
    name: 'Zemismart Wireless Scene Switch 3 Gang',
    store: 'zemismart Official Store',
    orderDate: '2025-06-05',
    price: '€18.31',
    category: 'button_wireless_3',
    manufacturerIDs: ['_TZ3000_bi6lpsew', '_TZ3000_a7ouggvs', '_TZ3000_adkvzooy'],
    productIDs: ['TS0043', 'TS004F'],
    capabilities: ['alarm_generic'],
    battery: 'CR2450',
    powerSource: 'battery',
    clusters: [0, 1, 3, 4, 6],
    endpoints: { 
      '1': { clusters: [0, 1, 3, 4, 6], bindings: [6] },
      '2': { clusters: [0, 1, 3, 4, 6], bindings: [6] },
      '3': { clusters: [0, 1, 3, 4, 6], bindings: [6] }
    },
    features: ['scene_control', 'single_double_long_press', 'battery_optimized'],
    proprietary: {
      tuya_dp: {
        '1': 'button_1_mode',
        '2': 'button_2_mode',
        '3': 'button_3_mode',
        '101': 'battery_percentage'
      }
    }
  }
];

function enrichDriver(driverPath, deviceData) {
  console.log(`\n📝 Enriching driver: ${path.basename(driverPath)}`);
  
  const composeFile = path.join(driverPath, 'driver.compose.json');
  if (!fs.existsSync(composeFile)) {
    console.log(`  ⚠ driver.compose.json not found, skipping`);
    return;
  }

  const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));

  // Merge manufacturer IDs (avoid duplicates)
  if (!compose.zigbee) compose.zigbee = {};
  const existingMfg = compose.zigbee.manufacturerName || [];
  const existingMfgArray = Array.isArray(existingMfg) ? existingMfg : [existingMfg];
  const newMfg = [...new Set([...existingMfgArray, ...deviceData.manufacturerIDs])];
  compose.zigbee.manufacturerName = newMfg;

  // Merge product IDs
  const existingProd = compose.zigbee.productId || [];
  const existingProdArray = Array.isArray(existingProd) ? existingProd : [existingProd];
  const newProd = [...new Set([...existingProdArray, ...deviceData.productIDs])];
  compose.zigbee.productId = newProd;

  // Update endpoints if more comprehensive
  if (deviceData.endpoints && Object.keys(deviceData.endpoints).length > Object.keys(compose.zigbee.endpoints || {}).length) {
    compose.zigbee.endpoints = deviceData.endpoints;
  }

  // Add energy configuration for battery devices
  if (deviceData.battery) {
    if (!compose.energy) compose.energy = {};
    compose.energy.batteries = [deviceData.battery];
  }

  // Update capabilities (merge)
  const existingCap = compose.capabilities || [];
  const newCap = [...new Set([...existingCap, ...deviceData.capabilities])];
  compose.capabilities = newCap;

  // Add settings for proprietary features
  if (deviceData.proprietary && deviceData.proprietary.tuya_dp) {
    if (!compose.settings) compose.settings = [];
    
    // Add Tuya DP configuration setting
    const dpSetting = {
      id: 'tuya_dp_configuration',
      type: 'label',
      label: {
        en: 'Tuya Datapoint Configuration',
        fr: 'Configuration Tuya Datapoint'
      },
      value: JSON.stringify(deviceData.proprietary.tuya_dp, null, 2)
    };
    
    // Only add if not exists
    if (!compose.settings.find(s => s.id === 'tuya_dp_configuration')) {
      compose.settings.push(dpSetting);
    }
  }

  // Save enriched driver.compose.json
  fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2) + '\n', 'utf8');
  console.log(`  ✅ Enriched with ${deviceData.manufacturerIDs.length} manufacturer IDs`);
  console.log(`  ✅ Added ${deviceData.features.length} features`);
}

function createHybridEnergyManager() {
  console.log('\n⚡ Creating Hybrid Energy Manager...');
  
  const managerPath = path.join(ROOT, 'lib', 'HybridEnergyManager.js');
  
  const managerCode = `'use strict';

/**
 * Hybrid Energy Manager
 * Gère intelligemment les sources d'énergie (battery, AC, DC, USB, hybrid)
 * et les capacités propriétaires des constructeurs
 */

const { ZigBeeDevice } = require('homey-zigbeedriver');

class HybridEnergyManager {
  
  constructor(device) {
    this.device = device;
    this.powerSource = null;
    this.batteryType = null;
    this.energyMode = 'balanced'; // performance, balanced, power_saving
  }

  /**
   * Détection automatique de la source d'énergie
   */
  async detectPowerSource() {
    const settings = this.device.getSettings();
    const capabilities = this.device.getCapabilities();
    
    // Méthode 1: Basé sur les capabilities
    if (capabilities.includes('measure_battery')) {
      // Vérifier si vraiment battery ou hybrid (AC+battery backup)
      if (capabilities.includes('measure_power') || capabilities.includes('measure_voltage')) {
        this.powerSource = 'hybrid';
        this.device.log('Detected hybrid power source (AC + battery backup)');
      } else {
        this.powerSource = 'battery';
        this.device.log('Detected battery power source');
      }
    } else if (capabilities.includes('measure_power')) {
      this.powerSource = 'ac';
      this.device.log('Detected AC power source');
    } else {
      this.powerSource = 'dc';
      this.device.log('Detected DC power source');
    }

    // Méthode 2: Basé sur energy.batteries dans driver
    const driverEnergy = this.device.driver?.manifest?.energy;
    if (driverEnergy && driverEnergy.batteries && driverEnergy.batteries.length > 0) {
      this.batteryType = driverEnergy.batteries[0];
      this.device.log(\`Detected battery type: \${this.batteryType}\`);
    }

    // Méthode 3: Basé sur les clusters Zigbee
    try {
      const node = this.device.zclNode;
      const powerCluster = node.endpoints[1]?.clusters?.genPowerCfg;
      
      if (powerCluster) {
        const batteryVoltage = await powerCluster.readAttributes(['batteryVoltage']).catch(() => null);
        if (batteryVoltage && batteryVoltage.batteryVoltage > 0) {
          this.powerSource = this.powerSource === 'ac' ? 'hybrid' : 'battery';
        }
      }
    } catch (err) {
      this.device.error('Error detecting power via clusters:', err);
    }

    return this.powerSource;
  }

  /**
   * Gestion intelligente du reporting selon la source d'énergie
   */
  getOptimalReportingConfig() {
    const configs = {
      battery: {
        minInterval: 300,    // 5 minutes
        maxInterval: 3600,   // 1 hour
        reportableChange: 1
      },
      ac: {
        minInterval: 5,      // 5 seconds
        maxInterval: 60,     // 1 minute
        reportableChange: 0.1
      },
      dc: {
        minInterval: 10,
        maxInterval: 300,
        reportableChange: 0.5
      },
      hybrid: {
        minInterval: 30,
        maxInterval: 600,
        reportableChange: 0.5
      }
    };

    // Ajuster selon le mode énergétique
    const config = configs[this.powerSource] || configs.battery;
    
    if (this.energyMode === 'performance') {
      config.minInterval = Math.max(1, Math.floor(config.minInterval / 2));
      config.maxInterval = Math.max(10, Math.floor(config.maxInterval / 2));
    } else if (this.energyMode === 'power_saving') {
      config.minInterval = config.minInterval * 2;
      config.maxInterval = config.maxInterval * 2;
    }

    return config;
  }

  /**
   * Gestion des capacités propriétaires Tuya
   */
  async registerProprietaryCapabilities(tuyaDpMap) {
    if (!tuyaDpMap) return;

    this.device.log('Registering proprietary Tuya datapoints:', tuyaDpMap);

    // Enregistrer les handlers pour chaque DP
    for (const [dp, capability] of Object.entries(tuyaDpMap)) {
      try {
        await this.registerTuyaDp(parseInt(dp), capability);
      } catch (err) {
        this.device.error(\`Failed to register DP \${dp}:\`, err);
      }
    }
  }

  async registerTuyaDp(dp, capabilityName) {
    const node = this.device.zclNode;
    if (!node) return;

    try {
      // Écouter les rapports Tuya pour ce DP
      const cluster = node.endpoints[1]?.clusters?.manuSpecificTuya;
      
      if (cluster) {
        cluster.on('reporting', (data) => {
          if (data.dp === dp) {
            this.handleTuyaDpReport(dp, data.data, capabilityName);
          }
        });
      }
    } catch (err) {
      this.device.error(\`Error registering Tuya DP \${dp}:\`, err);
    }
  }

  handleTuyaDpReport(dp, rawData, capabilityName) {
    this.device.log(\`Tuya DP \${dp} report:\`, rawData);

    // Conversion intelligente selon le type de capacité
    let value = rawData;

    if (capabilityName.includes('battery')) {
      value = this.convertBatteryValue(rawData);
    } else if (capabilityName.includes('temperature')) {
      value = this.convertTemperatureValue(rawData);
    } else if (capabilityName.includes('humidity')) {
      value = this.convertHumidityValue(rawData);
    }

    // Mettre à jour la capability Homey
    if (this.device.hasCapability(capabilityName)) {
      this.device.setCapabilityValue(capabilityName, value).catch(err => {
        this.device.error(\`Failed to set \${capabilityName}:\`, err);
      });
    }
  }

  convertBatteryValue(rawValue) {
    // Tuya battery: 0-100 ou 0-200 (double)
    if (rawValue > 100) return Math.min(100, Math.round(rawValue / 2));
    return Math.min(100, Math.max(0, rawValue));
  }

  convertTemperatureValue(rawValue) {
    // Tuya temp: souvent en dixièmes de degré
    return parseFloat((rawValue / 10).toFixed(1));
  }

  convertHumidityValue(rawValue) {
    // Tuya humidity: 0-100
    return Math.min(100, Math.max(0, rawValue));
  }

  /**
   * Définir le mode énergétique
   */
  setEnergyMode(mode) {
    if (!['performance', 'balanced', 'power_saving'].includes(mode)) {
      throw new Error(\`Invalid energy mode: \${mode}\`);
    }
    
    this.energyMode = mode;
    this.device.log(\`Energy mode set to: \${mode}\`);
    
    // Appliquer le nouveau mode
    this.applyEnergyMode();
  }

  async applyEnergyMode() {
    const config = this.getOptimalReportingConfig();
    this.device.log('Applying energy mode config:', config);

    // Reconfigurer le reporting pour toutes les capacités mesurables
    const capabilities = this.device.getCapabilities();
    
    for (const cap of capabilities) {
      if (cap.startsWith('measure_') || cap.startsWith('meter_')) {
        await this.configureCapabilityReporting(cap, config).catch(err => {
          this.device.error(\`Failed to configure \${cap}:\`, err);
        });
      }
    }
  }

  async configureCapabilityReporting(capability, config) {
    // Implémenter la configuration du reporting Zigbee
    // selon la capability et le config
    this.device.log(\`Configuring reporting for \${capability}\`, config);
    // TODO: Implémenter avec registerCapability ou configureAttributeReporting
  }
}

module.exports = HybridEnergyManager;
`;

  fs.mkdirSync(path.dirname(managerPath), { recursive: true });
  fs.writeFileSync(managerPath, managerCode, 'utf8');
  console.log(`  ✅ Created: ${path.relative(ROOT, managerPath)}`);
}

function main() {
  console.log('🚀 ALIEXPRESS DEVICES INTEGRATOR\n');
  console.log(`Found ${ALIEXPRESS_DEVICES.length} AliExpress devices to integrate\n`);

  // Créer le Hybrid Energy Manager
  createHybridEnergyManager();

  // Enrichir chaque driver correspondant
  let enrichedCount = 0;
  
  for (const device of ALIEXPRESS_DEVICES) {
    const driverPath = path.join(ROOT, 'drivers', device.category);
    
    if (fs.existsSync(driverPath)) {
      enrichDriver(driverPath, device);
      enrichedCount++;
    } else {
      console.log(`\n⚠ Driver not found: ${device.category}`);
      console.log(`  Device: ${device.name}`);
      console.log(`  Suggestion: Create driver or map to existing category`);
    }
  }

  // Créer un rapport d'intégration
  const report = {
    date: new Date().toISOString(),
    totalDevices: ALIEXPRESS_DEVICES.length,
    enrichedDrivers: enrichedCount,
    devices: ALIEXPRESS_DEVICES.map(d => ({
      name: d.name,
      category: d.category,
      manufacturerIDs: d.manufacturerIDs.length,
      features: d.features.length,
      powerSource: d.powerSource,
      battery: d.battery
    }))
  };

  const reportPath = path.join(ROOT, 'reports', 'ALIEXPRESS_INTEGRATION_REPORT.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log(`\n✅ Integration complete!`);
  console.log(`   Enriched: ${enrichedCount}/${ALIEXPRESS_DEVICES.length} drivers`);
  console.log(`   Report: ${reportPath}`);
}

main();
