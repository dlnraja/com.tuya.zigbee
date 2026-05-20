'use strict';
const CI = require('../utils/CaseInsensitiveMatcher');

const { CLUSTERS } = require('../constants/ZigbeeConstants.js');


/**
 * ManufacturerQuirks - v1.0.0
 * Crowdsourced knowledge base for exotic Zigbee implementations.
 * Sources: Zigbee2MQTT, Home Assistant ZHA, Hubitat, Tasmota, deCONZ.
 */

const QUIRKS = {
  // --- XIAOMI / AQARA ---
  XIAOMI: {
    manufacturerCodes: [0x115F, 0x1234],
    clusters: {
      0x0000: {
        attributes: {
          0xFF01: 'special_report_tlv',
          0xFF02: 'special_report_tlv_alt'
        },
        // Xiaomi devices often need a "Magic Mode" write to cluster 0 attribute 1
        handshake: async (device) => {
          try {
            const cluster = await device.getSafeCluster('basic');
            if (cluster) await cluster.writeAttributes({ 0x0001: { value: 0x01, type: 0x20 } });
          } catch (e) {}
        }
      }
    }
  },

  // --- SONOFF / EWELINK ---
  SONOFF: {
    manufacturerCodes: [0x1286],
    clusters: {
      0xFC11: {
        name: 'manuSpecificSonoff',
        attributes: {
          0x0000: 'motion_timeout',
          0x0001: 'illumination_mode'
        }
      }
    }
  },

  // --- HEIMAN ---
  HEIMAN: {
    manufacturerCodes: [0x1209],
    iasFix: true // Heiman needs manual IAS enrollment check
  },

  // --- LEGRAND / NETATMO ---
  LEGRAND: {
    manufacturerCodes: [0x1021],
    clusters: {
      0xFC01: {
        name: 'manuSpecificLegrand',
        attributes: { 0x0000: 'switch_mode' }
      }
    }
  },

  // --- DANFOSS / HIVE ---
  DANFOSS: {
    manufacturerCodes: [0x1246],
    clusters: {
      0x0201: {
        attributes: {
          0x4000: 'sw_error_code',
          0x4014: 'mounting_mode_active'
        }
      }
    }
  },

  // --- IKEA TRADFRI ---
  IKEA: {
    manufacturerCodes: [0x117C],
    forceBind: [0x0006, 0x0008] // Force bind these for remotes
  },

  // --- BOSCH / ROBERT BOSCH ---
  BOSCH: {
    manufacturerCodes: [0x1011],
    clusters: {
      0xFCAC: {
        name: 'manuSpecificBosch',
        attributes: { 0x4000: 'system_mode', 0x4003: 'mounting_mode' }
      }
    }
  },

  // --- UBISYS ---
  UBISYS: {
    manufacturerCodes: [0x10F2],
    clusters: {
      0xFC00: {
        name: 'manuSpecificUbisysDeviceSetup',
        attributes: { 0x0000: 'input_configuration', 0x0001: 'shutter_calibration' }
      }
    }
  },

  // --- SCHNEIDER ELECTRIC / WISER ---
  SCHNEIDER: {
    manufacturerCodes: [0x105E],
    clusters: {
      0xFC40: { name: 'manuSpecificSchneiderConfig' }
    }
  },

  // --- MULLER LICHT (TINT) ---
  MULLER: {
    manufacturerCodes: [0x1160, 0x1050],
    clusters: {
      0x0000: {
        attributes: {
          0x4005: 'tint_light_effect', // Disco, Party, etc.
          0x4006: 'tint_power_on_behavior'
        }
      }
    }
  },

  // --- SILVERCREST / LIDL ---
  SILVERCREST: {
    manufacturerCodes: [0x126E],
    clusters: {
      [CLUSTERS.TUYA_EF00]: { name: 'tuyaDataPoint' } // Lidl is often Tuya-based
    }
  },

  // --- TUYA (EXOTIC) ---
  TUYA_EXOTIC: {
    clusters: {
      0xE000: { name: 'tuyaMaintenance' },
      0xE001: { name: 'tuyaDebug' },
      [CLUSTERS.TUYA_EF00]: { name: 'tuyaDataPoint' }
    },
    // Some Tuya TRVs need a time sync on cluster 0x000A
    timeSyncNeeded: true
  }
};

class ExoticQuirkEngine {
  static getQuirk(manufacturerName, mfrId) {
    const name = CI.normalize((manufacturerName || ''));
    if (name.includes('LUMI') || name.includes('XIAOMI') || name.includes('AQARA')) return QUIRKS.XIAOMI;
    if (name.includes('SONOFF') || name.includes('COOLKIT')) return QUIRKS.SONOFF;
    if (name.includes('HEIMAN')) return QUIRKS.HEIMAN;
    if (name.includes('LEGRAND') || name.includes('NETATMO')) return QUIRKS.LEGRAND;
    if (name.includes('DANFOSS') || name.includes('HIVE')) return QUIRKS.DANFOSS;
    if (name.includes('IKEA')) return QUIRKS.IKEA;
    if (name.includes('BOSCH')) return QUIRKS.BOSCH;
    if (name.includes('UBISYS')) return QUIRKS.UBISYS;
    if (name.includes('SCHNEIDER')) return QUIRKS.SCHNEIDER;
    if (name.includes('MULLER') || name.includes('TINT')) return QUIRKS.MULLER;
    if (name.includes('SILVERCREST') || name.includes('LIDL')) return QUIRKS.SILVERCREST;
    if (mfrId === 0x1011) return QUIRKS.BOSCH;
    if (mfrId === 0x10F2) return QUIRKS.UBISYS;
    if (mfrId === 0x115F) return QUIRKS.XIAOMI;
    if (mfrId === 0x1286) return QUIRKS.SONOFF;
    return null;
  }

  /**
   * Run specialized handshake for specific brands
   */
  static async runHandshake(device) {
    const mfr = device.getSetting('zb_manufacturer_name');
    const mfrId = device.zclNode?.manufacturerId;
    const quirk = this.getQuirk(mfr, mfrId);
    
    if (quirk && quirk.handshake) {
      device.log(`[QUIRK] Running handshake for ${mfr}`);
      await quirk.handshake(device);
    }
  }
}

module.exports = { ExoticQuirkEngine, QUIRKS };
