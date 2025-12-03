#!/usr/bin/env node
/**
 * HEIMAN + SIRENS + STROBES + ALARMS ENRICHMENT
 *
 * Complete integration of:
 * - ALL HEIMAN Zigbee devices
 * - ALL Zigbee Sirens (IAS WD)
 * - Strobe lights
 * - Smoke detectors
 * - Gas detectors
 * - CO detectors
 * - Water leak sensors
 * - Smoke launchers/generators
 *
 * Sources:
 * - https://www.heimantech.com/
 * - https://www.zigbee2mqtt.io/supported-devices/
 * - Zigbee Cluster Library (IAS WD - 0x0502)
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', '..', 'drivers');

// =============================================================================
// HEIMAN COMPLETE DEVICE DATABASE
// =============================================================================
const HEIMAN_DEVICES = {
  // =========================================================================
  // SIRENS & WARNING DEVICES (IAS WD)
  // =========================================================================
  siren: {
    devices: [
      // HEIMAN Sirens
      { manufacturerName: 'HEIMAN', modelId: 'WarningDevice', description: 'Warning Device' },
      { manufacturerName: 'HEIMAN', modelId: 'WarningDevice-EF-3.0', description: 'Warning Device 3.0' },
      { manufacturerName: 'HEIMAN', modelId: 'HS2WD', description: 'Smart Wireless Siren' },
      { manufacturerName: 'HEIMAN', modelId: 'HS2WD-E', description: 'Siren Strobe EU' },
      { manufacturerName: 'HEIMAN', modelId: 'HS2WD-E-3.0', description: 'Siren Strobe EU 3.0' },
      { manufacturerName: 'HEIMAN', modelId: 'SRHMP-I1', description: 'Smart Siren Indoor' },
      { manufacturerName: 'HEIMAN', modelId: 'SWHM-I1', description: 'Smart Warning Horn' },
      { manufacturerName: 'Heiman', modelId: 'WarningDevice', description: 'Warning Device' },
      { manufacturerName: 'Heiman', modelId: 'HS2WD-E', description: 'Siren Strobe' },

      // Tuya Sirens
      { manufacturerName: '_TZ3000_fabws1w2', modelId: 'TS0216', description: 'Tuya Siren Strobe' },
      { manufacturerName: '_TZ3000_d0yu2xgi', modelId: 'TS0216', description: 'Tuya Siren' },
      { manufacturerName: '_TZ3000_fwfwifin', modelId: 'TS0216', description: 'Tuya Siren Alarm' },
      { manufacturerName: '_TZ3000_8r5u7wkh', modelId: 'TS0216', description: 'Tuya Siren' },
      { manufacturerName: '_TZ3000_hv9cqcci', modelId: 'TS0216', description: 'Tuya Outdoor Siren' },
      { manufacturerName: '_TZE200_nlrfgpny', modelId: 'TS0601', description: 'Tuya Outdoor Solar Siren' },
      { manufacturerName: '_TZE200_t1blo2bj', modelId: 'TS0601', description: 'Tuya Indoor Siren' },
      { manufacturerName: '_TZE204_nlrfgpny', modelId: 'TS0601', description: 'Tuya Outdoor Siren V2' },
      { manufacturerName: '_TZE200_d0ypnbvn', modelId: 'TS0601', description: 'Tuya Siren Alarm' },
      { manufacturerName: '_TZE204_d0ypnbvn', modelId: 'TS0601', description: 'Tuya Siren V2' },

      // Neo Coolcam Sirens
      { manufacturerName: 'NEO', modelId: 'NAS-AB02B0', description: 'Neo Siren' },
      { manufacturerName: 'NEO', modelId: 'NAS-AB02B2', description: 'Neo Siren V2' },

      // Develco Sirens
      { manufacturerName: 'Develco Products A/S', modelId: 'SIRZB-110', description: 'Develco Indoor Siren' },
      { manufacturerName: 'Develco', modelId: 'SIRZB-110', description: 'Develco Siren' },

      // Frient Sirens
      { manufacturerName: 'frient A/S', modelId: 'SIRZB-110', description: 'Frient Indoor Siren' },

      // Smartenit Sirens
      { manufacturerName: 'Smartenit, Inc', modelId: 'ZBALMRM', description: 'Smartenit Siren' },
      { manufacturerName: 'Smartenit', modelId: 'ZBALRM', description: 'Smartenit Warning Device' },

      // Third Realty / SMaBiT
      { manufacturerName: 'Third Reality, Inc', modelId: 'RTS500A', description: 'Third Reality Siren' },
      { manufacturerName: 'SMaBiT', modelId: 'AV2010/29A', description: 'SMaBiT Siren' },

      // Immax / IMOU
      { manufacturerName: 'IMMAX', modelId: '07504L', description: 'Immax Neo Smart Siren' },
      { manufacturerName: 'IMOU', modelId: 'ZS-01', description: 'IMOU Siren' },

      // Lidl / Silvercrest
      { manufacturerName: '_TZ3000_fwfwifin', modelId: 'TS0216', description: 'Lidl Smart Siren' },

      // eWeLink
      { manufacturerName: 'eWeLink', modelId: 'ZB-SIR', description: 'eWeLink Siren' }
    ]
  },

  // =========================================================================
  // SMOKE DETECTORS
  // =========================================================================
  smoke_detector_advanced: {
    devices: [
      // HEIMAN Smoke Detectors
      { manufacturerName: 'HEIMAN', modelId: 'HS1SA', description: 'Mini Smoke Alarm' },
      { manufacturerName: 'HEIMAN', modelId: 'HS1SA-E', description: 'Smoke Alarm EU' },
      { manufacturerName: 'HEIMAN', modelId: 'HS1SA-M', description: 'Smoke Alarm M' },
      { manufacturerName: 'HEIMAN', modelId: 'HS3SA', description: 'Smart Smoke Alarm 3' },
      { manufacturerName: 'HEIMAN', modelId: 'HS2SA-EF-3.0', description: 'Smoke Alarm 3.0' },
      { manufacturerName: 'HEIMAN', modelId: 'SmokeSensor-N', description: 'Smart Smoke Sensor N' },
      { manufacturerName: 'HEIMAN', modelId: 'SmokeSensor-N-3.0', description: 'Smoke Sensor 3.0' },
      { manufacturerName: 'HEIMAN', modelId: 'SmokeSensor-EF-3.0', description: 'Smoke Sensor EF 3.0' },
      { manufacturerName: 'HEIMAN', modelId: 'SMOK_V15', description: 'Smoke Sensor V15' },
      { manufacturerName: 'HEIMAN', modelId: 'SMOK_V16', description: 'Smoke Sensor V16' },
      { manufacturerName: 'HEIMAN', modelId: 'SMOK_YDLV10', description: 'Smoke Sensor YDLV10' },
      { manufacturerName: 'Heiman', modelId: 'HS1SA', description: 'Smoke Alarm' },
      { manufacturerName: 'Heiman', modelId: 'HS3SA', description: 'Smart Smoke Alarm' },
      { manufacturerName: 'Heiman', modelId: 'SmokeSensor-N', description: 'Smoke Sensor' },

      // Tuya Smoke Detectors
      { manufacturerName: '_TZE200_ntcy3xu1', modelId: 'TS0601', description: 'Tuya Smoke Detector' },
      { manufacturerName: '_TZE200_uebojraa', modelId: 'TS0601', description: 'Tuya Smart Smoke' },
      { manufacturerName: '_TZE200_yojqa8xn', modelId: 'TS0601', description: 'Tuya Smoke Alarm' },
      { manufacturerName: '_TZE204_ntcy3xu1', modelId: 'TS0601', description: 'Tuya Smoke V2' },
      { manufacturerName: '_TZ3000_ytf0x5wm', modelId: 'TS0205', description: 'Tuya Smoke TS0205' },

      // Develco Smoke
      { manufacturerName: 'Develco Products A/S', modelId: 'SMSZB-120', description: 'Develco Smoke Sensor' },
      { manufacturerName: 'Develco', modelId: 'SMSZB-120', description: 'Develco Smoke' },

      // Frient Smoke
      { manufacturerName: 'frient A/S', modelId: 'SMSZB-120', description: 'Frient Smoke Alarm' },

      // Third Reality
      { manufacturerName: 'Third Reality, Inc', modelId: 'RTS500A-SMOKE', description: 'Third Reality Smoke' },

      // Aqara / Xiaomi
      { manufacturerName: 'LUMI', modelId: 'lumi.sensor_smoke', description: 'Aqara Smoke Sensor' },
      { manufacturerName: 'Xiaomi', modelId: 'lumi.sensor_smoke', description: 'Xiaomi Smoke' }
    ]
  },

  // =========================================================================
  // GAS DETECTORS (Combustible / Natural / LPG)
  // =========================================================================
  gas_detector: {
    devices: [
      // HEIMAN Gas Detectors
      { manufacturerName: 'HEIMAN', modelId: 'HS1CG', description: 'Combustible Gas Sensor' },
      { manufacturerName: 'HEIMAN', modelId: 'HS1CG-E', description: 'Gas Sensor EU' },
      { manufacturerName: 'HEIMAN', modelId: 'HS1CG-M', description: 'Gas Sensor M' },
      { manufacturerName: 'HEIMAN', modelId: 'HS3CG', description: 'Smart Gas Sensor 3' },
      { manufacturerName: 'HEIMAN', modelId: 'GASSensor-N', description: 'Smart Gas Sensor N' },
      { manufacturerName: 'HEIMAN', modelId: 'GASSensor-N-3.0', description: 'Gas Sensor 3.0' },
      { manufacturerName: 'HEIMAN', modelId: 'GASSensor-EF-3.0', description: 'Gas Sensor EF 3.0' },
      { manufacturerName: 'Heiman', modelId: 'HS1CG', description: 'Gas Sensor' },
      { manufacturerName: 'Heiman', modelId: 'GASSensor-N', description: 'Gas Sensor' },

      // Tuya Gas Detectors
      { manufacturerName: '_TZE200_yojqa8xn', modelId: 'TS0601', description: 'Tuya Gas Detector' },
      { manufacturerName: '_TZE200_ggev5fsl', modelId: 'TS0601', description: 'Tuya Combustible Gas' },
      { manufacturerName: '_TZE204_ggev5fsl', modelId: 'TS0601', description: 'Tuya Gas V2' },
      { manufacturerName: '_TZE200_rjxqso4a', modelId: 'TS0601', description: 'Tuya Natural Gas' },
      { manufacturerName: '_TZE204_rjxqso4a', modelId: 'TS0601', description: 'Tuya Gas Alarm' },
      { manufacturerName: '_TZ3000_8nysnv3b', modelId: 'TS0205', description: 'Tuya Gas TS0205' },

      // Third party
      { manufacturerName: 'LUMI', modelId: 'lumi.sensor_gas.acn02', description: 'Aqara Gas Sensor' },
      { manufacturerName: 'Xiaomi', modelId: 'lumi.sensor_natgas', description: 'Xiaomi Gas Sensor' }
    ]
  },

  // =========================================================================
  // CO DETECTORS (Carbon Monoxide)
  // =========================================================================
  co_sensor: {
    devices: [
      // HEIMAN CO Detectors
      { manufacturerName: 'HEIMAN', modelId: 'HS1CA', description: 'CO Detector' },
      { manufacturerName: 'HEIMAN', modelId: 'HS1CA-E', description: 'CO Detector EU' },
      { manufacturerName: 'HEIMAN', modelId: 'HS1CA-M', description: 'CO Detector M' },
      { manufacturerName: 'HEIMAN', modelId: 'HS3CA', description: 'Smart CO Detector 3' },
      { manufacturerName: 'HEIMAN', modelId: 'COSensor-N', description: 'Smart CO Sensor N' },
      { manufacturerName: 'HEIMAN', modelId: 'COSensor-N-3.0', description: 'CO Sensor 3.0' },
      { manufacturerName: 'HEIMAN', modelId: 'COSensor-EF-3.0', description: 'CO Sensor EF 3.0' },
      { manufacturerName: 'Heiman', modelId: 'HS1CA', description: 'CO Detector' },
      { manufacturerName: 'Heiman', modelId: 'COSensor-N', description: 'CO Sensor' },

      // Tuya CO Detectors
      { manufacturerName: '_TZE200_pbdlrmfb', modelId: 'TS0601', description: 'Tuya CO Detector' },
      { manufacturerName: '_TZE204_pbdlrmfb', modelId: 'TS0601', description: 'Tuya CO V2' },
      { manufacturerName: '_TZ3000_zl1kmjqx', modelId: 'TS0205', description: 'Tuya CO TS0205' },

      // Develco
      { manufacturerName: 'Develco Products A/S', modelId: 'COSZB-110', description: 'Develco CO Sensor' },
      { manufacturerName: 'Develco', modelId: 'COSZB-110', description: 'Develco CO' },

      // Frient
      { manufacturerName: 'frient A/S', modelId: 'COSZB-110', description: 'Frient CO Alarm' }
    ]
  },

  // =========================================================================
  // WATER LEAK SENSORS
  // =========================================================================
  water_leak_sensor: {
    devices: [
      // HEIMAN Water Leak
      { manufacturerName: 'HEIMAN', modelId: 'HS1WL', description: 'Water Leak Sensor' },
      { manufacturerName: 'HEIMAN', modelId: 'HS1WL-E', description: 'Water Leak EU' },
      { manufacturerName: 'HEIMAN', modelId: 'HS1WL-M', description: 'Water Leak M' },
      { manufacturerName: 'HEIMAN', modelId: 'HS3WL', description: 'Smart Water Leak 3' },
      { manufacturerName: 'HEIMAN', modelId: 'WaterSensor-N', description: 'Smart Water Sensor N' },
      { manufacturerName: 'HEIMAN', modelId: 'WaterSensor-N-3.0', description: 'Water Sensor 3.0' },
      { manufacturerName: 'Heiman', modelId: 'HS1WL', description: 'Water Leak' },
      { manufacturerName: 'Heiman', modelId: 'WaterSensor-N', description: 'Water Sensor' },

      // Tuya Water Leak
      { manufacturerName: '_TZ3000_kyb656no', modelId: 'TS0207', description: 'Tuya Water Leak' },
      { manufacturerName: '_TZ3000_upgcbody', modelId: 'TS0207', description: 'Tuya Water Sensor' },
      { manufacturerName: '_TZ3000_awvmkayh', modelId: 'TS0207', description: 'Tuya Flood Sensor' },
      { manufacturerName: '_TYZB01_sqmd19i1', modelId: 'TS0207', description: 'Tuya Water V2' },

      // Aqara / Xiaomi
      { manufacturerName: 'LUMI', modelId: 'lumi.sensor_wleak.aq1', description: 'Aqara Water Leak' },
      { manufacturerName: 'LUMI', modelId: 'lumi.flood.agl02', description: 'Aqara Water Sensor' },
      { manufacturerName: 'Xiaomi', modelId: 'lumi.sensor_wleak', description: 'Xiaomi Water Leak' }
    ]
  },

  // =========================================================================
  // CONTACT SENSORS (DOOR/WINDOW)
  // =========================================================================
  contact_sensor: {
    devices: [
      // HEIMAN Contact Sensors
      { manufacturerName: 'HEIMAN', modelId: 'HS1DS', description: 'Door/Window Sensor' },
      { manufacturerName: 'HEIMAN', modelId: 'HS1DS-E', description: 'Door Sensor EU' },
      { manufacturerName: 'HEIMAN', modelId: 'HS1DS-M', description: 'Door Sensor M' },
      { manufacturerName: 'HEIMAN', modelId: 'HS3DS', description: 'Smart Door Sensor 3' },
      { manufacturerName: 'HEIMAN', modelId: 'DoorSensor-N', description: 'Smart Door Sensor N' },
      { manufacturerName: 'HEIMAN', modelId: 'DoorSensor-N-3.0', description: 'Door Sensor 3.0' },
      { manufacturerName: 'HEIMAN', modelId: 'DoorSensor-EF-3.0', description: 'Door Sensor EF 3.0' },
      { manufacturerName: 'Heiman', modelId: 'HS1DS', description: 'Door Sensor' },
      { manufacturerName: 'Heiman', modelId: 'DoorSensor-N', description: 'Door Sensor' }
    ]
  },

  // =========================================================================
  // MOTION SENSORS (PIR)
  // =========================================================================
  motion_sensor: {
    devices: [
      // HEIMAN Motion Sensors
      { manufacturerName: 'HEIMAN', modelId: 'HS1MS', description: 'Motion Sensor' },
      { manufacturerName: 'HEIMAN', modelId: 'HS1MS-E', description: 'Motion Sensor EU' },
      { manufacturerName: 'HEIMAN', modelId: 'HS1MS-M', description: 'Motion Sensor M' },
      { manufacturerName: 'HEIMAN', modelId: 'HS3MS', description: 'Smart Motion Sensor 3' },
      { manufacturerName: 'HEIMAN', modelId: 'PIRSensor-N', description: 'Smart PIR Sensor N' },
      { manufacturerName: 'HEIMAN', modelId: 'PIRSensor-N-3.0', description: 'PIR Sensor 3.0' },
      { manufacturerName: 'HEIMAN', modelId: 'PIRSensor-EF-3.0', description: 'PIR Sensor EF 3.0' },
      { manufacturerName: 'HEIMAN', modelId: 'IASZone:MotionSensor', description: 'IAS Motion' },
      { manufacturerName: 'Heiman', modelId: 'HS1MS', description: 'Motion Sensor' },
      { manufacturerName: 'Heiman', modelId: 'PIRSensor-N', description: 'PIR Sensor' }
    ]
  },

  // =========================================================================
  // CLIMATE SENSORS (Temperature / Humidity)
  // =========================================================================
  climate_sensor: {
    devices: [
      // HEIMAN Temperature/Humidity
      { manufacturerName: 'HEIMAN', modelId: 'HS1HT', description: 'Temp & Humidity Sensor' },
      { manufacturerName: 'HEIMAN', modelId: 'HS1HT-E', description: 'Temp Humidity EU' },
      { manufacturerName: 'HEIMAN', modelId: 'HS1HT-M', description: 'Temp Humidity M' },
      { manufacturerName: 'HEIMAN', modelId: 'HS3HT', description: 'Smart Temp Humidity 3' },
      { manufacturerName: 'HEIMAN', modelId: 'TempSensor-N', description: 'Smart Temp Sensor N' },
      { manufacturerName: 'HEIMAN', modelId: 'TempSensor-N-3.0', description: 'Temp Sensor 3.0' },
      { manufacturerName: 'HEIMAN', modelId: 'TH01-ZB', description: 'Temp Humidity ZB' },
      { manufacturerName: 'Heiman', modelId: 'HS1HT', description: 'Temp Humidity' },
      { manufacturerName: 'Heiman', modelId: 'TempSensor-N', description: 'Temp Sensor' }
    ]
  },

  // =========================================================================
  // AIR QUALITY SENSORS
  // =========================================================================
  air_quality_comprehensive: {
    devices: [
      // HEIMAN Air Quality
      { manufacturerName: 'HEIMAN', modelId: 'HS3AQ', description: 'Air Quality Monitor' },
      { manufacturerName: 'HEIMAN', modelId: 'HS3AQ-E', description: 'Air Quality EU' },
      { manufacturerName: 'HEIMAN', modelId: 'AQMonitor-N', description: 'Smart AQ Monitor N' },
      { manufacturerName: 'HEIMAN', modelId: 'AQMonitor-N-3.0', description: 'AQ Monitor 3.0' },
      { manufacturerName: 'Heiman', modelId: 'HS3AQ', description: 'Air Quality' }
    ]
  },

  // =========================================================================
  // DOORBELL
  // =========================================================================
  doorbell: {
    devices: [
      // HEIMAN Doorbell
      { manufacturerName: 'HEIMAN', modelId: 'HS2DB', description: 'Smart Doorbell' },
      { manufacturerName: 'HEIMAN', modelId: 'HS2DB-E', description: 'Doorbell EU' },
      { manufacturerName: 'HEIMAN', modelId: 'HS2DB-E-3.0', description: 'Doorbell 3.0' },
      { manufacturerName: 'Heiman', modelId: 'HS2DB', description: 'Doorbell' }
    ]
  },

  // =========================================================================
  // SOS / EMERGENCY BUTTONS
  // =========================================================================
  button_emergency_sos: {
    devices: [
      // HEIMAN Emergency Button
      { manufacturerName: 'HEIMAN', modelId: 'SOS-EF', description: 'SOS Button' },
      { manufacturerName: 'HEIMAN', modelId: 'SOS-EF-3.0', description: 'SOS Button 3.0' },
      { manufacturerName: 'HEIMAN', modelId: 'HS2EB', description: 'Emergency Button' },
      { manufacturerName: 'HEIMAN', modelId: 'HS2EB-E', description: 'Emergency Button EU' },
      { manufacturerName: 'HEIMAN', modelId: 'RC-EM', description: 'Remote Control Emergency' },
      { manufacturerName: 'Heiman', modelId: 'SOS-EF', description: 'SOS Button' },
      { manufacturerName: 'Heiman', modelId: 'HS2EB', description: 'Emergency Button' }
    ]
  },

  // =========================================================================
  // SMART PLUGS
  // =========================================================================
  plug_smart: {
    devices: [
      // HEIMAN Plugs
      { manufacturerName: 'HEIMAN', modelId: 'HS2SK', description: 'Smart Socket' },
      { manufacturerName: 'HEIMAN', modelId: 'HS2SK-E', description: 'Smart Socket EU' },
      { manufacturerName: 'HEIMAN', modelId: 'HS2SK-EF-3.0', description: 'Socket 3.0' },
      { manufacturerName: 'HEIMAN', modelId: 'SmartPlug-N', description: 'Smart Plug N' },
      { manufacturerName: 'Heiman', modelId: 'HS2SK', description: 'Smart Socket' }
    ]
  },

  // =========================================================================
  // GATEWAY / HUB
  // =========================================================================
  gateway_zigbee_bridge: {
    devices: [
      // HEIMAN Gateway
      { manufacturerName: 'HEIMAN', modelId: 'HS1GW', description: 'Smart Gateway' },
      { manufacturerName: 'HEIMAN', modelId: 'HS1GW-E', description: 'Gateway EU' },
      { manufacturerName: 'HEIMAN', modelId: 'HS1GW-M', description: 'Gateway M' },
      { manufacturerName: 'HEIMAN', modelId: 'HS3GW', description: 'Smart Gateway 3' },
      { manufacturerName: 'Heiman', modelId: 'HS1GW', description: 'Gateway' }
    ]
  },

  // =========================================================================
  // REMOTE CONTROLS / SCENE SWITCHES
  // =========================================================================
  scene_switch_4: {
    devices: [
      // HEIMAN Remote
      { manufacturerName: 'HEIMAN', modelId: 'HS2RC', description: 'Remote Control' },
      { manufacturerName: 'HEIMAN', modelId: 'HS2RC-E', description: 'Remote Control EU' },
      { manufacturerName: 'HEIMAN', modelId: 'HS2RC-N', description: 'Smart Remote N' },
      { manufacturerName: 'HEIMAN', modelId: 'RC-EF-3.0', description: 'Remote 3.0' },
      { manufacturerName: 'Heiman', modelId: 'HS2RC', description: 'Remote Control' }
    ]
  }
};

// =============================================================================
// STROBE / FLASH LIGHTS (IAS WD with strobe capability)
// =============================================================================
const STROBE_DEVICES = {
  siren: {
    devices: [
      // Strobe-specific devices
      { manufacturerName: '_TZ3000_fwfwifin', modelId: 'TS0216', description: 'Flash Strobe Siren' },
      { manufacturerName: 'ORVIBO', modelId: 'SN10ZW', description: 'Orvibo Strobe Siren' },
      { manufacturerName: 'Climax', modelId: 'BX-IS', description: 'Climax Indoor Siren' },
      { manufacturerName: 'Climax', modelId: 'SOLSW', description: 'Climax Solar Siren' },
      { manufacturerName: 'Visonic', modelId: 'MCW-S', description: 'Visonic Wireless Siren' },
      { manufacturerName: 'LDS', modelId: 'ZBS-101', description: 'LDS Siren' },
      { manufacturerName: 'Zipato', modelId: 'miniKeypad', description: 'Zipato Keypad with Siren' }
    ]
  }
};

// =============================================================================
// SMOKE LAUNCHERS / GENERATORS (for testing)
// =============================================================================
const SMOKE_LAUNCHER_DEVICES = {
  siren: {
    devices: [
      // Smoke fog machines with Zigbee integration
      { manufacturerName: '_TZE200_5sbebbzs', modelId: 'TS0601', description: 'Tuya Smoke Fog Machine' },
      { manufacturerName: '_TZE204_5sbebbzs', modelId: 'TS0601', description: 'Tuya Fog Generator' },
      { manufacturerName: 'URBSFog', modelId: 'FOG-01', description: 'Security Fog Generator' },
      { manufacturerName: 'PROTECT', modelId: 'SG-FOG', description: 'Security Fog Machine' },
      { manufacturerName: 'BANDIT', modelId: 'FOG-GEN', description: 'Bandit Fog Generator' }
    ]
  }
};

// =============================================================================
// ENRICHMENT FUNCTION
// =============================================================================
function enrichDriver(driverId, devices) {
  const driverPath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');

  if (!fs.existsSync(driverPath)) {
    return { success: false, reason: 'driver_not_found' };
  }

  try {
    const driver = JSON.parse(fs.readFileSync(driverPath, 'utf8'));
    let addedCount = 0;

    if (!driver.zigbee) driver.zigbee = {};
    const existingDevices = driver.zigbee.devices || [];
    const existingSet = new Set(existingDevices.map(d => `${d.manufacturerName}:${d.modelId}`));

    for (const device of devices) {
      const key = `${device.manufacturerName}:${device.modelId}`;
      if (!existingSet.has(key)) {
        existingDevices.push({
          manufacturerName: device.manufacturerName,
          modelId: device.modelId
        });
        addedCount++;
        existingSet.add(key);
      }
    }

    if (addedCount > 0) {
      driver.zigbee.devices = existingDevices;
      fs.writeFileSync(driverPath, JSON.stringify(driver, null, 2) + '\n');
      return { success: true, added: addedCount };
    }

    return { success: true, added: 0 };
  } catch (err) {
    return { success: false, reason: err.message };
  }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================
console.log('🚨 HEIMAN + SIRENS + ALARMS ENRICHMENT');
console.log('=======================================\n');

const results = { total: 0, added: 0, drivers: 0, errors: [] };

// Enrich HEIMAN devices
console.log('🔴 HEIMAN Devices:');
for (const [driverId, config] of Object.entries(HEIMAN_DEVICES)) {
  const result = enrichDriver(driverId, config.devices);
  if (result.success && result.added > 0) {
    console.log(`  ✅ ${driverId}: +${result.added} devices`);
    results.added += result.added;
    results.drivers++;
  } else if (result.success) {
    console.log(`  ⏭️  ${driverId}: already complete`);
  } else {
    console.log(`  ❌ ${driverId}: ${result.reason}`);
    results.errors.push({ driver: driverId, reason: result.reason });
  }
  results.total += config.devices.length;
}

// Enrich Strobe devices
console.log('\n💡 Strobe/Flash Devices:');
for (const [driverId, config] of Object.entries(STROBE_DEVICES)) {
  const result = enrichDriver(driverId, config.devices);
  if (result.success && result.added > 0) {
    console.log(`  ✅ ${driverId}: +${result.added} devices`);
    results.added += result.added;
    results.drivers++;
  } else if (result.success) {
    console.log(`  ⏭️  ${driverId}: already complete`);
  } else {
    console.log(`  ❌ ${driverId}: ${result.reason}`);
  }
  results.total += config.devices.length;
}

// Enrich Smoke Launcher devices
console.log('\n🌫️  Smoke Launchers/Fog Machines:');
for (const [driverId, config] of Object.entries(SMOKE_LAUNCHER_DEVICES)) {
  const result = enrichDriver(driverId, config.devices);
  if (result.success && result.added > 0) {
    console.log(`  ✅ ${driverId}: +${result.added} devices`);
    results.added += result.added;
    results.drivers++;
  } else if (result.success) {
    console.log(`  ⏭️  ${driverId}: already complete`);
  } else {
    console.log(`  ❌ ${driverId}: ${result.reason}`);
  }
  results.total += config.devices.length;
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 SUMMARY');
console.log('='.repeat(50));
console.log(`📱 Total device entries: ${results.total}`);
console.log(`✅ Devices added: ${results.added}`);
console.log(`📁 Drivers enriched: ${results.drivers}`);
console.log('='.repeat(50));

// Save report
const reportPath = path.join(__dirname, '..', '..', 'data', 'enrichment', 'heiman-sirens-alarms-report.json');
fs.writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  results,
  heimanDevices: HEIMAN_DEVICES,
  strobeDevices: STROBE_DEVICES,
  smokeLauncherDevices: SMOKE_LAUNCHER_DEVICES
}, null, 2));

console.log(`\n📄 Report: ${reportPath}`);
console.log('\n✨ HEIMAN + Sirens + Alarms ready for Homey!');
