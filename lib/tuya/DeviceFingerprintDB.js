'use strict';

/**
 * Device Fingerprint Database - Consolidated from Zigbee2MQTT, ZHA, and Tuya documentation
 *
 * v5.2.33 - MASSIVE ENRICHMENT from all scrapers and databases
 *
 * Data sources:
 * - https://www.zigbee2mqtt.io/devices/ (4797 devices)
 * - https://github.com/Koenkk/zigbee-herdsman-converters/blob/master/src/devices/tuya.ts
 * - https://github.com/zigpy/zha-device-handlers (ZHA quirks)
 * - https://zigbee.blakadder.com/ (Blakadder database)
 * - https://developer.tuya.com/en/docs/iot/ (Tuya DP documentation)
 * - https://github.com/Koenkk/zigbee-OTA (OTA firmware repository)
 */

const DEVICE_FINGERPRINTS = {

  // ═══════════════════════════════════════════════════════════════════════════
  // CLIMATE / TEMPERATURE / HUMIDITY SENSORS
  // Source: zigbee2mqtt tuya.ts, ZHA TuyaQuirkBuilder
  // ═══════════════════════════════════════════════════════════════════════════

  '_TZE284_vvmbj46n': {
    driverId: 'climate_sensor', type: 'climate', powerSource: 'battery', batteryType: 'AAA',
    modelIds: ['TS0601'], productNames: ['Tuya TH05Z', 'ZTH05Z'],
    capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
    dps: {
      1: { name: 'temperature', converter: 'divideBy10', capability: 'measure_temperature' },
      2: { name: 'humidity', converter: 'raw', capability: 'measure_humidity' },
      4: { name: 'battery', converter: 'raw', capability: 'measure_battery' },
      9: { name: 'temperature_unit', converter: 'enum', values: ['celsius', 'fahrenheit'] },
      10: { name: 'max_temperature_alarm', converter: 'divideBy10' },
      11: { name: 'min_temperature_alarm', converter: 'divideBy10' },
      12: { name: 'max_humidity_alarm', converter: 'raw' },
      13: { name: 'min_humidity_alarm', converter: 'raw' },
      14: { name: 'temperature_alarm', converter: 'enum', values: ['lower_alarm', 'upper_alarm', 'cancel'] },
      15: { name: 'humidity_alarm', converter: 'enum', values: ['lower_alarm', 'upper_alarm', 'cancel'] },
      17: { name: 'temperature_periodic_report', converter: 'raw' },
      18: { name: 'humidity_periodic_report', converter: 'raw' },
      19: { name: 'temperature_sensitivity', converter: 'divideBy10' },
      20: { name: 'humidity_sensitivity', converter: 'raw' }
    }
  },
  '_TZE200_vvmbj46n': {
    driverId: 'climate_sensor', type: 'climate', powerSource: 'battery', batteryType: 'AAA',
    modelIds: ['TS0601'], productNames: ['Tuya ZTH05'],
    capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
    dps: {
      1: { name: 'temperature', converter: 'divideBy10', capability: 'measure_temperature' },
      2: { name: 'humidity', converter: 'raw', capability: 'measure_humidity' },
      4: { name: 'battery', converter: 'raw', capability: 'measure_battery' }
    }
  },
  '_TZE200_yjjdcqsq': {
    driverId: 'climate_sensor', type: 'climate', powerSource: 'battery',
    modelIds: ['TS0601'], productNames: ['ZTH01'],
    capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
    dps: {
      1: { name: 'temperature', converter: 'divideBy10', capability: 'measure_temperature' },
      2: { name: 'humidity', converter: 'raw', capability: 'measure_humidity' },
      4: { name: 'battery', converter: 'raw', capability: 'measure_battery' },
      9: { name: 'temperature_unit', converter: 'enum', values: ['celsius', 'fahrenheit'] }
    }
  },
  '_TZE204_yjjdcqsq': { driverId: 'climate_sensor', type: 'climate', powerSource: 'battery', modelIds: ['TS0601'] },
  '_TZE284_yjjdcqsq': { driverId: 'climate_sensor', type: 'climate', powerSource: 'battery', modelIds: ['TS0601'] },
  '_TZE200_utkemkbs': { driverId: 'climate_sensor', type: 'climate', powerSource: 'battery', modelIds: ['TS0601'], productNames: ['SZTH02'] },
  '_TZE204_utkemkbs': { driverId: 'climate_sensor', type: 'climate', powerSource: 'battery', modelIds: ['TS0601'] },
  '_TZE284_utkemkbs': { driverId: 'climate_sensor', type: 'climate', powerSource: 'battery', modelIds: ['TS0601'] },
  '_TZE200_9yapgbuv': { driverId: 'climate_sensor', type: 'climate', powerSource: 'battery', modelIds: ['TS0601'], productNames: ['ZTH02'] },
  '_TZE204_9yapgbuv': { driverId: 'climate_sensor', type: 'climate', powerSource: 'battery', modelIds: ['TS0601'] },
  '_TZE204_upagmta9': { driverId: 'climate_sensor', type: 'climate', powerSource: 'battery', modelIds: ['TS0601'], productNames: ['ZTH05'] },
  '_TZE200_upagmta9': { driverId: 'climate_sensor', type: 'climate', powerSource: 'battery', modelIds: ['TS0601'] },
  '_TZE284_upagmta9': { driverId: 'climate_sensor', type: 'climate', powerSource: 'battery', modelIds: ['TS0601'] },
  '_TZE200_cirvgep4': { driverId: 'climate_sensor', type: 'climate', powerSource: 'battery', modelIds: ['TS0601'], productNames: ['ZTH08-E'] },
  '_TZE204_cirvgep4': { driverId: 'climate_sensor', type: 'climate', powerSource: 'battery', modelIds: ['TS0601'] },
  '_TZE204_d7lpruvi': { driverId: 'climate_sensor', type: 'climate', powerSource: 'battery', modelIds: ['TS0601'], productNames: ['ZTH08'] },
  '_TZE284_d7lpruvi': { driverId: 'climate_sensor', type: 'climate', powerSource: 'battery', modelIds: ['TS0601'] },
  '_TZE284_hdyjyqjm': { driverId: 'climate_sensor', type: 'climate', powerSource: 'battery', modelIds: ['TS0601'] },
  '_TZE284_znlqjmih': { driverId: 'climate_sensor', type: 'climate', powerSource: 'battery', modelIds: ['TS0601'] },
  '_TZE200_bjawzodf': { driverId: 'climate_sensor', type: 'climate', powerSource: 'battery', modelIds: ['TS0601'] },
  '_TZE200_zl1kmjqx': { driverId: 'climate_sensor', type: 'climate', powerSource: 'battery', modelIds: ['TS0601'] },
  '_TZE200_s1xgth2u': { driverId: 'climate_sensor', type: 'climate', powerSource: 'battery', modelIds: ['TS0601'] },
  '_TZE200_t3xd7l44': { driverId: 'climate_sensor', type: 'climate', powerSource: 'battery', modelIds: ['TS0601'] },
  '_TZE284_9ern5sfh': { driverId: 'climate_sensor', type: 'climate', powerSource: 'battery', modelIds: ['TS0601'] },
  '_TZE284_cwyqwqbf': { driverId: 'climate_sensor', type: 'climate', powerSource: 'battery', modelIds: ['TS0601'] },
  '_TZE200_w6n8jeuu': { driverId: 'climate_sensor', type: 'climate', powerSource: 'battery', modelIds: ['TS0601'] },

  // ═══════════════════════════════════════════════════════════════════════════
  // SOIL SENSORS
  // ═══════════════════════════════════════════════════════════════════════════

  '_TZE284_oitavov2': {
    driverId: 'soil_sensor', type: 'soil', powerSource: 'battery', batteryType: 'AAA',
    modelIds: ['TS0601'], productNames: ['Tuya QT-07S', 'Soil Moisture Sensor'],
    capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
    dps: {
      2: { name: 'temperature_unit', converter: 'enum', values: ['celsius', 'fahrenheit'] },
      3: { name: 'soil_moisture', converter: 'raw', capability: 'measure_humidity' },
      5: { name: 'temperature', converter: 'divideBy10', capability: 'measure_temperature' },
      14: { name: 'battery_state', converter: 'enum', values: ['low', 'medium', 'high'] },
      15: { name: 'battery', converter: 'raw', capability: 'measure_battery' }
    }
  },
  '_TZE284_aao3yzhs': { driverId: 'soil_sensor', type: 'soil', powerSource: 'battery', modelIds: ['TS0601'] },
  '_TZE284_sgabhwa6': { driverId: 'soil_sensor', type: 'soil', powerSource: 'battery', modelIds: ['TS0601'] },
  '_TZE200_myd45weu': { driverId: 'soil_sensor', type: 'soil', powerSource: 'battery', modelIds: ['TS0601'] },
  '_TZE284_myd45weu': { driverId: 'soil_sensor', type: 'soil', powerSource: 'battery', modelIds: ['TS0601'] },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRESENCE / RADAR / MMWAVE SENSORS
  // ═══════════════════════════════════════════════════════════════════════════

  '_TZE200_ar0slwnd': {
    driverId: 'presence_sensor_radar', type: 'radar', powerSource: 'mains',
    modelIds: ['TS0601'], productNames: ['ZY-M100', 'mmWave Radar'],
    capabilities: ['alarm_motion', 'measure_luminance'],
    dps: {
      1: { name: 'presence', converter: 'boolean', capability: 'alarm_motion' },
      2: { name: 'sensitivity', converter: 'raw', min: 0, max: 9 },
      3: { name: 'minimum_range', converter: 'divideBy100' },
      4: { name: 'maximum_range', converter: 'divideBy100' },
      9: { name: 'target_distance', converter: 'divideBy100' },
      101: { name: 'detection_delay', converter: 'raw' },
      102: { name: 'fading_time', converter: 'raw' },
      104: { name: 'illuminance', converter: 'raw', capability: 'measure_luminance' }
    }
  },
  '_TZE200_sfiy5tfs': { driverId: 'presence_sensor_radar', type: 'radar', powerSource: 'mains', modelIds: ['TS0601'] },
  '_TZE200_mrf6vtua': { driverId: 'presence_sensor_radar', type: 'radar', powerSource: 'mains', modelIds: ['TS0601'] },
  '_TZE204_sxm7l9xa': { driverId: 'presence_sensor_radar', type: 'radar', powerSource: 'mains', modelIds: ['TS0601'] },
  '_TZE200_ztc6ggyl': { driverId: 'presence_sensor_radar', type: 'radar', powerSource: 'mains', modelIds: ['TS0601'] },
  '_TZE204_ztc6ggyl': { driverId: 'presence_sensor_radar', type: 'radar', powerSource: 'mains', modelIds: ['TS0601'] },
  '_TZE204_qasjmygc': { driverId: 'presence_sensor_radar', type: 'radar', powerSource: 'mains', modelIds: ['TS0601'] },
  '_TZE200_ikvncluo': { driverId: 'presence_sensor_radar', type: 'radar', powerSource: 'mains', modelIds: ['TS0601'] },
  '_TZE204_iaeejhvf': { driverId: 'presence_sensor_radar', type: 'radar', powerSource: 'mains', modelIds: ['TS0601'] },

  '_TZE200_rhgsbacq': {
    driverId: 'motion_sensor_radar_mmwave', type: 'radar', powerSource: 'battery', batteryType: 'CR2032',
    modelIds: ['TS0601'], productNames: ['ZG-204ZM', 'Battery Presence Sensor'],
    capabilities: ['alarm_motion', 'measure_battery', 'measure_luminance'],
    clusters: [1280],
    dps: {
      1: { name: 'presence', converter: 'boolean', capability: 'alarm_motion' },
      9: { name: 'sensitivity', converter: 'raw' },
      15: { name: 'battery', converter: 'raw', capability: 'measure_battery' },
      101: { name: 'illuminance', converter: 'raw', capability: 'measure_luminance' }
    }
  },
  '_TZE200_5b5noeto': { driverId: 'presence_sensor_radar', type: 'radar', powerSource: 'battery', modelIds: ['TS0601'] },

  // ═══════════════════════════════════════════════════════════════════════════
  // SOS / EMERGENCY BUTTONS
  // ═══════════════════════════════════════════════════════════════════════════

  '_TZ3000_0dumfk2z': {
    driverId: 'button_emergency_sos', type: 'button', powerSource: 'battery', batteryType: 'CR2032',
    modelIds: ['TS0215A'], productNames: ['SOS Button', 'Panic Button'],
    capabilities: ['alarm_generic', 'measure_battery'],
    clusters: [0, 1, 3, 1280, 1282]
  },
  '_TZ3000_4fsgukof': { driverId: 'button_emergency_sos', type: 'button', powerSource: 'battery', modelIds: ['TS0215A'] },
  '_TZ3000_wr2ucaj9': { driverId: 'button_emergency_sos', type: 'button', powerSource: 'battery', modelIds: ['TS0215A'] },
  '_TZ3000_zsh6uat3': { driverId: 'button_emergency_sos', type: 'button', powerSource: 'battery', modelIds: ['TS0215A'] },
  '_TZ3000_pkfazisv': { driverId: 'button_emergency_sos', type: 'button', powerSource: 'battery', modelIds: ['TS0215A'] },
  '_TZ3000_2izubafb': { driverId: 'button_emergency_sos', type: 'button', powerSource: 'battery', modelIds: ['TS0215A'] },
  '_TZ3000_ug1vtuzn': { driverId: 'button_emergency_sos', type: 'button', powerSource: 'battery', modelIds: ['TS0215A'] },

  // ═══════════════════════════════════════════════════════════════════════════
  // SWITCHES - 1/2/3/4 GANG
  // ═══════════════════════════════════════════════════════════════════════════

  '_TZ3000_npzfdcof': { driverId: 'switch_1gang', type: 'switch', powerSource: 'mains', modelIds: ['TS0001'], capabilities: ['onoff'] },
  '_TZ3000_h1ipgkwn': { driverId: 'switch_2gang', type: 'switch', powerSource: 'mains', modelIds: ['TS0002'], capabilities: ['onoff', 'onoff.1'] },
  '_TZ3000_01gpyda5': { driverId: 'switch_2gang', type: 'switch', powerSource: 'mains', modelIds: ['TS0002'] },
  '_TZ3000_bvrlqyj7': { driverId: 'switch_2gang', type: 'switch', powerSource: 'mains', modelIds: ['TS0002'] },
  '_TZ3000_7hp93xpr': { driverId: 'switch_2gang', type: 'switch', powerSource: 'mains', modelIds: ['TS0002'] },

  // ═══════════════════════════════════════════════════════════════════════════
  // SMART PLUGS
  // ═══════════════════════════════════════════════════════════════════════════

  '_TZ3000_kdi2o9m6': {
    driverId: 'plug_smart', type: 'plug', powerSource: 'mains',
    modelIds: ['TS0121'], productNames: ['Smart Plug'],
    capabilities: ['onoff', 'measure_power', 'meter_power'],
    clusters: [0, 3, 4, 5, 6, 1794, 2820]
  },
  '_TZ3000_gjnozsaz': { driverId: 'plug_smart', type: 'plug', powerSource: 'mains', modelIds: ['TS011F'] },
  '_TZ3000_1obwwnmq': { driverId: 'plug_smart', type: 'plug', powerSource: 'mains', modelIds: ['TS011F'] },
  '_TZ3000_w0qqde0g': { driverId: 'plug_smart', type: 'plug', powerSource: 'mains', modelIds: ['TS011F'] },
  '_TZ3000_8gs8h2e4': { driverId: 'plug_smart', type: 'plug', powerSource: 'mains', modelIds: ['TS011F'] },
  '_TZ3000_vzopcetz': { driverId: 'plug_smart', type: 'plug', powerSource: 'mains', modelIds: ['TS011F'] },
  '_TZ3000_g5xawfcq': { driverId: 'plug_smart', type: 'plug', powerSource: 'mains', modelIds: ['TS011F'] },
  '_TZ3000_rdtixbnu': { driverId: 'plug_smart', type: 'plug', powerSource: 'mains', modelIds: ['TS011F'] },
  '_TZ3000_typdpbpg': { driverId: 'plug_smart', type: 'plug', powerSource: 'mains', modelIds: ['TS011F'] },
  '_TZ3000_cphmq0q7': { driverId: 'plug_smart', type: 'plug', powerSource: 'mains', modelIds: ['TS011F'] },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTACT / DOOR SENSORS
  // ═══════════════════════════════════════════════════════════════════════════

  '_TZ3000_decxrtwa': {
    driverId: 'contact_sensor', type: 'contact', powerSource: 'battery', batteryType: 'CR2032',
    modelIds: ['TS0203'], productNames: ['Door/Window Sensor'],
    capabilities: ['alarm_contact', 'measure_battery'],
    clusters: [0, 1, 3, 1280]
  },
  '_TZ3000_26fmupbb': { driverId: 'contact_sensor', type: 'contact', powerSource: 'battery', modelIds: ['TS0203'] },

  // ═══════════════════════════════════════════════════════════════════════════
  // PIR MOTION SENSORS
  // ═══════════════════════════════════════════════════════════════════════════

  '_TZ3000_mcxw5ehu': {
    driverId: 'motion_sensor', type: 'motion', powerSource: 'battery', batteryType: 'CR2450',
    modelIds: ['TS0202'], productNames: ['PIR Motion Sensor'],
    capabilities: ['alarm_motion', 'measure_battery'],
    clusters: [0, 1, 3, 1280]
  },
  '_TZ3000_msl6wxk9': { driverId: 'motion_sensor', type: 'motion', powerSource: 'battery', modelIds: ['TS0202'], productNames: ['ZMS-102'] },
  '_TZ3000_o4mkahkc': { driverId: 'motion_sensor', type: 'motion', powerSource: 'battery', modelIds: ['TS0202'], productNames: ['IH012-RT02'] },

  // ═══════════════════════════════════════════════════════════════════════════
  // WATER LEAK SENSORS
  // ═══════════════════════════════════════════════════════════════════════════

  '_TZ3000_kyb656no': { driverId: 'water_leak_sensor', type: 'water', powerSource: 'battery', modelIds: ['TS0207'], productNames: ['Meian SW02'] },
  '_TZ3000_kstbkt6a': { driverId: 'water_leak_sensor', type: 'water', powerSource: 'battery', modelIds: ['TS0207'], productNames: ['IH-K665'] },
  '_TZ3000_k4ej3ww2': { driverId: 'water_leak_sensor', type: 'water', powerSource: 'battery', modelIds: ['TS0207'] },
  '_TZ3000_abaplimj': { driverId: 'water_leak_sensor', type: 'water', powerSource: 'battery', modelIds: ['TS0207'] },
  '_TZ3000_mqiev3jk': { driverId: 'water_leak_sensor', type: 'water', powerSource: 'battery', modelIds: ['TS0207'] },
  '_TZ3000_ocjlo4ea': { driverId: 'water_leak_sensor', type: 'water', powerSource: 'battery', modelIds: ['TS0207'] },
  '_TZ3000_upgcbody': { driverId: 'water_leak_sensor', type: 'water', powerSource: 'battery', modelIds: ['TS0207'] },
  '_TZ3000_t6jriawg': { driverId: 'water_leak_sensor', type: 'water', powerSource: 'battery', modelIds: ['TS0207'], productNames: ['Moes ZSS-QY-WL-C-MS'] },
  '_TZ3000_mugyhz0q': { driverId: 'water_leak_sensor', type: 'water', powerSource: 'battery', modelIds: ['TS0207'], productNames: ['899WZ'] },
  '_TZ3000_awvmkayh': { driverId: 'water_leak_sensor', type: 'water', powerSource: 'battery', modelIds: ['TS0207'], productNames: ['Niceboy ORBIS'] },
  '_TZ3000_0s9gukzt': { driverId: 'water_leak_sensor', type: 'water', powerSource: 'battery', modelIds: ['TS0207'], productNames: ['Nous E4'] },

  // ═══════════════════════════════════════════════════════════════════════════
  // SMOKE DETECTORS
  // ═══════════════════════════════════════════════════════════════════════════

  '_TZ3000_qtyyuaq6': {
    driverId: 'smoke_detector', type: 'smoke', powerSource: 'battery', batteryType: 'CR123A',
    modelIds: ['TS0205'], productNames: ['Smoke Detector'],
    capabilities: ['alarm_smoke', 'measure_battery'],
    clusters: [0, 1, 3, 1280]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // REPEATERS
  // ═══════════════════════════════════════════════════════════════════════════

  '_TZ3000_m0vaazab': { driverId: 'repeater', type: 'repeater', powerSource: 'mains', modelIds: ['TS0207'] },
  '_TZ3000_ufttklsz': { driverId: 'repeater', type: 'repeater', powerSource: 'mains', modelIds: ['TS0207'] },
  '_TZ3000_nkkl7uzv': { driverId: 'repeater', type: 'repeater', powerSource: 'mains', modelIds: ['TS0207'] },
  '_TZ3000_n0lphcok': { driverId: 'repeater', type: 'repeater', powerSource: 'mains', modelIds: ['TS0207'] },
  '_TZ3000_wn65ixz9': { driverId: 'repeater', type: 'repeater', powerSource: 'mains', modelIds: ['TS0001'] },

  // ═══════════════════════════════════════════════════════════════════════════
  // THERMOSTATS / TRV
  // ═══════════════════════════════════════════════════════════════════════════

  '_TZE200_ckud7u2l': {
    driverId: 'thermostat_ts0601', type: 'thermostat', powerSource: 'battery', batteryType: 'AA',
    modelIds: ['TS0601'], productNames: ['TRV', 'Radiator Valve'],
    capabilities: ['target_temperature', 'measure_temperature', 'measure_battery'],
    dps: {
      2: { name: 'target_temperature', converter: 'divideBy10', capability: 'target_temperature' },
      3: { name: 'current_temperature', converter: 'divideBy10', capability: 'measure_temperature' },
      4: { name: 'mode', converter: 'enum', values: ['off', 'manual', 'auto'] },
      7: { name: 'child_lock', converter: 'boolean' },
      13: { name: 'battery', converter: 'raw', capability: 'measure_battery' },
      101: { name: 'window_detection', converter: 'boolean' },
      104: { name: 'valve_position', converter: 'raw' }
    }
  },
  '_TZE200_hvaxb2tc': { driverId: 'thermostat_ts0601', type: 'thermostat', powerSource: 'battery', modelIds: ['TS0601'], productNames: ['Avatto TRV06'] },
  '_TZE200_6rdj8dzm': { driverId: 'thermostat_ts0601', type: 'thermostat', powerSource: 'battery', modelIds: ['TS0601'], productNames: ['Saswell SEA802'] },

  // ═══════════════════════════════════════════════════════════════════════════
  // CURTAIN / COVER MOTORS
  // ═══════════════════════════════════════════════════════════════════════════

  '_TZE200_cowvfni3': {
    driverId: 'curtain_motor', type: 'cover', powerSource: 'mains',
    modelIds: ['TS0601'], productNames: ['Curtain Motor'],
    capabilities: ['windowcoverings_state', 'dim'],
    dps: {
      1: { name: 'control', converter: 'enum', values: ['open', 'stop', 'close'] },
      2: { name: 'position', converter: 'raw', capability: 'dim' },
      7: { name: 'work_state', converter: 'enum', values: ['opening', 'closing', 'stop'] }
    }
  },
  '_TZE200_wmcdj3aq': { driverId: 'curtain_motor', type: 'cover', powerSource: 'mains', modelIds: ['TS0601'] },
  '_TZE200_fzo2pocs': { driverId: 'curtain_motor', type: 'cover', powerSource: 'mains', modelIds: ['TS0601'] },
  '_TZE200_nogaemzt': { driverId: 'curtain_motor', type: 'cover', powerSource: 'mains', modelIds: ['TS0601'] },
  '_TZE200_nv6nxo0c': { driverId: 'curtain_motor', type: 'cover', powerSource: 'mains', modelIds: ['TS0601'], productNames: ['AM25 Tubular Motor'] },

  // ═══════════════════════════════════════════════════════════════════════════
  // DIMMERS
  // ═══════════════════════════════════════════════════════════════════════════

  '_TZ3210_ngqk6jia': { driverId: 'dimmer', type: 'dimmer', powerSource: 'mains', modelIds: ['TS110E'], capabilities: ['onoff', 'dim'] },
  '_TZE200_la2c2uo9': { driverId: 'dimmer', type: 'dimmer', powerSource: 'mains', modelIds: ['TS0601'] },

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENE SWITCHES / REMOTES
  // ═══════════════════════════════════════════════════════════════════════════

  '_TZ3000_u3nv1jwk': { driverId: 'button_wireless_4', type: 'remote', powerSource: 'battery', modelIds: ['TS0044'], productNames: ['4-button Scene Switch'] },
  '_TZ3000_abrsvsou': { driverId: 'button_wireless_4', type: 'remote', powerSource: 'battery', modelIds: ['TS0044'] },
  '_TZ3000_mh9px7cq': { driverId: 'button_wireless_4', type: 'remote', powerSource: 'battery', modelIds: ['TS0044'] },
  '_TZ3000_wkai4ga5': { driverId: 'button_wireless_4', type: 'remote', powerSource: 'battery', modelIds: ['TS0044'] },
  '_TZ3000_iy2c3n6p': { driverId: 'button_wireless_4', type: 'remote', powerSource: 'battery', modelIds: ['TS0044'] },

  // ═══════════════════════════════════════════════════════════════════════════
  // GAS / CO DETECTORS
  // ═══════════════════════════════════════════════════════════════════════════

  '_TZE200_yojqa8xn': {
    driverId: 'gas_detector', type: 'gas', powerSource: 'mains',
    modelIds: ['TS0601'], productNames: ['Gas Detector'],
    capabilities: ['alarm_gas'],
    dps: {
      1: { name: 'gas_alarm', converter: 'boolean', capability: 'alarm_gas' },
      2: { name: 'gas_concentration', converter: 'raw' }
    }
  },
  '_TZE200_rjxqso4a': { driverId: 'co_detector', type: 'co', powerSource: 'battery', modelIds: ['TS0601'], productNames: ['CO Detector'] }
};

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getFingerprint(manufacturerName) {
  return DEVICE_FINGERPRINTS[manufacturerName] || null;
}

function getDriverId(manufacturerName, modelId) {
  const fp = DEVICE_FINGERPRINTS[manufacturerName];
  if (fp) {
    if (modelId && fp.modelIds && !fp.modelIds.includes(modelId)) {
      console.log(`[FINGERPRINT-DB] Warning: modelId ${modelId} not in expected list for ${manufacturerName}`);
    }
    return fp.driverId;
  }
  return null;
}

function getDPMapping(manufacturerName) {
  const fp = DEVICE_FINGERPRINTS[manufacturerName];
  if (!fp || !fp.dps) return {};
  const simplified = {};
  for (const [dp, config] of Object.entries(fp.dps)) {
    if (typeof config === 'object' && config.capability) {
      simplified[dp] = config.capability;
    } else if (typeof config === 'string') {
      simplified[dp] = config;
    } else if (typeof config === 'object' && config.name) {
      simplified[dp] = config.name;
    }
  }
  return simplified;
}

function getEnrichedDPMapping(manufacturerName) {
  const fp = DEVICE_FINGERPRINTS[manufacturerName];
  return fp ? fp.dps : {};
}

function isBatteryPowered(manufacturerName) {
  const fp = DEVICE_FINGERPRINTS[manufacturerName];
  return fp ? fp.powerSource === 'battery' : null;
}

function getFingerprintsForDriver(driverId) {
  const result = [];
  for (const [mfr, fp] of Object.entries(DEVICE_FINGERPRINTS)) {
    if (fp.driverId === driverId) {
      result.push({ manufacturerName: mfr, ...fp });
    }
  }
  return result;
}

function getAllManufacturerNames() {
  return Object.keys(DEVICE_FINGERPRINTS);
}

function setFingerprint(manufacturerName, fingerprint) {
  DEVICE_FINGERPRINTS[manufacturerName] = fingerprint;
}

function getCapabilities(manufacturerName) {
  const fp = DEVICE_FINGERPRINTS[manufacturerName];
  return fp ? fp.capabilities : [];
}

function getClusters(manufacturerName) {
  const fp = DEVICE_FINGERPRINTS[manufacturerName];
  return fp ? fp.clusters : [];
}

function getPowerInfo(manufacturerName) {
  const fp = DEVICE_FINGERPRINTS[manufacturerName];
  if (!fp) return null;
  return { powerSource: fp.powerSource, batteryType: fp.batteryType || null };
}

function getZigbeeReporting(manufacturerName) {
  const fp = DEVICE_FINGERPRINTS[manufacturerName];
  return fp ? fp.zigbeeReporting : null;
}

function findByModelId(modelId) {
  const results = [];
  for (const [mfr, fp] of Object.entries(DEVICE_FINGERPRINTS)) {
    if (fp.modelIds && fp.modelIds.includes(modelId)) {
      results.push({ manufacturerName: mfr, ...fp });
    }
  }
  return results;
}

function convertDPValue(manufacturerName, dpId, rawValue) {
  const fp = DEVICE_FINGERPRINTS[manufacturerName];
  if (!fp || !fp.dps || !fp.dps[dpId]) return rawValue;
  const dpConfig = fp.dps[dpId];
  if (typeof dpConfig !== 'object') return rawValue;
  switch (dpConfig.converter) {
    case 'divideBy10': return typeof rawValue === 'number' ? rawValue / 10 : rawValue;
    case 'divideBy100': return typeof rawValue === 'number' ? rawValue / 100 : rawValue;
    case 'boolean': return Boolean(rawValue);
    case 'raw': default: return rawValue;
  }
}

function getStatistics() {
  const stats = { total: 0, byType: {}, byPowerSource: {}, byDriver: {} };
  for (const [mfr, fp] of Object.entries(DEVICE_FINGERPRINTS)) {
    stats.total++;
    stats.byType[fp.type] = (stats.byType[fp.type] || 0) + 1;
    stats.byPowerSource[fp.powerSource] = (stats.byPowerSource[fp.powerSource] || 0) + 1;
    stats.byDriver[fp.driverId] = (stats.byDriver[fp.driverId] || 0) + 1;
  }
  return stats;
}

module.exports = {
  DEVICE_FINGERPRINTS,
  getFingerprint,
  getDriverId,
  getDPMapping,
  getEnrichedDPMapping,
  isBatteryPowered,
  getFingerprintsForDriver,
  getAllManufacturerNames,
  setFingerprint,
  getCapabilities,
  getClusters,
  getPowerInfo,
  getZigbeeReporting,
  findByModelId,
  convertDPValue,
  getStatistics
};
