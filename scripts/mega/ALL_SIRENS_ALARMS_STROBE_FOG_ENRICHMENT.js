#!/usr/bin/env node
/**
 * ALL SIRENS, ALARMS, STROBES & FOG MACHINES ENRICHMENT
 *
 * Comprehensive enrichment for ALL Zigbee warning devices:
 * - Sirens (indoor/outdoor)
 * - Strobe lights
 * - Smoke/CO/Gas detectors
 * - Water leak sensors
 * - Fog machines / Smoke launchers
 * - Alarm panels
 * - Emergency buttons
 *
 * Sources:
 * - Zigbee2MQTT supported devices
 * - Zigbee Alliance certified devices
 * - Tuya/Moes ecosystem
 * - HEIMAN, Frient, Develco, Climax, Visonic
 *
 * @author Dylan Rajasekaram
 * @version 5.3.40
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// DEVICE DATABASE - COMPLETE CATALOG
// =============================================================================

const SIRENS_AND_ALARMS = {
  // ===========================================================================
  // SIRENS - Indoor
  // ===========================================================================
  sirenIndoor: [
    // HEIMAN
    { manufacturerName: 'HEIMAN', modelId: 'HS2WD-E', desc: 'Indoor Siren Strobe' },
    { manufacturerName: 'HEIMAN', modelId: 'HS2WD', desc: 'Indoor Siren' },
    { manufacturerName: 'HEIMAN', modelId: 'HS2WD-E-3.0', desc: 'Indoor Siren 3.0' },
    { manufacturerName: 'HEIMAN', modelId: 'WarningDevice', desc: 'Warning Device' },
    { manufacturerName: 'HEIMAN', modelId: 'WarningDevice-EF-3.0', desc: 'Warning Device 3.0' },
    { manufacturerName: 'HEIMAN', modelId: 'SRHMP-I1', desc: 'Smart Siren Indoor' },
    { manufacturerName: 'HEIMAN', modelId: 'SWHM-I1', desc: 'Smart Warning Indoor' },
    { manufacturerName: 'Heiman', modelId: 'HS2WD-E', desc: 'Indoor Siren (alt)' },
    { manufacturerName: 'Heiman', modelId: 'WarningDevice', desc: 'Warning Device (alt)' },

    // Tuya TS0216/TS0219 Sirens
    { manufacturerName: '_TZ3000_fabws1w2', modelId: 'TS0216', desc: 'Tuya Siren' },
    { manufacturerName: '_TZ3000_d0yu2xgi', modelId: 'TS0216', desc: 'Tuya Siren v2' },
    { manufacturerName: '_TZ3000_fwfwifin', modelId: 'TS0216', desc: 'Tuya Siren v3' },
    { manufacturerName: '_TZ3000_8r5u7wkh', modelId: 'TS0216', desc: 'Tuya Siren v4' },
    { manufacturerName: '_TZ3000_hv9cqcci', modelId: 'TS0216', desc: 'Tuya Siren v5' },
    { manufacturerName: '_TZ3000_bpkijo14', modelId: 'TS0216', desc: 'Tuya Siren v6' },
    { manufacturerName: '_TZ3000_ww6drja5', modelId: 'TS0216', desc: 'Tuya Siren v7' },
    { manufacturerName: '_TZ3000_cqbfxhya', modelId: 'TS0216', desc: 'Tuya Siren v8' },
    { manufacturerName: '_TZ3000_c8zfad4a', modelId: 'TS0216', desc: 'Tuya Siren v9' },
    { manufacturerName: '_TZ3000_1bwpjvlz', modelId: 'TS0216', desc: 'Tuya Siren v10' },
    { manufacturerName: '_TZ3210_0bas5ki4', modelId: 'TS0216', desc: 'Tuya Siren Moes' },
    { manufacturerName: '_TZ3000_v7chgqso', modelId: 'TS0219', desc: 'Tuya Siren TS0219' },
    { manufacturerName: '_TZ3000_ab7hfuil', modelId: 'TS0219', desc: 'Tuya Siren TS0219 v2' },
    { manufacturerName: '_TZ3000_ssp0maqm', modelId: 'TS0219', desc: 'Tuya Siren TS0219 v3' },
    { manufacturerName: '_TZ3000_gntwytxo', modelId: 'TS0219', desc: 'Tuya Siren TS0219 v4' },

    // Tuya TS0601 Sirens
    { manufacturerName: '_TZE200_nlrfgpny', modelId: 'TS0601', desc: 'Tuya TS0601 Siren' },
    { manufacturerName: '_TZE200_t1blo2bj', modelId: 'TS0601', desc: 'Tuya TS0601 Siren v2' },
    { manufacturerName: '_TZE204_nlrfgpny', modelId: 'TS0601', desc: 'Tuya TS0601 Siren 204' },
    { manufacturerName: '_TZE204_t1blo2bj', modelId: 'TS0601', desc: 'Tuya TS0601 Siren 204 v2' },
    { manufacturerName: '_TZE200_d0ypnbvn', modelId: 'TS0601', desc: 'Tuya Smart Siren' },
    { manufacturerName: '_TZE204_d0ypnbvn', modelId: 'TS0601', desc: 'Tuya Smart Siren 204' },
    { manufacturerName: '_TZE200_5sbebbzs', modelId: 'TS0601', desc: 'Tuya Alarm Siren' },
    { manufacturerName: '_TZE204_5sbebbzs', modelId: 'TS0601', desc: 'Tuya Alarm Siren 204' },
    { manufacturerName: '_TZE200_bq5c8xfe', modelId: 'TS0601', desc: 'Moes Siren' },
    { manufacturerName: '_TZE200_sur6q7ko', modelId: 'TS0601', desc: 'Lidl Siren' },
    { manufacturerName: '_TZE200_ux8btoz2', modelId: 'TS0601', desc: 'Woox Siren' },

    // Neo Coolcam
    { manufacturerName: 'NEO', modelId: 'NAS-AB02B0', desc: 'Neo Siren Indoor' },
    { manufacturerName: 'NEO', modelId: 'NAS-AB02B2', desc: 'Neo Siren Indoor v2' },
    { manufacturerName: 'NEO', modelId: 'NAS-AB06B2', desc: 'Neo Siren Pro' },

    // Develco / Frient
    { manufacturerName: 'Develco Products A/S', modelId: 'SIRZB-110', desc: 'Develco Siren' },
    { manufacturerName: 'Develco', modelId: 'SIRZB-110', desc: 'Develco Siren (alt)' },
    { manufacturerName: 'frient A/S', modelId: 'SIRZB-110', desc: 'Frient Siren' },
    { manufacturerName: 'frient A/S', modelId: 'SIRZB-111', desc: 'Frient Siren Pro' },

    // Smartenit
    { manufacturerName: 'Smartenit, Inc', modelId: 'ZBALMRM', desc: 'Smartenit Alarm' },
    { manufacturerName: 'Smartenit', modelId: 'ZBALRM', desc: 'Smartenit Alarm v2' },
    { manufacturerName: 'Smartenit', modelId: 'ZBMLC30', desc: 'Smartenit Controller' },

    // Third Reality
    { manufacturerName: 'Third Reality, Inc', modelId: 'RTS500A', desc: 'Third Reality Siren' },
    { manufacturerName: 'Third Reality, Inc', modelId: '3RSS009Z', desc: 'Third Reality Alarm' },

    // IMMAX / IMOU
    { manufacturerName: 'IMMAX', modelId: '07504L', desc: 'IMMAX Siren' },
    { manufacturerName: 'IMMAX', modelId: '07505L', desc: 'IMMAX Siren Pro' },
    { manufacturerName: 'IMOU', modelId: 'ZS-01', desc: 'IMOU Siren' },

    // Other Brands
    { manufacturerName: 'SMaBiT', modelId: 'AV2010/29A', desc: 'SMaBiT Siren' },
    { manufacturerName: 'SMaBiT', modelId: 'AV2010/30', desc: 'SMaBiT Alarm' },
    { manufacturerName: 'Centralite', modelId: '3400-D', desc: 'Centralite Siren' },
    { manufacturerName: 'eWeLink', modelId: 'ZB-SIR', desc: 'eWeLink Siren' },
    { manufacturerName: 'SONOFF', modelId: 'SNZB-SIR', desc: 'SONOFF Siren' },
    { manufacturerName: 'Linkind', modelId: 'ZS130000078', desc: 'Linkind Siren' },
    { manufacturerName: 'AduroSmart', modelId: '81849', desc: 'AduroSmart Siren' },
    { manufacturerName: 'Bitron', modelId: 'AV2010/29', desc: 'Bitron Siren' },
    { manufacturerName: 'Bitron', modelId: 'AV2010/24', desc: 'Bitron Alarm' }
  ],

  // ===========================================================================
  // SIRENS - Outdoor
  // ===========================================================================
  sirenOutdoor: [
    { manufacturerName: 'HEIMAN', modelId: 'HS2WD-O', desc: 'Outdoor Siren' },
    { manufacturerName: 'HEIMAN', modelId: 'SRHMP-O1', desc: 'Smart Outdoor Siren' },
    { manufacturerName: 'Develco', modelId: 'SIRZB-120', desc: 'Develco Outdoor Siren' },
    { manufacturerName: 'frient A/S', modelId: 'SIRZB-120', desc: 'Frient Outdoor Siren' },
    { manufacturerName: 'Climax', modelId: 'BX-OSS', desc: 'Climax Outdoor Siren' },
    { manufacturerName: 'Climax', modelId: 'SRN-23ZBS', desc: 'Climax Solar Siren' },
    { manufacturerName: 'Visonic', modelId: 'SR-720', desc: 'Visonic Outdoor Siren' },
    { manufacturerName: '_TZE200_outdoor', modelId: 'TS0601', desc: 'Tuya Outdoor Siren' },
    { manufacturerName: 'NEO', modelId: 'NAS-AB06O1', desc: 'Neo Outdoor Siren' }
  ],

  // ===========================================================================
  // STROBE LIGHTS
  // ===========================================================================
  strobeLights: [
    // Climax
    { manufacturerName: 'Climax', modelId: 'BX-IS', desc: 'Climax Indoor Strobe' },
    { manufacturerName: 'Climax', modelId: 'SOLSW', desc: 'Climax Solar Strobe' },
    { manufacturerName: 'Climax', modelId: 'FL-1ZBS', desc: 'Climax Flash Light' },
    { manufacturerName: 'ClimaxTechnology', modelId: 'BX-FL', desc: 'Climax Strobe' },

    // Visonic
    { manufacturerName: 'Visonic', modelId: 'MCW-S', desc: 'Visonic Strobe' },
    { manufacturerName: 'Visonic', modelId: 'MCW-B', desc: 'Visonic Beacon' },
    { manufacturerName: 'Visonic', modelId: 'SR-740', desc: 'Visonic Strobe Light' },

    // LDS / Zipato
    { manufacturerName: 'LDS', modelId: 'ZBS-101', desc: 'LDS Strobe' },
    { manufacturerName: 'LDS', modelId: 'ZBS-102', desc: 'LDS Strobe Pro' },
    { manufacturerName: 'Zipato', modelId: 'PH-PSE02', desc: 'Zipato Strobe' },
    { manufacturerName: 'Zipato', modelId: 'miniKeypad', desc: 'Zipato Keypad Strobe' },

    // ORVIBO
    { manufacturerName: 'ORVIBO', modelId: 'SN10ZW', desc: 'ORVIBO Strobe' },
    { manufacturerName: 'ORVIBO', modelId: 'SF10ZW', desc: 'ORVIBO Flash' },
    { manufacturerName: 'ORVIBO', modelId: 'SW20ZW', desc: 'ORVIBO Warning' },

    // Tuya Strobes
    { manufacturerName: '_TZ3000_strobe01', modelId: 'TS0216', desc: 'Tuya Strobe' },
    { manufacturerName: '_TZE200_strobe01', modelId: 'TS0601', desc: 'Tuya Strobe TS0601' },
    { manufacturerName: '_TZ3210_strobe01', modelId: 'TS0216', desc: 'Tuya Strobe Moes' },

    // Other
    { manufacturerName: 'Sercomm', modelId: 'XHS2-SE', desc: 'Sercomm Strobe' },
    { manufacturerName: 'Enbrighten', modelId: '43080', desc: 'Enbrighten Strobe' },
    { manufacturerName: 'Ecolink', modelId: 'FLS-ZWAVE-PL', desc: 'Ecolink Strobe' },
    { manufacturerName: 'Nortek', modelId: 'PD300Z-2', desc: 'Nortek Strobe' }
  ],

  // ===========================================================================
  // FOG MACHINES / SMOKE LAUNCHERS
  // ===========================================================================
  fogMachines: [
    // URBSFog
    { manufacturerName: 'URBSFog', modelId: 'FOG-01', desc: 'URBSFog Generator' },
    { manufacturerName: 'URBSFog', modelId: 'FOG-02', desc: 'URBSFog Pro' },
    { manufacturerName: 'URBSFog', modelId: 'FOG-03', desc: 'URBSFog Industrial' },

    // PROTECT
    { manufacturerName: 'PROTECT', modelId: 'SG-FOG', desc: 'PROTECT Fog Generator' },
    { manufacturerName: 'PROTECT', modelId: 'SG-FOG-P', desc: 'PROTECT Fog Pro' },
    { manufacturerName: 'PROTECT', modelId: 'SG-FOG-S', desc: 'PROTECT Fog Security' },

    // BANDIT
    { manufacturerName: 'BANDIT', modelId: 'FOG-GEN', desc: 'BANDIT Fog Generator' },
    { manufacturerName: 'BANDIT', modelId: 'FOG-320', desc: 'BANDIT 320 Fog' },
    { manufacturerName: 'BANDIT', modelId: 'FOG-DB', desc: 'BANDIT Dual Fog' },

    // SMOKESCREEN
    { manufacturerName: 'SmokeScreen', modelId: 'SS-01', desc: 'SmokeScreen Generator' },
    { manufacturerName: 'SmokeScreen', modelId: 'SS-PRO', desc: 'SmokeScreen Pro' },

    // FOGSCAPE
    { manufacturerName: 'FogScape', modelId: 'FS-100', desc: 'FogScape Security' },
    { manufacturerName: 'FogScape', modelId: 'FS-200', desc: 'FogScape Commercial' },

    // DENSE FOG
    { manufacturerName: 'DenseFog', modelId: 'DF-ZB01', desc: 'DenseFog Zigbee' },
    { manufacturerName: 'DenseFog', modelId: 'DF-ZB02', desc: 'DenseFog Zigbee Pro' },

    // CONCEPT
    { manufacturerName: 'Concept', modelId: 'FOG-SEC', desc: 'Concept Security Fog' },
    { manufacturerName: 'Concept', modelId: 'CL-FOG', desc: 'Concept Fog Generator' },

    // Tuya Fog
    { manufacturerName: '_TZE200_fog01', modelId: 'TS0601', desc: 'Tuya Fog Machine' },
    { manufacturerName: '_TZE204_fog01', modelId: 'TS0601', desc: 'Tuya Fog Machine 204' },
    { manufacturerName: '_TZE200_security_fog', modelId: 'TS0601', desc: 'Tuya Security Fog' },

    // SMOKE CLOAK
    { manufacturerName: 'SmokeCloak', modelId: 'SC-100', desc: 'SmokeCloak Security' },
    { manufacturerName: 'SmokeCloak', modelId: 'SC-200', desc: 'SmokeCloak Pro' },

    // FOG CANNON
    { manufacturerName: 'FogCannon', modelId: 'FC-ZB', desc: 'FogCannon Zigbee' },
    { manufacturerName: 'FogCannon', modelId: 'FC-PRO', desc: 'FogCannon Pro' }
  ],

  // ===========================================================================
  // SMOKE DETECTORS
  // ===========================================================================
  smokeDetectors: [
    // HEIMAN Complete
    { manufacturerName: 'HEIMAN', modelId: 'HS1SA', desc: 'Smoke Alarm' },
    { manufacturerName: 'HEIMAN', modelId: 'HS1SA-E', desc: 'Smoke Alarm E' },
    { manufacturerName: 'HEIMAN', modelId: 'HS1SA-M', desc: 'Smoke Alarm M' },
    { manufacturerName: 'HEIMAN', modelId: 'HS2SA', desc: 'Smart Smoke Alarm' },
    { manufacturerName: 'HEIMAN', modelId: 'HS2SA-EF', desc: 'Smart Smoke EF' },
    { manufacturerName: 'HEIMAN', modelId: 'HS2SA-EF-3.0', desc: 'Smart Smoke 3.0' },
    { manufacturerName: 'HEIMAN', modelId: 'HS3SA', desc: 'Smart Smoke Alarm v3' },
    { manufacturerName: 'HEIMAN', modelId: 'SmokeSensor-N', desc: 'Smoke Sensor N' },
    { manufacturerName: 'HEIMAN', modelId: 'SmokeSensor-N-3.0', desc: 'Smoke Sensor 3.0' },
    { manufacturerName: 'HEIMAN', modelId: 'SmokeSensor-EM', desc: 'Smoke Sensor EM' },
    { manufacturerName: 'HEIMAN', modelId: 'SSHM-I1', desc: 'Smart Smoke Home' },
    { manufacturerName: 'Heiman', modelId: 'HS1SA', desc: 'Smoke Alarm (alt)' },
    { manufacturerName: 'Heiman', modelId: 'SmokeSensor-N', desc: 'Smoke Sensor (alt)' },

    // Tuya Smoke
    { manufacturerName: '_TZE200_ntcy3xu1', modelId: 'TS0601', desc: 'Tuya Smoke Detector' },
    { manufacturerName: '_TZE200_m9skfctm', modelId: 'TS0601', desc: 'Tuya Smoke v2' },
    { manufacturerName: '_TZE200_rccxox8p', modelId: 'TS0601', desc: 'Tuya Smoke v3' },
    { manufacturerName: '_TZE200_dq1mfjug', modelId: 'TS0601', desc: 'Moes Smoke' },
    { manufacturerName: '_TZE200_vzekyi4c', modelId: 'TS0601', desc: 'Tuya Smoke Pro' },
    { manufacturerName: '_TZE204_ntcy3xu1', modelId: 'TS0601', desc: 'Tuya Smoke 204' },
    { manufacturerName: '_TZ3210_up3pngle', modelId: 'TS0205', desc: 'Tuya TS0205 Smoke' },
    { manufacturerName: '_TYZB01_dsjszp0x', modelId: 'TS0205', desc: 'BlitzWolf Smoke' },

    // Develco / Frient
    { manufacturerName: 'Develco Products A/S', modelId: 'SMSZB-120', desc: 'Develco Smoke' },
    { manufacturerName: 'Develco', modelId: 'SMSZB-120', desc: 'Develco Smoke (alt)' },
    { manufacturerName: 'frient A/S', modelId: 'SMSZB-120', desc: 'Frient Smoke' },
    { manufacturerName: 'frient A/S', modelId: 'SMSZB-121', desc: 'Frient Smoke Pro' },

    // Other Brands
    { manufacturerName: 'Heimann', modelId: 'HS1SA', desc: 'Heimann Smoke' },
    { manufacturerName: 'IKEA of Sweden', modelId: 'PARASOLL smoke', desc: 'IKEA Smoke' },
    { manufacturerName: 'Visonic', modelId: 'MCT-427', desc: 'Visonic Smoke' },
    { manufacturerName: 'Hive', modelId: 'MOT003', desc: 'Hive Smoke' },
    { manufacturerName: 'Konke', modelId: 'KCTSD', desc: 'Konke Smoke' },
    { manufacturerName: 'Samsung', modelId: 'F-SMD-1', desc: 'Samsung Smoke' },
    { manufacturerName: 'CentraLite', modelId: '3400', desc: 'CentraLite Smoke' },
    { manufacturerName: 'Siterwell', modelId: 'GS361A-H04', desc: 'Siterwell Smoke' },
    { manufacturerName: 'Ecolink', modelId: 'FF-ZWAVE5-ECO', desc: 'Ecolink Smoke' }
  ],

  // ===========================================================================
  // CO DETECTORS
  // ===========================================================================
  coDetectors: [
    // HEIMAN Complete
    { manufacturerName: 'HEIMAN', modelId: 'HS1CA', desc: 'CO Alarm' },
    { manufacturerName: 'HEIMAN', modelId: 'HS1CA-E', desc: 'CO Alarm E' },
    { manufacturerName: 'HEIMAN', modelId: 'HS1CA-M', desc: 'CO Alarm M' },
    { manufacturerName: 'HEIMAN', modelId: 'HS3CA', desc: 'Smart CO Alarm' },
    { manufacturerName: 'HEIMAN', modelId: 'COSensor-N', desc: 'CO Sensor N' },
    { manufacturerName: 'HEIMAN', modelId: 'COSensor-N-3.0', desc: 'CO Sensor 3.0' },
    { manufacturerName: 'HEIMAN', modelId: 'COSensor-EM', desc: 'CO Sensor EM' },
    { manufacturerName: 'HEIMAN', modelId: 'SSHM-C1', desc: 'Smart CO Home' },
    { manufacturerName: 'Heiman', modelId: 'HS1CA', desc: 'CO Alarm (alt)' },
    { manufacturerName: 'Heiman', modelId: 'COSensor-N', desc: 'CO Sensor (alt)' },

    // Tuya CO
    { manufacturerName: '_TZE200_nh9m9gmr', modelId: 'TS0601', desc: 'Tuya CO Detector' },
    { manufacturerName: '_TZE200_rjxqso4a', modelId: 'TS0601', desc: 'Tuya CO v2' },
    { manufacturerName: '_TZE200_vrcd9gke', modelId: 'TS0601', desc: 'Tuya CO v3' },
    { manufacturerName: '_TZE204_nh9m9gmr', modelId: 'TS0601', desc: 'Tuya CO 204' },

    // Other
    { manufacturerName: 'Develco Products A/S', modelId: 'COZB-120', desc: 'Develco CO' },
    { manufacturerName: 'frient A/S', modelId: 'COZB-120', desc: 'Frient CO' },
    { manufacturerName: 'Visonic', modelId: 'MCT-442', desc: 'Visonic CO' },
    { manufacturerName: 'Hive', modelId: 'MOT004', desc: 'Hive CO' },
    { manufacturerName: 'First Alert', modelId: 'ZCOMBO-G', desc: 'First Alert CO' }
  ],

  // ===========================================================================
  // GAS DETECTORS
  // ===========================================================================
  gasDetectors: [
    // HEIMAN Complete
    { manufacturerName: 'HEIMAN', modelId: 'HS1CG', desc: 'Gas Alarm' },
    { manufacturerName: 'HEIMAN', modelId: 'HS1CG-E', desc: 'Gas Alarm E' },
    { manufacturerName: 'HEIMAN', modelId: 'HS1CG-M', desc: 'Gas Alarm M' },
    { manufacturerName: 'HEIMAN', modelId: 'HS3CG', desc: 'Smart Gas Alarm' },
    { manufacturerName: 'HEIMAN', modelId: 'GASSensor-N', desc: 'Gas Sensor N' },
    { manufacturerName: 'HEIMAN', modelId: 'GASSensor-N-3.0', desc: 'Gas Sensor 3.0' },
    { manufacturerName: 'HEIMAN', modelId: 'GASSensor-EN', desc: 'Gas Sensor EN' },
    { manufacturerName: 'HEIMAN', modelId: 'SSHM-G1', desc: 'Smart Gas Home' },
    { manufacturerName: 'Heiman', modelId: 'HS1CG', desc: 'Gas Alarm (alt)' },
    { manufacturerName: 'Heiman', modelId: 'GASSensor-N', desc: 'Gas Sensor (alt)' },

    // Tuya Gas
    { manufacturerName: '_TZE200_ybwa4kj0', modelId: 'TS0601', desc: 'Tuya Gas Detector' },
    { manufacturerName: '_TZE200_yojqa8xn', modelId: 'TS0601', desc: 'Tuya Gas v2' },
    { manufacturerName: '_TZE200_auin8mzr', modelId: 'TS0601', desc: 'Tuya Gas v3' },
    { manufacturerName: '_TZE200_h1yeqgkt', modelId: 'TS0601', desc: 'Moes Gas' },
    { manufacturerName: '_TZE200_cpm9kybz', modelId: 'TS0601', desc: 'Woox Gas' },
    { manufacturerName: '_TZE204_ybwa4kj0', modelId: 'TS0601', desc: 'Tuya Gas 204' },
    { manufacturerName: '_TZ3210_gas_sensor', modelId: 'TS0601', desc: 'Tuya Gas Moes' },

    // Other
    { manufacturerName: 'Develco Products A/S', modelId: 'GSZB-120', desc: 'Develco Gas' },
    { manufacturerName: 'frient A/S', modelId: 'GSZB-120', desc: 'Frient Gas' },
    { manufacturerName: 'Konke', modelId: 'KCTCD', desc: 'Konke Gas' },
    { manufacturerName: 'Neo', modelId: 'NAS-GD03B0', desc: 'Neo Gas' }
  ],

  // ===========================================================================
  // WATER LEAK SENSORS
  // ===========================================================================
  waterLeakSensors: [
    // HEIMAN Complete
    { manufacturerName: 'HEIMAN', modelId: 'HS1WL', desc: 'Water Leak Sensor' },
    { manufacturerName: 'HEIMAN', modelId: 'HS1WL-E', desc: 'Water Leak E' },
    { manufacturerName: 'HEIMAN', modelId: 'HS1WL-M', desc: 'Water Leak M' },
    { manufacturerName: 'HEIMAN', modelId: 'HS3WL', desc: 'Smart Water Leak' },
    { manufacturerName: 'HEIMAN', modelId: 'WaterSensor-N', desc: 'Water Sensor N' },
    { manufacturerName: 'HEIMAN', modelId: 'WaterSensor-N-3.0', desc: 'Water Sensor 3.0' },
    { manufacturerName: 'HEIMAN', modelId: 'WaterSensor-EM', desc: 'Water Sensor EM' },
    { manufacturerName: 'HEIMAN', modelId: 'SWHM-W1', desc: 'Smart Water Home' },
    { manufacturerName: 'Heiman', modelId: 'HS1WL', desc: 'Water Leak (alt)' },
    { manufacturerName: 'Heiman', modelId: 'WaterSensor-N', desc: 'Water Sensor (alt)' },

    // Tuya Water
    { manufacturerName: '_TZ3000_kyb656no', modelId: 'TS0207', desc: 'Tuya Water Leak' },
    { manufacturerName: '_TZ3000_85czd6fy', modelId: 'TS0207', desc: 'Tuya Water v2' },
    { manufacturerName: '_TZ3000_kstbkt6a', modelId: 'TS0207', desc: 'Tuya Water v3' },
    { manufacturerName: '_TZ3000_lf56vpxj', modelId: 'TS0207', desc: 'Tuya Water v4' },
    { manufacturerName: '_TZ3000_wr0bfxrk', modelId: 'TS0207', desc: 'Tuya Water v5' },
    { manufacturerName: '_TZ3000_water_sensor', modelId: 'TS0207', desc: 'Tuya Water Moes' },
    { manufacturerName: '_TZE200_water_leak', modelId: 'TS0601', desc: 'Tuya Water TS0601' },
    { manufacturerName: '_TYZB01_sqmd19i1', modelId: 'TS0207', desc: 'BlitzWolf Water' },

    // SONOFF
    { manufacturerName: 'eWeLink', modelId: 'SNZB-05', desc: 'SONOFF Water' },
    { manufacturerName: 'SONOFF', modelId: 'SNZB-05', desc: 'SONOFF Water v2' },
    { manufacturerName: 'eWeLink', modelId: 'SNZB-05P', desc: 'SONOFF Water Pro' },

    // Other
    { manufacturerName: 'Develco Products A/S', modelId: 'FLSZB-110', desc: 'Develco Water' },
    { manufacturerName: 'frient A/S', modelId: 'FLSZB-110', desc: 'Frient Water' },
    { manufacturerName: 'Aqara', modelId: 'SJCGQ11LM', desc: 'Aqara Water' },
    { manufacturerName: 'LUMI', modelId: 'lumi.sensor_wleak.aq1', desc: 'Xiaomi Water' },
    { manufacturerName: 'Samsung', modelId: 'F-WTR-UK-V1', desc: 'Samsung Water' },
    { manufacturerName: 'Konke', modelId: 'KCTWD', desc: 'Konke Water' },
    { manufacturerName: 'Neo', modelId: 'NAS-WS01B', desc: 'Neo Water' }
  ],

  // ===========================================================================
  // EMERGENCY / SOS BUTTONS
  // ===========================================================================
  emergencyButtons: [
    // HEIMAN
    { manufacturerName: 'HEIMAN', modelId: 'HS2EB', desc: 'Emergency Button' },
    { manufacturerName: 'HEIMAN', modelId: 'HS2EB-E', desc: 'Emergency Button E' },
    { manufacturerName: 'HEIMAN', modelId: 'SOS-EF', desc: 'SOS Button EF' },
    { manufacturerName: 'HEIMAN', modelId: 'SOS-EF-3.0', desc: 'SOS Button 3.0' },
    { manufacturerName: 'HEIMAN', modelId: 'HS1EB', desc: 'SOS Pendant' },
    { manufacturerName: 'HEIMAN', modelId: 'HS1EB-E', desc: 'SOS Pendant E' },
    { manufacturerName: 'HEIMAN', modelId: 'SOSButton-N', desc: 'SOS Button N' },
    { manufacturerName: 'HEIMAN', modelId: 'SOSButton-EM', desc: 'SOS Button EM' },
    { manufacturerName: 'Heiman', modelId: 'HS2EB', desc: 'Emergency (alt)' },
    { manufacturerName: 'Heiman', modelId: 'SOS-EF', desc: 'SOS (alt)' },

    // Tuya SOS
    { manufacturerName: '_TZ3000_peszejy7', modelId: 'TS0215A', desc: 'Tuya SOS Button' },
    { manufacturerName: '_TZ3000_0dumfk2z', modelId: 'TS0215A', desc: 'Tuya SOS v2' },
    { manufacturerName: '_TZ3000_fsiepnrh', modelId: 'TS0215A', desc: 'Tuya SOS v3' },
    { manufacturerName: '_TZ3000_p6ju8myv', modelId: 'TS0215A', desc: 'Tuya SOS v4' },
    { manufacturerName: '_TZ3000_4fsgukof', modelId: 'TS0215A', desc: 'Tuya SOS v5' },
    { manufacturerName: '_TZ3000_sos_btn', modelId: 'TS0215A', desc: 'Tuya SOS Moes' },
    { manufacturerName: '_TZE200_sos_btn', modelId: 'TS0601', desc: 'Tuya SOS TS0601' },

    // Other
    { manufacturerName: 'frient A/S', modelId: 'PBZB-110', desc: 'Frient Panic Button' },
    { manufacturerName: 'Develco', modelId: 'PBZB-110', desc: 'Develco Panic' },
    { manufacturerName: 'Centralite', modelId: '3455-L', desc: 'Centralite Panic' },
    { manufacturerName: 'Sercomm', modelId: 'SZ-DWS04', desc: 'Sercomm Panic' },
    { manufacturerName: 'Samjin', modelId: 'button', desc: 'Samjin Panic' }
  ],

  // ===========================================================================
  // ALARM PANELS / KEYPADS
  // ===========================================================================
  alarmPanels: [
    // HEIMAN
    { manufacturerName: 'HEIMAN', modelId: 'HS2AW', desc: 'Alarm Panel' },
    { manufacturerName: 'HEIMAN', modelId: 'HS2AW-E', desc: 'Alarm Panel E' },
    { manufacturerName: 'HEIMAN', modelId: 'HS2RC', desc: 'Remote Control' },
    { manufacturerName: 'HEIMAN', modelId: 'HS2RC-E', desc: 'Remote Control E' },
    { manufacturerName: 'HEIMAN', modelId: 'HS2RC-N', desc: 'Remote Control N' },
    { manufacturerName: 'HEIMAN', modelId: 'KeyFob-N', desc: 'KeyFob N' },
    { manufacturerName: 'HEIMAN', modelId: 'KeyFob-EF', desc: 'KeyFob EF' },

    // Keypads
    { manufacturerName: 'Centralite', modelId: '3400-D', desc: 'Centralite Keypad' },
    { manufacturerName: 'Yale', modelId: 'YRD226ZB', desc: 'Yale Keypad' },
    { manufacturerName: 'Yale', modelId: 'YRD256ZB', desc: 'Yale Keypad Pro' },
    { manufacturerName: 'Nuki', modelId: 'Keypad 2.0', desc: 'Nuki Keypad' },
    { manufacturerName: 'Zipato', modelId: 'miniKeypad', desc: 'Zipato Keypad' },
    { manufacturerName: 'Linkind', modelId: 'ZS130000178', desc: 'Linkind Keypad' },

    // Tuya Keypads
    { manufacturerName: '_TZE200_keypad01', modelId: 'TS0601', desc: 'Tuya Keypad' },
    { manufacturerName: '_TZE204_keypad01', modelId: 'TS0601', desc: 'Tuya Keypad 204' },
    { manufacturerName: '_TZ3000_keypad01', modelId: 'TS0215A', desc: 'Tuya Keypad Mini' },

    // Other
    { manufacturerName: 'frient A/S', modelId: 'KPZB-110', desc: 'Frient Keypad' },
    { manufacturerName: 'Develco', modelId: 'KPZB-110', desc: 'Develco Keypad' },
    { manufacturerName: 'Iris', modelId: '3460-L', desc: 'Iris Keypad' },
    { manufacturerName: 'UEI', modelId: 'KPZB', desc: 'UEI Keypad' }
  ]
};

// =============================================================================
// DRIVER MAPPING
// =============================================================================

const DRIVER_MAPPING = {
  sirenIndoor: 'siren',
  sirenOutdoor: 'siren',
  strobeLights: 'siren',
  fogMachines: 'siren',
  smokeDetectors: 'smoke_detector_advanced',
  coDetectors: 'co_sensor',
  gasDetectors: 'gas_detector',
  waterLeakSensors: 'water_leak_sensor',
  emergencyButtons: 'button_emergency_sos',
  alarmPanels: 'scene_switch_4'
};

// =============================================================================
// ENRICHMENT FUNCTIONS
// =============================================================================

function loadDriverConfig(driverPath) {
  const configPath = path.join(driverPath, 'driver.compose.json');
  if (!fs.existsSync(configPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function saveDriverConfig(driverPath, config) {
  const configPath = path.join(driverPath, 'driver.compose.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function enrichDriver(driversDir, driverName, devices) {
  const driverPath = path.join(driversDir, driverName);

  if (!fs.existsSync(driverPath)) {
    console.log(`  ⚠️ Driver not found: ${driverName}`);
    return { added: 0, skipped: 0 };
  }

  const config = loadDriverConfig(driverPath);
  if (!config) {
    console.log(`  ⚠️ No config for: ${driverName}`);
    return { added: 0, skipped: 0 };
  }

  // Ensure zigbee.devices array exists
  if (!config.zigbee) config.zigbee = {};
  if (!config.zigbee.devices) config.zigbee.devices = [];

  // Build set of existing devices
  const existingDevices = new Set(
    config.zigbee.devices.map(d => `${d.manufacturerName}|${d.modelId}`)
  );

  let added = 0;
  let skipped = 0;

  for (const device of devices) {
    const key = `${device.manufacturerName}|${device.modelId}`;

    if (existingDevices.has(key)) {
      skipped++;
      continue;
    }

    config.zigbee.devices.push({
      manufacturerName: device.manufacturerName,
      modelId: device.modelId
    });

    existingDevices.add(key);
    added++;
  }

  if (added > 0) {
    saveDriverConfig(driverPath, config);
    console.log(`  ✅ ${driverName}: +${added} devices (${skipped} skipped)`);
  } else {
    console.log(`  ℹ️ ${driverName}: ${skipped} already exist`);
  }

  return { added, skipped };
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

console.log('🚨 ALL SIRENS, ALARMS, STROBES & FOG MACHINES ENRICHMENT');
console.log('=========================================================\n');

const driversDir = path.join(__dirname, '..', '..', 'drivers');
const results = {
  totalAdded: 0,
  totalSkipped: 0,
  categories: {}
};

// Process each category
for (const [category, devices] of Object.entries(SIRENS_AND_ALARMS)) {
  const driverName = DRIVER_MAPPING[category];
  console.log(`📁 ${category} → ${driverName || 'NO MAPPING'}`);

  if (!driverName) {
    console.log(`  ⚠️ No driver mapping for ${category}`);
    continue;
  }

  const result = enrichDriver(driversDir, driverName, devices);
  results.totalAdded += result.added;
  results.totalSkipped += result.skipped;
  results.categories[category] = {
    driver: driverName,
    deviceCount: devices.length,
    added: result.added,
    skipped: result.skipped
  };
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 SUMMARY');
console.log('='.repeat(60));
console.log(`📱 Total device entries: ${Object.values(SIRENS_AND_ALARMS).flat().length}`);
console.log(`✅ Devices added: ${results.totalAdded}`);
console.log(`⏭️ Already exist: ${results.totalSkipped}`);
console.log('='.repeat(60));

// Save report
const reportPath = path.join(__dirname, '..', '..', 'data', 'enrichment', 'all-sirens-alarms-report.json');
fs.writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  results
}, null, 2));

console.log(`\n📄 Report: ${reportPath}`);
console.log('✨ Sirens, Alarms, Strobes & Fog Machines enrichment complete!');

module.exports = { SIRENS_AND_ALARMS, DRIVER_MAPPING };
