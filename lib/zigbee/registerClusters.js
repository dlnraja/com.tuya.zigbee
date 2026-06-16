'use strict';

const { Cluster } = require('zigbee-clusters');

/**
 * Register all custom clusters with Homey
 * Call this ONCE at app startup in app.js
 *
 * IMPORTANT v5.5.44:
 * - Only register ONE cluster for 0xEF00 (TuyaSpecificCluster with NAME='tuya')
 * - Multiple clusters with same ID cause conflicts!
 * - Community pattern: zclNode.endpoints[1].clusters.tuya.on("response", ...)
 *
 * Reference: https://github.com/athombv/node-zigbee-clusters#implementing-a-custom-cluster
 *
 * v9.1.0: Improved cluster registration and error handling (Issue #8)
 *
 * @param {Object} logger - Homey logger instance (optional)
 */
function registerCustomClusters(logger = null) {
  // v9.1.0: Track registration state and results
  const registrationState = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
    registeredClusters: new Map()
  };

  /**
   * v9.1.0: Safe cluster registration with improved error handling
   */
  function safeRegisterCluster(clusterModule, clusterName, clusterId) {
    try {
      if (!clusterModule) {
        registrationState.skipped++;
        return false;
      }

      Cluster.addCluster(clusterModule);
      registrationState.success++;
      registrationState.registeredClusters.set(clusterId, clusterName);

      if (logger) {
        logger.log(`[OK] ✅ ${clusterName} (0x${clusterId.toString(16)}) registered`);
      }
      return true;
    } catch (regErr) {
      if (regErr.message && regErr.message.includes('already exists')) {
        registrationState.skipped++;
        if (logger) {
          logger.log(`[WARN] ${clusterName} already registered (skipping)`);
        }
        return true; // Consider "already exists" as success
      } else {
        registrationState.failed++;
        registrationState.errors.push({
          cluster: clusterName,
          id: clusterId,
          error: regErr.message
        });
        if (logger) {
          logger.error(`[ERROR] Failed to register ${clusterName}: ${regErr.message}`);
        }
        return false;
      }
    }
  }

  try {
    // v5.5.44: Only load TuyaSpecificCluster (NAME='tuya')
    // DO NOT load TuyaManufacturerCluster - same ID causes conflict!
    let TuyaSpecificCluster;

    try {
      TuyaSpecificCluster = require('../clusters/TuyaSpecificCluster');
      if (logger) {
        logger.log('[OK] TuyaSpecificCluster module loaded (NAME=tuya, ID=0xEF00)');
      }
    } catch (loadErr) {
      if (logger) {
        logger.error('[ERROR] Cannot load TuyaSpecificCluster:', loadErr.message);
      }
    }

    // Register TuyaSpecificCluster (the only 0xEF00 cluster we need)
    safeRegisterCluster(TuyaSpecificCluster, 'TuyaSpecificCluster', 0xEF00);

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

    safeRegisterCluster(TuyaE000Cluster, 'TuyaE000Cluster', 0xE000);

    // v5.8.22: Register TuyaE001Cluster (0xE001/57345) - Switch mode cluster
    let TuyaE001Cluster;
    try {
      TuyaE001Cluster = require('../clusters/TuyaE001Cluster');
    } catch (e) {
      if (logger) {logger.log('[WARN] TuyaE001 load:', e.message);}
    }
    safeRegisterCluster(TuyaE001Cluster, 'TuyaE001Cluster', 0xE001);

    // v5.8.22: Register TuyaE002Cluster (0xE002/57346) - Sensor alarms
    let TuyaE002Cluster;
    try {
      TuyaE002Cluster = require('../clusters/TuyaE002Cluster');
    } catch (e) {
      if (logger) {logger.log('[WARN] TuyaE002 load:', e.message);}
    }
    safeRegisterCluster(TuyaE002Cluster, 'TuyaE002Cluster', 0xE002);

    // v5.11.30: Register TuyaE003Cluster (0xE003/57347) - Scene/button events
    let TuyaE003Cluster;
    try {
      TuyaE003Cluster = require('../clusters/TuyaE003Cluster');
    } catch (e) {
      if (logger) {logger.log('[WARN] TuyaE003 load:', e.message);}
    }
    safeRegisterCluster(TuyaE003Cluster, 'TuyaE003Cluster', 0xE003);

    // v5.12.2: Register TuyaE003BoundCluster for receiving scene/button events
    try {
      const TuyaE003BoundCluster = require('../clusters/TuyaE003BoundCluster');
      if (logger) {logger.log('[OK] TuyaE003BoundCluster loaded (receives scene/button events)');}
    } catch (e) {
      if (logger) {logger.log('[WARN] TuyaE003BoundCluster:', e.message);}
    }

    // v5.8.52: Register Zosung IR clusters (0xE004, 0xED00) for ir_blaster
    // CRITICAL: Must be registered at app startup, BEFORE zclNode construction
    // Previously only registered in device.js (too late - clusters not in zclNode)
    let ZosungIRControlCluster;
    try {
      ZosungIRControlCluster = require('../clusters/ZosungIRControlCluster');
    } catch (e) {
      if (logger) {logger.log('[WARN] ZosungIRControl load:', e.message);}
    }
    safeRegisterCluster(ZosungIRControlCluster, 'ZosungIRControlCluster', 0xE004);

    let ZosungIRTransmitCluster;
    try {
      ZosungIRTransmitCluster = require('../clusters/ZosungIRTransmitCluster');
    } catch (e) {
      if (logger) {logger.log('[WARN] ZosungIRTransmit load:', e.message);}
    }
    safeRegisterCluster(ZosungIRTransmitCluster, 'ZosungIRTransmitCluster', 0xED00);

    // v5.9.11: Register GreenPower cluster (0x0021) for energy-harvesting switches
    let GreenPowerCluster;
    try {
      GreenPowerCluster = require('../zigbee/GreenPowerCluster');
    } catch (e) {
      if (logger) {logger.log('[WARN] GreenPower load:', e.message);}
    }
    safeRegisterCluster(GreenPowerCluster, 'GreenPowerCluster', 0x0021);

    // v5.12.5: Register TuyaColorControlCluster (Johan SDK3) for ZCL RGB devices
    let TuyaColorControlCluster;
    try {
      TuyaColorControlCluster = require('../clusters/TuyaColorControlCluster');
    } catch (e) {
      if (logger) {logger.log('[WARN] TuyaColorControl load:', e.message);}
    }
    safeRegisterCluster(TuyaColorControlCluster, 'TuyaColorControlCluster', 0x0300);

    // v5.12.5: Register TuyaWindowCoveringCluster (Johan SDK3) for ZCL curtains
    let TuyaWindowCoveringCluster;
    try {
      TuyaWindowCoveringCluster = require('../clusters/TuyaWindowCoveringCluster');
    } catch (e) {
      if (logger) {logger.log('[WARN] TuyaWindowCovering load:', e.message);}
    }
    safeRegisterCluster(TuyaWindowCoveringCluster, 'TuyaWindowCoveringCluster', 0x0102);

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
        if (UnknownClusterHandler.register(cid)) {
          registrationState.success++;
          registrationState.registeredClusters.set(cid, `dynamic_0x${cid.toString(16)}`);
          if (logger) {
            logger.log(`[OK] Dynamic cluster 0x${cid.toString(16)} pre-registered`);
          }
        }
      } catch { /* ponytail: cluster registration may fail for unsupported cluster IDs */ }
    }

    // v9.1.0: Log registration summary
    if (logger) {
      logger.log(`[CLUSTER-REG] ✅ Registration complete: ${registrationState.success} success, ${registrationState.failed} failed, ${registrationState.skipped} skipped`);
      if (registrationState.errors.length > 0) {
        logger.log(`[CLUSTER-REG] ⚠️ Errors:`, registrationState.errors);
      }
    }

    return registrationState;
  } catch (err) {
    if (logger) {
      logger.error('[ERROR] ❌ Failed to register custom clusters:', err.message);
      logger.error('[ERROR] Stack:', err.stack);
    }
    return registrationState;
  }
}

module.exports = { registerCustomClusters };

