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

    // === PLUG VARIATIONS (Energy Scaling) ===
    if (driverType.includes('plug') || driverType.includes('outlet') || driverType.includes('socket')) {
      return this._getPlugConfig(manufacturerName, productId, driverType);
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
   * v5.5.333: Added specific configs for _TZ3000_wkai4ga5 and _TZ3000_5tqxpine
   * Per forum feedback from Eftychis_Georgilas
   */
  static _getButtonConfig(manufacturerName, productId) {
    const config = {
      protocol: 'mixed',
      endpoints: {},
      bindings: {},
      dpMappings: {},
      zclClusters: [],
      capabilities: ['measure_battery'],
      specialHandling: null,
      buttonLabels: null, // v5.5.333: Optional positional button labels
      noBatteryCluster: false // v5.5.333: Some devices don't report battery
    };

    // === SPECIFIC DEVICE FIXES (Forum feedback) ===
    // _TZ3000_wkai4ga5 - 4-button scene switch (Eftychis report)
    if (manufacturerName === '_TZ3000_wkai4ga5') {
      config.protocol = 'zcl';
      config.endpoints = {
        1: { clusters: [0, 1, 3, 4, 5, 6, 8, 18], bindings: [1, 5, 6] },
        2: { clusters: [0, 3, 4, 5, 6, 18], bindings: [5, 6] },
        3: { clusters: [0, 3, 4, 5, 6, 18], bindings: [5, 6] },
        4: { clusters: [0, 3, 4, 5, 6, 18], bindings: [5, 6] }
      };
      config.zclClusters = [5, 6, 18]; // Scenes + OnOff + MultistateInput
      config.buttonLabels = ['upper_left', 'upper_right', 'lower_left', 'lower_right'];
      config.specialHandling = 'ts0044_scene_switch';
      return config;
    }

    // _TZ3000_5tqxpine - 4-button scene switch without battery (Eftychis report)
    if (manufacturerName === '_TZ3000_5tqxpine') {
      config.protocol = 'zcl';
      config.endpoints = {
        1: { clusters: [0, 3, 4, 5, 6, 18], bindings: [5, 6] },
        2: { clusters: [0, 3, 4, 5, 6, 18], bindings: [5, 6] },
        3: { clusters: [0, 3, 4, 5, 6, 18], bindings: [5, 6] },
        4: { clusters: [0, 3, 4, 5, 6, 18], bindings: [5, 6] }
      };
      config.zclClusters = [5, 6, 18]; // Scenes + OnOff + MultistateInput
      config.buttonLabels = ['upper_left', 'upper_right', 'lower_left', 'lower_right'];
      config.noBatteryCluster = true; // No battery reporting on this model
      config.specialHandling = 'ts0044_scene_switch_no_battery';
      return config;
    }

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
  /**
   * v5.6.1: Configuration spécifique pour plugs avec scaling par marque
   * Sources: Zigbee2MQTT, Home Assistant Community, Homey Forum
   *
   * RÈGLE: Certaines marques reportent l'énergie en Wh au lieu de kWh
   * ou ont des diviseurs différents pour power/voltage/current
   */
  static _getPlugConfig(manufacturerName, productId, driverType) {
    const config = {
      protocol: 'mixed',
      endpoints: { 1: { clusters: [0, 1, 6, 2820, 1794, 61184], bindings: [6] } },
      dpMappings: {},
      zclClusters: [6, 2820, 1794], // OnOff + ElectricalMeasurement + Metering
      capabilities: ['onoff', 'measure_power', 'meter_power', 'measure_voltage', 'measure_current'],
      specialHandling: null,
      // v5.6.1: Energy scaling defaults by brand
      energyScaling: {
        power_divisor: 10,      // Default: raw value / 10 = W
        voltage_divisor: 10,    // Default: raw value / 10 = V
        current_divisor: 1000,  // Default: raw value / 1000 = A (mA → A)
        energy_divisor: 100,    // Default: raw value / 100 = kWh
        energy_multiplier: 1    // Default: no multiplier (1 = kWh, 0.001 = Wh→kWh)
      }
    };

    // ═══════════════════════════════════════════════════════════════
    // LIDL SILVERCREST - Reports energy in Wh instead of kWh
    // Source: https://github.com/Koenkk/zigbee2mqtt/issues/14356
    // ManufacturerNames: _TZ3000_ynmowqk2, _TZ3000_kdi2o9m6, _TZ3000_g5xawfcq
    // ═══════════════════════════════════════════════════════════════
    const LIDL_SILVERCREST_IDS = [
      '_TZ3000_ynmowqk2', '_TZ3000_kdi2o9m6', '_TZ3000_g5xawfcq',
      '_TZ3000_typdpbpg', '_TZ3000_okaz9tjs', '_TZ3000_rdtixbnu'
    ];
    if (LIDL_SILVERCREST_IDS.includes(manufacturerName)) {
      config.energyScaling.energy_multiplier = 0.001; // Wh → kWh
      config.specialHandling = 'lidl_silvercrest_energy_wh';
      return config;
    }

    // ═══════════════════════════════════════════════════════════════
    // NOUS A1Z - Standard Tuya scaling
    // Source: https://www.zigbee2mqtt.io/devices/A1Z.html
    // ═══════════════════════════════════════════════════════════════
    const NOUS_IDS = [
      '_TZ3000_cphmq0q7', '_TZ3000_ew3ldmgx', '_TZ3000_dpo1ysak',
      '_TZ3000_gjnozsaz', '_TZ3000_w0qqde0g'
    ];
    if (NOUS_IDS.includes(manufacturerName)) {
      // Standard scaling, no special handling needed
      config.specialHandling = 'nous_standard';
      return config;
    }

    // ═══════════════════════════════════════════════════════════════
    // BLITZWOLF BW-SHP13 - Some versions have broken reporting
    // Source: https://www.zigbee2mqtt.io/devices/TS011F_plug_1.html
    // Needs polling instead of automatic reporting
    // ═══════════════════════════════════════════════════════════════
    const BLITZWOLF_IDS = [
      '_TZ3000_amdymr7l', '_TZ3000_typdpbpg', '_TZ3000_zloso4jk'
    ];
    if (BLITZWOLF_IDS.includes(manufacturerName)) {
      config.specialHandling = 'blitzwolf_polling_required';
      config.pollingInterval = 60; // Poll every 60 seconds
      return config;
    }

    // ═══════════════════════════════════════════════════════════════
    // MOES / BSEED - Some use Tuya DP instead of ZCL for energy
    // Source: Zigbee2MQTT TS011F_plug_3
    // ═══════════════════════════════════════════════════════════════
    const MOES_BSEED_IDS = [
      '_TZ3000_cehuw1lw', '_TZ3000_5f43h46b', '_TZ3000_yujkchbz',
      '_TZ3000_xkap8wtb', '_TZ3000_qeuvnohg'
    ];
    if (MOES_BSEED_IDS.includes(manufacturerName)) {
      config.protocol = 'tuya_dp';
      config.dpMappings = {
        1: { capability: 'onoff', transform: (v) => Boolean(v) },
        17: { capability: 'measure_current', divisor: 1000 },
        18: { capability: 'measure_power', divisor: 10 },
        19: { capability: 'measure_voltage', divisor: 10 },
        20: { capability: 'meter_power', divisor: 100 }
      };
      config.specialHandling = 'moes_tuya_dp_energy';
      return config;
    }

    // ═══════════════════════════════════════════════════════════════
    // NEDIS SmartLife - Same as Lidl (Tuya OEM)
    // ═══════════════════════════════════════════════════════════════
    const NEDIS_IDS = [
      '_TZ3000_w0qqde0g', '_TZ3000_u5u4cakc', '_TZ3000_hdopuwv6'
    ];
    if (NEDIS_IDS.includes(manufacturerName)) {
      config.specialHandling = 'nedis_standard';
      return config;
    }

    // ═══════════════════════════════════════════════════════════════
    // ZEMISMART - High power plugs (30A) with different scaling
    // Source: https://github.com/Koenkk/zigbee2mqtt/issues/12437
    // ═══════════════════════════════════════════════════════════════
    const ZEMISMART_IDS = [
      '_TZ3000_f1bapcit', '_TZ3000_1h2x4akh', '_TZ3000_okaz9tjs'
    ];
    if (ZEMISMART_IDS.includes(manufacturerName)) {
      config.energyScaling.current_divisor = 100; // Different current scaling
      config.specialHandling = 'zemismart_high_power';
      return config;
    }

    // ═══════════════════════════════════════════════════════════════
    // AUBESS / Generic - Standard Tuya TS011F
    // ═══════════════════════════════════════════════════════════════
    const AUBESS_IDS = [
      '_TZ3000_cphmq0q7', '_TZ3000_ksw8qtmt', '_TZ3000_okaz9tjs',
      '_TZ3000_ps3dmato', '_TZ3000_dksbtrzs'
    ];
    if (AUBESS_IDS.includes(manufacturerName)) {
      config.specialHandling = 'aubess_standard';
      return config;
    }

    return config;
  }

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
