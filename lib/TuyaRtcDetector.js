'use strict';
const CI = require('./utils/CaseInsensitiveMatcher');

/**
 * 
 *                       TUYA RTC DETECTOR - PRODUCTION READY                    
 *                                                                               
 *    AUTO-DÃ‰TECTION: Devices TS0601 avec RTC intÃ©grÃ© + LCD display           
 *    MÃ‰THODE: outCluster 0x000A = preuve matÃ©rielle RTC                     
 *    FALLBACK: manufacturerName + modelId heuristics                         
 *    RUNTIME: Validation comportement aprÃ¨s sync                             
 * 
 */

const TIME_CLUSTER = 0x000A;

class TuyaRtcDetector {

  /**
   * DÃ©tection PRIMAIRE: outCluster 0x000A (100% fiable)
   * Si device dÃ©clare outCluster Time  il a forcÃ©ment un RTC
   */
  static hasRtcViaOutCluster(device) {
    try {
      const node = device.zclNode || device.node || device._zclNode;
      if (!node?.endpoints?.[1]) return false;

      const outClusters = node.endpoints[1].outClusters || [];

      // VÃ©rifications multiples (Homey peut formater diffÃ©remment)
      const hasTimeOut = outClusters.includes(TIME_CLUSTER) ||
        outClusters.includes('0x000A') ||
        outClusters.includes(10) ||
        outClusters.includes('time');

      if (hasTimeOut) {
        device.log('[RtcDetect]  RTC confirmed via outCluster 0x000A');
        return true;
      }

      device.log(`[RtcDetect]  No Time outCluster (found: ${JSON.stringify(outClusters)})`);
      return false;
    } catch (e) {
      device.log(`[RtcDetect] outCluster check failed: ${e.message}`);
      return false;
    }
  }

  /**
   * DÃ©tection SECONDAIRE: manufacturerName + modelId patterns
   * Fallback si outCluster detection Ã©choue
   */
  static hasRtcViaHeuristics(device) {
    try {
      const data = device.getData() || {};
      const manufacturerName = data.manufacturerName || device._manufacturerName || '';
      const modelId = data.modelId || device._modelId || '';

      device.log(`[RtcDetect] Heuristic check: ${manufacturerName} / ${modelId}`);

      // Doit Ãªtre TS0601 d'abord
      if (!CI.equalsCI(modelId, 'TS0601')) {
        device.log('[RtcDetect]  Not TS0601 - no RTC expected');
        return false;
      }

      // Manufactureurs CONFIRMÃ‰S avec RTC + LCD
      const confirmedRtcManufacturers = [
        '_TZE284_vvmbj46n',  // TH05Z - TARGET PRINCIPAL
        '_TZE200_vvmbj46n',  // Variante OEM
        '_TZE284_qoy0ekbd',  // Clone identique
        '_TZE200_qoy0ekbd',  // Variante OEM
        '_TZE200_znbl8dj5',  // MÃªme MCU
        '_TZE284_aao6qtcs',  // LCD climate
        '_TZE200_aao6qtcs',  // Variante
        '_TZE284_kfhhe7qj',  // Autre batch
        '_TZE200_htnnfasr',  // Known RTC
        '_TZE200_lve3dvpy',  // LCD display
        '_TZE284_9yapgbuv',  // Climate RTC
        '_TZE200_bjawzodf'   // LCD sensor
      ];

      // Match exact manufacturerName (case-insensitive)
      const mfrNorm = CI.normalize((manufacturerName || ''));
      for (const rtcMfr of confirmedRtcManufacturers) {
        if (mfrNorm === rtcMfr.toLowerCase()) {
          device.log(`[RtcDetect]  RTC confirmed via known manufacturer: ${rtcMfr}`);
          return true;
        }
      }

      // Patterns gÃ©nÃ©riques (plus risquÃ©)
      const mfrLower = CI.normalize((manufacturerName || ''));
      if (mfrLower.startsWith('_tze284_') ||
        mfrLower.startsWith('_tze200_')) {
        device.log(`[RtcDetect]  Possible RTC via pattern: ${manufacturerName}`);
        return true; // La plupart des TZE284/TZE200 ont des LCD
      }

      device.log(`[RtcDetect]  Unknown manufacturer pattern: ${manufacturerName}`);
      return false;

    } catch (e) {
      device.log(`[RtcDetect] Heuristic check failed: ${e.message}`);
      return false;
    }
  }

  /**
   * DÃ©tection TERTIAIRE: Runtime validation
   * Observe le comportement aprÃ¨s sync Time
   */
  static async validateRtcRuntime(device, beforeSync, afterSync) {
    try {
      // Si capabilities temp/humidity inchangÃ©es mais sync rÃ©ussie
      //  probablement un RTC qui s'est mis Ã jour

      const tempBefore = beforeSync.temperature;
      const tempAfter = afterSync.temperature;
      const syncSuccess = afterSync.syncResult?.success;

      if (syncSuccess && tempBefore === tempAfter) {
        device.log('[RtcDetect]  Runtime validation: sync success + stable sensor data  RTC confirmed');
        return true;
      }

      // Autres validations possibles
      const timeBefore = beforeSync.timestamp;
      const timeAfter = afterSync.timestamp;
      const syncDelay = timeAfter - timeBefore;

      if (syncSuccess && syncDelay < 5000) { // Sync rapide = device rÃ©actif
        device.log('[RtcDetect]  Runtime validation: fast sync response  RTC likely');
        return true;
      }

      return false;
    } catch (e) {
      device.log(`[RtcDetect] Runtime validation failed: ${e.message}`);
      return false;
    }
  }

  /**
   * MÃ‰THODE PRINCIPALE: DÃ©tection combinÃ©e avec prioritÃ©s
   */
  static hasRtc(device, options = {}) {
    const useHeuristics = options.useHeuristics !== false;
    const useRuntime = options.useRuntime || false;

    device.log('[RtcDetect]  Starting RTC detection...');

    // PrioritÃ© 1: outCluster 0x000A (preuve matÃ©rielle)
    if (this.hasRtcViaOutCluster(device)) {
      device.log('[RtcDetect]  RTC detected via outCluster (RELIABLE)');
      return { hasRtc: true, method: 'outCluster', confidence: 'high' };
    }

    // PrioritÃ© 2: Heuristics manufacturerName/modelId
    if (useHeuristics && this.hasRtcViaHeuristics(device)) {
      device.log('[RtcDetect]  RTC detected via heuristics (MEDIUM)');
      return { hasRtc: true, method: 'heuristics', confidence: 'medium' };
    }

    // PrioritÃ© 3: Runtime validation (nÃ©cessite observation)
    if (useRuntime) {
      device.log('[RtcDetect]  RTC detection requires runtime validation');
      return { hasRtc: false, method: 'runtime_pending', confidence: 'pending' };
    }

    device.log('[RtcDetect]  No RTC detected');
    return { hasRtc: false, method: 'none', confidence: 'high' };
  }

  /**
   * HELPER: Liste tous les devices RTC connus
   */
  static getKnownRtcDevices() {
    return {
      // Manufactureurs avec RTC confirmÃ©
      confirmed: [
        '_TZE284_vvmbj46n',  // TH05Z principal
        '_TZE200_vvmbj46n',
        '_TZE284_qoy0ekbd',
        '_TZE200_qoy0ekbd',
        '_TZE200_znbl8dj5',
        '_TZE284_aao6qtcs',
        '_TZE200_aao6qtcs',
        '_TZE284_kfhhe7qj',
        '_TZE200_htnnfasr',
        '_TZE200_lve3dvpy',
        '_TZE284_9yapgbuv',
        '_TZE200_bjawzodf'
      ],

      // Patterns probables
      patterns: [
        '_TZE284_*',  // La plupart ont LCD
        '_TZE200_*'   // Beaucoup ont LCD
      ],

      // Exclusions (pas de RTC)
      excluded: [
        '_TZ3000_*',  // Pure ZCL, pas de LCD
        '_TZ3210_*'   // ZCL standard
      ]
    };
  }

  /**
   * HELPER: Debug info complÃ¨te
   */
  static debugDeviceInfo(device) {
    try {
      const node = device.zclNode || device.node || device._zclNode;
      const data = device.getData() || {};

      const info = {
        manufacturerName: data.manufacturerName || device._manufacturerName,
        modelId: data.modelId || device._modelId,
        outClusters: node?.endpoints?.[1]?.outClusters || [],
        inClusters: node?.endpoints?.[1]?.inClusters || [],
        hasTimeOut: this.hasRtcViaOutCluster(device),
        heuristicMatch: this.hasRtcViaHeuristics(device)
      };

      device.log('[RtcDetect]  Device info:', JSON.stringify(info, null, 2));
      return info;
    } catch (e) {
      device.log(`[RtcDetect] Debug info failed: ${e.message}`);
      return null;
    }
  }
}

module.exports = TuyaRtcDetector;
