'use strict';

/**
 * ClusterDPDatabase - Universal Cluster & DataPoint Database
 *
 * Comprehensive mapping of:
 * - Zigbee standard clusters
 * - Tuya DataPoints (DP)
 * - Manufacturer-specific clusters
 * - Capabilities mapping
 *
 * Covers ALL device types for maximum compatibility
 */

class ClusterDPDatabase {

  // ============================================================================
  // ZIGBEE STANDARD CLUSTERS (0x0000 - 0xFFFF)
  // ============================================================================

  static ZIGBEE_CLUSTERS = {
    // General Clusters (0x0000 - 0x00FF)
    BASIC: { id: 0x0000, name: 'basic', decimal: 0 },
    POWER_CONFIG: { id: 0x0001, name: 'powerConfiguration', decimal: 1 },
    DEVICE_TEMP: { id: 0x0002, name: 'deviceTemperature', decimal: 2 },
    IDENTIFY: { id: 0x0003, name: 'identify', decimal: 3 },
    GROUPS: { id: 0x0004, name: 'groups', decimal: 4 },
    SCENES: { id: 0x0005, name: 'scenes', decimal: 5 },
    ON_OFF: { id: 0x0006, name: 'onOff', decimal: 6 },
    ON_OFF_CONFIG: { id: 0x0007, name: 'onOffSwitchConfiguration', decimal: 7 },
    LEVEL_CONTROL: { id: 0x0008, name: 'levelControl', decimal: 8 },
    ALARMS: { id: 0x0009, name: 'alarms', decimal: 9 },
    TIME: { id: 0x000A, name: 'time', decimal: 10 },
    RSSI_LOCATION: { id: 0x000B, name: 'rssiLocation', decimal: 11 },
    BINARY_INPUT: { id: 0x000F, name: 'binaryInput', decimal: 15 },
    COMMISSIONING: { id: 0x0015, name: 'commissioning', decimal: 21 },
    PARTITION: { id: 0x0016, name: 'partition', decimal: 22 },
    OTA: { id: 0x0019, name: 'ota', decimal: 25 },
    POLL_CONTROL: { id: 0x0020, name: 'pollControl', decimal: 32 },
    GREEN_POWER: { id: 0x0021, name: 'greenPower', decimal: 33 },

    // Closures (0x0100 - 0x01FF)
    SHADE_CONFIG: { id: 0x0100, name: 'shadeConfiguration', decimal: 256 },
    DOOR_LOCK: { id: 0x0101, name: 'doorLock', decimal: 257 },
    WINDOW_COVERING: { id: 0x0102, name: 'windowCovering', decimal: 258 },

    // HVAC (0x0200 - 0x02FF)
    PUMP_CONFIG: { id: 0x0200, name: 'pumpConfigurationAndControl', decimal: 512 },
    THERMOSTAT: { id: 0x0201, name: 'thermostat', decimal: 513 },
    FAN_CONTROL: { id: 0x0202, name: 'fanControl', decimal: 514 },
    DEHUMIDIFICATION: { id: 0x0203, name: 'dehumidificationControl', decimal: 515 },
    THERMOSTAT_UI: { id: 0x0204, name: 'thermostatUserInterfaceConfiguration', decimal: 516 },

    // Lighting (0x0300 - 0x03FF)
    COLOR_CONTROL: { id: 0x0300, name: 'colorControl', decimal: 768 },
    BALLAST_CONFIG: { id: 0x0301, name: 'ballastConfiguration', decimal: 769 },

    // Measurement & Sensing (0x0400 - 0x04FF)
    ILLUMINANCE: { id: 0x0400, name: 'illuminanceMeasurement', decimal: 1024 },
    ILLUMINANCE_LEVEL: { id: 0x0401, name: 'illuminanceLevelSensing', decimal: 1025 },
    TEMPERATURE: { id: 0x0402, name: 'temperatureMeasurement', decimal: 1026 },
    PRESSURE: { id: 0x0403, name: 'pressureMeasurement', decimal: 1027 },
    FLOW: { id: 0x0404, name: 'flowMeasurement', decimal: 1028 },
    HUMIDITY: { id: 0x0405, name: 'relativeHumidity', decimal: 1029 },
    OCCUPANCY: { id: 0x0406, name: 'occupancySensing', decimal: 1030 },
    SOIL_MOISTURE: { id: 0x0408, name: 'soilMoisture', decimal: 1032 },
    PH_MEASUREMENT: { id: 0x0409, name: 'phMeasurement', decimal: 1033 },
    EC_MEASUREMENT: { id: 0x040A, name: 'electricalConductivity', decimal: 1034 },
    WIND_SPEED: { id: 0x040B, name: 'windSpeedMeasurement', decimal: 1035 },
    CO2_MEASUREMENT: { id: 0x040D, name: 'carbonDioxideMeasurement', decimal: 1037 },
    PM25_MEASUREMENT: { id: 0x042A, name: 'pm25Measurement', decimal: 1066 },

    // Security & Safety (0x0500 - 0x05FF)
    IAS_ZONE: { id: 0x0500, name: 'iasZone', decimal: 1280 },
    IAS_ACE: { id: 0x0501, name: 'iasAce', decimal: 1281 },
    IAS_WD: { id: 0x0502, name: 'iasWd', decimal: 1282 },

    // Protocol Interfaces (0x0600 - 0x06FF)
    GENERIC_TUNNEL: { id: 0x0600, name: 'genericTunnel', decimal: 1536 },
    BACNET_PROTOCOL: { id: 0x0601, name: 'bacnetProtocolTunnel', decimal: 1537 },

    // Smart Energy (0x0700 - 0x07FF)
    PRICE: { id: 0x0700, name: 'price', decimal: 1792 },
    DEMAND_RESPONSE: { id: 0x0701, name: 'demandResponseAndLoadControl', decimal: 1793 },
    METERING: { id: 0x0702, name: 'metering', decimal: 1794 },
    MESSAGING: { id: 0x0703, name: 'messaging', decimal: 1795 },
    TUNNELING: { id: 0x0704, name: 'tunneling', decimal: 1796 },
    PREPAYMENT: { id: 0x0705, name: 'prepayment', decimal: 1797 },
    ENERGY_MANAGEMENT: { id: 0x0706, name: 'energyManagement', decimal: 1798 },
    CALENDAR: { id: 0x0707, name: 'calendar', decimal: 1799 },
    DEVICE_MANAGEMENT: { id: 0x0708, name: 'deviceManagement', decimal: 1800 },

    // Lighting & Occupancy (0x0800 - 0x08FF)
    KEY_ESTABLISHMENT: { id: 0x0800, name: 'keyEstablishment', decimal: 2048 },

    // Measurement (0x0B00 - 0x0BFF)
    ELECTRICAL_MEASUREMENT: { id: 0x0B04, name: 'electricalMeasurement', decimal: 2820 },
    DIAGNOSTICS: { id: 0x0B05, name: 'diagnostics', decimal: 2821 },

    // Touchlink (0x1000)
    TOUCHLINK: { id: 0x1000, name: 'touchlink', decimal: 4096 },

    // Manufacturer Specific (0xE000 - 0xFFFF)
    TUYA_E000: { id: 0xE000, name: 'tuyaManufacturerSpecific0', decimal: 57344, description: 'Tuya Manufacturer Specific Cluster 0 (BSEED switches)' },
    TUYA_E001: { id: 0xE001, name: 'tuyaExternalSwitchType', decimal: 57345, description: 'Tuya External Switch Type Cluster (switch mode control)' },
    TUYA_ED00: { id: 0xED00, name: 'tuyaProprietary', decimal: 60672, description: 'Tuya Proprietary Cluster (TS0601 curtain motor, etc.)' },
    TUYA_EF00: { id: 0xEF00, name: 'tuyaManufacturer', decimal: 61184, description: 'Tuya Manufacturer Cluster (standard DP tunnel)' },
    TUYA_1888: { id: 0x1888, name: 'tuyaManufacturerSpecific1', decimal: 6280, description: 'Tuya Manufacturer Specific Cluster 1' },
    XIAOMI: { id: 0xFCC0, name: 'xiaomiSpecific', decimal: 64704, description: 'Xiaomi Manufacturer Specific Cluster' }
  };

  // ============================================================================
  // TUYA DATAPOINTS (DP) - COMPREHENSIVE DATABASE
  // ============================================================================

  static TUYA_DATAPOINTS = {
    // Standard Control DPs (1-10)
    DP1: {
      id: 1,
      name: 'switch_1',
      types: ['bool', 'enum'],
      capabilities: ['onoff'],
      description: 'Main switch / Gang 1 / Temperature'
    },
    DP2: {
      id: 2,
      name: 'switch_2',
      types: ['bool', 'value'],
      capabilities: ['onoff.gang2', 'measure_humidity'],
      description: 'Gang 2 / Humidity'
    },
    DP3: {
      id: 3,
      name: 'switch_3',
      types: ['bool'],
      capabilities: ['onoff.gang3'],
      description: 'Gang 3'
    },
    DP4: {
      id: 4,
      name: 'switch_4_battery',
      types: ['bool', 'value'],
      capabilities: ['onoff.gang4', 'measure_battery'],
      description: 'Gang 4 / Battery percentage'
    },
    DP5: {
      id: 5,
      name: 'switch_5_voltage',
      types: ['bool', 'value'],
      capabilities: ['onoff.gang5', 'measure_voltage'],
      description: 'Gang 5 / Battery voltage'
    },
    DP6: {
      id: 6,
      name: 'switch_6',
      types: ['bool', 'value'],
      capabilities: ['onoff.gang6', 'measure_humidity'],
      description: 'Gang 6 / Additional sensor'
    },

    // Countdown Timers (7-10)
    DP7: {
      id: 7,
      name: 'countdown_1',
      types: ['value'],
      capabilities: ['countdown_timer.gang1'],
      description: 'Countdown timer gang 1 (seconds)'
    },
    DP8: {
      id: 8,
      name: 'countdown_2',
      types: ['value'],
      capabilities: ['countdown_timer.gang2'],
      description: 'Countdown timer gang 2'
    },
    DP9: {
      id: 9,
      name: 'countdown_3',
      types: ['value'],
      capabilities: ['countdown_timer.gang3'],
      description: 'Countdown timer gang 3'
    },
    DP10: {
      id: 10,
      name: 'countdown_4',
      types: ['value'],
      capabilities: ['countdown_timer.gang4'],
      description: 'Countdown timer gang 4'
    },

    // Battery & Power (11-15)
    DP11: {
      id: 11,
      name: 'battery_state',
      types: ['enum'],
      capabilities: ['battery_charging_state'],
      description: 'Battery state (charging/discharging)'
    },
    DP12: {
      id: 12,
      name: 'battery_capacity',
      types: ['value'],
      capabilities: ['measure_battery.capacity'],
      description: 'Battery capacity (mAh)'
    },
    DP13: {
      id: 13,
      name: 'voltage',
      types: ['value'],
      capabilities: ['measure_voltage'],
      description: 'Voltage measurement'
    },
    DP14: {
      id: 14,
      name: 'battery_percentage_main',
      types: ['value'],
      capabilities: ['measure_battery'],
      description: 'Main battery percentage'
    },
    DP15: {
      id: 15,
      name: 'battery_alarm',
      types: ['bool'],
      capabilities: ['alarm_battery'],
      description: 'Low battery alarm'
    },

    // LED & Backlight (16-20)
    DP16: {
      id: 16,
      name: 'led_mode',
      types: ['enum'],
      capabilities: ['led_mode'],
      description: 'LED indicator mode'
    },
    DP17: {
      id: 17,
      name: 'backlight',
      types: ['bool', 'enum'],
      capabilities: ['backlight_mode'],
      description: 'Backlight control'
    },
    DP18: {
      id: 18,
      name: 'led_brightness',
      types: ['value'],
      capabilities: ['dim.led'],
      description: 'LED brightness (0-100)'
    },
    DP19: {
      id: 19,
      name: 'inching_mode',
      types: ['string'],
      capabilities: ['pulse_mode'],
      description: 'Inching/Pulse mode'
    },
    DP20: {
      id: 20,
      name: 'child_lock',
      types: ['bool'],
      capabilities: ['child_lock'],
      description: 'Child lock'
    },

    // Power Measurements (21-28)
    DP21: {
      id: 21,
      name: 'power',
      types: ['value'],
      capabilities: ['measure_power'],
      description: 'Power (W)'
    },
    DP22: {
      id: 22,
      name: 'current',
      types: ['value'],
      capabilities: ['measure_current'],
      description: 'Current (A)'
    },
    DP23: {
      id: 23,
      name: 'voltage_measurement',
      types: ['value'],
      capabilities: ['measure_voltage'],
      description: 'Voltage (V)'
    },
    DP24: {
      id: 24,
      name: 'energy',
      types: ['value'],
      capabilities: ['meter_power'],
      description: 'Energy consumption (kWh)'
    },
    DP25: {
      id: 25,
      name: 'power_factor',
      types: ['value'],
      capabilities: ['measure_power.factor'],
      description: 'Power factor'
    },

    // Time Sync (36, 103, etc.)
    DP100: {
      id: 100,
      name: 'time_sync_main',
      types: ['string'],
      capabilities: ['time_sync'],
      description: 'Time synchronization (main)'
    },

    // Environmental Sensors (101-120)
    DP101: {
      id: 101,
      name: 'temperature',
      types: ['value'],
      capabilities: ['measure_temperature'],
      description: 'Temperature (°C * 10)'
    },
    DP102: {
      id: 102,
      name: 'humidity',
      types: ['value'],
      capabilities: ['measure_humidity'],
      description: 'Humidity (% * 10)'
    },
    DP103: {
      id: 103,
      name: 'co2',
      types: ['value'],
      capabilities: ['measure_co2'],
      description: 'CO2 (ppm)'
    },
    DP104: {
      id: 104,
      name: 'voc',
      types: ['value'],
      capabilities: ['measure_voc'],
      description: 'VOC (ppb)'
    },
    DP105: {
      id: 105,
      name: 'pm25',
      types: ['value'],
      capabilities: ['measure_pm25'],
      description: 'PM2.5 (µg/m³)'
    },
    DP106: {
      id: 106,
      name: 'pm10',
      types: ['value'],
      capabilities: ['measure_pm10'],
      description: 'PM10 (µg/m³)'
    },
    DP107: {
      id: 107,
      name: 'formaldehyde',
      types: ['value'],
      capabilities: ['measure_formaldehyde'],
      description: 'HCHO (mg/m³)'
    },
    DP108: {
      id: 108,
      name: 'illuminance',
      types: ['value'],
      capabilities: ['measure_luminance'],
      description: 'Illuminance (lux)'
    },
    DP109: {
      id: 109,
      name: 'soil_moisture',
      types: ['value'],
      capabilities: ['measure_moisture'],
      description: 'Soil moisture (%)'
    },

    // Motion & Presence (151-160)
    DP151: {
      id: 151,
      name: 'motion',
      types: ['bool'],
      capabilities: ['alarm_motion'],
      description: 'Motion detection'
    },
    DP152: {
      id: 152,
      name: 'presence',
      types: ['bool'],
      capabilities: ['alarm_motion'],
      description: 'Presence detection (radar)'
    },
    DP153: {
      id: 153,
      name: 'motion_sensitivity',
      types: ['enum', 'value'],
      capabilities: ['motion_sensitivity'],
      description: 'Motion sensitivity (0-100)'
    },
    DP154: {
      id: 154,
      name: 'motion_distance',
      types: ['value'],
      capabilities: ['motion_distance'],
      description: 'Detection distance (m)'
    },
    DP155: {
      id: 155,
      name: 'motion_timeout',
      types: ['value'],
      capabilities: ['motion_timeout'],
      description: 'Motion timeout (seconds)'
    },

    // Contact & Door (161-170)
    DP161: {
      id: 161,
      name: 'contact',
      types: ['bool'],
      capabilities: ['alarm_contact'],
      description: 'Contact sensor'
    },
    DP162: {
      id: 162,
      name: 'tamper',
      types: ['bool'],
      capabilities: ['alarm_tamper'],
      description: 'Tamper alarm'
    },

    // Water & Leak (171-180)
    DP171: {
      id: 171,
      name: 'water_leak',
      types: ['bool'],
      capabilities: ['alarm_water'],
      description: 'Water leak detection'
    },
    DP172: {
      id: 172,
      name: 'water_level',
      types: ['value'],
      capabilities: ['measure_water'],
      description: 'Water level'
    },

    // Smoke & Gas (181-190)
    DP181: {
      id: 181,
      name: 'smoke',
      types: ['bool'],
      capabilities: ['alarm_smoke'],
      description: 'Smoke detection'
    },
    DP182: {
      id: 182,
      name: 'gas',
      types: ['bool'],
      capabilities: ['alarm_gas'],
      description: 'Gas detection'
    },
    DP183: {
      id: 183,
      name: 'co',
      types: ['bool', 'value'],
      capabilities: ['alarm_co', 'measure_co'],
      description: 'Carbon monoxide'
    },

    // Thermostat & Climate (201-220)
    DP201: {
      id: 201,
      name: 'target_temperature',
      types: ['value'],
      capabilities: ['target_temperature'],
      description: 'Target temperature (°C * 10)'
    },
    DP202: {
      id: 202,
      name: 'current_temperature',
      types: ['value'],
      capabilities: ['measure_temperature'],
      description: 'Current temperature'
    },
    DP203: {
      id: 203,
      name: 'thermostat_mode',
      types: ['enum'],
      capabilities: ['thermostat_mode'],
      description: 'Thermostat mode'
    },
    DP204: {
      id: 204,
      name: 'window_detection',
      types: ['bool'],
      capabilities: ['window_detection'],
      description: 'Window open detection'
    },
    DP205: {
      id: 205,
      name: 'frost_protection',
      types: ['bool'],
      capabilities: ['frost_protection'],
      description: 'Frost protection'
    },

    // Schedules (209-210)
    DP209: {
      id: 209,
      name: 'weekly_schedule',
      types: ['string'],
      capabilities: ['weekly_schedule'],
      description: 'Weekly schedule (complex)'
    },
    DP210: {
      id: 210,
      name: 'random_timing',
      types: ['string'],
      capabilities: ['random_timing'],
      description: 'Random timing (complex)'
    }
  };

  // ============================================================================
  // CLUSTER TO CAPABILITY MAPPING
  // ============================================================================

  static getCapabilitiesFromClusters(clusters) {
    const capabilities = new Set();

    for (const [id, cluster] of Object.entries(clusters)) {
      switch (parseInt(id)) {
      case 1: // Power Configuration
        capabilities.add('measure_battery');
        break;
      case 6: // OnOff
        capabilities.add('onoff');
        break;
      case 8: // Level Control
        capabilities.add('dim');
        break;
      case 768: // Color Control
        capabilities.add('light_hue');
        capabilities.add('light_saturation');
        break;
      case 1024: // Illuminance
        capabilities.add('measure_luminance');
        break;
      case 1026: // Temperature
        capabilities.add('measure_temperature');
        break;
      case 1029: // Humidity
        capabilities.add('measure_humidity');
        break;
      case 1030: // Occupancy
        capabilities.add('alarm_motion');
        break;
      case 1280: // IAS Zone
        capabilities.add('alarm_contact');
        capabilities.add('alarm_motion');
        capabilities.add('alarm_tamper');
        break;
      case 1794: // Metering
        capabilities.add('meter_power');
        break;
      case 2820: // Electrical Measurement
        capabilities.add('measure_power');
        capabilities.add('measure_voltage');
        capabilities.add('measure_current');
        break;
      }
    }

    return Array.from(capabilities);
  }

  // ============================================================================
  // DP TO CAPABILITY MAPPING
  // ============================================================================

  static getCapabilityFromDP(dpId) {
    const dp = this.TUYA_DATAPOINTS[`DP${dpId}`];
    return dp ? dp.capabilities[0] : null;
  }

  // ============================================================================
  // GET ALL SUPPORTED DPs FOR DEVICE TYPE
  // ============================================================================

  static getDPsForDeviceType(deviceType) {
    const dpMap = {
      'switch': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 14, 16, 17, 19, 20, 209, 210],
      'sensor_motion': [151, 152, 153, 154, 155, 14, 108],
      'sensor_climate': [101, 102, 14, 108],
      'sensor_air_quality': [103, 104, 105, 106, 107, 14],
      'sensor_contact': [161, 162, 14],
      'sensor_water': [171, 172, 14],
      'sensor_smoke': [181, 14],
      'sensor_gas': [182, 183, 14],
      'plug': [1, 21, 22, 23, 24, 25],
      'thermostat': [201, 202, 203, 204, 205],
      'curtain': [1, 2, 3],
      'lock': [1, 14, 20]
    };

    return dpMap[deviceType] || [];
  }

  // ============================================================================
  // DETECT DEVICE TYPE FROM CLUSTERS/DPs
  // ============================================================================

  static detectDeviceType(clusters, dps = []) {
    // Check clusters first
    if (clusters[6] && clusters[8]) return 'dimmer';
    if (clusters[6]) return 'switch';
    if (clusters[768]) return 'light_color';
    if (clusters[1280]) return 'sensor_security';
    if (clusters[1030]) return 'sensor_motion';
    if (clusters[1026] && clusters[1029]) return 'sensor_climate';
    if (clusters[513]) return 'thermostat';
    if (clusters[258]) return 'curtain';

    // Check DPs if no clear cluster match
    if (dps.includes(1) && dps.includes(2)) return 'switch_multigang';
    if (dps.includes(151) || dps.includes(152)) return 'sensor_motion';
    if (dps.includes(101) && dps.includes(102)) return 'sensor_climate';
    if (dps.includes(103) || dps.includes(104)) return 'sensor_air_quality';
    if (dps.includes(21) && dps.includes(24)) return 'plug_energy';

    return 'unknown';
  }
}

module.exports = ClusterDPDatabase;
