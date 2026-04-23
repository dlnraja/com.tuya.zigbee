'use strict';

const { CLUSTERS } = require('../constants/ZigbeeConstants.js');


const { Cluster } = require('zigbee-clusters');

/**
 * Register all custom clusters with Homey
 * Call this ONCE at app startup in app.js
 *
 * IMPORTANT v5.5.44:
 * - Only register ONE cluster for CLUSTERS.TUYA_EF00 (TuyaSpecificCluster with NAME='tuya')
 * - Multiple clusters with same ID cause conflicts!
 * - Community pattern: zclNode.endpoints[1].clusters.tuya.on("response", ...)
 *
 * Reference: https://github.com/athombv/node-zigbee-clusters#implementing-a-custom-cluster
 *
 * @param {Object} logger - Homey logger instance (optional)
 */
function registerCustomClusters(logger = null) {
  try {
    // v5.5.44: Only load TuyaSpecificCluster (NAME='tuya')
    // DO NOT load TuyaManufacturerCluster - same ID causes conflict!
    let TuyaSpecificCluster;

    try {
      TuyaSpecificCluster = require('../clusters/TuyaSpecificCluster');
      if (logger) {
        logger.log('[OK] TuyaSpecificCluster module loaded (NAME=tuya, ID=CLUSTERS.TUYA_EF00)');
      }
    } catch (loadErr) {
      if (logger) {
        logger.error('[ERROR] Cannot load TuyaSpecificCluster:', loadErr.message);
      }
    }

    // Register TuyaSpecificCluster (the only CLUSTERS.TUYA_EF00 cluster we need)
    if (TuyaSpecificCluster) {
      try {
        Cluster.addCluster(TuyaSpecificCluster);
        if (logger) {
          logger.log('[OK]  TuyaSpecificCluster (CLUSTERS.TUYA_EF00, NAME=tuya) registered');
          logger.log('[OK]  Access via: zclNode.endpoints[1].clusters.tuya');
        }
      } catch (regErr) {
        if (regErr.message && regErr.message.includes('already exists')) {
          if (logger) {
            logger.log('[WARN] Tuya cluster already registered (skipping)');
          }
        } else {
          throw regErr;
        }
      }
    }

    // v5.8.15: Register TuyaE000Cluster (0xE000/57344) for MOES buttons
    // CRITICAL: Without this, SDK discards frames from cluster 57344
    // Fixes: _TZ3000_zgyzgdua physical buttons not triggering flows
    let TuyaE000Cluster;
    try {
      TuyaE000Cluster = require('../clusters/TuyaE000Cluster');
      if (logger) {
        logger.log('[OK] TuyaE000Cluster module loaded (NAME=tuyaE000, ID=0xE000)');
      }
    } catch (loadErr) {
      if (logger) {
        logger.error('[ERROR] Cannot load TuyaE000Cluster:', loadErr.message);
      }
    }

    if (TuyaE000Cluster) {
      try {
        Cluster.addCluster(TuyaE000Cluster);
        if (logger) {
          logger.log('[OK]  TuyaE000Cluster (0xE000, NAME=tuyaE000) registered');
          logger.log('[OK]  Access via: zclNode.endpoints[1].clusters.tuyaE000');
        }
      } catch (regErr) {
        if (regErr.message && regErr.message.includes('already exists')) {
          if (logger) {
            logger.log('[WARN] TuyaE000 cluster already registered (skipping)');
          }
        } else {
          if (logger) {
            logger.error('[WARN] TuyaE000Cluster registration error:', regErr.message);
          }
        }
      }
    }

    // v5.8.22: Register TuyaE001Cluster (0xE001/57345) - Switch mode cluster
    let TuyaE001Cluster;
    try {
      TuyaE001Cluster = require('../clusters/TuyaE001Cluster');
      Cluster.addCluster(TuyaE001Cluster);
      if (logger) logger.log('[OK]  TuyaE001Cluster (0xE001) registered - power-on, switch mode');
    } catch (e) {
      if (!e.message?.includes('already exists') && logger) logger.log('[WARN] TuyaE001:', e.message);
    }

    // v5.8.22: Register TuyaE002Cluster (0xE002/57346) - Sensor alarms
    let TuyaE002Cluster;
    try {
      TuyaE002Cluster = require('../clusters/TuyaE002Cluster');
      Cluster.addCluster(TuyaE002Cluster);
      if (logger) logger.log('[OK]  TuyaE002Cluster (0xE002) registered - sensor alarms');
    } catch (e) {
      if (!e.message?.includes('already exists') && logger) logger.log('[WARN] TuyaE002:', e.message);
    }

    // v5.11.30: Register TuyaE003Cluster (0xE003/57347) - Scene/button events
    try {
      const TuyaE003Cluster = require('../clusters/TuyaE003Cluster');
      Cluster.addCluster(TuyaE003Cluster);
      if (logger) logger.log('[OK]  TuyaE003Cluster (0xE003) registered - scene/button events');
    } catch (e) {
      if (!e.message?.includes('already exists') && logger) logger.log('[WARN] TuyaE003:', e.message);
    }

    // v5.12.2: Register TuyaE003BoundCluster for receiving scene/button events
    try {
      const TuyaE003BoundCluster = require('../clusters/TuyaE003BoundCluster');
      if (logger) logger.log('[OK] TuyaE003BoundCluster loaded (receives scene/button events)');
    } catch (e) {
      if (logger) logger.log('[WARN] TuyaE003BoundCluster:', e.message);
    }

    // v5.8.52: Register Zosung IR clusters (0xE004, 0xED00) for ir_blaster
    // CRITICAL: Must be registered at app startup, BEFORE zclNode construction
    // Previously only registered in device.js (too late - clusters not in zclNode)
    try {
      const ZosungIRControlCluster = require('../clusters/ZosungIRControlCluster');
      Cluster.addCluster(ZosungIRControlCluster);
      if (logger) logger.log('[OK]  ZosungIRControlCluster (0xE004) registered');
    } catch (e) {
      if (!e.message?.includes('already exists') && logger) logger.log('[WARN] ZosungIRControl:', e.message);
    }

    try {
      const ZosungIRTransmitCluster = require('../clusters/ZosungIRTransmitCluster');
      Cluster.addCluster(ZosungIRTransmitCluster);
      if (logger) logger.log('[OK]  ZosungIRTransmitCluster (0xED00) registered');
    } catch (e) {
      if (!e.message?.includes('already exists') && logger) logger.log('[WARN] ZosungIRTransmit:', e.message);
    }

    // v5.9.11: Register GreenPower cluster (0x0021) for energy-harvesting switches
    try {
      const GreenPowerCluster = require('../zigbee/GreenPowerCluster');
      if (logger) logger.log('[OK]  GreenPowerCluster (0x0021) registered');
    } catch (e) {
      if (!e.message?.includes('already exists') && logger) logger.log('[WARN] GreenPower:', e.message);
    }

    // v5.12.5: Register TuyaColorControlCluster (Johan SDK3) for ZCL RGB devices
    try {
      const TuyaColorControlCluster = require('../clusters/TuyaColorControlCluster');
      Cluster.addCluster(TuyaColorControlCluster);
      if (logger) logger.log('[OK] TuyaColorControlCluster (0x0300 ext) registered - tuyaRgbMode');
    } catch (e) {
      if (!e.message?.includes('already exists') && logger) logger.log('[WARN] TuyaColorControl:', e.message);
    }

    // v5.12.5: Register TuyaWindowCoveringCluster (Johan SDK3) for ZCL curtains
    try {
      const TuyaWindowCoveringCluster = require('../clusters/TuyaWindowCoveringCluster');
      Cluster.addCluster(TuyaWindowCoveringCluster);
      if (logger) logger.log('[OK] TuyaWindowCoveringCluster (0x0102 ext) registered - calibration, motorReversal');
    } catch (e) {
      if (!e.message?.includes('already exists') && logger) logger.log('[WARN] TuyaWindowCovering:', e.message);
    }

    // v5.8.22: Pre-register remaining exotic clusters via UnknownClusterHandler
    // v5.8.52: Removed 0xED00 - now properly registered as ZosungIRTransmitCluster above
    const UnknownClusterHandler = require('../clusters/UnknownClusterHandler');
    const preRegisterClusters = [
      // Tuya extended (sensors) - 0xE003 now properly registered above
      0xE005, 0xE006,
      // Tuya manufacturer-specific function clusters
      0xFC00, 0xFC01, 0xFC02, 0xFC03, 0xFC11,
      // Tuya IPC / presence sensor
      0xFC40, 0xFC41, 0xFC57, 0xFC7E,
      // Xiaomi / Aqara specific
      0xFCC0, 0xFF01, 0xFF02,
      // Switch modules / misc manufacturer
      0xFD02, 0xFE00, 0xFF00, 0xFF66,
      // Tuya OTA / proprietary
      0x1888,
    ];
    for (const cid of preRegisterClusters) {
      try {
        if (UnknownClusterHandler.register(cid) && logger) {
          logger.log(`[OK] Dynamic cluster 0x${cid.toString(16)} pre-registered`);
        }
      } catch {}
    }

    return true;
  } catch (err) {
    if (logger) {
      logger.error('[ERROR]  Failed to register custom clusters:', err.message);
      logger.error('[ERROR] Stack:', err.stack);
    }
    return false;
  }
}

module.exports = { registerCustomClusters };

