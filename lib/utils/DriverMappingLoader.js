'use strict';

const fs = require('fs');
const path = require('path');

/**
 * ALTERNATIVE_SOURCES - Comprehensive cross-platform device database references
 * 
 * This constant maps device identifiers to their documentation and implementation
 * across 15+ community and proprietary Zigbee platforms. Used for:
 * - Device identification and capability detection
 * - DP (Data Point) mapping research
 * - Cross-platform compatibility verification
 * - Feature parity analysis
 * 
 * @constant {Object}
 */
const ALTERNATIVE_SOURCES = {
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: COMMUNITY OPEN-SOURCE PROJECTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 1. Zigbee2MQTT - Largest open-source Zigbee device database
   * Repository: https://github.com/Koenkk/zigbee2mqtt
   * Devices DB: https://github.com/Koenkk/zigbee-herdsman-converters
   * Documentation: https://www.zigbee2mqtt.io/supported-devices/
   */
  zigbee2mqtt: {
    name: 'Zigbee2MQTT',
    type: 'community',
    url: 'https://www.zigbee2mqtt.io',
    github: 'https://github.com/Koenkk/zigbee-herdsman-converters',
    devicesUrl: 'https://www.zigbee2mqtt.io/supported-devices/',
    convertersPath: 'src/devices/tuya.ts',
    deviceCount: 4200,
    tuyaDevices: 1800,
    features: ['tuya_dp', 'zcl', 'ota', 'groups', 'scenes'],
    dpMappingFormat: 'tuya.fz / tuya.tz converters',
    notes: 'Primary reference for Tuya DP mappings. Most comprehensive.',
    manufacturerPrefixes: [
      '_TZ3000_', '_TZ3210_', '_TZ3400_', '_TZ2000_', '_TZ1800_',
      '_TZE200_', '_TZE204_', '_TZE284_', '_TYZB01_', '_TYST11_',
      '_TZQ00_', '_TZB01_', '_TZH00_', '_TZS00_'
    ],
    dpResearchFiles: [
      'src/devices/tuya.ts',
      'src/lib/tuya.ts',
      'src/lib/legacy/tuya.ts'
    ]
  },

  /**
   * 2. ZHA (Zigbee Home Automation) - Home Assistant integration
   * Repository: https://github.com/zigpy/zha-device-handlers
   * Quirks: Device-specific handlers for non-standard behavior
   */
  zha: {
    name: 'ZHA Device Handlers (Home Assistant)',
    type: 'community',
    url: 'https://www.home-assistant.io/integrations/zha/',
    github: 'https://github.com/zigpy/zha-device-handlers',
    quirksPath: 'zhaquirks/tuya/',
    deviceCount: 2500,
    tuyaDevices: 900,
    features: ['quirks', 'tuya_dp', 'zcl', 'clusters'],
    dpMappingFormat: 'TuyaLocalCluster / TuyaNewManufCluster',
    notes: 'Python quirks for device fixes. Good for cluster analysis.',
    keyFiles: [
      'zhaquirks/tuya/__init__.py',
      'zhaquirks/tuya/mcu/__init__.py',
      'zhaquirks/tuya/ts0601_sensor.py',
      'zhaquirks/tuya/ts0601_switch.py',
      'zhaquirks/tuya/ts0601_trv.py'
    ],
    clusterDefinitions: {
      tuyaMcuCluster: 0xEF00,  // 61184
      tuyaPrivateCluster: 0xE000,
      tuyaElectricalCluster: 0xE001
    }
  },

  /**
   * 3. deCONZ / Phoscon - Dresden Elektronik gateway
   * Repository: https://github.com/dresden-elektronik/deconz-rest-plugin
   * Device DB: https://github.com/dresden-elektronik/deconz-dev/wiki/Tuya-Devices
   */
  deconz: {
    name: 'deCONZ / Phoscon',
    type: 'community',
    url: 'https://phoscon.de/en/conbee',
    github: 'https://github.com/dresden-elektronik/deconz-rest-plugin',
    deviceDbPath: 'devices/tuya/',
    deviceCount: 1800,
    tuyaDevices: 600,
    features: ['ddf', 'zcl', 'bindings'],
    dpMappingFormat: 'DDF (Device Description Files) JSON',
    notes: 'Good for ZCL cluster research and bindings.',
    ddfPath: 'devices/',
    supportedTypes: ['lights', 'sensors', 'switches', 'covers']
  },

  /**
   * 4. Zigbee2Tasmota - ESP32/ESP8266 Zigbee bridge
   * Repository: https://github.com/arendst/Tasmota
   * Zigbee: https://tasmota.github.io/docs/Zigbee/
   */
  zigbee2tasmota: {
    name: 'Zigbee2Tasmota',
    type: 'community',
    url: 'https://tasmota.github.io/docs/Zigbee/',
    github: 'https://github.com/arendst/Tasmota',
    deviceDbPath: 'tasmota/zigbee/',
    deviceCount: 800,
    tuyaDevices: 300,
    features: ['tuya_dp', 'zcl', 'berry_scripts'],
    dpMappingFormat: 'Berry scripts / ZbData',
    notes: 'Lightweight implementation. Good for ESP-based projects.'
  },

  /**
   * 5. OpenHAB Zigbee Binding
   * Repository: https://github.com/openhab/org.openhab.binding.zigbee
   */
  openhab: {
    name: 'OpenHAB Zigbee Binding',
    type: 'community',
    url: 'https://www.openhab.org/addons/bindings/zigbee/',
    github: 'https://github.com/openhab/org.openhab.binding.zigbee',
    deviceCount: 600,
    tuyaDevices: 150,
    features: ['zcl', 'things', 'channels'],
    dpMappingFormat: 'Java Thing handlers',
    notes: 'Enterprise-grade implementation. Good for ZCL standards.'
  },

  /**
   * 6. ioBroker Zigbee Adapter
   * Repository: https://github.com/ioBroker/ioBroker.zigbee
   */
  iobroker: {
    name: 'ioBroker Zigbee',
    type: 'community',
    url: 'https://www.iobroker.net/',
    github: 'https://github.com/ioBroker/ioBroker.zigbee',
    deviceCount: 1200,
    tuyaDevices: 400,
    features: ['tuya_dp', 'zcl', 'states'],
    dpMappingFormat: 'JavaScript converters (based on Z2M)',
    notes: 'Uses Zigbee2MQTT converters. Good for state mapping.'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: PROPRIETARY PLATFORMS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 7. Tuya IoT Platform - Official Tuya developer resources
   * Documentation: https://developer.tuya.com/
   * DP Reference: https://developer.tuya.com/en/docs/iot/
   */
  tuyaIot: {
    name: 'Tuya IoT Platform (Official)',
    type: 'proprietary',
    url: 'https://developer.tuya.com/',
    docsUrl: 'https://developer.tuya.com/en/docs/iot/',
    dpReference: 'https://developer.tuya.com/en/docs/iot/dps',
    features: ['official_dp', 'cloud_api', 'local_api'],
    dpMappingFormat: 'Official DP specifications',
    notes: 'Authoritative source for Tuya DP definitions.',
    standardDPs: {
      // Common Tuya standard DPs
      switch: { 1: 'switch', 2: 'switch_2', 3: 'switch_3', 4: 'switch_4' },
      dimmer: { 1: 'switch', 2: 'bright_value', 3: 'temp_value' },
      thermostat: { 1: 'system_mode', 2: 'target_temp', 3: 'current_temp', 4: 'battery' },
      sensor: { 1: 'temp', 2: 'humidity', 3: 'battery' }
    }
  },

  /**
   * 8. SmartThings - Samsung IoT platform
   * Edge Drivers: https://github.com/SmartThingsCommunity/SmartThingsEdgeDrivers
   */
  smartthings: {
    name: 'SmartThings Edge Drivers',
    type: 'proprietary',
    url: 'https://www.smartthings.com/',
    github: 'https://github.com/SmartThingsCommunity/SmartThingsEdgeDrivers',
    driversPath: 'drivers/SmartThings/zigbee-switch/',
    deviceCount: 1500,
    tuyaDevices: 400,
    features: ['edge_drivers', 'zcl', 'capabilities'],
    dpMappingFormat: 'Lua Edge driver handlers',
    notes: 'Good for capability mapping and standard Zigbee behavior.',
    fingerprintFormat: {
      mfr: 'manufacturerCode',
      model: 'model',
      deviceJoinName: 'friendly name'
    }
  },

  /**
   * 9. Hubitat - Local-first smart home hub
   * Drivers: https://github.com/hubitat/HubitatPublic
   */
  hubitat: {
    name: 'Hubitat Elevation',
    type: 'proprietary',
    url: 'https://hubitat.com/',
    github: 'https://github.com/hubitat/HubitatPublic',
    driversPath: 'examples/drivers/',
    communityDrivers: 'https://community.hubitat.com/',
    deviceCount: 1000,
    tuyaDevices: 350,
    features: ['groovy_drivers', 'zcl', 'tuya_dp'],
    dpMappingFormat: 'Groovy device handlers',
    notes: 'Active community. Many Tuya-specific drivers.',
    tuyaDrivers: [
      'Tuya Zigbee Switch',
      'Tuya Zigbee Dimmer',
      'Tuya Zigbee RGBW',
      'Tuya Zigbee TRV',
      'Tuya Zigbee Sensor'
    ]
  },

  /**
   * 10. Homey Community - Athom Homey app store
   * Apps: https://homey.app/en-us/apps/
   * Community: https://community.homey.app/
   */
  homeyCommunity: {
    name: 'Homey Community Apps',
    type: 'proprietary',
    url: 'https://homey.app/',
    communityUrl: 'https://community.homey.app/',
    appsStore: 'https://homey.app/en-us/apps/',
    relatedApps: [
      'com.tuya.zigbee',           // JohanBendz original
      'com.tuya',                  // Official Tuya (cloud)
      'com.ikea.tradfri',          // IKEA reference
      'com.philips.hue.zigbee'     // Hue reference
    ],
    features: ['sdk3', 'flows', 'capabilities', 'zigbee'],
    notes: 'Reference for Homey capability mapping and flow cards.'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: DEVICE DATABASES & RESEARCH RESOURCES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 11. Blakadder Templates - Comprehensive Tuya device database
   * URL: https://templates.blakadder.com/
   */
  blakadder: {
    name: 'Blakadder Tuya Templates',
    type: 'database',
    url: 'https://templates.blakadder.com/',
    categories: ['wifi', 'zigbee', 'bluetooth'],
    deviceCount: 5000,
    zigbeeDevices: 800,
    features: ['templates', 'gpio', 'fingerprints'],
    notes: 'Best for device identification and GPIO/DP mapping.',
    searchUrl: 'https://templates.blakadder.com/search.html'
  },

  /**
   * 12. Zigbee Device Compatibility Repository (ZDAR)
   * Community-driven device compatibility database
   */
  zigbeeCompatibility: {
    name: 'Zigbee Device Compatibility (Community)',
    type: 'database',
    url: 'https://zigbee.blakadder.com/',
    github: 'https://github.com/blakadder/zigbee',
    deviceCount: 2000,
    features: ['compatibility', 'fingerprints', 'clusters'],
    notes: 'Cross-platform compatibility information.'
  },

  /**
   * 13. Zigbee Alliance / CSA Device Database
   * Official Zigbee certified products
   */
  zigbeeAlliance: {
    name: 'Zigbee Alliance / CSA',
    type: 'official',
    url: 'https://csa-iot.org/',
    certifiedProducts: 'https://csa-iot.org/csa-iot_products/',
    features: ['certification', 'clusters', 'standards'],
    notes: 'Official Zigbee certified devices. Standards reference.',
    clusterLibrary: 'https://csa-iot.org/developer-resource/specifications-download-request/'
  },

  /**
   * 14. Tuya GitHub Repositories
   * Official Tuya open-source projects
   */
  tuyaGithub: {
    name: 'Tuya Official GitHub',
    type: 'proprietary',
    github: 'https://github.com/tuya',
    repositories: [
      'tuya-home-assistant',
      'tuya-connector-python',
      'tuya-iotos-embeded-sdk',
      'tuya-panel-kit'
    ],
    features: ['sdk', 'api', 'examples'],
    notes: 'Official SDKs and integration examples.'
  },

  /**
   * 15. Tuya Convert Database
   * Device fingerprints for OTA flashing
   */
  tuyaConvert: {
    name: 'Tuya-Convert Device Database',
    type: 'community',
    github: 'https://github.com/ct-Open-Source/tuya-convert',
    wikiUrl: 'https://github.com/ct-Open-Source/tuya-convert/wiki/Tested-Devices',
    features: ['fingerprints', 'firmware_versions', 'chip_info'],
    notes: 'Good for identifying device hardware and firmware.'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: SPECIALIZED RESOURCES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 16. Zigbee Clusters Reference
   * ZCL specification and cluster documentation
   */
  zclClusters: {
    name: 'ZCL Cluster Reference',
    type: 'specification',
    url: 'https://zigbeealliance.org/solution/zigbee/',
    features: ['clusters', 'attributes', 'commands'],
    commonClusters: {
      basic: 0x0000,
      powerConfiguration: 0x0001,
      identify: 0x0003,
      groups: 0x0004,
      scenes: 0x0005,
      onOff: 0x0006,
      levelControl: 0x0008,
      colorControl: 0x0300,
      illuminanceMeasurement: 0x0400,
      temperatureMeasurement: 0x0402,
      relativeHumidity: 0x0405,
      occupancySensing: 0x0406,
      iasZone: 0x0500,
      iasWd: 0x0502,
      electricalMeasurement: 0x0B04,
      metering: 0x0702,
      tuyaPrivate: 0xE000,
      tuyaMcu: 0xEF00
    },
    notes: 'Standard ZCL cluster definitions.'
  },

  /**
   * 17. GitHub Issues & Discussions (Cross-project)
   * Research resources from multiple projects
   */
  githubResearch: {
    name: 'GitHub Issues Research',
    type: 'research',
    searchUrls: [
      'https://github.com/Koenkk/zigbee2mqtt/issues?q=tuya',
      'https://github.com/zigpy/zha-device-handlers/issues?q=tuya',
      'https://github.com/dresden-elektronik/deconz-rest-plugin/issues?q=tuya'
    ],
    notes: 'Search for device-specific issues and solutions.',
    searchPattern: 'is:issue {manufacturerName} OR {model}'
  },

  /**
   * 18. Reddit Communities
   * Discussion forums for device research
   */
  reddit: {
    name: 'Reddit Zigbee Communities',
    type: 'community',
    subreddits: [
      'r/homeassistant',
      'r/Zigbee2MQTT',
      'r/homeautomation',
      'r/smarthome'
    ],
    searchUrl: 'https://www.reddit.com/search/?q=tuya%20zigbee',
    notes: 'User experiences and device compatibility reports.'
  }
};

/**
 * DEVICE_CATEGORIES - Comprehensive device type mapping
 * Maps device types to capabilities, clusters, and driver recommendations
 */
const DEVICE_CATEGORIES = {
  // Lighting
  lights: {
    subTypes: ['bulb_white', 'bulb_cct', 'bulb_rgbw', 'led_strip', 'downlight'],
    capabilities: ['onoff', 'dim', 'light_temperature', 'light_hue', 'light_saturation'],
    clusters: [0x0006, 0x0008, 0x0300],
    tuyaDPs: { 1: 'switch', 2: 'bright_value', 3: 'temp_value', 5: 'colour_data' }
  },
  
  // Switches & Relays
  switches: {
    subTypes: ['switch_1gang', 'switch_2gang', 'switch_3gang', 'switch_4gang', 'switch_6gang'],
    capabilities: ['onoff'],
    clusters: [0x0006],
    tuyaDPs: { 1: 'switch_1', 2: 'switch_2', 3: 'switch_3', 4: 'switch_4' }
  },
  
  // Dimmers
  dimmers: {
    subTypes: ['switch_dimmer_1gang', 'switch_dimmer_2gang', 'rotary_dimmer'],
    capabilities: ['onoff', 'dim'],
    clusters: [0x0006, 0x0008],
    tuyaDPs: { 1: 'switch', 2: 'bright_value', 3: 'min_brightness' }
  },
  
  // Smart Plugs
  plugs: {
    subTypes: ['plug_smart', 'plug_energy', 'usb_outlet'],
    capabilities: ['onoff', 'measure_power', 'meter_power', 'measure_voltage', 'measure_current'],
    clusters: [0x0006, 0x0702, 0x0B04],
    tuyaDPs: { 1: 'switch', 9: 'countdown', 17: 'current', 18: 'power', 19: 'voltage', 20: 'energy' }
  },
  
  // Climate Sensors
  climateSensors: {
    subTypes: ['climate_sensor', 'temperature_sensor', 'humidity_sensor'],
    capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
    clusters: [0x0001, 0x0402, 0x0405],
    tuyaDPs: { 1: 'temperature', 2: 'humidity', 4: 'battery' }
  },
  
  // Motion Sensors
  motionSensors: {
    subTypes: ['motion_sensor', 'pir_sensor', 'radar_sensor', 'mmwave_sensor'],
    capabilities: ['alarm_motion', 'measure_battery', 'measure_luminance'],
    clusters: [0x0001, 0x0400, 0x0406, 0x0500],
    tuyaDPs: { 1: 'pir', 4: 'battery', 12: 'sensitivity', 102: 'illuminance' }
  },
  
  // Contact Sensors
  contactSensors: {
    subTypes: ['contact_sensor', 'door_sensor', 'window_sensor'],
    capabilities: ['alarm_contact', 'measure_battery'],
    clusters: [0x0001, 0x0500],
    tuyaDPs: { 1: 'contact', 2: 'battery' }
  },
  
  // Water Leak Sensors
  waterSensors: {
    subTypes: ['water_leak_sensor', 'flood_sensor'],
    capabilities: ['alarm_water', 'measure_battery'],
    clusters: [0x0001, 0x0500],
    tuyaDPs: { 1: 'water_leak', 4: 'battery' }
  },
  
  // Smoke Detectors
  smokeDetectors: {
    subTypes: ['smoke_detector', 'smoke_detector_advanced'],
    capabilities: ['alarm_smoke', 'alarm_tamper', 'measure_battery'],
    clusters: [0x0001, 0x0500],
    tuyaDPs: { 1: 'smoke_detector', 4: 'battery', 14: 'tamper' }
  },
  
  // Thermostats & TRVs
  thermostats: {
    subTypes: ['thermostat_tuya_dp', 'thermostat_trv', 'thermostat_floor'],
    capabilities: ['target_temperature', 'measure_temperature', 'thermostat_mode', 'measure_battery'],
    clusters: [0x0001, 0x0201, 0x0402],
    tuyaDPs: { 1: 'system_mode', 2: 'target_temp', 3: 'current_temp', 4: 'battery', 7: 'child_lock' }
  },
  
  // Curtains & Covers
  covers: {
    subTypes: ['curtain_motor', 'blind_motor', 'roller_shutter'],
    capabilities: ['windowcoverings_state', 'windowcoverings_set', 'dim'],
    clusters: [0x0102],
    tuyaDPs: { 1: 'control', 2: 'percent_control', 3: 'percent_state', 7: 'work_state' }
  },
  
  // Buttons & Scene Switches
  buttons: {
    subTypes: ['button_wireless_1', 'button_wireless_2', 'button_wireless_4', 'scene_switch_4'],
    capabilities: ['button.1', 'button.2', 'button.3', 'button.4', 'measure_battery'],
    clusters: [0x0001, 0x0005, 0x0006, 0x0012],
    tuyaDPs: null,  // Uses ZCL scenes cluster or Tuya private 0xE000
    modes: ['command', 'event', 'dimmer']
  },
  
  // Sirens & Alarms
  sirens: {
    subTypes: ['siren_alarm', 'siren_indoor'],
    capabilities: ['onoff', 'alarm_generic', 'volume_set'],
    clusters: [0x0006, 0x0502],
    tuyaDPs: { 104: 'alarm', 5: 'duration', 7: 'volume', 13: 'alarm_state' }
  },
  
  // Garage Doors
  garageDoors: {
    subTypes: ['garage_door', 'gate_controller'],
    capabilities: ['garagedoor_closed', 'alarm_contact'],
    clusters: [0x0006, 0x0500],
    tuyaDPs: { 1: 'switch', 3: 'door_contact' }
  },
  
  // Irrigation
  irrigation: {
    subTypes: ['irrigation_valve', 'water_timer'],
    capabilities: ['onoff', 'measure_water'],
    clusters: [0x0006],
    tuyaDPs: { 1: 'switch', 5: 'countdown', 11: 'weather_delay' }
  },
  
  // Fingerbot
  fingerbot: {
    subTypes: ['fingerbot'],
    capabilities: ['onoff', 'button.push', 'measure_battery'],
    clusters: [0x0001, 0x0006],
    tuyaDPs: { 1: 'switch', 2: 'mode', 5: 'sustain_time', 10: 'click_control' }
  }
};

/**
 * MANUFACTURER_PREFIXES - Known Tuya manufacturer name patterns
 * Used for device identification and driver matching
 */
const MANUFACTURER_PREFIXES = {
  // Tuya standard prefixes
  tuya: [
    '_TZ3000_', '_TZ3210_', '_TZ3400_', '_TZ3600_',
    '_TZ2000_', '_TZ2500_', '_TZ1800_',
    '_TZE200_', '_TZE204_', '_TZE284_',
    '_TYZB01_', '_TYZB02_', '_TYST11_',
    '_TZQ00_', '_TZB01_', '_TZH00_', '_TZS00_'
  ],
  
  // Brand prefixes
  brands: {
    'MOES': ['_TZE200_', 'MOES'],
    'BlitzWolf': ['BW-', 'BlitzWolf'],
    'ZemiSmart': ['_TZ3000_', 'ZemiSmart'],
    'Lonsonho': ['_TZ3000_', 'LONSONHO', 'Lonsonho'],
    'LIDL': ['_TZ3000_', 'LIDL', 'Silvercrest'],
    'eWeLink': ['eWeLink', 'SONOFF'],
    'Neo Coolcam': ['_TZ3000_', 'Neo Coolcam', 'NAS-'],
    'Aubess': ['_TZ3000_', 'Aubess', 'AUBESS'],
    'Bseed': ['_TZ3000_', 'BSEED', 'Bseed'],
    'Girier': ['_TZ3000_', 'Girier', 'GIRIER'],
    'Woox': ['_TZ3000_', 'WOOX', 'Woox'],
    'Nous': ['_TZ3000_', 'Nous'],
    'Immax': ['_TZ3000_', 'IMMAX', 'Immax']
  }
};

/**
 * DP_PARSERS - Common Tuya DP value parsers
 * Used to convert raw DP values to Homey capability values
 */
const DP_PARSERS = {
  // Temperature parsers
  divide_10: (v) => v / 10,
  divide_100: (v) => v / 100,
  multiply_10: (v) => v * 10,
  
  // Percentage parsers
  percent_255: (v) => Math.round((v / 255) * 100),
  percent_1000: (v) => Math.round((v / 1000) * 100),
  
  // Boolean parsers
  bool: (v) => !!v,
  inverted_bool: (v) => !v,
  
  // Battery parsers
  battery_percentage: (v) => Math.min(100, Math.max(0, v)),
  battery_voltage_to_percent: (v) => {
    // Convert mV to percentage (2.7V-3.2V range typical for CR2450)
    const voltage = v / 1000;
    if (voltage >= 3.0) return 100;
    if (voltage <= 2.5) return 0;
    return Math.round(((voltage - 2.5) / 0.5) * 100);
  },
  
  // Color parsers
  color_hsv: (v) => {
    // Parse Tuya HSV format: HHHHSSSSVVVV (hex string)
    if (typeof v === 'string' && v.length >= 12) {
      return {
        h: parseInt(v.substring(0, 4), 16),
        s: parseInt(v.substring(4, 8), 16) / 1000,
        v: parseInt(v.substring(8, 12), 16) / 1000
      };
    }
    return null;
  },
  
  // Enum parsers
  thermostat_mode: (v) => {
    const modes = { 0: 'off', 1: 'heat', 2: 'cool', 3: 'auto' };
    return modes[v] || 'auto';
  }
};

/**
 * DriverMappingLoader - Centralized driver mapping database loader
 * 
 * Loads driver-mapping-database.json and provides query methods
 * for device detection, DP mapping, and driver selection.
 * 
 * Enhanced with cross-platform research capabilities from 15+ sources.
 * 
 * @class DriverMappingLoader
 */
class DriverMappingLoader {
  constructor() {
    this.database = null;
    this.loaded = false;
    this.loadDatabase();
  }

  /**
   * Load driver-mapping-database.json
   */
  loadDatabase() {
    try {
      const dbPath = path.join(__dirname, '../../driver-mapping-database.json');
      
      if (!fs.existsSync(dbPath)) {
        // Optional file - silently use empty database if not found
        this.database = { devices: {}, parsers: {}, driver_rules: {} };
        return;
      }

      const rawData = fs.readFileSync(dbPath, 'utf8');
      this.database = JSON.parse(rawData);
      this.loaded = true;
      
      console.log('[DRIVER-MAPPING] ✅ Database loaded successfully');
      console.log(`[DRIVER-MAPPING]   Version: ${this.database.version}`);
      console.log(`[DRIVER-MAPPING]   Models: ${Object.keys(this.database.devices).length}`);
      
    } catch (err) {
      console.error('[DRIVER-MAPPING] ❌ Failed to load database:', err.message);
      this.database = { devices: {}, parsers: {}, driver_rules: {} };
    }
  }

  /**
   * Get device information by model and manufacturer
   * @param {string} model - Device model (e.g., 'TS0601')
   * @param {string} manufacturer - Manufacturer ID (e.g., '_TZE284_vvmbj46n')
   * @returns {object|null} Device info or null if not found
   */
  getDeviceInfo(model, manufacturer) {
    if (!this.loaded || !this.database.devices[model]) {
      return null;
    }

    const modelData = this.database.devices[model];
    const manufacturerData = modelData.manufacturers?.[manufacturer];

    if (!manufacturerData) {
      return null;
    }

    return {
      model,
      manufacturer,
      name: manufacturerData.name,
      driver: manufacturerData.driver,
      capabilities: manufacturerData.capabilities || [],
      dps: manufacturerData.dps || {},
      endpoints: manufacturerData.endpoints || {},
      battery: manufacturerData.battery || null,
      polling: manufacturerData.polling || { initial: '3s', interval: '5m' },
      type: modelData.type,
      cluster: modelData.cluster || null,
      description: modelData.description
    };
  }

  /**
   * Get all manufacturers for a specific model
   * @param {string} model - Device model
   * @returns {array} List of manufacturer IDs
   */
  getManufacturersForModel(model) {
    if (!this.loaded || !this.database.devices[model]) {
      return [];
    }

    const manufacturers = this.database.devices[model].manufacturers || {};
    return Object.keys(manufacturers);
  }

  /**
   * Get recommended driver for a device
   * @param {string} model - Device model
   * @param {string} manufacturer - Manufacturer ID
   * @returns {string|null} Driver ID or null
   */
  getRecommendedDriver(model, manufacturer) {
    const deviceInfo = this.getDeviceInfo(model, manufacturer);
    return deviceInfo ? deviceInfo.driver : null;
  }

  /**
   * Get DP mappings for a Tuya device
   * @param {string} model - Device model (e.g., 'TS0601')
   * @param {string} manufacturer - Manufacturer ID
   * @returns {object} DP mappings { dpId: { capability, parser, unit } }
   */
  getDPMappings(model, manufacturer) {
    const deviceInfo = this.getDeviceInfo(model, manufacturer);
    return deviceInfo ? deviceInfo.dps : {};
  }

  /**
   * Parse a DP value using the appropriate parser
   * @param {string} parserName - Parser name (e.g., 'divide_by_10')
   * @param {any} value - Raw value to parse
   * @returns {any} Parsed value
   */
  parseValue(parserName, value) {
    const parser = this.database.parsers?.[parserName];
    
    if (!parser) {
      console.warn(`[DRIVER-MAPPING] Unknown parser: ${parserName}, returning raw value`);
      return value;
    }

    try {
      // Execute parser function
      // eslint-disable-next-line no-eval
      const parserFunc = eval(`(${parser.function})`);
      return parserFunc(value);
    } catch (err) {
      console.error(`[DRIVER-MAPPING] Parser ${parserName} failed:`, err.message);
      return value;
    }
  }

  /**
   * Get driver rules (deprecated drivers, forbidden capabilities, etc.)
   * @param {string} driverType - Driver type (e.g., 'usb_outlet')
   * @returns {object|null} Driver rules or null
   */
  getDriverRules(driverType) {
    return this.database.driver_rules?.[driverType] || null;
  }

  /**
   * Check if a driver is deprecated and get replacement
   * @param {string} driverType - Driver type
   * @param {string} subType - Sub-type (e.g., '2gang')
   * @returns {object} { deprecated: bool, mapTo: string|null, reason: string|null }
   */
  checkDeprecated(driverType, subType = null) {
    const rules = this.getDriverRules(driverType);
    
    if (!rules || !rules.deprecated) {
      return { deprecated: false, mapTo: null, reason: null };
    }

    let mapTo = null;
    if (rules.mapTo) {
      if (subType && rules.mapTo[subType]) {
        mapTo = rules.mapTo[subType];
      } else if (typeof rules.mapTo === 'string') {
        mapTo = rules.mapTo;
      }
    }

    return {
      deprecated: true,
      mapTo,
      reason: rules.reason || 'Driver deprecated'
    };
  }

  /**
   * Get detection priority order
   * @returns {array} Ordered list of device types by priority
   */
  getDetectionPriority() {
    return this.database.detection_priority?.order || [];
  }

  /**
   * Get detection rule for a device type
   * @param {string} deviceType - Device type
   * @returns {object|null} Detection rule or null
   */
  getDetectionRule(deviceType) {
    return this.database.detection_priority?.rules?.[deviceType] || null;
  }

  /**
   * Get common issue information
   * @param {string} issueKey - Issue key (e.g., 'battery_not_showing')
   * @returns {object|null} Issue info or null
   */
  getCommonIssue(issueKey) {
    return this.database.common_issues?.[issueKey] || null;
  }

  /**
   * Find all devices affected by a common issue
   * @param {string} issueKey - Issue key
   * @returns {array} List of affected devices
   */
  getAffectedDevices(issueKey) {
    const issue = this.getCommonIssue(issueKey);
    return issue ? issue.devices : [];
  }

  /**
   * Get all supported models
   * @returns {array} List of model IDs
   */
  getAllModels() {
    return this.loaded ? Object.keys(this.database.devices) : [];
  }

  /**
   * Get database version
   * @returns {string} Version string
   */
  getVersion() {
    return this.database?.version || 'unknown';
  }

  /**
   * Get database last updated date
   * @returns {string} Date string
   */
  getLastUpdated() {
    return this.database?.lastUpdated || 'unknown';
  }

  /**
   * Search devices by name
   * @param {string} query - Search query
   * @returns {array} List of matching devices
   */
  searchDevices(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();

    if (!this.loaded) return results;

    for (const [model, modelData] of Object.entries(this.database.devices)) {
      const manufacturers = modelData.manufacturers || {};
      
      for (const [manufacturer, device] of Object.entries(manufacturers)) {
        const name = (device.name || '').toLowerCase();
        const desc = (modelData.description || '').toLowerCase();
        
        if (name.includes(lowerQuery) || desc.includes(lowerQuery) || 
            model.toLowerCase().includes(lowerQuery) ||
            manufacturer.toLowerCase().includes(lowerQuery)) {
          results.push({
            model,
            manufacturer,
            name: device.name,
            driver: device.driver,
            description: modelData.description
          });
        }
      }
    }

    return results;
  }

  /**
   * Get statistics about the database
   * @returns {object} Database statistics
   */
  getStats() {
    if (!this.loaded) {
      return { loaded: false };
    }

    const models = Object.keys(this.database.devices);
    let totalManufacturers = 0;
    let tuyaDpDevices = 0;
    let standardZigbeeDevices = 0;

    for (const [model, modelData] of Object.entries(this.database.devices)) {
      const manufacturerCount = Object.keys(modelData.manufacturers || {}).length;
      totalManufacturers += manufacturerCount;

      if (modelData.type === 'tuya_dp') {
        tuyaDpDevices += manufacturerCount;
      } else {
        standardZigbeeDevices += manufacturerCount;
      }
    }

    return {
      loaded: true,
      version: this.database.version,
      lastUpdated: this.database.lastUpdated,
      totalModels: models.length,
      totalManufacturers,
      tuyaDpDevices,
      standardZigbeeDevices,
      parsers: Object.keys(this.database.parsers || {}).length,
      driverRules: Object.keys(this.database.driver_rules || {}).length,
      commonIssues: Object.keys(this.database.common_issues || {}).length
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CROSS-PLATFORM RESEARCH METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get all alternative sources for device research
   * @returns {object} ALTERNATIVE_SOURCES constant
   */
  getAlternativeSources() {
    return ALTERNATIVE_SOURCES;
  }

  /**
   * Get specific alternative source by key
   * @param {string} sourceKey - Source key (e.g., 'zigbee2mqtt', 'zha')
   * @returns {object|null} Source info or null
   */
  getSource(sourceKey) {
    return ALTERNATIVE_SOURCES[sourceKey] || null;
  }

  /**
   * Get all sources of a specific type
   * @param {string} type - Source type ('community', 'proprietary', 'database', 'official')
   * @returns {array} Array of sources matching the type
   */
  getSourcesByType(type) {
    return Object.entries(ALTERNATIVE_SOURCES)
      .filter(([, source]) => source.type === type)
      .map(([key, source]) => ({ key, ...source }));
  }

  /**
   * Get device category information
   * @param {string} category - Category key (e.g., 'lights', 'switches')
   * @returns {object|null} Category info or null
   */
  getDeviceCategory(category) {
    return DEVICE_CATEGORIES[category] || null;
  }

  /**
   * Get all device categories
   * @returns {object} DEVICE_CATEGORIES constant
   */
  getAllDeviceCategories() {
    return DEVICE_CATEGORIES;
  }

  /**
   * Find category by driver subtype
   * @param {string} driverType - Driver type (e.g., 'switch_2gang')
   * @returns {object|null} Category info with category key
   */
  findCategoryByDriver(driverType) {
    for (const [categoryKey, category] of Object.entries(DEVICE_CATEGORIES)) {
      if (category.subTypes && category.subTypes.includes(driverType)) {
        return { category: categoryKey, ...category };
      }
    }
    return null;
  }

  /**
   * Get standard Tuya DPs for a device category
   * @param {string} category - Category key
   * @returns {object|null} DP mappings or null
   */
  getCategoryDPs(category) {
    const cat = DEVICE_CATEGORIES[category];
    return cat ? cat.tuyaDPs : null;
  }

  /**
   * Get required ZCL clusters for a device category
   * @param {string} category - Category key
   * @returns {array} Array of cluster IDs
   */
  getCategoryClusters(category) {
    const cat = DEVICE_CATEGORIES[category];
    return cat ? cat.clusters : [];
  }

  /**
   * Check if manufacturer name matches Tuya pattern
   * @param {string} manufacturerName - Manufacturer name to check
   * @returns {object} { isTuya: bool, prefix: string|null, brand: string|null }
   */
  identifyManufacturer(manufacturerName) {
    if (!manufacturerName) {
      return { isTuya: false, prefix: null, brand: null };
    }

    // Check Tuya prefixes
    for (const prefix of MANUFACTURER_PREFIXES.tuya) {
      if (manufacturerName.startsWith(prefix) || manufacturerName.toLowerCase().startsWith(prefix.toLowerCase())) {
        return { isTuya: true, prefix, brand: null };
      }
    }

    // Check brand prefixes
    for (const [brand, prefixes] of Object.entries(MANUFACTURER_PREFIXES.brands)) {
      for (const prefix of prefixes) {
        if (manufacturerName.includes(prefix) || manufacturerName.toLowerCase().includes(prefix.toLowerCase())) {
          return { isTuya: true, prefix, brand };
        }
      }
    }

    return { isTuya: false, prefix: null, brand: null };
  }

  /**
   * Get all known Tuya manufacturer prefixes
   * @returns {object} MANUFACTURER_PREFIXES constant
   */
  getManufacturerPrefixes() {
    return MANUFACTURER_PREFIXES;
  }

  /**
   * Parse a DP value using built-in parsers
   * @param {string} parserName - Parser name from DP_PARSERS
   * @param {any} value - Raw value to parse
   * @returns {any} Parsed value
   */
  parseWithBuiltinParser(parserName, value) {
    const parser = DP_PARSERS[parserName];
    if (!parser) {
      return value;
    }
    try {
      return parser(value);
    } catch (err) {
      console.error(`[DRIVER-MAPPING] Built-in parser ${parserName} failed:`, err.message);
      return value;
    }
  }

  /**
   * Get all built-in DP parsers
   * @returns {object} DP_PARSERS constant
   */
  getBuiltinParsers() {
    return DP_PARSERS;
  }

  /**
   * Generate research URLs for a specific device
   * @param {string} manufacturerName - Device manufacturer name
   * @param {string} model - Device model (e.g., 'TS0601')
   * @returns {object} Object with URLs for each research source
   */
  generateResearchUrls(manufacturerName, model) {
    const urls = {};
    
    // Zigbee2MQTT search
    urls.zigbee2mqtt = `https://www.zigbee2mqtt.io/supported-devices/#q=${encodeURIComponent(manufacturerName)}`;
    
    // ZHA GitHub issues
    urls.zha = `https://github.com/zigpy/zha-device-handlers/issues?q=${encodeURIComponent(manufacturerName)}`;
    
    // deCONZ GitHub issues
    urls.deconz = `https://github.com/dresden-elektronik/deconz-rest-plugin/issues?q=${encodeURIComponent(manufacturerName)}`;
    
    // Blakadder search
    urls.blakadder = `https://templates.blakadder.com/search.html?q=${encodeURIComponent(manufacturerName)}`;
    
    // Zigbee compatibility database
    urls.zigbeeCompatibility = `https://zigbee.blakadder.com/search.html?q=${encodeURIComponent(manufacturerName)}`;
    
    // Hubitat community
    urls.hubitat = `https://community.hubitat.com/search?q=${encodeURIComponent(manufacturerName + ' ' + model)}`;
    
    // Home Assistant community
    urls.homeAssistant = `https://community.home-assistant.io/search?q=${encodeURIComponent(manufacturerName + ' zigbee')}`;
    
    // Reddit
    urls.reddit = `https://www.reddit.com/search/?q=${encodeURIComponent(manufacturerName + ' tuya zigbee')}`;
    
    // GitHub global search
    urls.github = `https://github.com/search?q=${encodeURIComponent(manufacturerName)}&type=code`;
    
    return urls;
  }

  /**
   * Get ZCL cluster information
   * @param {number} clusterId - Cluster ID
   * @returns {object|null} Cluster info or null
   */
  getClusterInfo(clusterId) {
    const clusters = ALTERNATIVE_SOURCES.zclClusters.commonClusters;
    for (const [name, id] of Object.entries(clusters)) {
      if (id === clusterId) {
        return { id: clusterId, name, hex: `0x${clusterId.toString(16).padStart(4, '0').toUpperCase()}` };
      }
    }
    return { id: clusterId, name: 'unknown', hex: `0x${clusterId.toString(16).padStart(4, '0').toUpperCase()}` };
  }

  /**
   * Get comprehensive source summary
   * @returns {object} Summary of all sources with device counts
   */
  getSourcesSummary() {
    const summary = {
      totalSources: Object.keys(ALTERNATIVE_SOURCES).length,
      byType: {},
      totalDevicesCovered: 0,
      tuyaDevicesCovered: 0
    };

    for (const [key, source] of Object.entries(ALTERNATIVE_SOURCES)) {
      if (!summary.byType[source.type]) {
        summary.byType[source.type] = [];
      }
      summary.byType[source.type].push({
        key,
        name: source.name,
        deviceCount: source.deviceCount || 0,
        tuyaDevices: source.tuyaDevices || 0
      });

      if (source.deviceCount) summary.totalDevicesCovered += source.deviceCount;
      if (source.tuyaDevices) summary.tuyaDevicesCovered += source.tuyaDevices;
    }

    return summary;
  }
}

// Singleton instance
let instance = null;

/**
 * Get singleton instance of DriverMappingLoader
 * @returns {DriverMappingLoader} Singleton instance
 */
function getInstance() {
  if (!instance) {
    instance = new DriverMappingLoader();
  }
  return instance;
}

module.exports = {
  // Class and singleton
  DriverMappingLoader,
  getInstance,
  
  // Constants - Direct access to research data
  ALTERNATIVE_SOURCES,
  DEVICE_CATEGORIES,
  MANUFACTURER_PREFIXES,
  DP_PARSERS,
  
  // Core database methods
  getDeviceInfo: (model, manufacturer) => getInstance().getDeviceInfo(model, manufacturer),
  getDPMappings: (model, manufacturer) => getInstance().getDPMappings(model, manufacturer),
  getRecommendedDriver: (model, manufacturer) => getInstance().getRecommendedDriver(model, manufacturer),
  parseValue: (parserName, value) => getInstance().parseValue(parserName, value),
  checkDeprecated: (driverType, subType) => getInstance().checkDeprecated(driverType, subType),
  searchDevices: (query) => getInstance().searchDevices(query),
  getStats: () => getInstance().getStats(),
  
  // Cross-platform research methods
  getAlternativeSources: () => getInstance().getAlternativeSources(),
  getSource: (sourceKey) => getInstance().getSource(sourceKey),
  getSourcesByType: (type) => getInstance().getSourcesByType(type),
  getSourcesSummary: () => getInstance().getSourcesSummary(),
  
  // Device category methods
  getDeviceCategory: (category) => getInstance().getDeviceCategory(category),
  getAllDeviceCategories: () => getInstance().getAllDeviceCategories(),
  findCategoryByDriver: (driverType) => getInstance().findCategoryByDriver(driverType),
  getCategoryDPs: (category) => getInstance().getCategoryDPs(category),
  getCategoryClusters: (category) => getInstance().getCategoryClusters(category),
  
  // Manufacturer identification
  identifyManufacturer: (manufacturerName) => getInstance().identifyManufacturer(manufacturerName),
  getManufacturerPrefixes: () => getInstance().getManufacturerPrefixes(),
  
  // Parsing utilities
  parseWithBuiltinParser: (parserName, value) => getInstance().parseWithBuiltinParser(parserName, value),
  getBuiltinParsers: () => getInstance().getBuiltinParsers(),
  
  // Research helpers
  generateResearchUrls: (manufacturerName, model) => getInstance().generateResearchUrls(manufacturerName, model),
  getClusterInfo: (clusterId) => getInstance().getClusterInfo(clusterId)
};
