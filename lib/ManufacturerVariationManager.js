'use strict';

/**
 * ManufacturerVariationManager - Gestion dynamique des variations par manufacturerName
 * v1.0.0 - Résout les différences de clusters ZCL, DPs Tuya, et endpoints
 *
 * PROBLÈME RÉSOLU:
 * - Certains manufacturerNames utilisent ZCL standard (clusters 6, 8, etc.)
 * - D'autres utilisent Tuya DP exclusivement (cluster 61184/0xEF00)
 * - Différences dans endpoints, bindings, et dpMappings
 * - Configuration statique ne fonctionne pas pour tous les cas
 */

class ManufacturerVariationManager {

  /**
   * Détecte le protocole et la configuration pour un manufacturerName donné
   */
  static getManufacturerConfig(manufacturerName, productId, driverType) {
    const config = {
      protocol: 'mixed', // 'tuya_dp', 'zcl', 'mixed'
      endpoints: {},
      bindings: {},
      dpMappings: {},
      zclClusters: [],
      capabilities: [],
      specialHandling: null
    };

    // === CURTAIN MOTOR VARIATIONS ===
    if (driverType === 'curtain_motor') {
      return this._getCurtainMotorConfig(manufacturerName, productId);
    }

    // === BUTTON VARIATIONS ===
    if (driverType === 'button_wireless') {
      return this._getButtonConfig(manufacturerName, productId);
    }

    // === SWITCH VARIATIONS ===
    if (driverType.startsWith('switch_')) {
      return this._getSwitchConfig(manufacturerName, productId, driverType);
    }

    // === SENSOR VARIATIONS ===
    if (driverType.includes('sensor')) {
      return this._getSensorConfig(manufacturerName, productId, driverType);
    }

    return config;
  }

  /**
   * Configuration spécifique pour curtain_motor
   */
  static _getCurtainMotorConfig(manufacturerName, productId) {
    const config = {
      protocol: 'mixed',
      endpoints: { 1: { clusters: [], bindings: [] } },
      dpMappings: {},
      zclClusters: [],
      capabilities: ['windowcoverings_state', 'windowcoverings_set'],
      specialHandling: null
    };

    // === _TZE200_ series - Pure Tuya DP ===
    if (manufacturerName.startsWith('_TZE200_')) {
      config.protocol = 'tuya_dp';
      config.endpoints[1].clusters = [61184]; // 0xEF00 only
      config.endpoints[1].bindings = [];
      config.dpMappings = {
        1: { capability: 'windowcoverings_state', transform: (v) => v === 0 ? 'up' : v === 2 ? 'down' : 'idle' },
        2: { capability: 'windowcoverings_set', transform: (v) => v / 100 },
        3: { capability: 'dim', transform: (v) => v / 100 },
        101: { capability: null, internal: 'opening_mode' } // MOES specific
      };

      // Spécial: MOES Roller Blind
      if (manufacturerName === '_TZE200_icka1clh') {
        config.capabilities.push('windowcoverings_tilt_set');
        config.specialHandling = 'moes_roller_blind';
      }
    }

    // === _TZ3000_ series - Mixed ZCL + Tuya ===
    else if (manufacturerName.startsWith('_TZ3000_')) {
      config.protocol = 'mixed';
      config.endpoints[1].clusters = [0, 1, 6, 8, 258, 61184]; // Basic + OnOff + Level + WindowCovering + Tuya
      config.endpoints[1].bindings = [6, 8, 258];
      config.zclClusters = [6, 8, 258]; // OnOff, Level Control, Window Covering
      config.dpMappings = {
        1: { capability: 'windowcoverings_state' },
        2: { capability: 'windowcoverings_set', transform: (v) => v / 100 }
      };
    }

    // === _TZ3210_ series - Enhanced ZCL ===
    else if (manufacturerName.startsWith('_TZ3210_')) {
      config.protocol = 'zcl';
      config.endpoints[1].clusters = [0, 1, 6, 8, 258, 768]; // + Color Control for some
      config.endpoints[1].bindings = [6, 8, 258];
      config.zclClusters = [6, 8, 258];
      config.capabilities.push('windowcoverings_tilt_set');
    }

    // === Legacy manufacturerNames (Benexmart, Dooya) ===
    else {
      config.protocol = 'zcl';
      config.endpoints[1].clusters = [0, 1, 6, 8, 258];
      config.endpoints[1].bindings = [6, 8, 258];
      config.zclClusters = [6, 8, 258];
    }

    return config;
  }

  /**
   * Configuration spécifique pour button_wireless
   */
  static _getButtonConfig(manufacturerName, productId) {
    const config = {
      protocol: 'mixed',
      endpoints: {},
      bindings: {},
      dpMappings: {},
      zclClusters: [],
      capabilities: ['measure_battery'],
      specialHandling: null
    };

    // === _TZ3000_ series - Standard button ===
    if (manufacturerName.startsWith('_TZ3000_')) {
      config.protocol = 'zcl';
      config.endpoints = {
        1: { clusters: [0, 1, 3, 6, 1280], bindings: [1, 6, 1280] }
      };
      config.zclClusters = [6, 1280]; // OnOff + IAS Zone

      // Multi-button support based on productId
      if (['TS0042', 'TS0043', 'TS0044'].includes(productId)) {
        for (let i = 2; i <= parseInt(productId.slice(-1)) + 1; i++) {
          config.endpoints[i] = { clusters: [0, 3], bindings: [1] };
        }
      }
    }

    // === _TZ3400_ series - Scene controller ===
    else if (manufacturerName.startsWith('_TZ3400_')) {
      config.protocol = 'mixed';
      config.endpoints = {
        1: { clusters: [0, 1, 3, 6, 5, 61184], bindings: [1, 6, 5] }
      };
      config.zclClusters = [6, 5]; // OnOff + Scenes
      config.dpMappings = {
        1: { capability: null, internal: 'button_event' }
      };
    }

    return config;
  }

  /**
   * Configuration spécifique pour switches
   */
  static _getSwitchConfig(manufacturerName, productId, driverType) {
    const gangCount = parseInt(driverType.match(/\d+/)?.[0]) || 1;

    const config = {
      protocol: 'mixed',
      endpoints: {},
      bindings: {},
      dpMappings: {},
      zclClusters: [],
      capabilities: [`onoff.gang_${gangCount}`],
      specialHandling: null
    };

    // Multi-gang capabilities
    for (let i = 1; i <= gangCount; i++) {
      config.capabilities.push(i === 1 ? 'onoff' : `onoff.gang_${i}`);
    }

    // === _TZE200_ series - Pure Tuya DP ===
    if (manufacturerName.startsWith('_TZE200_')) {
      config.protocol = 'tuya_dp';
      config.endpoints = {
        1: { clusters: [61184], bindings: [] }
      };

      // DP mappings for multi-gang
      for (let i = 1; i <= gangCount; i++) {
        config.dpMappings[i] = {
          capability: i === 1 ? 'onoff' : `onoff.gang_${i}`,
          transform: (v) => Boolean(v)
        };
      }
    }

    // === _TZ3000_ series - Standard ZCL ===
    else if (manufacturerName.startsWith('_TZ3000_')) {
      config.protocol = 'zcl';
      config.endpoints = {
        1: { clusters: [0, 1, 6], bindings: [6] }
      };
      config.zclClusters = [6]; // OnOff

      // Additional endpoints for multi-gang
      for (let i = 2; i <= gangCount; i++) {
        config.endpoints[i] = { clusters: [6], bindings: [6] };
      }
    }

    return config;
  }

  /**
   * Configuration spécifique pour sensors
   */
  static _getSensorConfig(manufacturerName, productId, driverType) {
    const config = {
      protocol: 'mixed',
      endpoints: { 1: { clusters: [0, 1], bindings: [1] } },
      bindings: {},
      dpMappings: {},
      zclClusters: [],
      capabilities: ['measure_battery'],
      specialHandling: null
    };

    // Sensor type detection
    if (driverType.includes('temperature') || driverType.includes('climate')) {
      config.capabilities.push('measure_temperature', 'measure_humidity');
      config.endpoints[1].clusters.push(1026, 1029); // Temperature + Humidity
      config.endpoints[1].bindings.push(1026, 1029);
      config.zclClusters = [1026, 1029];
    }

    if (driverType.includes('motion')) {
      config.capabilities.push('alarm_motion');
      config.endpoints[1].clusters.push(1280); // IAS Zone
      config.endpoints[1].bindings.push(1280);
      config.zclClusters.push(1280);
    }

    // === _TZE200_ series - Tuya DP sensors ===
    if (manufacturerName.startsWith('_TZE200_')) {
      config.protocol = 'tuya_dp';
      config.endpoints[1].clusters = [61184];
      config.endpoints[1].bindings = [];
      config.zclClusters = [];

      // Common Tuya sensor DPs
      config.dpMappings = {
        1: { capability: 'measure_temperature', divisor: 10 },
        2: { capability: 'measure_humidity', divisor: 1 },
        3: { capability: 'measure_battery', divisor: 1 },
        101: { capability: 'alarm_motion', transform: (v) => Boolean(v) }
      };
    }

    return config;
  }

  /**
   * Applique la configuration dynamique à un device
   */
  static applyManufacturerConfig(device, config) {
    // Store config for runtime use
    device._manufacturerConfig = config;

    // Apply protocol-specific initialization
    if (config.protocol === 'tuya_dp') {
      device._isPureTuyaDP = true;
      device._usesZCL = false;
    } else if (config.protocol === 'zcl') {
      device._isPureTuyaDP = false;
      device._usesZCL = true;
    } else {
      device._isPureTuyaDP = true;
      device._usesZCL = true;
    }

    // Store dynamic DP mappings
    if (config.dpMappings && Object.keys(config.dpMappings).length > 0) {
      device._dynamicDpMappings = config.dpMappings;
    }

    // Store ZCL cluster list
    if (config.zclClusters && config.zclClusters.length > 0) {
      device._supportedZclClusters = config.zclClusters;
    }

    // Apply special handling
    if (config.specialHandling) {
      device._specialHandling = config.specialHandling;
    }

    return config;
  }

  /**
   * Vérifie si un manufacturerName nécessite une configuration spéciale
   */
  static needsSpecialConfig(manufacturerName, productId, driverType) {
    // Patterns nécessitant une configuration dynamique
    const specialPatterns = [
      '_TZE200_', '_TZE204_', '_TZE284_', // Pure Tuya DP
      '_TZ3000_', '_TZ3210_', '_TZ3400_', // Mixed protocols
      'Benexmart', 'Dooya', 'MOES'        // Legacy brands
    ];

    return specialPatterns.some(pattern => manufacturerName.includes(pattern));
  }
}

module.exports = ManufacturerVariationManager;
