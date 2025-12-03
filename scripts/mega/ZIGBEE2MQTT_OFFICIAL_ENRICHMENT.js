#!/usr/bin/env node
/**
 * ZIGBEE2MQTT OFFICIAL ENRICHMENT
 *
 * Source: https://github.com/Koenkk/zigbee-herdsman-converters
 * This is THE authoritative open-source reference for Zigbee device compatibility.
 *
 * All fingerprints (zigbeeModel) extracted from:
 * - src/devices/heiman.ts
 * - src/devices/sonoff.ts
 * - src/devices/tuya.ts (sirens & security)
 *
 * @author Dylan Rajasekaram
 * @version 5.3.44
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// HEIMAN DEVICES - From zigbee-herdsman-converters/src/devices/heiman.ts
// =============================================================================

const HEIMAN_DEVICES = {
  // ---------------------------------------------------------------------------
  // SMOKE DETECTORS - IAS Zone 0x0500 (Zone Type 0x0028)
  // ---------------------------------------------------------------------------
  smokeDetectors: {
    driver: 'smoke_detector_advanced',
    cluster: 'iasZone',  // 0x0500
    devices: [
      // HS1SA Series
      { zigbeeModel: 'SMOK_V16', model: 'HS1SA', desc: 'Smoke detector V16' },
      { zigbeeModel: 'SMOK_V15', model: 'HS1SA', desc: 'Smoke detector V15' },
      { zigbeeModel: 'SMOK_YDLV10', model: 'HS1SA', desc: 'Smoke detector YDLV10' },
      { zigbeeModel: 'SMOK_HV14', model: 'HS1SA', desc: 'Smoke detector HV14' },
      { zigbeeModel: 'FB56-SMF02HM1.4', model: 'HS1SA', desc: 'Smoke detector FB56' },
      { zigbeeModel: 'b5db59bfd81e4f1f95dc57fdbba17931', model: 'HS1SA', desc: 'Smoke v1' },
      { zigbeeModel: '98293058552c49f38ad0748541ee96ba', model: 'HS1SA', desc: 'Smoke v2' },
      { zigbeeModel: '319fa36e7384414a9ea62cba8f6e7626', model: 'HS1SA', desc: 'Smoke v3' },
      { zigbeeModel: 'c3442b4ac59b4ba1a83119d938f283ab', model: 'HS1SA', desc: 'Smoke v4' },
      // HS3SA Series
      { zigbeeModel: 'SmokeSensor-N', model: 'HS3SA', desc: 'Smoke Sensor N' },
      { zigbeeModel: 'SmokeSensor-EM', model: 'HS3SA', desc: 'Smoke Sensor EM' },
      { zigbeeModel: 'SmokeSensor-N-3.0', model: 'HS3SA', desc: 'Smoke Sensor N 3.0' },
      { zigbeeModel: 'SmokeSensor-EF-3.0', model: 'HS3SA', desc: 'Smoke Sensor EF 3.0' },
      // HS2SA Series
      { zigbeeModel: 'HS2SA-EF-3.0', model: 'HS2SA', desc: 'Smoke Sensor HS2SA EF 3.0' }
    ]
  },

  // ---------------------------------------------------------------------------
  // CO DETECTORS - IAS Zone 0x0500 (Zone Type 0x002B)
  // ---------------------------------------------------------------------------
  coDetectors: {
    driver: 'co_sensor',
    cluster: 'iasZone',
    devices: [
      // HS1CA Series
      { zigbeeModel: 'CO_V15', model: 'HS1CA-M', desc: 'CO Sensor V15' },
      { zigbeeModel: 'CO_V16', model: 'HS1CA-M', desc: 'CO Sensor V16' },
      { zigbeeModel: 'CO_YDLV10', model: 'HS1CA-M', desc: 'CO Sensor YDLV10' },
      { zigbeeModel: 'CO_CTPG', model: 'HS1CA-M', desc: 'CO Sensor CTPG' },
      { zigbeeModel: '1ccaa94c49a84abaa9e38687913947ba', model: 'HS1CA-M', desc: 'CO v1' },
      // HS1CA-E Series
      { zigbeeModel: 'COSensor-EM', model: 'HS1CA-E', desc: 'CO Sensor EM' },
      { zigbeeModel: 'COSensor-N', model: 'HS1CA-E', desc: 'CO Sensor N' },
      { zigbeeModel: 'COSensor-EF-3.0', model: 'HS1CA-E', desc: 'CO Sensor EF 3.0' }
    ]
  },

  // ---------------------------------------------------------------------------
  // GAS DETECTORS - IAS Zone 0x0500
  // ---------------------------------------------------------------------------
  gasDetectors: {
    driver: 'gas_detector',
    cluster: 'iasZone',
    devices: [
      { zigbeeModel: 'GASSensor-N', model: 'HS3CG', desc: 'Gas Sensor N' },
      { zigbeeModel: 'GASSensor-N-3.0', model: 'HS3CG', desc: 'Gas Sensor N 3.0' },
      { zigbeeModel: 'd90d7c61c44d468a8e906ca0841e0a0c', model: 'HS3CG', desc: 'Gas v1' },
      { zigbeeModel: 'GASSensor-EN', model: 'HS1CG-M', desc: 'Gas Sensor EN' },
      { zigbeeModel: 'GAS_V15', model: 'HS1CG_M', desc: 'Gas Sensor V15' },
      { zigbeeModel: 'HY0022', model: 'HS1CG_H', desc: 'Gas Sensor HY0022' },
      { zigbeeModel: 'RH3070', model: 'HS1CG', desc: 'Gas Sensor RH3070' }
    ]
  },

  // ---------------------------------------------------------------------------
  // WATER LEAK SENSORS - IAS Zone 0x0500 (Zone Type 0x002A)
  // ---------------------------------------------------------------------------
  waterLeakSensors: {
    driver: 'water_leak_sensor',
    cluster: 'iasZone',
    devices: [
      { zigbeeModel: 'WaterSensor-N', model: 'HS1WL', desc: 'Water Sensor N' },
      { zigbeeModel: 'WaterSensor-EM', model: 'HS1WL', desc: 'Water Sensor EM' },
      { zigbeeModel: 'WaterSensor-N-3.0', model: 'HS3WL', desc: 'Water Sensor N 3.0' },
      { zigbeeModel: 'WaterSensor-EF-3.0', model: 'HS3WL', desc: 'Water Sensor EF 3.0' },
      { zigbeeModel: 'WaterSensor2-EF-3.0', model: 'HS3WL', desc: 'Water Sensor2 EF 3.0' },
      { zigbeeModel: 'WATER_TPV13', model: 'HS1WL', desc: 'Water Sensor TPV13' }
    ]
  },

  // ---------------------------------------------------------------------------
  // DOOR/WINDOW SENSORS - IAS Zone 0x0500 (Zone Type 0x0015)
  // ---------------------------------------------------------------------------
  contactSensors: {
    driver: 'contact_sensor',
    cluster: 'iasZone',
    devices: [
      { zigbeeModel: 'DoorSensor-N', model: 'HS3DS', desc: 'Door Sensor N' },
      { zigbeeModel: 'DoorSensor-N-3.0', model: 'HS3DS', desc: 'Door Sensor N 3.0' },
      { zigbeeModel: 'DoorSensor-EM', model: 'HS1DS', desc: 'Door Sensor EM' },
      { zigbeeModel: 'DoorSensor-EF-3.0', model: 'HS1DS', desc: 'Door Sensor EF 3.0' },
      { zigbeeModel: 'HS8DS-EF2-3.0', model: 'HS8DS-EFA', desc: 'Door Sensor HS8DS' },
      { zigbeeModel: 'D1-EF2-3.0', model: 'D1-EFA', desc: 'Door Sensor D1' },
      { zigbeeModel: 'DOOR_TPV13', model: 'HEIMAN-M1', desc: 'Door Sensor TPV13' },
      { zigbeeModel: 'DOOR_TPV12', model: 'HEIMAN-M1', desc: 'Door Sensor TPV12' }
    ]
  },

  // ---------------------------------------------------------------------------
  // MOTION SENSORS - IAS Zone 0x0500 (Zone Type 0x000D) + Occupancy 0x0406
  // ---------------------------------------------------------------------------
  motionSensors: {
    driver: 'motion_sensor',
    cluster: 'iasZone',
    devices: [
      { zigbeeModel: 'PIRSensor-N', model: 'HS3MS', desc: 'PIR Sensor N' },
      { zigbeeModel: 'PIRSensor-EM', model: 'HS3MS', desc: 'PIR Sensor EM' },
      { zigbeeModel: 'PIRSensor-EF-3.0', model: 'HS3MS', desc: 'PIR Sensor EF 3.0' },
      { zigbeeModel: 'PIR_TPV13', model: 'HS3MS', desc: 'PIR Sensor TPV13' },
      { zigbeeModel: 'PIRILLSensor-EF-3.0', model: 'HS1MIS-3.0', desc: 'PIR+Illuminance' }
    ]
  },

  // ---------------------------------------------------------------------------
  // SIRENS - IAS WD 0x0502
  // ---------------------------------------------------------------------------
  sirens: {
    driver: 'siren',
    cluster: 'iasWd',  // 0x0502
    devices: [
      { zigbeeModel: 'WarningDevice', model: 'HS2WD-E', desc: 'Warning Device' },
      { zigbeeModel: 'WarningDevice-EF-3.0', model: 'HS2WD-E', desc: 'Warning Device EF 3.0' },
      { zigbeeModel: 'SRHMP-I1', model: 'SRHMP-I1', desc: 'Siren SRHMP-I1' }
    ]
  },

  // ---------------------------------------------------------------------------
  // TEMPERATURE/HUMIDITY SENSORS - msTemperatureMeasurement 0x0402 + msRelativeHumidity 0x0405
  // ---------------------------------------------------------------------------
  climateSensors: {
    driver: 'climate_sensor',
    cluster: 'msTemperatureMeasurement',
    devices: [
      { zigbeeModel: 'HT-EM', model: 'HS1HT', desc: 'Temp/Humidity EM' },
      { zigbeeModel: 'TH-EM', model: 'HS1HT', desc: 'Temp/Humidity TH-EM' },
      { zigbeeModel: 'TH-T_V14', model: 'HS1HT', desc: 'Temp/Humidity V14' },
      { zigbeeModel: 'HT-N', model: 'HS1HT-N', desc: 'Temp/Humidity N' },
      { zigbeeModel: 'HT-EF-3.0', model: 'HS1HT-N', desc: 'Temp/Humidity EF 3.0' }
    ]
  },

  // ---------------------------------------------------------------------------
  // EMERGENCY BUTTONS - IAS Zone
  // ---------------------------------------------------------------------------
  emergencyButtons: {
    driver: 'button_emergency_sos',
    cluster: 'iasZone',
    devices: [
      { zigbeeModel: 'SOS-EM', model: 'HS1EB', desc: 'Emergency Button EM' },
      { zigbeeModel: 'SOS-EF-3.0', model: 'HS1EB-E', desc: 'Emergency Button EF 3.0' }
    ]
  },

  // ---------------------------------------------------------------------------
  // REMOTE CONTROLS
  // ---------------------------------------------------------------------------
  remoteControls: {
    driver: 'scene_switch_4',
    cluster: 'iasAce',  // 0x0501
    devices: [
      { zigbeeModel: 'RC-N', model: 'HS1RC-N', desc: 'Remote Control N' },
      { zigbeeModel: 'RC-EF-3.0', model: 'HM1RC-2-E', desc: 'Remote Control EF 3.0' },
      { zigbeeModel: 'RC-EM', model: 'HS1RC-EM', desc: 'Remote Control EM' },
      { zigbeeModel: 'SceneSwitch-EM-3.0', model: 'HS2SS', desc: 'Scene Switch' }
    ]
  },

  // ---------------------------------------------------------------------------
  // SMART PLUGS - genOnOff 0x0006 + haElectricalMeasurement 0x0B04
  // ---------------------------------------------------------------------------
  smartPlugs: {
    driver: 'plug_energy_monitor',
    cluster: 'genOnOff',
    devices: [
      { zigbeeModel: 'SmartPlug', model: 'HS2SK', desc: 'Smart Plug' },
      { zigbeeModel: 'SmartPlug-EF-3.0', model: 'HS2SK', desc: 'Smart Plug EF 3.0' },
      { zigbeeModel: 'SmartPlug-N', model: 'HS2SK_nxp', desc: 'Smart Plug N' },
      { zigbeeModel: 'E_Socket', model: 'HS2ESK-E', desc: 'In-Wall Plug' }
    ]
  }
};

// =============================================================================
// SONOFF DEVICES - From zigbee-herdsman-converters/src/devices/sonoff.ts
// =============================================================================

const SONOFF_DEVICES = {
  // ---------------------------------------------------------------------------
  // TEMPERATURE/HUMIDITY SENSORS
  // ---------------------------------------------------------------------------
  tempHumidity: {
    driver: 'climate_sensor',
    devices: [
      { zigbeeModel: 'TH01', model: 'SNZB-02', desc: 'Temp/Humidity Sensor' },
      { zigbeeModel: 'SNZB-02D', model: 'SNZB-02D', desc: 'Temp/Humidity LCD' },
      { zigbeeModel: 'SNZB-02P', model: 'SNZB-02P', desc: 'Temp/Humidity Pro' },
      { zigbeeModel: 'SNZB-02LD', model: 'SNZB-02LD', desc: 'Temp/Humidity LD' },
      { zigbeeModel: 'SNZB-02WD', model: 'SNZB-02WD', desc: 'Temp/Humidity WD' },
      { zigbeeModel: 'SNZB-02-DR2', model: 'SNZB-02-DR2', desc: 'Temp/Humidity DR2' }
    ]
  },

  // ---------------------------------------------------------------------------
  // MOTION SENSORS - IAS Zone 0x0500 / Occupancy 0x0406
  // ---------------------------------------------------------------------------
  motionSensors: {
    driver: 'motion_sensor',
    devices: [
      { zigbeeModel: 'MS01', model: 'SNZB-03', desc: 'Motion Sensor' },
      { zigbeeModel: 'SNZB-03P', model: 'SNZB-03P', desc: 'Motion Sensor Pro' }
    ]
  },

  // ---------------------------------------------------------------------------
  // DOOR/WINDOW SENSORS - IAS Zone 0x0500
  // ---------------------------------------------------------------------------
  contactSensors: {
    driver: 'contact_sensor',
    devices: [
      { zigbeeModel: 'DS01', model: 'SNZB-04', desc: 'Contact Sensor' },
      { zigbeeModel: 'SNZB-04P', model: 'SNZB-04P', desc: 'Contact Sensor Pro' }
    ]
  },

  // ---------------------------------------------------------------------------
  // WATER LEAK SENSORS - IAS Zone 0x0500
  // ---------------------------------------------------------------------------
  waterLeakSensors: {
    driver: 'water_leak_sensor',
    devices: [
      { zigbeeModel: 'WL01', model: 'SNZB-05', desc: 'Water Leak Sensor' },
      { zigbeeModel: 'SNZB-05P', model: 'SNZB-05P', desc: 'Water Leak Pro' }
    ]
  },

  // ---------------------------------------------------------------------------
  // PRESENCE SENSORS - Occupancy 0x0406 (mmWave)
  // ---------------------------------------------------------------------------
  presenceSensors: {
    driver: 'presence_sensor_radar',
    devices: [
      { zigbeeModel: 'SNZB-06P', model: 'SNZB-06P', desc: 'Human Presence mmWave' }
    ]
  },

  // ---------------------------------------------------------------------------
  // WIRELESS BUTTONS
  // ---------------------------------------------------------------------------
  buttons: {
    driver: 'button_wireless_1',
    devices: [
      { zigbeeModel: 'WB01', model: 'SNZB-01', desc: 'Wireless Button' },
      { zigbeeModel: 'SNZB-01P', model: 'SNZB-01P', desc: 'Wireless Button Pro' },
      { zigbeeModel: 'WB-01', model: 'WB-01', desc: 'Wireless Button WB' },
      { zigbeeModel: 'SNZB-01M', model: 'SNZB-01M', desc: 'Multi-Button' }
    ]
  },

  // ---------------------------------------------------------------------------
  // MINI SWITCHES - genOnOff 0x0006
  // ---------------------------------------------------------------------------
  miniSwitches: {
    driver: 'module_mini_switch',
    devices: [
      { zigbeeModel: '01MINIZB', model: 'ZBMINI', desc: 'Mini Switch' },
      { zigbeeModel: 'SA-003-Zigbee', model: 'SA-003-Zigbee', desc: 'Switch SA-003' },
      { zigbeeModel: 'ZBMINIL2', model: 'ZBMINIL2', desc: 'Mini L2 No Neutral' },
      { zigbeeModel: 'ZBMINIR2', model: 'ZBMINIR2', desc: 'Mini R2' },
      { zigbeeModel: 'ZBMicro', model: 'ZBMicro', desc: 'Micro USB Repeater' },
      { zigbeeModel: 'MINI-ZB2GS', model: 'MINI-ZB2GS', desc: 'Dual Switch 2G' },
      { zigbeeModel: 'MINI-ZB2GS-L', model: 'MINI-ZB2GS-L', desc: 'Dual Switch 2G-L' }
    ]
  },

  // ---------------------------------------------------------------------------
  // SMART PLUGS - genOnOff 0x0006 + seMetering 0x0702
  // ---------------------------------------------------------------------------
  smartPlugs: {
    driver: 'plug_energy_monitor',
    devices: [
      { zigbeeModel: 'S26R2ZB', model: 'S26R2ZB', desc: 'Smart Plug R2' },
      { zigbeeModel: 'S31ZB', model: 'S31ZB', desc: 'Smart Plug S31' },
      { zigbeeModel: 'S40ZBTPB', model: 'S40ZBTPB', desc: 'Smart Plug S40' },
      { zigbeeModel: 'S40ZBTPF', model: 'S40ZBTPF', desc: 'Smart Plug S40 FR' },
      { zigbeeModel: 'S60ZBTPF', model: 'S60ZBTPF', desc: 'Outdoor Plug S60 FR' },
      { zigbeeModel: 'S60ZBTPG', model: 'S60ZBTPG', desc: 'Outdoor Plug S60' },
      { zigbeeModel: 'SA-029-1', model: 'SA-029-1', desc: 'Smart Plug SA-029' }
    ]
  },

  // ---------------------------------------------------------------------------
  // RADIATOR VALVE - Thermostat 0x0201
  // ---------------------------------------------------------------------------
  radiatorValves: {
    driver: 'radiator_valve',
    devices: [
      { zigbeeModel: 'TRVZB', model: 'TRVZB', desc: 'Thermostatic Radiator Valve' }
    ]
  },

  // ---------------------------------------------------------------------------
  // WATER VALVE - genOnOff 0x0006
  // ---------------------------------------------------------------------------
  waterValves: {
    driver: 'valve_water',
    devices: [
      { zigbeeModel: 'SWV', model: 'SWV', desc: 'Smart Water Valve' }
    ]
  },

  // ---------------------------------------------------------------------------
  // BRIDGES & DONGLES
  // ---------------------------------------------------------------------------
  bridges: {
    driver: 'gateway_zigbee_bridge',
    devices: [
      { zigbeeModel: 'ZBBridge-P', model: 'ZBBridge-P', desc: 'Zigbee Bridge Pro' },
      { zigbeeModel: 'ZBBridge-U', model: 'ZBBridge-U', desc: 'Zigbee Bridge Ultra' },
      { zigbeeModel: 'ZBDongle-E', model: 'ZBDongle-E', desc: 'Zigbee 3.0 Dongle-E' },
      { zigbeeModel: 'ZBDongle-P', model: 'ZBDongle-P', desc: 'Zigbee 3.0 Dongle-P' }
    ]
  }
};

// =============================================================================
// TUYA SIRENS & SECURITY - From zigbee-herdsman-converters
// =============================================================================

const TUYA_SECURITY_DEVICES = {
  sirens: {
    driver: 'siren',
    devices: [
      // Standard IAS WD
      { manufacturerName: '_TZ3000_fwqnjhky', modelId: 'TS0216', desc: 'Tuya Siren' },
      { manufacturerName: '_TYZB01_8scntis1', modelId: 'TS0216', desc: 'Tuya Siren v2' },
      { manufacturerName: '_TYZB01_4obovpbi', modelId: 'TS0216', desc: 'Tuya Siren v3' },
      { manufacturerName: '_TZ3000_ab3awvjc', modelId: 'TS0219', desc: 'Tuya Siren TS0219' },
      // TS0601 Tuya DP
      { manufacturerName: '_TZE200_t1blo2bj', modelId: 'TS0601', desc: 'Tuya Siren DP' },
      { manufacturerName: '_TZE200_nlrfgpny', modelId: 'TS0601', desc: 'Neo Siren' },
      { manufacturerName: '_TZE204_nlrfgpny', modelId: 'TS0601', desc: 'Neo Siren v2' }
    ]
  },

  smokeDetectors: {
    driver: 'smoke_detector_advanced',
    devices: [
      { manufacturerName: '_TZ3000_rte1qmaj', modelId: 'TS0205', desc: 'Tuya Smoke' },
      { manufacturerName: '_TZE200_ntcy3xu1', modelId: 'TS0601', desc: 'Tuya Smoke DP' },
      { manufacturerName: '_TZE200_dq1mfjug', modelId: 'TS0601', desc: 'Tuya Smoke v2' },
      { manufacturerName: '_TZE200_m9skfctm', modelId: 'TS0601', desc: 'Tuya Smoke v3' }
    ]
  },

  gasDetectors: {
    driver: 'gas_detector',
    devices: [
      { manufacturerName: '_TZE200_rjxqso4a', modelId: 'TS0601', desc: 'Tuya Gas' },
      { manufacturerName: '_TZE200_yojqa8xn', modelId: 'TS0601', desc: 'Tuya Gas v2' },
      { manufacturerName: '_TZ3000_eiqjkquz', modelId: 'TS0205', desc: 'Tuya Gas TS0205' }
    ]
  },

  coDetectors: {
    driver: 'co_sensor',
    devices: [
      { manufacturerName: '_TZE200_vq5chjgh', modelId: 'TS0601', desc: 'Tuya CO' },
      { manufacturerName: '_TZE200_7qmdqwmj', modelId: 'TS0601', desc: 'Tuya CO v2' }
    ]
  },

  waterLeakSensors: {
    driver: 'water_leak_sensor',
    devices: [
      { manufacturerName: '_TZ3000_kyb656no', modelId: 'TS0207', desc: 'Tuya Water Leak' },
      { manufacturerName: '_TZ3000_mugyhz0q', modelId: 'TS0207', desc: 'Tuya Water v2' },
      { manufacturerName: '_TZ3000_kxfbo3d9', modelId: 'TS0207', desc: 'Tuya Water v3' },
      { manufacturerName: '_TYZB01_sqmd19i1', modelId: 'TS0207', desc: 'Tuya Water v4' }
    ]
  },

  sosButtons: {
    driver: 'button_emergency_sos',
    devices: [
      { manufacturerName: '_TZ3000_fkp7yfbz', modelId: 'TS0215A', desc: 'Tuya SOS Button' },
      { manufacturerName: '_TZ3000_p6ju8myv', modelId: 'TS0215A', desc: 'Tuya SOS v2' },
      { manufacturerName: '_TZ3000_co4gqbha', modelId: 'TS0215A', desc: 'Tuya SOS v3' },
      { manufacturerName: '_TYZB02_key8kk7r', modelId: 'TS0215A', desc: 'Tuya SOS v4' }
    ]
  }
};

// =============================================================================
// ENRICHMENT FUNCTION
// =============================================================================

function loadDriverConfig(driverPath) {
  const configPath = path.join(driverPath, 'driver.compose.json');
  if (!fs.existsSync(configPath)) return null;
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function saveDriverConfig(driverPath, config) {
  const configPath = path.join(driverPath, 'driver.compose.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function enrichDriver(driversDir, driverName, devices, useZigbeeModel = true) {
  const driverPath = path.join(driversDir, driverName);
  if (!fs.existsSync(driverPath)) return { added: 0, skipped: 0 };

  const config = loadDriverConfig(driverPath);
  if (!config) return { added: 0, skipped: 0 };

  if (!config.zigbee) config.zigbee = {};
  if (!config.zigbee.devices) config.zigbee.devices = [];

  const existing = new Set(config.zigbee.devices.map(d =>
    `${d.manufacturerName}|${d.modelId || d.productId}`
  ));

  let added = 0, skipped = 0;

  for (const device of devices) {
    let manufacturerName, modelId;

    if (useZigbeeModel && device.zigbeeModel) {
      // HEIMAN/SONOFF style: zigbeeModel becomes productId, manufacturerName is brand
      manufacturerName = 'HEIMAN';
      modelId = device.zigbeeModel;
    } else if (device.manufacturerName) {
      // Tuya style: manufacturerName + modelId
      manufacturerName = device.manufacturerName;
      modelId = device.modelId;
    } else {
      continue;
    }

    const key = `${manufacturerName}|${modelId}`;
    if (existing.has(key)) { skipped++; continue; }

    config.zigbee.devices.push({ manufacturerName, modelId });
    existing.add(key);
    added++;
  }

  if (added > 0) saveDriverConfig(driverPath, config);
  return { added, skipped };
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

console.log('📚 ZIGBEE2MQTT OFFICIAL ENRICHMENT');
console.log('Source: github.com/Koenkk/zigbee-herdsman-converters');
console.log('='.repeat(60) + '\n');

const driversDir = path.join(__dirname, '..', '..', 'drivers');
let totalAdded = 0;

// Process HEIMAN devices
console.log('🔴 HEIMAN DEVICES:');
for (const [category, data] of Object.entries(HEIMAN_DEVICES)) {
  const result = enrichDriver(driversDir, data.driver, data.devices, true);
  if (result.added > 0) {
    console.log(`  ✅ ${category} → ${data.driver}: +${result.added}`);
    totalAdded += result.added;
  }
}

// Process SONOFF devices
console.log('\n🔵 SONOFF DEVICES:');
for (const [category, data] of Object.entries(SONOFF_DEVICES)) {
  // For SONOFF, use eWeLink as manufacturer
  const sonoffDevices = data.devices.map(d => ({
    manufacturerName: 'eWeLink',
    modelId: d.zigbeeModel
  }));
  const result = enrichDriver(driversDir, data.driver, sonoffDevices, false);
  if (result.added > 0) {
    console.log(`  ✅ ${category} → ${data.driver}: +${result.added}`);
    totalAdded += result.added;
  }
}

// Process Tuya security devices
console.log('\n🟢 TUYA SECURITY DEVICES:');
for (const [category, data] of Object.entries(TUYA_SECURITY_DEVICES)) {
  const result = enrichDriver(driversDir, data.driver, data.devices, false);
  if (result.added > 0) {
    console.log(`  ✅ ${category} → ${data.driver}: +${result.added}`);
    totalAdded += result.added;
  }
}

// Count totals
const heimanCount = Object.values(HEIMAN_DEVICES).reduce((sum, d) => sum + d.devices.length, 0);
const sonoffCount = Object.values(SONOFF_DEVICES).reduce((sum, d) => sum + d.devices.length, 0);
const tuyaCount = Object.values(TUYA_SECURITY_DEVICES).reduce((sum, d) => sum + d.devices.length, 0);

console.log('\n' + '='.repeat(60));
console.log('📊 SUMMARY');
console.log(`  HEIMAN devices: ${heimanCount}`);
console.log(`  SONOFF devices: ${sonoffCount}`);
console.log(`  TUYA security: ${tuyaCount}`);
console.log(`  TOTAL entries: ${heimanCount + sonoffCount + tuyaCount}`);
console.log(`  NEW fingerprints added: ${totalAdded}`);
console.log('='.repeat(60));

// Save report
const reportPath = path.join(__dirname, '..', '..', 'data', 'enrichment', 'zigbee2mqtt-official-report.json');
fs.writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  source: 'github.com/Koenkk/zigbee-herdsman-converters',
  heiman: heimanCount,
  sonoff: sonoffCount,
  tuya: tuyaCount,
  totalAdded
}, null, 2));

console.log(`\n📄 Report: ${reportPath}`);
console.log('✨ Zigbee2MQTT official enrichment complete!');
