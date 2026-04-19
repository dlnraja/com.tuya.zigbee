const { safeDivide } = require('../utils/tuyaUtils.js');
/**
 * DeviceFingerprintDB.js - v1.0.0
 * 
 * THE "CLOUD-LESS / IA-LESS" MASTER DATABASE.
 * This file contains high-confidence static mappings for Tuya Zigbee devices.
 * It serves as the ultimate local fallback when AI providers or Tuya Cloud are unavailable.
 * 
 * Rules:
 * 1. Prioritize clusters for classification.
 * 2. Use common Tuya manufacturer prefixes.
 * 3. Match against driver categories.
 */

'use strict';

const TUYA_DB = {
  //  EMERGENCY / SOS BUTTONS (IAS Zone)
  'button_emergency_sos': {
    clusters: [1280, 1281], // IAS Zone/IAS WD
    pids: ['TS0215', 'TS0215A', 'TS0218', 'TS0601'],
    mfr_prefixes: ['_TZ3000_', '_TYZB01_', '_TZE200_', '_TZE204_', '_TZE284_'], // Peter's _TZE284_ added
    priority: 85,
  },
  
  //  SMART PLUGS / RELAYS (Mains Powered)
  'plug_smart_v2': {
    clusters: [6], // On/Off
    pids: ['TS011F', 'TS0121', 'TS0112', 'TS0115'],
    mfr_prefixes: ['_TZ3000_', '_TZE200_', '_TZE204_'],
    priority: 70,
  },

  //  LIGHTING (Color / Dimming)
  'light_rgb_cw_v2': {
    clusters: [6, 8, 768], // OnOff, Level, Color
    pids: ['TS0505', 'TS0505B', 'TS0502'],
    mfr_prefixes: ['_TZ3000_', '_TZE200_', '_TZE202_'],
    priority: 90,
  },

  //  CLIMATE SENSORS (Battery)
  'sensor_climate_v2': {
    clusters: [1026, 1029], // Temp, Hum
    pids: ['TS0201', 'TS0601'],
    mfr_prefixes: ['_TZ3000_', '_TZE200_'],
    priority: 75,
  }
};


module.exports = {
  TUYA_DB,
  
  /**
   * IA-less classification logic
   */
  classifyDevice(mfr, pid, clusters = []) {
    for (const [driver, rules] of Object.entries(TUYA_DB)) {
      // 1. Cluster Match (Heavy weight)
      const clusterMatch = rules.clusters.every(c => clusters.includes(c));
      if (clusterMatch) return { driver, confidence: rules.priority + 10 };

      // 2. PID + MFR Prefix Match
      const pidMatch = rules.pids.includes(pid);
      const mfrMatch = rules.mfr_prefixes.some(p => mfr.startsWith(p));
      if (pidMatch && mfrMatch) return { driver, confidence: rules.priority };
    }
    return null;
  }
};
