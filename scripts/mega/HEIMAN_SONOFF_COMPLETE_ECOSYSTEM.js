#!/usr/bin/env node
/**
 * HEIMAN + SONOFF/EWELINK COMPLETE ECOSYSTEM ENRICHMENT
 *
 * Comprehensive integration for:
 * - ALL Heiman Zigbee security devices
 * - ALL Sonoff/eWeLink Zigbee devices
 * - NSPanel Pro gateway support
 * - iHost/eWeLink Cube compatibility
 *
 * Based on:
 * - Zigbee2MQTT supported devices
 * - SONOFF Zigbee Homey app patterns
 * - Heiman official product catalog
 * - eWeLink Cube documentation
 *
 * @author Dylan Rajasekaram
 * @version 5.3.41
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// HEIMAN COMPLETE ZIGBEE CATALOG
// =============================================================================

const HEIMAN_DEVICES = {
  // ===========================================================================
  // SMOKE DETECTORS
  // ===========================================================================
  smokeDetectors: [
    // HS1SA Series - Smoke Alarm
    { manufacturerName: 'HEIMAN', modelId: 'HS1SA', desc: 'Smoke Alarm Basic' },
    { manufacturerName: 'HEIMAN', modelId: 'HS1SA-E', desc: 'Smoke Alarm Europe' },
    { manufacturerName: 'HEIMAN', modelId: 'HS1SA-M', desc: 'Smoke Alarm Mini' },
    { manufacturerName: 'HEIMAN', modelId: 'HS1SA-N', desc: 'Smoke Alarm New' },
    { manufacturerName: 'Heiman', modelId: 'HS1SA', desc: 'Smoke Alarm (alt)' },
    { manufacturerName: 'Heiman', modelId: 'HS1SA-E', desc: 'Smoke Alarm E (alt)' },

    // HS2SA Series - Smart Smoke Alarm
    { manufacturerName: 'HEIMAN', modelId: 'HS2SA', desc: 'Smart Smoke Alarm' },
    { manufacturerName: 'HEIMAN', modelId: 'HS2SA-E', desc: 'Smart Smoke Europe' },
    { manufacturerName: 'HEIMAN', modelId: 'HS2SA-EF', desc: 'Smart Smoke EF' },
    { manufacturerName: 'HEIMAN', modelId: 'HS2SA-EF-3.0', desc: 'Smart Smoke 3.0' },

    // HS3SA Series - Premium Smoke
    { manufacturerName: 'HEIMAN', modelId: 'HS3SA', desc: 'Premium Smoke Alarm' },
    { manufacturerName: 'HEIMAN', modelId: 'HS3SA-E', desc: 'Premium Smoke Europe' },

    // SmokeSensor Series
    { manufacturerName: 'HEIMAN', modelId: 'SmokeSensor-N', desc: 'Smoke Sensor N' },
    { manufacturerName: 'HEIMAN', modelId: 'SmokeSensor-N-3.0', desc: 'Smoke Sensor 3.0' },
    { manufacturerName: 'HEIMAN', modelId: 'SmokeSensor-EM', desc: 'Smoke Sensor EM' },
    { manufacturerName: 'HEIMAN', modelId: 'SmokeSensor-EF-3.0', desc: 'Smoke Sensor EF' },
    { manufacturerName: 'HEIMAN', modelId: 'SSHM-I1', desc: 'Smart Smoke Home I1' },

    // Alternate casings
    { manufacturerName: 'Heiman', modelId: 'SmokeSensor-N', desc: 'Smoke Sensor (alt)' },
    { manufacturerName: 'Heiman', modelId: 'SmokeSensor-EM', desc: 'Smoke EM (alt)' },
    { manufacturerName: 'Heimann', modelId: 'HS1SA', desc: 'Heimann Smoke' }
  ],

  // ===========================================================================
  // CO DETECTORS
  // ===========================================================================
  coDetectors: [
    // HS1CA Series
    { manufacturerName: 'HEIMAN', modelId: 'HS1CA', desc: 'CO Alarm Basic' },
    { manufacturerName: 'HEIMAN', modelId: 'HS1CA-E', desc: 'CO Alarm Europe' },
    { manufacturerName: 'HEIMAN', modelId: 'HS1CA-M', desc: 'CO Alarm Mini' },
    { manufacturerName: 'HEIMAN', modelId: 'HS1CA-N', desc: 'CO Alarm New' },
    { manufacturerName: 'Heiman', modelId: 'HS1CA', desc: 'CO Alarm (alt)' },
    { manufacturerName: 'Heiman', modelId: 'HS1CA-E', desc: 'CO Alarm E (alt)' },

    // HS3CA Series
    { manufacturerName: 'HEIMAN', modelId: 'HS3CA', desc: 'Smart CO Alarm' },
    { manufacturerName: 'HEIMAN', modelId: 'HS3CA-E', desc: 'Smart CO Europe' },

    // COSensor Series
    { manufacturerName: 'HEIMAN', modelId: 'COSensor-N', desc: 'CO Sensor N' },
    { manufacturerName: 'HEIMAN', modelId: 'COSensor-N-3.0', desc: 'CO Sensor 3.0' },
    { manufacturerName: 'HEIMAN', modelId: 'COSensor-EM', desc: 'CO Sensor EM' },
    { manufacturerName: 'HEIMAN', modelId: 'COSensor-EF-3.0', desc: 'CO Sensor EF' },
    { manufacturerName: 'HEIMAN', modelId: 'SSHM-C1', desc: 'Smart CO Home C1' },

    { manufacturerName: 'Heiman', modelId: 'COSensor-N', desc: 'CO Sensor (alt)' }
  ],

  // ===========================================================================
  // GAS DETECTORS
  // ===========================================================================
  gasDetectors: [
    // HS1CG Series
    { manufacturerName: 'HEIMAN', modelId: 'HS1CG', desc: 'Gas Alarm Basic' },
    { manufacturerName: 'HEIMAN', modelId: 'HS1CG-E', desc: 'Gas Alarm Europe' },
    { manufacturerName: 'HEIMAN', modelId: 'HS1CG-M', desc: 'Gas Alarm Mini' },
    { manufacturerName: 'HEIMAN', modelId: 'HS1CG-N', desc: 'Gas Alarm New' },
    { manufacturerName: 'Heiman', modelId: 'HS1CG', desc: 'Gas Alarm (alt)' },
    { manufacturerName: 'Heiman', modelId: 'HS1CG-E', desc: 'Gas Alarm E (alt)' },

    // HS3CG Series
    { manufacturerName: 'HEIMAN', modelId: 'HS3CG', desc: 'Smart Gas Alarm' },
    { manufacturerName: 'HEIMAN', modelId: 'HS3CG-E', desc: 'Smart Gas Europe' },

    // GASSensor Series
    { manufacturerName: 'HEIMAN', modelId: 'GASSensor-N', desc: 'Gas Sensor N' },
    { manufacturerName: 'HEIMAN', modelId: 'GASSensor-N-3.0', desc: 'Gas Sensor 3.0' },
    { manufacturerName: 'HEIMAN', modelId: 'GASSensor-EM', desc: 'Gas Sensor EM' },
    { manufacturerName: 'HEIMAN', modelId: 'GASSensor-EN', desc: 'Gas Sensor EN' },
    { manufacturerName: 'HEIMAN', modelId: 'SSHM-G1', desc: 'Smart Gas Home G1' },

    { manufacturerName: 'Heiman', modelId: 'GASSensor-N', desc: 'Gas Sensor (alt)' }
  ],

  // ===========================================================================
  // WATER LEAK SENSORS
  // ===========================================================================
  waterLeakSensors: [
    // HS1WL Series
    { manufacturerName: 'HEIMAN', modelId: 'HS1WL', desc: 'Water Leak Basic' },
    { manufacturerName: 'HEIMAN', modelId: 'HS1WL-E', desc: 'Water Leak Europe' },
    { manufacturerName: 'HEIMAN', modelId: 'HS1WL-M', desc: 'Water Leak Mini' },
    { manufacturerName: 'HEIMAN', modelId: 'HS1WL-N', desc: 'Water Leak New' },
    { manufacturerName: 'Heiman', modelId: 'HS1WL', desc: 'Water Leak (alt)' },

    // HS3WL Series
    { manufacturerName: 'HEIMAN', modelId: 'HS3WL', desc: 'Smart Water Leak' },
    { manufacturerName: 'HEIMAN', modelId: 'HS3WL-E', desc: 'Smart Water Europe' },

    // WaterSensor Series
    { manufacturerName: 'HEIMAN', modelId: 'WaterSensor-N', desc: 'Water Sensor N' },
    { manufacturerName: 'HEIMAN', modelId: 'WaterSensor-N-3.0', desc: 'Water Sensor 3.0' },
    { manufacturerName: 'HEIMAN', modelId: 'WaterSensor-EM', desc: 'Water Sensor EM' },
    { manufacturerName: 'HEIMAN', modelId: 'SWHM-W1', desc: 'Smart Water Home W1' },

    { manufacturerName: 'Heiman', modelId: 'WaterSensor-N', desc: 'Water Sensor (alt)' }
  ],

  // ===========================================================================
  // SIRENS & STROBES
  // ===========================================================================
  sirens: [
    // HS2WD Series - Warning Device
    { manufacturerName: 'HEIMAN', modelId: 'HS2WD', desc: 'Siren Basic' },
    { manufacturerName: 'HEIMAN', modelId: 'HS2WD-E', desc: 'Siren Europe' },
    { manufacturerName: 'HEIMAN', modelId: 'HS2WD-E-3.0', desc: 'Siren 3.0' },
    { manufacturerName: 'HEIMAN', modelId: 'HS2WD-O', desc: 'Siren Outdoor' },
    { manufacturerName: 'Heiman', modelId: 'HS2WD-E', desc: 'Siren (alt)' },

    // WarningDevice Series
    { manufacturerName: 'HEIMAN', modelId: 'WarningDevice', desc: 'Warning Device' },
    { manufacturerName: 'HEIMAN', modelId: 'WarningDevice-EF', desc: 'Warning Device EF' },
    { manufacturerName: 'HEIMAN', modelId: 'WarningDevice-EF-3.0', desc: 'Warning Device 3.0' },
    { manufacturerName: 'Heiman', modelId: 'WarningDevice', desc: 'Warning (alt)' },

    // SRHMP Series
    { manufacturerName: 'HEIMAN', modelId: 'SRHMP-I1', desc: 'Smart Siren Indoor' },
    { manufacturerName: 'HEIMAN', modelId: 'SRHMP-O1', desc: 'Smart Siren Outdoor' },
    { manufacturerName: 'HEIMAN', modelId: 'SWHM-I1', desc: 'Smart Warning I1' }
  ],

  // ===========================================================================
  // DOOR/WINDOW SENSORS
  // ===========================================================================
  contactSensors: [
    // HS1DS Series
    { manufacturerName: 'HEIMAN', modelId: 'HS1DS', desc: 'Door Sensor Basic' },
    { manufacturerName: 'HEIMAN', modelId: 'HS1DS-E', desc: 'Door Sensor Europe' },
    { manufacturerName: 'HEIMAN', modelId: 'HS1DS-M', desc: 'Door Sensor Mini' },
    { manufacturerName: 'Heiman', modelId: 'HS1DS', desc: 'Door Sensor (alt)' },

    // HS3DS Series
    { manufacturerName: 'HEIMAN', modelId: 'HS3DS', desc: 'Smart Door Sensor' },
    { manufacturerName: 'HEIMAN', modelId: 'HS3DS-E', desc: 'Smart Door Europe' },

    // DoorSensor Series
    { manufacturerName: 'HEIMAN', modelId: 'DoorSensor-N', desc: 'Door Sensor N' },
    { manufacturerName: 'HEIMAN', modelId: 'DoorSensor-N-3.0', desc: 'Door Sensor 3.0' },
    { manufacturerName: 'HEIMAN', modelId: 'DoorSensor-EM', desc: 'Door Sensor EM' },
    { manufacturerName: 'HEIMAN', modelId: 'SWHM-D1', desc: 'Smart Door Home D1' },

    { manufacturerName: 'Heiman', modelId: 'DoorSensor-N', desc: 'Door Sensor (alt)' }
  ],

  // ===========================================================================
  // MOTION SENSORS
  // ===========================================================================
  motionSensors: [
    // HS1MS Series
    { manufacturerName: 'HEIMAN', modelId: 'HS1MS', desc: 'Motion Sensor Basic' },
    { manufacturerName: 'HEIMAN', modelId: 'HS1MS-E', desc: 'Motion Sensor Europe' },
    { manufacturerName: 'HEIMAN', modelId: 'HS1MS-M', desc: 'Motion Sensor Mini' },
    { manufacturerName: 'Heiman', modelId: 'HS1MS', desc: 'Motion Sensor (alt)' },

    // HS3MS Series
    { manufacturerName: 'HEIMAN', modelId: 'HS3MS', desc: 'Smart Motion Sensor' },
    { manufacturerName: 'HEIMAN', modelId: 'HS3MS-E', desc: 'Smart Motion Europe' },

    // PIRSensor Series
    { manufacturerName: 'HEIMAN', modelId: 'PIRSensor-N', desc: 'PIR Sensor N' },
    { manufacturerName: 'HEIMAN', modelId: 'PIRSensor-N-3.0', desc: 'PIR Sensor 3.0' },
    { manufacturerName: 'HEIMAN', modelId: 'PIRSensor-EM', desc: 'PIR Sensor EM' },
    { manufacturerName: 'HEIMAN', modelId: 'SWHM-M1', desc: 'Smart Motion Home M1' },

    { manufacturerName: 'Heiman', modelId: 'PIRSensor-N', desc: 'PIR Sensor (alt)' }
  ],

  // ===========================================================================
  // TEMPERATURE & HUMIDITY
  // ===========================================================================
  climateSensors: [
    // HS1HT Series
    { manufacturerName: 'HEIMAN', modelId: 'HS1HT', desc: 'Temp/Humidity Basic' },
    { manufacturerName: 'HEIMAN', modelId: 'HS1HT-E', desc: 'Temp/Humidity Europe' },
    { manufacturerName: 'HEIMAN', modelId: 'HS1HT-N', desc: 'Temp/Humidity New' },
    { manufacturerName: 'Heiman', modelId: 'HS1HT', desc: 'Temp/Humidity (alt)' },

    // HS3HT Series
    { manufacturerName: 'HEIMAN', modelId: 'HS3HT', desc: 'Smart Temp/Humidity' },
    { manufacturerName: 'HEIMAN', modelId: 'HS3HT-E', desc: 'Smart Temp/Hum Europe' },

    // TempHumiditySensor Series
    { manufacturerName: 'HEIMAN', modelId: 'TempHumiditySensor-N', desc: 'TH Sensor N' },
    { manufacturerName: 'HEIMAN', modelId: 'TempHumiditySensor-N-3.0', desc: 'TH Sensor 3.0' },
    { manufacturerName: 'HEIMAN', modelId: 'TempHumiditySensor-EM', desc: 'TH Sensor EM' },
    { manufacturerName: 'HEIMAN', modelId: 'SWHM-TH1', desc: 'Smart TH Home' },

    { manufacturerName: 'Heiman', modelId: 'TempHumiditySensor-N', desc: 'TH Sensor (alt)' }
  ],

  // ===========================================================================
  // EMERGENCY BUTTONS
  // ===========================================================================
  emergencyButtons: [
    // HS2EB Series
    { manufacturerName: 'HEIMAN', modelId: 'HS2EB', desc: 'Emergency Button' },
    { manufacturerName: 'HEIMAN', modelId: 'HS2EB-E', desc: 'Emergency Button Europe' },
    { manufacturerName: 'HEIMAN', modelId: 'HS2EB-3.0', desc: 'Emergency Button 3.0' },
    { manufacturerName: 'Heiman', modelId: 'HS2EB', desc: 'Emergency (alt)' },

    // HS1EB Series - SOS Pendant
    { manufacturerName: 'HEIMAN', modelId: 'HS1EB', desc: 'SOS Pendant' },
    { manufacturerName: 'HEIMAN', modelId: 'HS1EB-E', desc: 'SOS Pendant Europe' },

    // SOS-EF Series
    { manufacturerName: 'HEIMAN', modelId: 'SOS-EF', desc: 'SOS Button EF' },
    { manufacturerName: 'HEIMAN', modelId: 'SOS-EF-3.0', desc: 'SOS Button 3.0' },
    { manufacturerName: 'Heiman', modelId: 'SOS-EF', desc: 'SOS Button (alt)' },

    // SOSButton Series
    { manufacturerName: 'HEIMAN', modelId: 'SOSButton-N', desc: 'SOS Button N' },
    { manufacturerName: 'HEIMAN', modelId: 'SOSButton-EM', desc: 'SOS Button EM' }
  ],

  // ===========================================================================
  // REMOTE CONTROLS & KEYPADS
  // ===========================================================================
  remoteControls: [
    // HS2RC Series
    { manufacturerName: 'HEIMAN', modelId: 'HS2RC', desc: 'Remote Control' },
    { manufacturerName: 'HEIMAN', modelId: 'HS2RC-E', desc: 'Remote Control Europe' },
    { manufacturerName: 'HEIMAN', modelId: 'HS2RC-N', desc: 'Remote Control New' },
    { manufacturerName: 'Heiman', modelId: 'HS2RC', desc: 'Remote Control (alt)' },

    // KeyFob Series
    { manufacturerName: 'HEIMAN', modelId: 'KeyFob-N', desc: 'KeyFob N' },
    { manufacturerName: 'HEIMAN', modelId: 'KeyFob-EF', desc: 'KeyFob EF' },
    { manufacturerName: 'HEIMAN', modelId: 'KeyFob-EF-3.0', desc: 'KeyFob 3.0' },

    // HS2AW Alarm Panel
    { manufacturerName: 'HEIMAN', modelId: 'HS2AW', desc: 'Alarm Panel' },
    { manufacturerName: 'HEIMAN', modelId: 'HS2AW-E', desc: 'Alarm Panel Europe' }
  ],

  // ===========================================================================
  // AIR QUALITY
  // ===========================================================================
  airQuality: [
    { manufacturerName: 'HEIMAN', modelId: 'HS3AQ', desc: 'Air Quality Monitor' },
    { manufacturerName: 'HEIMAN', modelId: 'HS3AQ-E', desc: 'Air Quality Europe' },
    { manufacturerName: 'HEIMAN', modelId: 'AQSensor-N', desc: 'AQ Sensor N' },
    { manufacturerName: 'HEIMAN', modelId: 'AQSensor-EM', desc: 'AQ Sensor EM' },
    { manufacturerName: 'Heiman', modelId: 'HS3AQ', desc: 'Air Quality (alt)' }
  ],

  // ===========================================================================
  // SMART PLUGS
  // ===========================================================================
  smartPlugs: [
    { manufacturerName: 'HEIMAN', modelId: 'HS2SK', desc: 'Smart Plug' },
    { manufacturerName: 'HEIMAN', modelId: 'HS2SK-E', desc: 'Smart Plug Europe' },
    { manufacturerName: 'HEIMAN', modelId: 'HS2SK-N', desc: 'Smart Plug New' },
    { manufacturerName: 'HEIMAN', modelId: 'SmartPlug-N', desc: 'SmartPlug N' },
    { manufacturerName: 'HEIMAN', modelId: 'SmartPlug-EM', desc: 'SmartPlug EM' },
    { manufacturerName: 'Heiman', modelId: 'HS2SK', desc: 'Smart Plug (alt)' }
  ],

  // ===========================================================================
  // DOORBELLS
  // ===========================================================================
  doorbells: [
    { manufacturerName: 'HEIMAN', modelId: 'HS2DB', desc: 'Smart Doorbell' },
    { manufacturerName: 'HEIMAN', modelId: 'HS2DB-E', desc: 'Smart Doorbell Europe' },
    { manufacturerName: 'HEIMAN', modelId: 'DoorBell-N', desc: 'Doorbell N' },
    { manufacturerName: 'HEIMAN', modelId: 'DoorBell-EM', desc: 'Doorbell EM' },
    { manufacturerName: 'Heiman', modelId: 'HS2DB', desc: 'Smart Doorbell (alt)' }
  ],

  // ===========================================================================
  // GATEWAYS
  // ===========================================================================
  gateways: [
    { manufacturerName: 'HEIMAN', modelId: 'HS1GW', desc: 'Gateway Basic' },
    { manufacturerName: 'HEIMAN', modelId: 'HS1GW-E', desc: 'Gateway Europe' },
    { manufacturerName: 'HEIMAN', modelId: 'HS1GW-N', desc: 'Gateway New' },
    { manufacturerName: 'HEIMAN', modelId: 'HS2GW', desc: 'Smart Gateway' },
    { manufacturerName: 'HEIMAN', modelId: 'HS2GW-E', desc: 'Smart Gateway Europe' },
    { manufacturerName: 'HEIMAN', modelId: 'Gateway-N', desc: 'Gateway N' },
    { manufacturerName: 'Heiman', modelId: 'HS1GW', desc: 'Gateway (alt)' }
  ]
};

// =============================================================================
// SONOFF/EWELINK COMPLETE ZIGBEE CATALOG
// =============================================================================

const SONOFF_EWELINK_DEVICES = {
  // ===========================================================================
  // SENSORS - SNZB SERIES
  // ===========================================================================
  buttons: [
    // SNZB-01 Wireless Button
    { manufacturerName: 'eWeLink', modelId: 'SNZB-01', desc: 'Wireless Button' },
    { manufacturerName: 'eWeLink', modelId: 'SNZB-01P', desc: 'Wireless Button Pro' },
    { manufacturerName: 'SONOFF', modelId: 'SNZB-01', desc: 'Wireless Button' },
    { manufacturerName: 'SONOFF', modelId: 'SNZB-01P', desc: 'Wireless Button Pro' },
    { manufacturerName: 'eWeLink', modelId: 'WB01', desc: 'Wireless Button WB01' },
    { manufacturerName: 'eWeLink', modelId: 'WB-01', desc: 'Wireless Button WB-01' }
  ],

  tempHumidity: [
    // SNZB-02 Temperature & Humidity
    { manufacturerName: 'eWeLink', modelId: 'SNZB-02', desc: 'Temp & Humidity' },
    { manufacturerName: 'eWeLink', modelId: 'SNZB-02D', desc: 'Temp & Humidity LCD' },
    { manufacturerName: 'eWeLink', modelId: 'SNZB-02P', desc: 'Temp & Humidity Pro' },
    { manufacturerName: 'eWeLink', modelId: 'SNZB-02WD', desc: 'Temp & Humidity Waterproof' },
    { manufacturerName: 'eWeLink', modelId: 'SNZB-02LD', desc: 'Temp & Humidity w/Probe' },
    { manufacturerName: 'SONOFF', modelId: 'SNZB-02', desc: 'Temp & Humidity' },
    { manufacturerName: 'SONOFF', modelId: 'SNZB-02D', desc: 'Temp & Humidity LCD' },
    { manufacturerName: 'SONOFF', modelId: 'SNZB-02P', desc: 'Temp & Humidity Pro' },
    { manufacturerName: 'eWeLink', modelId: 'TH01', desc: 'Temp & Humidity TH01' }
  ],

  motion: [
    // SNZB-03 Motion Sensor
    { manufacturerName: 'eWeLink', modelId: 'SNZB-03', desc: 'Motion Sensor PIR' },
    { manufacturerName: 'eWeLink', modelId: 'SNZB-03P', desc: 'Motion Sensor Pro' },
    { manufacturerName: 'SONOFF', modelId: 'SNZB-03', desc: 'Motion Sensor PIR' },
    { manufacturerName: 'SONOFF', modelId: 'SNZB-03P', desc: 'Motion Sensor Pro' },
    { manufacturerName: 'eWeLink', modelId: 'MS01', desc: 'Motion Sensor MS01' }
  ],

  contact: [
    // SNZB-04 Door/Window
    { manufacturerName: 'eWeLink', modelId: 'SNZB-04', desc: 'Door/Window Sensor' },
    { manufacturerName: 'eWeLink', modelId: 'SNZB-04P', desc: 'Door/Window Pro' },
    { manufacturerName: 'SONOFF', modelId: 'SNZB-04', desc: 'Door/Window Sensor' },
    { manufacturerName: 'SONOFF', modelId: 'SNZB-04P', desc: 'Door/Window Pro' },
    { manufacturerName: 'eWeLink', modelId: 'DS01', desc: 'Door Sensor DS01' },
    { manufacturerName: 'eWeLink', modelId: 'WDS01', desc: 'Door Sensor WDS01' }
  ],

  water: [
    // SNZB-05 Water Leak
    { manufacturerName: 'eWeLink', modelId: 'SNZB-05', desc: 'Water Leak Sensor' },
    { manufacturerName: 'eWeLink', modelId: 'SNZB-05P', desc: 'Water Leak Pro' },
    { manufacturerName: 'SONOFF', modelId: 'SNZB-05', desc: 'Water Leak Sensor' },
    { manufacturerName: 'SONOFF', modelId: 'SNZB-05P', desc: 'Water Leak Pro' }
  ],

  presence: [
    // SNZB-06 Human Presence
    { manufacturerName: 'eWeLink', modelId: 'SNZB-06P', desc: 'Human Presence mmWave' },
    { manufacturerName: 'SONOFF', modelId: 'SNZB-06P', desc: 'Human Presence mmWave' },
    { manufacturerName: 'eWeLink', modelId: 'SNZB-06', desc: 'Human Presence' }
  ],

  // ===========================================================================
  // SWITCHES - ZBMINI & ZBM5 SERIES
  // ===========================================================================
  miniSwitches: [
    // ZBMINI Series
    { manufacturerName: 'eWeLink', modelId: 'ZBMINI', desc: 'Mini Switch' },
    { manufacturerName: 'eWeLink', modelId: 'ZBMINI-L', desc: 'Mini Switch No Neutral' },
    { manufacturerName: 'eWeLink', modelId: 'ZBMINI-L2', desc: 'Mini Switch No Neutral v2' },
    { manufacturerName: 'eWeLink', modelId: 'ZBMINIL2', desc: 'Mini Switch L2' },
    { manufacturerName: 'eWeLink', modelId: 'ZBMINIR2', desc: 'Mini Switch R2' },
    { manufacturerName: 'SONOFF', modelId: 'ZBMINI', desc: 'Mini Switch' },
    { manufacturerName: 'SONOFF', modelId: 'ZBMINI-L', desc: 'Mini Switch No Neutral' },
    { manufacturerName: 'SONOFF', modelId: 'ZBMINI-L2', desc: 'Mini Switch No Neutral v2' },
    { manufacturerName: 'eWeLink', modelId: '01MINIZB', desc: 'Mini Switch 01' },
    { manufacturerName: 'eWeLink', modelId: 'BASICZBR3', desc: 'Basic ZB R3' }
  ],

  wallSwitches: [
    // ZBM5 Wall Switch Series
    { manufacturerName: 'eWeLink', modelId: 'ZBM5-1', desc: 'Wall Switch 1-Gang' },
    { manufacturerName: 'eWeLink', modelId: 'ZBM5-2', desc: 'Wall Switch 2-Gang' },
    { manufacturerName: 'eWeLink', modelId: 'ZBM5-3', desc: 'Wall Switch 3-Gang' },
    { manufacturerName: 'SONOFF', modelId: 'ZBM5-1', desc: 'Wall Switch 1-Gang' },
    { manufacturerName: 'SONOFF', modelId: 'ZBM5-2', desc: 'Wall Switch 2-Gang' },
    { manufacturerName: 'SONOFF', modelId: 'ZBM5-3', desc: 'Wall Switch 3-Gang' },

    // T-Series Wall Switches
    { manufacturerName: 'eWeLink', modelId: 'TX-1C', desc: 'TX Switch 1-Gang' },
    { manufacturerName: 'eWeLink', modelId: 'TX-2C', desc: 'TX Switch 2-Gang' },
    { manufacturerName: 'eWeLink', modelId: 'TX-3C', desc: 'TX Switch 3-Gang' }
  ],

  // ===========================================================================
  // SMART PLUGS
  // ===========================================================================
  smartPlugs: [
    // S-Series Plugs
    { manufacturerName: 'eWeLink', modelId: 'S26R2ZB', desc: 'Smart Plug EU' },
    { manufacturerName: 'eWeLink', modelId: 'S31 Lite zb', desc: 'Smart Plug S31' },
    { manufacturerName: 'eWeLink', modelId: 'S31 Lite ZB', desc: 'Smart Plug S31 (alt)' },
    { manufacturerName: 'eWeLink', modelId: 'S31ZB', desc: 'Smart Plug S31 Energy' },
    { manufacturerName: 'eWeLink', modelId: 'S40ZB', desc: 'Smart Plug S40' },
    { manufacturerName: 'eWeLink', modelId: 'S40ZBTPB', desc: 'Smart Plug S40 TPB' },
    { manufacturerName: 'eWeLink', modelId: 'S40 Lite zb', desc: 'Smart Plug S40 Lite' },
    { manufacturerName: 'eWeLink', modelId: 'S60ZB', desc: 'iPlug S60' },
    { manufacturerName: 'eWeLink', modelId: 'S60ZBTPE', desc: 'iPlug S60 TPE' },
    { manufacturerName: 'eWeLink', modelId: 'S60ZBTPF', desc: 'iPlug S60 TPF' },
    { manufacturerName: 'SONOFF', modelId: 'S26R2ZB', desc: 'Smart Plug EU' },
    { manufacturerName: 'SONOFF', modelId: 'S31ZB', desc: 'Smart Plug S31' },
    { manufacturerName: 'SONOFF', modelId: 'S40ZB', desc: 'Smart Plug S40' },
    { manufacturerName: 'eWeLink', modelId: 'SA-003-Zigbee', desc: 'Smart Plug SA-003' }
  ],

  // ===========================================================================
  // CLIMATE
  // ===========================================================================
  climate: [
    // TRVZB Radiator Valve
    { manufacturerName: 'eWeLink', modelId: 'TRVZB', desc: 'Radiator Valve' },
    { manufacturerName: 'SONOFF', modelId: 'TRVZB', desc: 'Radiator Valve' },

    // ZBCurtain
    { manufacturerName: 'eWeLink', modelId: 'ZBCurtain', desc: 'Curtain Motor' },
    { manufacturerName: 'SONOFF', modelId: 'ZBCurtain', desc: 'Curtain Motor' },

    // SWV Water Valve
    { manufacturerName: 'eWeLink', modelId: 'SWV', desc: 'Smart Water Valve' },
    { manufacturerName: 'eWeLink', modelId: 'SWV-NH', desc: 'Smart Water Valve NH' },
    { manufacturerName: 'eWeLink', modelId: 'SWV-BSP', desc: 'Smart Water Valve BSP' },
    { manufacturerName: 'SONOFF', modelId: 'SWV', desc: 'Smart Water Valve' }
  ],

  // ===========================================================================
  // GATEWAYS & BRIDGES
  // ===========================================================================
  gateways: [
    // NSPanel Pro
    { manufacturerName: 'eWeLink', modelId: 'NSPanel Pro', desc: 'NSPanel Pro' },
    { manufacturerName: 'eWeLink', modelId: 'NSPanel Pro 86', desc: 'NSPanel Pro 86mm' },
    { manufacturerName: 'eWeLink', modelId: 'NSPanel Pro 120', desc: 'NSPanel Pro 120mm' },
    { manufacturerName: 'SONOFF', modelId: 'NSPanel Pro', desc: 'NSPanel Pro' },

    // NSPanel (Original)
    { manufacturerName: 'eWeLink', modelId: 'NSPanel', desc: 'NSPanel' },
    { manufacturerName: 'eWeLink', modelId: 'NSPanel-EU', desc: 'NSPanel EU' },
    { manufacturerName: 'eWeLink', modelId: 'NSPanel-US', desc: 'NSPanel US' },
    { manufacturerName: 'SONOFF', modelId: 'NSPanel', desc: 'NSPanel' },

    // Zigbee Bridges
    { manufacturerName: 'eWeLink', modelId: 'ZBBridge', desc: 'Zigbee Bridge' },
    { manufacturerName: 'eWeLink', modelId: 'ZBBridge-P', desc: 'Zigbee Bridge Pro' },
    { manufacturerName: 'eWeLink', modelId: 'ZBBridge-U', desc: 'Zigbee Bridge Ultra' },
    { manufacturerName: 'eWeLink', modelId: 'ZB Bridge Pro', desc: 'ZB Bridge Pro' },
    { manufacturerName: 'SONOFF', modelId: 'ZBBridge', desc: 'Zigbee Bridge' },
    { manufacturerName: 'SONOFF', modelId: 'ZBBridge-P', desc: 'Zigbee Bridge Pro' },

    // ZBDongle
    { manufacturerName: 'eWeLink', modelId: 'ZBDongle-E', desc: 'Zigbee Dongle E' },
    { manufacturerName: 'eWeLink', modelId: 'ZBDongle-P', desc: 'Zigbee Dongle P' },
    { manufacturerName: 'SONOFF', modelId: 'ZBDongle-E', desc: 'Zigbee Dongle E' },
    { manufacturerName: 'SONOFF', modelId: 'ZBDongle-P', desc: 'Zigbee Dongle P' },

    // iHost / eWeLink Cube
    { manufacturerName: 'eWeLink', modelId: 'iHost', desc: 'iHost Smart Hub' },
    { manufacturerName: 'eWeLink', modelId: 'iHost-4', desc: 'iHost 4GB' },
    { manufacturerName: 'eWeLink', modelId: 'eWeLink Cube', desc: 'eWeLink Cube' },
    { manufacturerName: 'SONOFF', modelId: 'iHost', desc: 'iHost Smart Hub' }
  ],

  // ===========================================================================
  // SIRENS
  // ===========================================================================
  sirens: [
    { manufacturerName: 'eWeLink', modelId: 'ZB-SIR', desc: 'Zigbee Siren' },
    { manufacturerName: 'eWeLink', modelId: 'SNZB-SIR', desc: 'SNZB Siren' },
    { manufacturerName: 'SONOFF', modelId: 'ZB-SIR', desc: 'Zigbee Siren' },
    { manufacturerName: 'SONOFF', modelId: 'SNZB-SIR', desc: 'SNZB Siren' }
  ]
};

// =============================================================================
// DRIVER MAPPING
// =============================================================================

const DRIVER_MAPPING = {
  // HEIMAN
  smokeDetectors: 'smoke_detector_advanced',
  coDetectors: 'co_sensor',
  gasDetectors: 'gas_detector',
  waterLeakSensors: 'water_leak_sensor',
  sirens: 'siren',
  contactSensors: 'contact_sensor',
  motionSensors: 'motion_sensor',
  climateSensors: 'climate_sensor',
  emergencyButtons: 'button_emergency_sos',
  remoteControls: 'scene_switch_4',
  airQuality: 'air_quality_comprehensive',
  smartPlugs: 'plug_smart',
  doorbells: 'doorbell',
  gateways: 'gateway_zigbee_bridge',

  // SONOFF
  buttons: 'button_wireless_1',
  tempHumidity: 'climate_sensor',
  motion: 'motion_sensor',
  contact: 'contact_sensor',
  water: 'water_leak_sensor',
  presence: 'presence_sensor_radar',
  miniSwitches: 'module_mini_switch',
  wallSwitches: 'switch_1gang',
  climate: 'radiator_valve'
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
  }

  return { added, skipped };
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

console.log('🏠 HEIMAN + SONOFF/EWELINK COMPLETE ECOSYSTEM ENRICHMENT');
console.log('==========================================================\n');

const driversDir = path.join(__dirname, '..', '..', 'drivers');
const results = {
  heiman: { added: 0, skipped: 0, categories: {} },
  sonoff: { added: 0, skipped: 0, categories: {} }
};

// Process HEIMAN devices
console.log('🔴 HEIMAN Security Devices:');
for (const [category, devices] of Object.entries(HEIMAN_DEVICES)) {
  const driverName = DRIVER_MAPPING[category];
  const result = enrichDriver(driversDir, driverName, devices);
  results.heiman.added += result.added;
  results.heiman.skipped += result.skipped;
  results.heiman.categories[category] = result;

  if (result.added > 0) {
    console.log(`  ✅ ${category} → ${driverName}: +${result.added}`);
  }
}

// Process SONOFF/eWeLink devices
console.log('\n🔵 SONOFF/eWeLink Devices:');
for (const [category, devices] of Object.entries(SONOFF_EWELINK_DEVICES)) {
  const driverName = DRIVER_MAPPING[category];
  const result = enrichDriver(driversDir, driverName, devices);
  results.sonoff.added += result.added;
  results.sonoff.skipped += result.skipped;
  results.sonoff.categories[category] = result;

  if (result.added > 0) {
    console.log(`  ✅ ${category} → ${driverName}: +${result.added}`);
  }
}

// Summary
const totalHeiman = Object.values(HEIMAN_DEVICES).flat().length;
const totalSonoff = Object.values(SONOFF_EWELINK_DEVICES).flat().length;

console.log('\n' + '='.repeat(60));
console.log('📊 SUMMARY');
console.log('='.repeat(60));
console.log(`🔴 HEIMAN: ${totalHeiman} device entries, ${results.heiman.added} added`);
console.log(`🔵 SONOFF: ${totalSonoff} device entries, ${results.sonoff.added} added`);
console.log(`📱 TOTAL: ${totalHeiman + totalSonoff} entries, ${results.heiman.added + results.sonoff.added} new devices`);
console.log('='.repeat(60));

// Save report
const reportPath = path.join(__dirname, '..', '..', 'data', 'enrichment', 'heiman-sonoff-ecosystem-report.json');
fs.writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  heiman: {
    totalEntries: totalHeiman,
    ...results.heiman
  },
  sonoff: {
    totalEntries: totalSonoff,
    ...results.sonoff
  }
}, null, 2));

console.log(`\n📄 Report: ${reportPath}`);
console.log('✨ HEIMAN + SONOFF/eWeLink ecosystem enrichment complete!');

module.exports = { HEIMAN_DEVICES, SONOFF_EWELINK_DEVICES, DRIVER_MAPPING };
