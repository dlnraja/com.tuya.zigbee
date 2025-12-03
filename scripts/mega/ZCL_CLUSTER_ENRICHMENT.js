#!/usr/bin/env node
/**
 * ZCL CLUSTER ENRICHMENT - Proper Zigbee Cluster Configuration
 *
 * Adds correct endpoint clusters and bindings to all drivers for native
 * Zigbee Direct communication without any hub/bridge dependency.
 *
 * @author Dylan Rajasekaram
 * @version 5.3.43
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// ZCL CLUSTER DEFINITIONS
// =============================================================================

const CLUSTERS = {
  // Standard ZCL
  BASIC: 0,           // 0x0000
  POWER_CFG: 1,       // 0x0001
  IDENTIFY: 3,        // 0x0003
  GROUPS: 4,          // 0x0004
  SCENES: 5,          // 0x0005
  ON_OFF: 6,          // 0x0006
  LEVEL_CTRL: 8,      // 0x0008
  ALARMS: 9,          // 0x0009
  TIME: 10,           // 0x000A
  OTA: 25,            // 0x0019

  // Closures
  WINDOW_COVERING: 258,  // 0x0102

  // HVAC
  THERMOSTAT: 513,       // 0x0201
  FAN_CTRL: 514,         // 0x0202
  THERMOSTAT_UI: 516,    // 0x0204

  // Lighting
  COLOR_CTRL: 768,       // 0x0300

  // Measurement
  ILLUMINANCE: 1024,     // 0x0400
  TEMPERATURE: 1026,     // 0x0402
  PRESSURE: 1027,        // 0x0403
  HUMIDITY: 1029,        // 0x0405
  OCCUPANCY: 1030,       // 0x0406

  // Security (IAS)
  IAS_ZONE: 1280,        // 0x0500
  IAS_ACE: 1281,         // 0x0501
  IAS_WD: 1282,          // 0x0502

  // Smart Energy
  METERING: 1794,        // 0x0702
  ELECTRICAL: 2820,      // 0x0B04

  // Tuya
  TUYA_PRIVATE: 61184    // 0xEF00
};

// =============================================================================
// DEVICE TYPE CONFIGURATIONS
// =============================================================================

const DEVICE_CONFIGS = {
  // ===========================================================================
  // SECURITY SENSORS (IAS Zone 0x0500)
  // ===========================================================================

  smoke_detector: {
    endpoints: {
      1: {
        clusters: [CLUSTERS.BASIC, CLUSTERS.POWER_CFG, CLUSTERS.IDENTIFY, CLUSTERS.IAS_ZONE],
        bindings: [CLUSTERS.IAS_ZONE, CLUSTERS.POWER_CFG]
      }
    },
    // Heiman, Tuya, Develco smoke detectors
    fingerprints: [
      { manufacturerName: 'HEIMAN', modelId: 'SmokeSensor-N-3.0' },
      { manufacturerName: 'HEIMAN', modelId: 'HS1SA-M' },
      { manufacturerName: 'HEIMAN', modelId: 'HS1SA-E' },
      { manufacturerName: 'HEIMAN', modelId: 'HS3SA' },
      { manufacturerName: '_TZE200_ntcy3xu1', modelId: 'TS0601' },
      { manufacturerName: '_TZ3000_rte1qmaj', modelId: 'TS0205' },
      { manufacturerName: 'Develco', modelId: 'SMSZB-120' },
      { manufacturerName: 'frient A/S', modelId: 'SMSZB-120' },
      { manufacturerName: 'SONOFF', modelId: 'SNZB-Smoke' }
    ]
  },

  co_sensor: {
    endpoints: {
      1: {
        clusters: [CLUSTERS.BASIC, CLUSTERS.POWER_CFG, CLUSTERS.IDENTIFY, CLUSTERS.IAS_ZONE],
        bindings: [CLUSTERS.IAS_ZONE, CLUSTERS.POWER_CFG]
      }
    },
    fingerprints: [
      { manufacturerName: 'HEIMAN', modelId: 'COSensor-N' },
      { manufacturerName: 'HEIMAN', modelId: 'HS1CA-M' },
      { manufacturerName: 'HEIMAN', modelId: 'HS3CA' },
      { manufacturerName: '_TZE200_vq5chjgh', modelId: 'TS0601' },
      { manufacturerName: 'Develco', modelId: 'COZB-120' }
    ]
  },

  gas_detector: {
    endpoints: {
      1: {
        clusters: [CLUSTERS.BASIC, CLUSTERS.POWER_CFG, CLUSTERS.IDENTIFY, CLUSTERS.IAS_ZONE],
        bindings: [CLUSTERS.IAS_ZONE]
      }
    },
    fingerprints: [
      { manufacturerName: 'HEIMAN', modelId: 'GASSensor-N' },
      { manufacturerName: 'HEIMAN', modelId: 'HS1CG-M' },
      { manufacturerName: 'HEIMAN', modelId: 'HS3CG' },
      { manufacturerName: '_TZE200_rjxqso4a', modelId: 'TS0601' },
      { manufacturerName: '_TZ3000_ztfj8m', modelId: 'TS0205' }
    ]
  },

  water_leak_sensor: {
    endpoints: {
      1: {
        clusters: [CLUSTERS.BASIC, CLUSTERS.POWER_CFG, CLUSTERS.IDENTIFY, CLUSTERS.IAS_ZONE],
        bindings: [CLUSTERS.IAS_ZONE, CLUSTERS.POWER_CFG]
      }
    },
    fingerprints: [
      { manufacturerName: 'HEIMAN', modelId: 'WaterSensor-N' },
      { manufacturerName: 'HEIMAN', modelId: 'HS1WL-M' },
      { manufacturerName: '_TZ3000_kyb656no', modelId: 'TS0207' },
      { manufacturerName: '_TZ3000_mugyhz0q', modelId: 'TS0207' },
      { manufacturerName: 'SONOFF', modelId: 'SNZB-05' },
      { manufacturerName: 'eWeLink', modelId: 'SNZB-05P' },
      { manufacturerName: 'LUMI', modelId: 'lumi.sensor_wleak.aq1' }
    ]
  },

  motion_sensor: {
    endpoints: {
      1: {
        clusters: [CLUSTERS.BASIC, CLUSTERS.POWER_CFG, CLUSTERS.IDENTIFY, CLUSTERS.IAS_ZONE, CLUSTERS.OCCUPANCY],
        bindings: [CLUSTERS.IAS_ZONE, CLUSTERS.OCCUPANCY, CLUSTERS.POWER_CFG]
      }
    },
    fingerprints: [
      { manufacturerName: 'HEIMAN', modelId: 'PIRSensor-N' },
      { manufacturerName: 'HEIMAN', modelId: 'HS1MS-M' },
      { manufacturerName: '_TZ3000_kmh5qpmb', modelId: 'TS0202' },
      { manufacturerName: '_TZ3000_mcxw5ehu', modelId: 'TS0202' },
      { manufacturerName: 'SONOFF', modelId: 'SNZB-03' },
      { manufacturerName: 'eWeLink', modelId: 'SNZB-03P' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'TRADFRI motion sensor' },
      { manufacturerName: 'Philips', modelId: 'SML001' },
      { manufacturerName: 'LUMI', modelId: 'lumi.sensor_motion.aq2' },
      { manufacturerName: 'Aqara', modelId: 'RTCGQ14LM' }
    ]
  },

  contact_sensor: {
    endpoints: {
      1: {
        clusters: [CLUSTERS.BASIC, CLUSTERS.POWER_CFG, CLUSTERS.IDENTIFY, CLUSTERS.IAS_ZONE],
        bindings: [CLUSTERS.IAS_ZONE, CLUSTERS.POWER_CFG]
      }
    },
    fingerprints: [
      { manufacturerName: 'HEIMAN', modelId: 'DoorSensor-N' },
      { manufacturerName: 'HEIMAN', modelId: 'HS1DS-M' },
      { manufacturerName: '_TZ3000_26fmupbb', modelId: 'TS0203' },
      { manufacturerName: '_TZ3000_n2egfsli', modelId: 'TS0203' },
      { manufacturerName: 'SONOFF', modelId: 'SNZB-04' },
      { manufacturerName: 'eWeLink', modelId: 'SNZB-04P' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'E1766' },
      { manufacturerName: 'LUMI', modelId: 'lumi.sensor_magnet.aq2' },
      { manufacturerName: 'Aqara', modelId: 'MCCGQ14LM' }
    ]
  },

  // ===========================================================================
  // SIRENS & WARNING DEVICES (IAS WD 0x0502)
  // ===========================================================================

  siren: {
    endpoints: {
      1: {
        clusters: [CLUSTERS.BASIC, CLUSTERS.POWER_CFG, CLUSTERS.IDENTIFY, CLUSTERS.IAS_WD, CLUSTERS.IAS_ZONE, CLUSTERS.ON_OFF],
        bindings: [CLUSTERS.IAS_WD, CLUSTERS.IAS_ZONE, CLUSTERS.ON_OFF]
      }
    },
    fingerprints: [
      { manufacturerName: 'HEIMAN', modelId: 'WarningDevice' },
      { manufacturerName: 'HEIMAN', modelId: 'HS2WD-E' },
      { manufacturerName: 'HEIMAN', modelId: 'SRHMP-I1' },
      { manufacturerName: '_TZ3000_fwqnjhky', modelId: 'TS0216' },
      { manufacturerName: '_TZE200_t1blo2bj', modelId: 'TS0601' },
      { manufacturerName: '_TZ3000_ab3awvjc', modelId: 'TS0219' },
      { manufacturerName: 'Develco', modelId: 'SIRZB-110' },
      { manufacturerName: 'SONOFF', modelId: 'SNZB-Siren' }
    ]
  },

  // ===========================================================================
  // CLIMATE SENSORS
  // ===========================================================================

  climate_sensor: {
    endpoints: {
      1: {
        clusters: [CLUSTERS.BASIC, CLUSTERS.POWER_CFG, CLUSTERS.IDENTIFY, CLUSTERS.TEMPERATURE, CLUSTERS.HUMIDITY],
        bindings: [CLUSTERS.TEMPERATURE, CLUSTERS.HUMIDITY, CLUSTERS.POWER_CFG]
      }
    },
    fingerprints: [
      { manufacturerName: 'HEIMAN', modelId: 'TempHumiditySensor-N' },
      { manufacturerName: '_TZ3000_qaaysllp', modelId: 'TS0201' },
      { manufacturerName: '_TZ3000_bguser20', modelId: 'TS0201' },
      { manufacturerName: 'SONOFF', modelId: 'SNZB-02' },
      { manufacturerName: 'eWeLink', modelId: 'SNZB-02D' },
      { manufacturerName: 'eWeLink', modelId: 'SNZB-02P' },
      { manufacturerName: 'LUMI', modelId: 'lumi.weather' },
      { manufacturerName: 'Aqara', modelId: 'WSDCGQ12LM' }
    ]
  },

  // ===========================================================================
  // SWITCHES & PLUGS
  // ===========================================================================

  switch_1gang: {
    endpoints: {
      1: {
        clusters: [CLUSTERS.BASIC, CLUSTERS.IDENTIFY, CLUSTERS.GROUPS, CLUSTERS.SCENES, CLUSTERS.ON_OFF],
        bindings: [CLUSTERS.ON_OFF]
      }
    },
    // Add Tuya cluster for TS0001/TS0011 devices
    tuyaEndpoints: {
      1: {
        clusters: [CLUSTERS.BASIC, CLUSTERS.IDENTIFY, CLUSTERS.ON_OFF, CLUSTERS.TUYA_PRIVATE],
        bindings: [CLUSTERS.ON_OFF]
      }
    },
    fingerprints: [
      { manufacturerName: '_TZ3000_npzfdcof', modelId: 'TS0001' },
      { manufacturerName: '_TZ3000_tqlv4ez4', modelId: 'TS0001' },
      { manufacturerName: 'SONOFF', modelId: 'ZBMINI' },
      { manufacturerName: 'SONOFF', modelId: 'ZBMINI-L' },
      { manufacturerName: 'SONOFF', modelId: 'ZBMINI-L2' },
      { manufacturerName: 'eWeLink', modelId: 'ZBMINIL2' },
      { manufacturerName: 'Aqara', modelId: 'SSM-U01' },
      { manufacturerName: 'LUMI', modelId: 'lumi.switch.n0agl1' }
    ]
  },

  switch_2gang: {
    endpoints: {
      1: {
        clusters: [CLUSTERS.BASIC, CLUSTERS.IDENTIFY, CLUSTERS.ON_OFF],
        bindings: [CLUSTERS.ON_OFF]
      },
      2: {
        clusters: [CLUSTERS.ON_OFF],
        bindings: [CLUSTERS.ON_OFF]
      }
    },
    tuyaEndpoints: {
      1: {
        clusters: [CLUSTERS.BASIC, CLUSTERS.ON_OFF, CLUSTERS.TUYA_PRIVATE],
        bindings: [CLUSTERS.ON_OFF]
      },
      2: {
        clusters: [CLUSTERS.ON_OFF],
        bindings: [CLUSTERS.ON_OFF]
      }
    },
    fingerprints: [
      { manufacturerName: '_TZ3000_hktqahrq', modelId: 'TS0002' },
      { manufacturerName: '_TZ3000_01gpyda5', modelId: 'TS0002' },
      { manufacturerName: 'Aqara', modelId: 'SSM-U02' },
      { manufacturerName: 'LUMI', modelId: 'lumi.switch.b2nacn02' }
    ]
  },

  switch_3gang: {
    endpoints: {
      1: {
        clusters: [CLUSTERS.BASIC, CLUSTERS.IDENTIFY, CLUSTERS.ON_OFF],
        bindings: [CLUSTERS.ON_OFF]
      },
      2: { clusters: [CLUSTERS.ON_OFF], bindings: [CLUSTERS.ON_OFF] },
      3: { clusters: [CLUSTERS.ON_OFF], bindings: [CLUSTERS.ON_OFF] }
    },
    fingerprints: [
      { manufacturerName: '_TZ3000_vjhcxlbz', modelId: 'TS0003' },
      { manufacturerName: '_TZ3000_odzoiovu', modelId: 'TS0003' }
    ]
  },

  plug_smart: {
    endpoints: {
      1: {
        clusters: [CLUSTERS.BASIC, CLUSTERS.IDENTIFY, CLUSTERS.GROUPS, CLUSTERS.SCENES, CLUSTERS.ON_OFF],
        bindings: [CLUSTERS.ON_OFF]
      }
    },
    fingerprints: [
      { manufacturerName: 'SONOFF', modelId: 'S26R2ZB' },
      { manufacturerName: 'SONOFF', modelId: 'S31ZB' },
      { manufacturerName: 'SONOFF', modelId: 'S40ZBTPB' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'TRADFRI control outlet' },
      { manufacturerName: 'Philips', modelId: 'LOM001' },
      { manufacturerName: 'Aqara', modelId: 'SP-EUC01' },
      { manufacturerName: 'LUMI', modelId: 'lumi.plug' }
    ]
  },

  plug_energy_monitor: {
    endpoints: {
      1: {
        clusters: [CLUSTERS.BASIC, CLUSTERS.IDENTIFY, CLUSTERS.ON_OFF, CLUSTERS.METERING, CLUSTERS.ELECTRICAL],
        bindings: [CLUSTERS.ON_OFF, CLUSTERS.METERING, CLUSTERS.ELECTRICAL]
      }
    },
    tuyaEndpoints: {
      1: {
        clusters: [CLUSTERS.BASIC, CLUSTERS.ON_OFF, CLUSTERS.METERING, CLUSTERS.ELECTRICAL, CLUSTERS.TUYA_PRIVATE],
        bindings: [CLUSTERS.ON_OFF, CLUSTERS.ELECTRICAL]
      }
    },
    fingerprints: [
      { manufacturerName: '_TZ3000_g5xawfcq', modelId: 'TS011F' },
      { manufacturerName: '_TZ3000_cphmq0q7', modelId: 'TS011F' },
      { manufacturerName: 'Develco', modelId: 'SPLZB-131' },
      { manufacturerName: 'Develco', modelId: 'EMIZB-132' }
    ]
  },

  // ===========================================================================
  // DIMMERS
  // ===========================================================================

  dimmer_wall_1gang: {
    endpoints: {
      1: {
        clusters: [CLUSTERS.BASIC, CLUSTERS.IDENTIFY, CLUSTERS.ON_OFF, CLUSTERS.LEVEL_CTRL],
        bindings: [CLUSTERS.ON_OFF, CLUSTERS.LEVEL_CTRL]
      }
    },
    fingerprints: [
      { manufacturerName: '_TZ3000_kdi2o9m6', modelId: 'TS110E' },
      { manufacturerName: '_TZE200_dfxkcots', modelId: 'TS0601' }
    ]
  },

  // ===========================================================================
  // BULBS
  // ===========================================================================

  bulb_dimmable: {
    endpoints: {
      1: {
        clusters: [CLUSTERS.BASIC, CLUSTERS.IDENTIFY, CLUSTERS.GROUPS, CLUSTERS.SCENES, CLUSTERS.ON_OFF, CLUSTERS.LEVEL_CTRL],
        bindings: [CLUSTERS.ON_OFF, CLUSTERS.LEVEL_CTRL]
      }
    },
    fingerprints: [
      { manufacturerName: 'IKEA of Sweden', modelId: 'TRADFRI bulb E27 W opal 1000lm' },
      { manufacturerName: 'Philips', modelId: 'LWB010' },
      { manufacturerName: 'sengled', modelId: 'E11-G13' }
    ]
  },

  bulb_tunable_white: {
    endpoints: {
      1: {
        clusters: [CLUSTERS.BASIC, CLUSTERS.IDENTIFY, CLUSTERS.GROUPS, CLUSTERS.SCENES, CLUSTERS.ON_OFF, CLUSTERS.LEVEL_CTRL, CLUSTERS.COLOR_CTRL],
        bindings: [CLUSTERS.ON_OFF, CLUSTERS.LEVEL_CTRL, CLUSTERS.COLOR_CTRL]
      }
    },
    fingerprints: [
      { manufacturerName: 'IKEA of Sweden', modelId: 'TRADFRI bulb E27 WS opal 980lm' },
      { manufacturerName: 'Philips', modelId: 'LTA001' },
      { manufacturerName: 'sengled', modelId: 'E11-G23' }
    ]
  },

  bulb_rgbw: {
    endpoints: {
      1: {
        clusters: [CLUSTERS.BASIC, CLUSTERS.IDENTIFY, CLUSTERS.GROUPS, CLUSTERS.SCENES, CLUSTERS.ON_OFF, CLUSTERS.LEVEL_CTRL, CLUSTERS.COLOR_CTRL],
        bindings: [CLUSTERS.ON_OFF, CLUSTERS.LEVEL_CTRL, CLUSTERS.COLOR_CTRL]
      }
    },
    fingerprints: [
      { manufacturerName: 'IKEA of Sweden', modelId: 'TRADFRI bulb E27 CWS opal 600lm' },
      { manufacturerName: 'Philips', modelId: 'LCT001' },
      { manufacturerName: 'Philips', modelId: 'LCA001' },
      { manufacturerName: '_TZ3210_sroezl0s', modelId: 'TS0505B' },
      { manufacturerName: 'innr', modelId: 'RB 285 C' }
    ]
  },

  // ===========================================================================
  // CURTAINS & BLINDS
  // ===========================================================================

  curtain_motor: {
    endpoints: {
      1: {
        clusters: [CLUSTERS.BASIC, CLUSTERS.IDENTIFY, CLUSTERS.GROUPS, CLUSTERS.SCENES, CLUSTERS.WINDOW_COVERING],
        bindings: [CLUSTERS.WINDOW_COVERING]
      }
    },
    tuyaEndpoints: {
      1: {
        clusters: [CLUSTERS.BASIC, CLUSTERS.WINDOW_COVERING, CLUSTERS.TUYA_PRIVATE],
        bindings: [CLUSTERS.WINDOW_COVERING]
      }
    },
    fingerprints: [
      { manufacturerName: '_TZ3000_fccpjz5z', modelId: 'TS130F' },
      { manufacturerName: '_TZE200_cowvfni3', modelId: 'TS0601' },
      { manufacturerName: 'SONOFF', modelId: 'ZBCurtain' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'FYRTUR block-out roller blind' },
      { manufacturerName: 'Aqara', modelId: 'ZNCLDJ12LM' },
      { manufacturerName: 'LUMI', modelId: 'lumi.curtain' }
    ]
  },

  // ===========================================================================
  // THERMOSTATS & CLIMATE CONTROL
  // ===========================================================================

  radiator_valve: {
    endpoints: {
      1: {
        clusters: [CLUSTERS.BASIC, CLUSTERS.POWER_CFG, CLUSTERS.IDENTIFY, CLUSTERS.THERMOSTAT, CLUSTERS.THERMOSTAT_UI],
        bindings: [CLUSTERS.THERMOSTAT, CLUSTERS.POWER_CFG]
      }
    },
    tuyaEndpoints: {
      1: {
        clusters: [CLUSTERS.BASIC, CLUSTERS.THERMOSTAT, CLUSTERS.TUYA_PRIVATE],
        bindings: [CLUSTERS.THERMOSTAT]
      }
    },
    fingerprints: [
      { manufacturerName: 'SONOFF', modelId: 'TRVZB' },
      { manufacturerName: '_TZE200_ckud7u2l', modelId: 'TS0601' },
      { manufacturerName: 'Schneider Electric', modelId: 'EER51000' }
    ]
  },

  // ===========================================================================
  // PRESENCE SENSORS (mmWave)
  // ===========================================================================

  presence_sensor_radar: {
    endpoints: {
      1: {
        clusters: [CLUSTERS.BASIC, CLUSTERS.IDENTIFY, CLUSTERS.OCCUPANCY],
        bindings: [CLUSTERS.OCCUPANCY]
      }
    },
    tuyaEndpoints: {
      1: {
        clusters: [CLUSTERS.BASIC, CLUSTERS.OCCUPANCY, CLUSTERS.TUYA_PRIVATE],
        bindings: [CLUSTERS.OCCUPANCY]
      }
    },
    fingerprints: [
      { manufacturerName: 'SONOFF', modelId: 'SNZB-06P' },
      { manufacturerName: 'eWeLink', modelId: 'SNZB-06P' },
      { manufacturerName: '_TZE200_ikvncluo', modelId: 'TS0601' },
      { manufacturerName: '_TZE204_qasjmygd', modelId: 'TS0601' }
    ]
  },

  // ===========================================================================
  // BUTTONS & REMOTES
  // ===========================================================================

  button_wireless_1: {
    endpoints: {
      1: {
        clusters: [CLUSTERS.BASIC, CLUSTERS.POWER_CFG, CLUSTERS.IDENTIFY, CLUSTERS.ON_OFF],
        bindings: [CLUSTERS.ON_OFF, CLUSTERS.POWER_CFG]
      }
    },
    fingerprints: [
      { manufacturerName: 'SONOFF', modelId: 'SNZB-01' },
      { manufacturerName: 'eWeLink', modelId: 'SNZB-01P' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'E1812' },
      { manufacturerName: 'Aqara', modelId: 'WXKG11LM' },
      { manufacturerName: 'LUMI', modelId: 'lumi.sensor_switch.aq2' }
    ]
  },

  button_wireless_4: {
    endpoints: {
      1: {
        clusters: [CLUSTERS.BASIC, CLUSTERS.POWER_CFG, CLUSTERS.IDENTIFY, CLUSTERS.ON_OFF, CLUSTERS.LEVEL_CTRL, CLUSTERS.SCENES],
        bindings: [CLUSTERS.ON_OFF, CLUSTERS.LEVEL_CTRL, CLUSTERS.SCENES, CLUSTERS.POWER_CFG]
      }
    },
    fingerprints: [
      { manufacturerName: 'IKEA of Sweden', modelId: 'TRADFRI remote control' },
      { manufacturerName: 'IKEA of Sweden', modelId: 'STYRBAR remote control N2' },
      { manufacturerName: 'Philips', modelId: 'RWL021' },
      { manufacturerName: 'Aqara', modelId: 'WXCJKG12LM' }
    ]
  }
};

// =============================================================================
// ENRICHMENT FUNCTIONS
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

function enrichDriverWithClusters(driversDir, driverName, deviceConfig) {
  const driverPath = path.join(driversDir, driverName);
  if (!fs.existsSync(driverPath)) {
    console.log(`  ⚠️ Driver not found: ${driverName}`);
    return { updated: false, added: 0 };
  }

  const config = loadDriverConfig(driverPath);
  if (!config) return { updated: false, added: 0 };

  let updated = false;
  let added = 0;

  // Initialize zigbee section if needed
  if (!config.zigbee) config.zigbee = {};
  if (!config.zigbee.devices) config.zigbee.devices = [];

  // Update endpoints with proper clusters
  if (!config.zigbee.endpoints && deviceConfig.endpoints) {
    config.zigbee.endpoints = deviceConfig.endpoints;
    updated = true;
    console.log(`  📋 Added endpoints configuration`);
  }

  // Add fingerprints
  if (deviceConfig.fingerprints) {
    const existing = new Set(config.zigbee.devices.map(d => `${d.manufacturerName}|${d.modelId}`));

    for (const fp of deviceConfig.fingerprints) {
      const key = `${fp.manufacturerName}|${fp.modelId}`;
      if (!existing.has(key)) {
        config.zigbee.devices.push({
          manufacturerName: fp.manufacturerName,
          modelId: fp.modelId
        });
        existing.add(key);
        added++;
      }
    }
  }

  if (updated || added > 0) {
    saveDriverConfig(driverPath, config);
  }

  return { updated, added };
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

console.log('🔧 ZCL CLUSTER ENRICHMENT - Native Zigbee Direct Support');
console.log('='.repeat(60) + '\n');

const driversDir = path.join(__dirname, '..', '..', 'drivers');
let totalDrivers = 0;
let totalAdded = 0;
let totalUpdated = 0;

for (const [driverName, deviceConfig] of Object.entries(DEVICE_CONFIGS)) {
  console.log(`📦 ${driverName}:`);
  const result = enrichDriverWithClusters(driversDir, driverName, deviceConfig);

  if (result.updated) totalUpdated++;
  totalAdded += result.added;

  if (result.added > 0) {
    console.log(`  ✅ Added ${result.added} fingerprints`);
  }
  totalDrivers++;
}

console.log('\n' + '='.repeat(60));
console.log(`📊 SUMMARY`);
console.log(`  Drivers processed: ${totalDrivers}`);
console.log(`  Drivers updated with endpoints: ${totalUpdated}`);
console.log(`  Fingerprints added: ${totalAdded}`);
console.log('='.repeat(60));

// Save report
const reportPath = path.join(__dirname, '..', '..', 'data', 'enrichment', 'zcl-cluster-enrichment-report.json');
const report = {
  timestamp: new Date().toISOString(),
  totalDrivers,
  totalUpdated,
  totalAdded,
  clusters: CLUSTERS,
  deviceConfigs: Object.keys(DEVICE_CONFIGS)
};
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log(`\n📄 Report: ${reportPath}`);
console.log('✨ ZCL Cluster enrichment complete!');
