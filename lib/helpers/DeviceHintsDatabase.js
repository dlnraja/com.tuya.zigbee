'use strict';

/**
 * DeviceHintsDatabase - Comprehensive fingerprint → driver mapping
 *
 * Maps all known Tuya/Zigbee manufacturer IDs to recommended drivers.
 * Used by SmartAdapt and DeviceIdentificationDatabase for accurate matching.
 */

const DEVICE_HINTS = {
  // ═══════════════════════════════════════════════════════════════════════════
  // CLIMATE / TEMPERATURE / HUMIDITY SENSORS
  // ═══════════════════════════════════════════════════════════════════════════
  '_TZE200_9yapgbuv': {
    driverId: 'climate_sensor_temp_humidity',
    deviceType: 'sensor',
    protocol: 'tuya_dp',
    productId: 'TS0601',
    description: 'ZTH01 Temperature/Humidity Sensor',
    capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
    dpMapping: { 1: 'measure_temperature', 2: 'measure_humidity', 4: 'measure_battery' }
  },
  '_TZE284_vvmbj46n': {
    driverId: 'soil_sensor',
    deviceType: 'sensor',
    protocol: 'tuya_dp',
    productId: 'TS0601',
    description: 'Soil Moisture & Climate Sensor',
    capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
    dpMapping: { 1: 'measure_temperature', 2: 'measure_humidity', 3: 'measure_battery' }
  },
  '_TZE284_oitavov2': {
    driverId: 'soil_sensor',
    deviceType: 'sensor',
    protocol: 'tuya_dp',
    productId: 'TS0601',
    description: 'Soil Moisture & Climate Sensor (alternate)',
    capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RADIATOR VALVES / TRV
  // ═══════════════════════════════════════════════════════════════════════════
  '_TZE200_hvaxb2tc': {
    driverId: 'radiator_valve_smart',
    deviceType: 'thermostat',
    protocol: 'tuya_dp',
    productId: 'TS0601',
    description: 'Avatto TRV06 Radiator Valve',
    capabilities: ['target_temperature', 'measure_temperature', 'thermostat_mode', 'measure_battery'],
    dpMapping: { 2: 'target_temperature', 3: 'measure_temperature', 4: 'thermostat_mode', 14: 'measure_battery' }
  },
  '_TZE200_aoclfnxz': {
    driverId: 'radiator_valve_smart',
    deviceType: 'thermostat',
    protocol: 'tuya_dp',
    productId: 'TS0601',
    description: 'MOES TRV Radiator Valve',
    capabilities: ['target_temperature', 'measure_temperature', 'thermostat_mode', 'measure_battery']
  },
  '_TZE200_bvu2wnxz': {
    driverId: 'radiator_valve_smart',
    deviceType: 'thermostat',
    protocol: 'tuya_dp',
    productId: 'TS0601',
    description: 'Generic TRV Radiator Valve',
    capabilities: ['target_temperature', 'measure_temperature', 'thermostat_mode', 'measure_battery']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRESENCE / RADAR / MMWAVE SENSORS
  // ═══════════════════════════════════════════════════════════════════════════
  '_TZE200_rhgsbacq': {
    driverId: 'presence_sensor_radar',
    deviceType: 'sensor',
    protocol: 'tuya_dp',
    productId: 'TS0601',
    description: 'Tuya Human Presence Radar',
    capabilities: ['alarm_motion', 'measure_luminance', 'measure_battery'],
    dpMapping: { 1: 'alarm_motion', 4: 'measure_luminance', 9: 'radar_sensitivity' }
  },
  '_TZE200_3towulqd': {
    driverId: 'zg_204zv_multi_sensor',
    deviceType: 'sensor',
    protocol: 'tuya_dp',
    productId: 'TS0601',
    description: 'ZG-204ZV Multi-Sensor (Motion, Temp, Humidity, Light)',
    capabilities: ['alarm_motion', 'measure_temperature', 'measure_humidity', 'measure_luminance', 'measure_battery'],
    dpMapping: { 1: 'presence', 3: 'temperature', 4: 'humidity', 9: 'illuminance', 15: 'battery' }
  },
  '_TZE200_ppuj1vem': {
    driverId: 'zg_204zv_multi_sensor',
    deviceType: 'sensor',
    protocol: 'tuya_dp',
    productId: 'TS0601',
    description: 'ZG-204ZL PIR Multi-Sensor',
    capabilities: ['alarm_motion', 'measure_temperature', 'measure_humidity', 'measure_luminance', 'measure_battery']
  },
  '_TZE200_7hfcudw5': {
    driverId: 'zg_204zv_multi_sensor',
    deviceType: 'sensor',
    protocol: 'tuya_dp',
    productId: 'TS0601',
    description: 'ZG-204ZM mmWave Multi-Sensor',
    capabilities: ['alarm_motion', 'measure_temperature', 'measure_humidity', 'measure_luminance', 'measure_battery']
  },
  '_TZE200_1ibpyhdc': {
    driverId: 'motion_sensor_radar_advanced',
    deviceType: 'sensor',
    protocol: 'tuya_dp',
    productId: 'TS0601',
    description: 'ZG-204ZL / ZG-204ZV Variant',
    capabilities: ['alarm_motion', 'measure_luminance', 'measure_battery']
  },
  '_TZE204_sxm7l9xa': {
    driverId: 'motion_sensor_radar_advanced',
    deviceType: 'sensor',
    protocol: 'tuya_dp',
    productId: 'TS0601',
    description: 'mmWave Presence Radar Advanced',
    capabilities: ['alarm_motion', 'measure_luminance', 'measure_distance']
  },
  '_TZE200_ikvncluo': {
    driverId: 'motion_sensor_radar_mmwave',
    deviceType: 'sensor',
    protocol: 'tuya_dp',
    productId: 'TS0601',
    description: 'mmWave Radar Motion',
    capabilities: ['alarm_motion', 'measure_luminance']
  },
  '_TZE204_ijxvkhd0': {
    driverId: 'sensor_mmwave_presence_advanced',
    deviceType: 'sensor',
    protocol: 'tuya_dp',
    productId: 'TS0601',
    description: 'Advanced mmWave Presence',
    capabilities: ['alarm_motion', 'measure_luminance', 'measure_distance']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BUTTONS / REMOTES / SCENE CONTROLLERS
  // ═══════════════════════════════════════════════════════════════════════════
  '_TZ3000_u3nv1jwk': {
    driverId: 'scene_controller_4button',
    deviceType: 'button',
    protocol: 'zigbee_standard',
    productId: 'TS0044',
    description: '4-Button Remote Control',
    capabilities: ['measure_battery'],
    endpoints: 4,
    flowCards: ['button_pressed', 'button_held', 'button_double_pressed']
  },
  '_TZ3000_xabckq1v': {
    driverId: 'button_ts0044',
    deviceType: 'button',
    protocol: 'zigbee_standard',
    productId: 'TS0044',
    description: '4-Button Scene Switch',
    capabilities: ['measure_battery'],
    endpoints: 4
  },
  '_TZ3000_bi6lpsew': {
    driverId: 'button_ts0043',
    deviceType: 'button',
    protocol: 'zigbee_standard',
    productId: 'TS0043',
    description: '3-Button Remote',
    capabilities: ['measure_battery'],
    endpoints: 3
  },
  '_TZ3000_a7ouggvs': {
    driverId: 'button_ts0041',
    deviceType: 'button',
    protocol: 'zigbee_standard',
    productId: 'TS0041',
    description: '1-Button Remote',
    capabilities: ['measure_battery'],
    endpoints: 1
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SOS / EMERGENCY BUTTONS
  // ═══════════════════════════════════════════════════════════════════════════
  '_TZ3000_0dumfk2z': {
    driverId: 'button_emergency_sos',
    deviceType: 'button',
    protocol: 'zigbee_ias',
    productId: 'TS0215A',
    description: 'SOS Emergency Button',
    capabilities: ['alarm_generic', 'measure_battery'],
    flowCards: ['sos_button_pressed', 'sos_button_cleared']
  },
  '_TZ3000_p6ju8myv': {
    driverId: 'button_emergency_sos',
    deviceType: 'button',
    protocol: 'zigbee_ias',
    productId: 'TS0215A',
    description: 'SOS Emergency Button (alt)',
    capabilities: ['alarm_generic', 'measure_battery']
  },
  '_TZ3000_2izubafb': {
    driverId: 'button_emergency_advanced',
    deviceType: 'button',
    protocol: 'zigbee_ias',
    productId: 'TS0215A',
    description: 'Emergency Panic Button',
    capabilities: ['alarm_generic', 'measure_battery']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // USB OUTLETS / SOCKETS
  // ═══════════════════════════════════════════════════════════════════════════
  '_TZE204_mvtclclq': {
    driverId: 'usb_outlet_bseed',
    deviceType: 'socket',
    protocol: 'tuya_dp',
    productId: 'TS0601',
    description: 'BSEED Double Socket + USB',
    capabilities: ['onoff', 'onoff.gang2', 'onoff.usb'],
    dpMapping: { 1: 'socket_1', 2: 'socket_2', 3: 'usb_port' }
  },
  '_TZE200_mvtclclq': {
    driverId: 'usb_outlet_bseed',
    deviceType: 'socket',
    protocol: 'tuya_dp',
    productId: 'TS0601',
    description: 'BSEED Double Socket + USB (variant)',
    capabilities: ['onoff', 'onoff.gang2', 'onoff.usb'],
    dpMapping: { 1: 'socket_1', 2: 'socket_2', 3: 'usb_port' }
  },
  '_TZ3000_h1ipgkwn': {
    driverId: 'usb_outlet_advanced',
    deviceType: 'socket',
    protocol: 'zigbee_standard',
    productId: 'TS0002',
    description: 'USB Power Adapter 2-Channel',
    capabilities: ['onoff.l1', 'onoff.l2'],
    endpoints: [1, 2]
  },
  '_TZ3000_w0qqde0g': {
    driverId: 'usb_outlet_advanced',
    deviceType: 'socket',
    protocol: 'zigbee_standard',
    productId: 'TS011F',
    description: 'USB Outlet with Energy Monitoring',
    capabilities: ['onoff', 'measure_power', 'meter_power']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SWITCHES (1-8 Gang)
  // ═══════════════════════════════════════════════════════════════════════════
  '_TZ3000_gjnozsaz': {
    driverId: 'switch_basic_1gang',
    deviceType: 'switch',
    protocol: 'zigbee_standard',
    productId: 'TS0001',
    description: '1-Gang Wall Switch',
    capabilities: ['onoff']
  },
  '_TZ3000_txpirlil': {
    driverId: 'switch_basic_2gang',
    deviceType: 'switch',
    protocol: 'zigbee_standard',
    productId: 'TS0002',
    description: '2-Gang Wall Switch',
    capabilities: ['onoff.l1', 'onoff.l2']
  },
  '_TZ3000_18ejxno0': {
    driverId: 'switch_basic_2gang_usb',
    deviceType: 'switch',
    protocol: 'zigbee_standard',
    productId: 'TS0002',
    description: '2-Gang Switch + USB',
    capabilities: ['onoff.l1', 'onoff.l2', 'onoff.usb']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SAFETY SENSORS (Smoke, CO, Water, Gas)
  // ═══════════════════════════════════════════════════════════════════════════
  '_TZE200_ytibqbra': {
    driverId: 'smoke_detector_advanced',
    deviceType: 'sensor',
    protocol: 'tuya_dp',
    productId: 'TS0601',
    description: 'Smart Smoke Detector',
    capabilities: ['alarm_smoke', 'measure_battery']
  },
  '_TZE200_m9skfctm': {
    driverId: 'moes_co_detector',
    deviceType: 'sensor',
    protocol: 'tuya_dp',
    productId: 'TS0601',
    description: 'CO Carbon Monoxide Detector',
    capabilities: ['alarm_co', 'measure_battery']
  },
  '_TZE200_auin8mzr': {
    driverId: 'water_leak_sensor',
    deviceType: 'sensor',
    protocol: 'tuya_dp',
    productId: 'TS0601',
    description: 'Water Leak Sensor',
    capabilities: ['alarm_water', 'measure_battery']
  },
  '_TZE200_ggev5fsl': {
    driverId: 'gas_detector',
    deviceType: 'sensor',
    protocol: 'tuya_dp',
    productId: 'TS0601',
    description: 'Gas Leak Detector',
    capabilities: ['alarm_gas', 'measure_battery']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTACT / DOOR / WINDOW SENSORS
  // ═══════════════════════════════════════════════════════════════════════════
  '_TZ3000_26fmupbb': {
    driverId: 'contact_sensor_basic',
    deviceType: 'sensor',
    protocol: 'zigbee_ias',
    productId: 'TS0203',
    description: 'Door/Window Contact Sensor',
    capabilities: ['alarm_contact', 'measure_battery']
  },
  '_TZ3000_n2egfsli': {
    driverId: 'contact_sensor_multipurpose',
    deviceType: 'sensor',
    protocol: 'zigbee_ias',
    productId: 'TS0203',
    description: 'Multipurpose Contact Sensor',
    capabilities: ['alarm_contact', 'measure_battery', 'alarm_tamper']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CURTAIN / COVER MOTORS
  // ═══════════════════════════════════════════════════════════════════════════
  '_TZE200_fctwhugx': {
    driverId: 'curtain_motor_ts0601',
    deviceType: 'windowcoverings',
    protocol: 'tuya_dp',
    productId: 'TS0601',
    description: 'Curtain Motor',
    capabilities: ['windowcoverings_state', 'windowcoverings_set', 'dim'],
    dpMapping: { 1: 'windowcoverings_state', 2: 'dim', 3: 'windowcoverings_set' }
  },
  '_TZE200_cowvfni3': {
    driverId: 'curtain_motor_advanced',
    deviceType: 'windowcoverings',
    protocol: 'tuya_dp',
    productId: 'TS0601',
    description: 'Smart Curtain Motor',
    capabilities: ['windowcoverings_state', 'windowcoverings_set', 'dim']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PLUGS / OUTLETS WITH ENERGY MONITORING
  // ═══════════════════════════════════════════════════════════════════════════
  '_TZ3000_g5xawfcq': {
    driverId: 'plug_energy_monitor',
    deviceType: 'socket',
    protocol: 'zigbee_standard',
    productId: 'TS011F',
    description: 'Smart Plug with Energy Monitoring',
    capabilities: ['onoff', 'measure_power', 'measure_voltage', 'measure_current', 'meter_power']
  },
  '_TZ3000_cehuw1lw': {
    driverId: 'plug_energy_advanced',
    deviceType: 'socket',
    protocol: 'zigbee_standard',
    productId: 'TS011F',
    description: 'Advanced Energy Plug',
    capabilities: ['onoff', 'measure_power', 'measure_voltage', 'measure_current', 'meter_power']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MOTION / PIR SENSORS (Standard)
  // ═══════════════════════════════════════════════════════════════════════════
  '_TZ3000_mmtwjmaq': {
    driverId: 'motion_sensor_pir',
    deviceType: 'sensor',
    protocol: 'zigbee_ias',
    productId: 'TS0202',
    description: 'PIR Motion Sensor',
    capabilities: ['alarm_motion', 'measure_battery']
  },
  '_TZ3000_kmh5qpmb': {
    driverId: 'motion_sensor_pir_advanced',
    deviceType: 'sensor',
    protocol: 'zigbee_ias',
    productId: 'TS0202',
    description: 'PIR Motion Sensor with Illuminance',
    capabilities: ['alarm_motion', 'measure_luminance', 'measure_battery']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LIGHTS / BULBS
  // ═══════════════════════════════════════════════════════════════════════════
  '_TZ3000_odygigth': {
    driverId: 'bulb_dimmable',
    deviceType: 'light',
    protocol: 'zigbee_standard',
    productId: 'TS0502A',
    description: 'Dimmable LED Bulb',
    capabilities: ['onoff', 'dim']
  },
  '_TZ3000_49qchf10': {
    driverId: 'bulb_tunable_white',
    deviceType: 'light',
    protocol: 'zigbee_standard',
    productId: 'TS0502B',
    description: 'Tunable White Bulb',
    capabilities: ['onoff', 'dim', 'light_temperature']
  },
  '_TZ3000_dbou1ap4': {
    driverId: 'bulb_rgbw',
    deviceType: 'light',
    protocol: 'zigbee_standard',
    productId: 'TS0505B',
    description: 'RGBW LED Bulb',
    capabilities: ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode']
  }
};

/**
 * Get device hint by manufacturer name
 */
function getDeviceHint(manufacturerName) {
  return DEVICE_HINTS[manufacturerName] || null;
}

/**
 * Get all hints for a device type
 */
function getHintsByDeviceType(deviceType) {
  return Object.entries(DEVICE_HINTS)
    .filter(([_, hint]) => hint.deviceType === deviceType)
    .map(([manufacturer, hint]) => ({ manufacturer, ...hint }));
}

/**
 * Get all hints for a protocol
 */
function getHintsByProtocol(protocol) {
  return Object.entries(DEVICE_HINTS)
    .filter(([_, hint]) => hint.protocol === protocol)
    .map(([manufacturer, hint]) => ({ manufacturer, ...hint }));
}

/**
 * Find best matching driver for device info
 */
function findBestDriver(deviceInfo) {
  const { manufacturer, modelId } = deviceInfo;

  // Direct match
  if (manufacturer && DEVICE_HINTS[manufacturer]) {
    const hint = DEVICE_HINTS[manufacturer];
    return {
      driverId: hint.driverId,
      confidence: 0.95,
      source: 'manufacturer_exact',
      hint
    };
  }

  // Prefix match
  for (const [mfr, hint] of Object.entries(DEVICE_HINTS)) {
    if (manufacturer && manufacturer.startsWith(mfr.slice(0, -3))) {
      return {
        driverId: hint.driverId,
        confidence: 0.80,
        source: 'manufacturer_prefix',
        hint
      };
    }
  }

  // ProductId match (case-insensitive)
  if (modelId) {
    const modelLower = modelId.toLowerCase();
    for (const [mfr, hint] of Object.entries(DEVICE_HINTS)) {
      if (hint.productId && hint.productId.toLowerCase() === modelLower) {
        return {
          driverId: hint.driverId,
          confidence: 0.70,
          source: 'productId',
          hint
        };
      }
    }
  }

  return null;
}

/**
 * Get all manufacturer IDs
 */
function getAllManufacturerIds() {
  return Object.keys(DEVICE_HINTS);
}

/**
 * Get statistics
 */
function getStats() {
  const deviceTypes = new Set();
  const protocols = new Set();
  const drivers = new Set();

  for (const hint of Object.values(DEVICE_HINTS)) {
    deviceTypes.add(hint.deviceType);
    protocols.add(hint.protocol);
    drivers.add(hint.driverId);
  }

  return {
    totalHints: Object.keys(DEVICE_HINTS).length,
    deviceTypes: Array.from(deviceTypes),
    protocols: Array.from(protocols),
    drivers: Array.from(drivers),
    deviceTypeCount: deviceTypes.size,
    protocolCount: protocols.size,
    driverCount: drivers.size
  };
}

module.exports = {
  DEVICE_HINTS,
  getDeviceHint,
  getHintsByDeviceType,
  getHintsByProtocol,
  findBestDriver,
  getAllManufacturerIds,
  getStats
};
