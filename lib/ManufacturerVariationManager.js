'use strict';
const { safeParse } = require('./utils/tuyaUtils.js');


const { CLUSTERS } = require('./constants/ZigbeeConstants.js');




const { includesCI, startsWithCI, equalsCI, containsCI } = require('./utils/CaseInsensitiveMatcher');

/**
 * ManufacturerVariationManager - Gestion dynamique des variations par manufacturerName
 * v5.5.697 - Case-insensitive matching throughout
 * v7.0.25 - Thinking Reimplementation Engine: COMPOSITE IDENTITY MAPPING
 * v1.0.0 - RÃ©sout les diffÃ©rences de clusters ZCL, DPs Tuya, et endpoints
 *
 * PROBLÃˆME RÃ‰SOLU:
 * - Certains manufacturerNames utilisent ZCL standard (clusters 6, 8, etc.)
 * - D'autres utilisent Tuya DP exclusivement (cluster safeDivide(CLUSTERS.TUYA_EF00, CLUSTERS.TUYA_EF00))
 * - DiffÃ©rences dans endpoints, bindings, et dpMappings
 * - Configuration statique ne fonctionne pas pour tous les cas
 */

class ManufacturerVariationManager {

  /**
   * v7.0.25: COMPOSITE LOOKUP TABLE (Rule 28)
   * Systematically maps (manufacturerName, productId) to specific configs.
   * 
   *  CRITICAL safeDivide(KNOWLEDGE, ARCHITECTURE) NOTE 
   * UN MÃŠME MANUFACTURER_NAME PEUT AVOIR PLUSIEURS DEVICE_ID (PRODUCT_ID) !
   * ONE MANUFACTURER_NAME CAN HAVE MULTIPLE DEVICE_IDs (PRODUCT_IDs) !
   * 
   * Do not rely solely on manufacturerName to determine device capabilities. 
   * Tuya frequently reuses the same manufacturerName (e.g. _TZE200_beckyt8z) 
   * across completely different hardware types (curtains, plugs, sensors).
   * ALWAYS use Composite Identity (manufacturerName + productId).
   * 
   * This is the "Source of Truth" for non-standard safeDivide(Tuya, Zigbee) hardware.
   */
  static COMPOSITE_IDENTITY_MAP() {
    return {
      // Shared ID Disambiguation (_TZE200 reuses this ID for everything)
      '_TZE200_beckyt8z': {
        'TS0601': 'curtain_motor_standard',
        'TS0602': 'plug_moes_standard',
      },
      '_TZE200_icka1clh': {
        'TS0601': 'moes_roller_blind',
      },
      // Radar Sensors
      '_TZE200_rhgsbacq': {
        'TS0601': 'radar_mmwave_mains',
      },
      '_TZE204_rhgsbacq': { // SDK 3 variant
        'TS0601': 'radar_mmwave_mains',
      },
      // BSEED/MOES Switches
      '_TZ3002_pzao9ls1': {
        'TS0726': 'bseed_ts0726_4gang'
      },
      // Soil Sensors
      '_TZE284_oitavov2': {
        'TS0601': 'tuya_soil_sensor_standard'
      }
    };
  }

  /**
   * DÃ©tecte le protocole et la configuration pour un manufacturerName donnÃ©
   */
  static getManufacturerConfig(manufacturerName, productId, driverType) {
    const config = {
      protocol: 'mixed', // 'tuya_dp', 'zcl', 'mixed'
      endpoints: {},
      bindings: {},
      dpMappings: {},
      zclClusters: [],
      capabilities: [],
      specialHandling
    };

    // === v7.0.25: COMPOSITE LOOKUP PRIORITY (Case-Insensitive) ===
    const compositeMap = this.COMPOSITE_IDENTITY_MAP();
    
    // Find matching manufacturer entry case-insensitively
    const mfrKey = Object.keys(compositeMap).find(key => equalsCI(key, manufacturerName));
    if (mfrKey) {
        // Find matching productId entry case-insensitively
        const pidKey = Object.keys(compositeMap[mfrKey]).find(key => equalsCI(key, productId));
        if (pidKey) {
            const configKey = compositeMap[mfrKey][pidKey];
            const compositeConfig = this._getConfigByKey(configKey, manufacturerName, productId, driverType);
            if (compositeConfig) return compositeConfig;
        }
    }

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

    // === COMPOSITE DISAMBIGUATION (N-to-N Logic) ===
    // Certain manufacturers reuse identifiers for different hardware classes
    if (equalsCI(manufacturerName, '_TZE200_beckyt8z')) {
        if (equalsCI(productId, 'TS0601')) return this._getCurtainMotorConfig(manufacturerName, productId);
        if (equalsCI(productId, 'TS0602')) return this._getPlugConfig(manufacturerName, productId, 'plug');
    }

    // === PLUG VARIATIONS (Energy Scaling) ===
    if (driverType.includes('plug') || driverType.includes('outlet') || driverType.includes('socket')) {
      return this._getPlugConfig(manufacturerName, productId, driverType);
    }

    return config;
  }

  /**
   * Configuration spÃ©cifique pour curtain_motor
   */
  static _getCurtainMotorConfig(manufacturerName, productId) {
    const config = {
      protocol: 'mixed',
      endpoints: { 1: { clusters: [], bindings: [] } },
      dpMappings: {},
      zclClusters: [],
      capabilities: ['windowcoverings_state', 'windowcoverings_set'],
      specialHandling
    };

    // === _TZE200_ series - Pure Tuya DP ===
    if (startsWithCI(manufacturerName, '_TZE200_')) {
      config.protocol = 'tuya_dp';
      config.endpoints[1].clusters = [CLUSTERS.TUYA_EF00]; // CLUSTERS.TUYA_EF00 only
      config.endpoints[1].bindings = [];
      config.dpMappings = {
        1: { capability: 'windowcoverings_state', transform: (v) => v === 0 ? 'up' : v === 2 ? 'down' : 'idle' },
        2: { capability: 'windowcoverings_set', transform: (v) => safeParse(v, 100) },
        3: { capability: 'dim', transform: (v) => safeParse(v, 100) },
        101: { capability, internal: 'opening_mode' } // MOES specific
      };

      // SpÃ©cial: MOES Roller Blind
      if (equalsCI(manufacturerName, '_TZE200_icka1clh')) {
        config.capabilities.push('windowcoverings_tilt_set');
        config.specialHandling = 'moes_roller_blind';
      }
    }

    // === _TZE204_ series - Pure Tuya DP (v5.5.998: Longsam Mini M3 etc.) ===
    // Z2M #26660: _TZE204_xu4a5rhj has INVERTED POSITION (DP2), not control (DP1)
    // Z2M #22614, ZHA #3181: Same device, position percentage is inverted
    // Fix: position = 100 - value for both read and write
    else if (startsWithCI(manufacturerName, '_TZE204_')) {
      config.protocol = 'tuya_dp';
      config.endpoints[1].clusters = [CLUSTERS.TUYA_EF00]; // CLUSTERS.TUYA_EF00 only
      config.endpoints[1].bindings = [];
      
      // v5.5.998: _TZE204_ curtains have INVERTED POSITION (not control)
      // Standard: open=100%, close=0%
      // Inverted: open=0%, close=100%
      // Control DP1 is NORMAL: 0=open, 1=stop, 2=close
      config.specialHandling = 'tze204_curtain_position_inverted';
      config.dpMappings = {
        1: { capability: 'windowcoverings_state', transform: (v) => v === 0 ? 'up' : v === 2 ? 'down' : 'idle' },
        2: { capability: 'windowcoverings_set', transform: (v) => (100 - safeParse(v, 1)) }, // INVERTED position read
        3: { capability: 'windowcoverings_set', transform: (v) => (100 - safeParse(v, 1)) }  // INVERTED position state
      };
      // v5.5.998: Flag for inverted POSITION (not control)
      config.invertedPosition = true;
    }

    // === _TZ3000_ series - Mixed ZCL + Tuya ===
    else if (startsWithCI(manufacturerName, '_TZ3000_')) {
      config.protocol = 'mixed';
      config.endpoints[1].clusters = [0, 1, 6, 8, 258, CLUSTERS.TUYA_EF00]; // Basic + OnOff + Level + WindowCovering + Tuya
      config.endpoints[1].bindings = [6, 8, 258];
      config.zclClusters = [6, 8, 258]; // OnOff, Level Control, Window Covering
      config.dpMappings = {
        1: { capability: 'windowcoverings_state' },
        2: { capability: 'windowcoverings_set', transform: (v) => safeParse(v, 100) }
      };
    }

    // === _TZ3210_ series - Enhanced ZCL ===
    else if (startsWithCI(manufacturerName, '_TZ3210_')) {
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
   * Configuration spÃ©cifique pour button_wireless
   * v5.5.492: COMPREHENSIVE MANUFACTURER-SPECIFIC BUTTON CONFIGURATIONS
   * Sources: Zigbee2MQTT converters, ZHA quirks, SmartThings handlers, Forum reports
   *
   * CRITICAL: Each manufacturerName has specific characteristics:
   * - Different clusters (scenes, onOff, multistateInput, Tuya DP)
   * - Different press type mappings (0/1/2 vs 1/2/3)
   * - Different endpoints structure
   * - Different battery reporting methods
   */
  static _getButtonConfig(manufacturerName, productId) {
    const config = {
      protocol: 'mixed',
      endpoints: {},
      bindings: {},
      dpMappings: {},
      zclClusters: [],
      capabilities: ['measure_battery'],
      specialHandling,
      buttonLabels,
      noBatteryCluster: false,
      // v5.5.492: Press type mapping (some devices use 0/1/2, others 1/2/3)
      pressTypeMapping: { 0: 'single', 1: 'double', 2: 'long' }, // Default Tuya
      // v5.5.492: Primary cluster for button events
      primaryCluster: 'scenes', // 'scenes', 'onOff', 'multistateInput', 'tuya_dp'
      // v5.5.492: Scene mode attribute (for TS004F)
      sceneModeAttribute
    };

    // 
    // TS004F SCENE MODE DEVICES - Require mode switching to Scene mode
    // Source: Z2M #7158, ZHA #1372, SmartThings Community
    // Attribute 0x8004 on onOff cluster: 0=Dimmer, 1=Scene
    // 
    const TS004F_SCENE_MODE_IDS = [
      '_TZ3000_xabckq1v', '_TZ3000_czuyt8lz', '_TZ3000_pcqjmcud',
      '_TZ3000_4fjiwweb', '_TZ3000_uri7oadn', '_TZ3000_ixla93vd',
      '_TZ3000_qzjcsmar', '_TZ3000_wkai4ga5', '_TZ3000_5tqxpine',
      '_TZ3000_abrsvsou', '_TZ3000_ja5osu5g', '_TZ3000_kjfzuycl',
      '_TZ3000_owgcnkrh', '_TZ3000_rrjr1dsk', '_TZ3000_vdfwjopk', 
      '_TZ3000_gwkzibhs' // v7.0.9: Added _TZ3000_gwkzibhs knob
    ];
    if (includesCI(TS004F_SCENE_MODE_IDS, manufacturerName) || equalsCI(productId, 'TS004F')) {
      config.protocol = 'zcl';
      config.primaryCluster = 'scenes';
      config.sceneModeAttribute = 0x8004; // Must write 1 to enable scene mode
      config.endpoints = {
        1: { clusters: [0, 1, 3, 4, 5, 6, 8, 18], bindings: [4, 5, 6] },
        2: { clusters: [0, 3, 4, 5, 6, 18], bindings: [4, 5, 6] },
        3: { clusters: [0, 3, 4, 5, 6, 18], bindings: [4, 5, 6] },
        4: { clusters: [0, 3, 4, 5, 6, 18], bindings: [4, 5, 6] }
      };
      config.zclClusters = [4, 5, 6, 18]; // Groups + Scenes + OnOff + MultistateInput
      config.specialHandling = 'ts004f_scene_mode';
      return config;
    }

    // 
    // TS0044 STANDARD DEVICES - No mode switching needed, use scenes cluster
    // Source: Z2M TS0044 converter
    // 
    const TS0044_STANDARD_IDS = [
      '_TZ3000_vp6clf9d', '_TZ3000_w4thianr', '_TZ3000_ee8nrt2l',
      '_TZ3000_j61x9rxn', '_TZ3000_et7afzxz', '_TZ3000_nuombroo',
      '_TZ3000_mh9px7cq', '_TZ3000_kfu8zapd', '_TZ3000_u3nv1jwk',
      '_TZ3000_uaa99arv', '_TZ3000_dziaict4', '_TZ3000_bgtzm4ny',
      '_TZ3000_b3mgfu0d', '_TZ3000_abci1hiu', '_TZ3000_a4xycprs',
      '_TZ3000_zgyzgdua', '_TZ3000_ufhtxr59'
    ];
    if (includesCI(TS0044_STANDARD_IDS, manufacturerName) || equalsCI(productId, 'TS0044')) {
      config.protocol = 'zcl';
      config.primaryCluster = 'scenes';
      config.sceneModeAttribute = 0x8004;
      config.endpoints = {
        1: { clusters: [0, 1, 3, 4, 5, 6], bindings: [4, 5, 6] },
        2: { clusters: [0, 3, 4, 5, 6], bindings: [4, 5, 6] },
        3: { clusters: [0, 3, 4, 5, 6], bindings: [4, 5, 6] },
        4: { clusters: [0, 3, 4, 5, 6], bindings: [4, 5, 6] }
      };
      config.zclClusters = [4, 5, 6];
      config.specialHandling = 'ts0044_standard';
      return config;
    }

    // 
    // TS0043 3-BUTTON DEVICES (with cluster 0xE000)
    // Source: Z2M TS0043 converter, deCONZ #3220, GitHub #98 LoraTap
    // v5.7.52: Added _TZ3000_famkxci2 (LoraTap SS600ZB/SS9300ZB) - uses 0xE000 not scenes
    // v6.1.0: Added _TZ3000_ee8nrt2l (LoraTap 4-button TS0044) - follows same E000 pattern
    // 
    const TS004x_E000_IDS = [
      '_TZ3000_famkxci2', // LoraTap 3-button (SS600ZB, SS9300ZB)
      '_TZ3000_ee8nrt2l'  // LoraTap 4-button (TS0044)
    ];
    if (includesCI(TS004x_E000_IDS, manufacturerName)) {
      config.protocol = 'zcl';
      config.primaryCluster = 'onOff';  // Uses onOff commands, NOT scenes
      config.endpoints = {
        1: { clusters: [0, 1, 6, 57344], bindings: [6] },  // 57344 = 0xE000
        2: { clusters: [1, 6], bindings: [6] },
        3: { clusters: [1, 6], bindings: [6] },
        4: { clusters: [1, 6], bindings: [6] }  // Has 4 EPs even for 3 buttons
      };
      config.zclClusters = [6, 57344];  // onOff + 0xE000
      config.specialHandling = 'ts004x_loratap_e000';
      return config;
    }

    // TS0043 STANDARD DEVICES - Use scenes cluster
    const TS0043_IDS = [
      '_TZ3000_bi6lpsew', '_TZ3000_a7ouggvs', '_TZ3000_gbm10jnj',
      '_TZ3000_rrjr1dsk', '_TZ3000_w8jwkczz', '_TZ3000_qzjcsmar'
    ];
    if (includesCI(TS0043_IDS, manufacturerName) || equalsCI(productId, 'TS0043')) {
      config.protocol = 'zcl';
      config.primaryCluster = 'scenes';
      config.sceneModeAttribute = 0x8004;
      config.endpoints = {
        1: { clusters: [0, 1, 3, 4, 5, 6], bindings: [4, 5, 6] },
        2: { clusters: [0, 3, 4, 5, 6], bindings: [4, 5, 6] },
        3: { clusters: [0, 3, 4, 5, 6], bindings: [4, 5, 6] }
      };
      config.zclClusters = [4, 5, 6];
      config.specialHandling = 'ts0043_3button';
      return config;
    }

    // 
    // TS0042 2-BUTTON DEVICES
    // Source: Z2M TS0042 converter, SmartThings Community #255203
    // 
    const TS0042_IDS = [
      '_TZ3000_owgcnkrh', '_TZ3000_dfgbtub0', '_TZ3000_tkurata6',
      '_TZ3000_fvh3pjaz', '_TZ3400_keyjhapk', '_TZ3000_pzui3skt'
    ];
    if (includesCI(TS0042_IDS, manufacturerName) || equalsCI(productId, 'TS0042')) {
      config.protocol = 'zcl';
      config.primaryCluster = 'scenes';
      config.sceneModeAttribute = 0x8004;
      config.endpoints = {
        1: { clusters: [0, 1, 3, 4, 5, 6], bindings: [4, 5, 6] },
        2: { clusters: [0, 3, 4, 5, 6], bindings: [4, 5, 6] }
      };
      config.zclClusters = [4, 5, 6];
      config.specialHandling = 'ts0042_2button';
      return config;
    }

    // 
    // TS0041 1-BUTTON DEVICES
    // Source: Z2M TS0041 converter, Z2M Issue #21301
    // 
    const TS0041_IDS = [
      '_TZ3000_tk3s5tyg', '_TZ3000_pzui3skt', '_TZ3000_f97vq5mn',
      '_TZ3000_ja5osu5g', '_TZ3000_mrpevh8p', '_TZ3000_adndolvx',
      '_TZ3000_4fjiwweb', '_TZ3400_keyjqthh', '_TZ3000_qzjcsmar'
    ];
    if (includesCI(TS0041_IDS, manufacturerName) || equalsCI(productId, 'TS0041')) {
      config.protocol = 'zcl';
      config.primaryCluster = 'scenes';
      config.sceneModeAttribute = 0x8004;
      config.endpoints = {
        1: { clusters: [0, 1, 3, 4, 5, 6], bindings: [4, 5, 6] }
      };
      config.zclClusters = [4, 5, 6];
      config.specialHandling = 'ts0041_1button';
      return config;
    }

    // 
    // TUYA DP BUTTONS (_TZE200_, _TZE204_, _TZE284_) - Use Tuya cluster [CLUSTERS.TUYA_EF00]: null // Source: Z2M Tuya button converters
    // 
    if (startsWithCI(manufacturerName, '_TZE')) {
      config.protocol = 'tuya_dp';
      config.primaryCluster = 'tuya_dp';
      config.endpoints = {
        1: { clusters: [0, CLUSTERS.TUYA_EF00], bindings: [] }
      };
      config.dpMappings = {
        1: { capability, internal: 'button_1_event' },
        2: { capability, internal: 'button_2_event' },
        3: { capability, internal: 'button_3_event' },
        4: { capability, internal: 'button_4_event' }
      };
      // Tuya DP press types: 0=single, 1=double, 2=long
      config.pressTypeMapping = { 0: 'single', 1: 'double', 2: 'long' };
      config.specialHandling = 'tuya_dp_button';
      return config;
    }

    // 
    // MULTISTATE INPUT BUTTONS - Use cluster 18 (genMultistateInput)
    // Some devices report button presses via presentValue attribute
    // 
    const MULTISTATE_IDS = [
      '_TZ3000_gjnozsaz', '_TZ3000_fdxihpp7', '_TZ3000_fkvaniuu'
    ];
    if (includesCI(MULTISTATE_IDS, manufacturerName)) {
      config.protocol = 'zcl';
      config.primaryCluster = 'multistateInput';
      config.endpoints = {
        1: { clusters: [0, 1, 3, 18], bindings: [18] }
      };
      config.zclClusters = [18];
      // MultistateInput values: 0=hold, 1=single, 2=double, 3=triple
      config.pressTypeMapping = { 0: 'long', 1: 'single', 2: 'double', 3: 'multi' };
      config.specialHandling = 'multistate_button';
      return config;
    }

    // 
    // SPECIFIC DEVICE FIXES (Forum feedback)
    // 

    // _TZ3000_wkai4ga5 - 4-button scene switch (Eftychis report)
    if (equalsCI(manufacturerName, '_TZ3000_wkai4ga5')) {
      config.protocol = 'zcl';
      config.endpoints = {
        1: { clusters: [0, 1, 3, 4, 5, 6, 8, 18], bindings: [1, 4, 5, 6] },
        2: { clusters: [0, 3, 4, 5, 6, 18], bindings: [4, 5, 6] },
        3: { clusters: [0, 3, 4, 5, 6, 18], bindings: [4, 5, 6] },
        4: { clusters: [0, 3, 4, 5, 6, 18], bindings: [4, 5, 6] }
      };
      config.zclClusters = [4, 5, 6, 18]; // Groups + Scenes + OnOff + MultistateInput
      config.buttonLabels = ['upper_left', 'upper_right', 'lower_left', 'lower_right'];
      config.specialHandling = 'ts0044_scene_switch';
      return config;
    }

    // _TZ3000_5tqxpine - 4-button scene switch without battery (Eftychis report)
    if (equalsCI(manufacturerName, '_TZ3000_5tqxpine')) {
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
    if (startsWithCI(manufacturerName, '_TZ3000_')) {
      config.protocol = 'zcl';
      config.endpoints = {
        1: { clusters: [0, 1, 3, 6, 1280], bindings: [1, 6, 1280] }
      };
      config.zclClusters = [6, 1280]; // OnOff + IAS Zone

      // Multi-button support based on productId
      if (CI.includesCI(['TS0042', 'TS0043', 'TS0044'], productId)) {
        for (let i = 2; i <= parseInt(productId.slice(-1)) + 1; i++) {
          config.endpoints[i] = { clusters: [0, 3], bindings: [1] };
        }
      }
    }

    // === _TZ3400_ series - Scene controller ===
    else if (startsWithCI(manufacturerName, '_TZ3400_')) {
      config.protocol = 'mixed';
      config.endpoints = {
        1: { clusters: [0, 1, 3, 6, 5, CLUSTERS.TUYA_EF00], bindings: [1, 6, 5] }
      };
      config.zclClusters = [6, 5]; // OnOff + Scenes
      config.dpMappings = {
        1: { capability, internal: 'button_event' }
      };
    }

    return config;
  }

  /**
   * Configuration spÃ©cifique pour switch_
   * v5.5.522: BSEED TS0726 power source correction
   */
  static _getSwitchConfig(manufacturerName, productId, driverType) {
    const gangCount = parseInt(driverType.match(/\d+/)?.[0]) || 1;const config = {
      protocol: 'mixed',
      endpoints: {},
      bindings: {},
      dpMappings: {},
      zclClusters: [],
      capabilities: [],
      specialHandling
    };

    // Multi-gang capabilities
    for (let i = 1; i <= gangCount; i++) {
      config.capabilities.push(i === 1 ? 'onoff' : `onoff.gang${i}`);
    }

    // === _TZE200_ series - Pure Tuya DP ===
    if (startsWithCI(manufacturerName, '_TZE200_')) {
      config.protocol = 'tuya_dp';
      config.endpoints = {
        1: { clusters: [CLUSTERS.TUYA_EF00], bindings: [] }
      };

      // DP mappings for multi-gang
      for (let i = 1; i <= gangCount; i++) {
        config.dpMappings[i] = {
          capability: i === 1 ? 'onoff' : `onoff.gang${i}`,
          transform: (v) => Boolean(v)
        };
      }
    }

    // === _TZ3000_cauq1okq - Known 2-gang TS0002 needing tuya_dp (Piotr) ===
    else if (equalsCI(manufacturerName, '_TZ3000_cauq1okq')) {
      config.protocol = 'tuya_dp';
      config.endpoints = {
        1: { clusters: [CLUSTERS.TUYA_EF00], bindings: [] }
      };
      for (let i = 1; i <= gangCount; i++) {
        config.dpMappings[i] = {
          capability: i === 1 ? 'onoff' : `onoff.gang${i}`,
          transform: (v) => Boolean(v)
        };
      }
      config.specialHandling = 'tuya_dp_forced';
    }

    // === _TZ3000_ series - Standard ZCL ===
    else if (startsWithCI(manufacturerName, '_TZ3000_')) {
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

    // === _TZ3002_ series - BSEED switches (forum fix) ===
    else if (startsWithCI(manufacturerName, '_TZ3002_')) {
      config.protocol = 'mixed';
      config.endpoints = {
        1: { clusters: [0, 4, 5, 6, 8, CLUSTERS.TUYA_EF00, 2820], bindings: [1, 6] }
      };
      
      // BSEED TS0726 specific - needs additional endpoints with clusters 0xE000/0xE001
      if (equalsCI(manufacturerName, '_TZ3002_pzao9ls1') && equalsCI(productId, 'TS0726')) {
        for (let i = 2; i <= 4; i++) {
          config.endpoints[i] = { 
            clusters: [0, 3, 4, 5, 57344, 57345], // 0xE000, 0xE001 
            bindings: [6] 
          };
        }
        config.specialHandling = 'bseed_ts0726_4gang';
        config.powerSource = 'mains'; // Force mains power detection
      }
      
      config.zclClusters = [6, 8, 2820]; // OnOff + Level + ElectricalMeasurement
    }

    return config;
  }

  /**
   * Configuration spÃ©cifique pour sensors
   */
  static _getSensorConfig(manufacturerName, productId, driverType) {
    const config = {
      protocol: 'mixed',
      endpoints: { 1: { clusters: [0, 1], bindings: [1] } },
      bindings: {},
      dpMappings: {},
      zclClusters: [],
      capabilities: ['measure_battery'],
      specialHandling
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

    // === _TZE_ series - Tuya DP sensors (v5.8.1: includes _TZE200, _TZE204, _TZE284) ===
    if (startsWithCI(manufacturerName, '_TZE')) {
      config.protocol = 'tuya_dp';
      config.endpoints[1].clusters = [CLUSTERS.TUYA_EF00];
      config.endpoints[1].bindings = [];
      config.zclClusters = [];

      // Common Tuya sensor DPs
      config.dpMappings = {
        1: { capability: 'measure_temperature', divisor: 10 },
        2: { capability: 'measure_humidity', divisor: 1 },
        3: { capability: 'measure_battery', divisor: 1 },
        101: { capability: 'alarm_motion', transform: (v) => Boolean(v) }
      };
      
      // _TZE200_crq3r3la mmWave sensor (forum fix)
      if (equalsCI(manufacturerName, '_TZE200_crq3r3la')) {
        config.powerSource = 'mains'; // Force mains power detection
        config.capabilities = ['alarm_motion', 'measure_luminance.distance']; // Remove false temp/humidity
        config.dpMappings = {
          1: { capability: 'alarm_motion', transform: (v) => Boolean(v) },
          9: { capability: 'measure_luminance.distance', divisor: 100 }, // Distance in cm
          // Remove temperature/humidity DPs - sensor doesn't have these capabilities
          101: { capability, internal: 'sensitivity' },
          102: { capability, internal: 'detection_delay' }
        };
        config.specialHandling = 'mmwave_presence_mains';
      }

      // _TZE200_u6x1zyv2 Rain sensor (ZG-223Z)
      if (equalsCI(manufacturerName, '_TZE200_u6x1zyv2')) {
        config.capabilities = ['alarm_water', 'measure_luminance'];
        config.dpMappings = {
          101: { capability: 'alarm_water', transform: (v) => v === 0 ? false : true }, // 0=dry, 1=wet
          102: { capability: 'measure_luminance', divisor: 1 }
        };
        config.specialHandling = 'tuya_rain_sensor_standard';
      }
    }

    // === Contact sensor logic fixes (forum reports) ===
    if (driverType.includes('contact')) {
      // Some HOBEIAN sensors have inverted logic
      const INVERTED_CONTACT_IDS = [
        'HOBEIAN', // Forum report: Lasse_K
        '_TZ3000_n2egfsli', // Additional inverted logic sensors
        'ZG-102', // HOBEIAN ZG-102Z Product ID
        'ZG-222' // Other variants
      ];
      
      if (INVERTED_CONTACT_IDS.some(id => containsCI(manufacturerName, id) || containsCI(productId, id))) {
        config.capabilities.push('alarm_contact');
        config.specialHandling = 'contact_inverted_logic';
        config.dpMappings = {
          1: { 
            capability: 'alarm_contact', 
            transform: (v) => {
              // Inverted logic: 0=closed, 1=open (opposite of standard)
              if (typeof v === 'boolean') return !v;
              return !(v === 0 || v === 'open');
            },
            debounce: 500 
          }
        };
      }
    }

    return config;
  }

  /**
   * Applique la configuration dynamique Ã un device
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
   * VÃ©rifie si un manufacturerName nÃ©cessite une configuration spÃ©ciale
   */
  /**
   * v5.6.1: Configuration spÃ©cifique pour plugs avec scaling par marque
   * Sources: Zigbee2MQTT, Home Assistant Community, Homey Forum
   *
   * RÃˆGLE: Certaines marques reportent l'Ã©nergie en Wh au lieu de kWh
   * ou ont des diviseurs diffÃ©rents pour power / safeDivide(voltage, current)
   */
  static _getPlugConfig(manufacturerName, productId, driverType) {
    const config = {
      protocol: 'mixed',
      endpoints: { 1: { clusters: [0, 1, 6, 2820, 1794, CLUSTERS.TUYA_EF00], bindings: [6] } },
      dpMappings: {},
      zclClusters: [6, 2820, 1794], // OnOff + ElectricalMeasurement + Metering
      capabilities: ['onoff', 'measure_power', 'meter_power', 'measure_voltage', 'measure_current'],
      specialHandling,
      // v5.6.1: Energy scaling defaults by brand
      energyScaling: {
        power_divisor: 10,      // Default: raw value/10 = W
        voltage_divisor: 10,    // Default: raw value/10 = V
        current_divisor: 1000,  // Default: raw value/1000 = A (mA  A)
        energy_divisor: 100,    // Default: raw value/100 = kWh
        energy_multiplier: 1    // Default: no multiplier (1 = kWh, 0.001 = WhkWh)
      }
    };

    // 
    // LIDL SILVERCREST - Reports energy in Wh instead of kWh
    // Source: https:
    // ManufacturerNames: _TZ3000_ynmowqk2, _TZ3000_kdi2o9m6, _TZ3000_g5xawfcq
    // 
    const LIDL_SILVERCREST_IDS = [
      '_TZ3000_ynmowqk2', '_TZ3000_kdi2o9m6', '_TZ3000_g5xawfcq',
      '_TZ3000_typdpbpg', '_TZ3000_okaz9tjs', '_TZ3000_rdtixbnu'
    ];
    if (includesCI(LIDL_SILVERCREST_IDS, manufacturerName)) {
      config.energyScaling.energy_multiplier = 0.001; // Wh  kWh
      config.specialHandling = 'lidl_silvercrest_energy_wh';
      return config;
    }

    // 
    // NOUS A1Z - Standard Tuya scaling
    // Source: https:
    // 
    const NOUS_IDS = [
      '_TZ3000_cphmq0q7', '_TZ3000_ew3ldmgx', '_TZ3000_dpo1ysak',
      '_TZ3000_gjnozsaz', '_TZ3000_w0qqde0g'
    ];
    if (includesCI(NOUS_IDS, manufacturerName)) {
      // Standard scaling, no special handling needed
      config.specialHandling = 'nous_standard';
      return config;
    }

    // 
    // BLITZWOLF BW-SHP13 - Some versions have broken reporting
    // Source: https:
    // Needs polling instead of automatic reporting
    // 
    const BLITZWOLF_IDS = [
      '_TZ3000_amdymr7l', '_TZ3000_typdpbpg', '_TZ3000_zloso4jk'
    ];
    if (includesCI(BLITZWOLF_IDS, manufacturerName)) {
      config.specialHandling = 'blitzwolf_polling_required';
      config.pollingInterval = 60; // Poll every 60 seconds
      return config;
    }

    // 
    // MOES/BSEED - Some use Tuya DP instead of ZCL for energy
    // v5.5.522: BSEED TS0726 power correction
    // 
    const BSEED_MAINS_IDS = [
      '_TZ3002_pzao9ls1' // BSEED TS0726 4-gang switch
    ];
    if (includesCI(BSEED_MAINS_IDS, manufacturerName)) {
      config.powerSource = 'mains'; // Force mains power detection
      config.specialHandling = 'bseed_mains_powered';
      return config;
    }
    // Source: Zigbee2MQTT TS011F_plug_3
    // 
    const MOES_BSEED_IDS = [
      '_TZ3000_cehuw1lw', '_TZ3000_5f43h46b', '_TZ3000_yujkchbz',
      '_TZ3000_xkap8wtb', '_TZ3000_qeuvnohg'
    ];
    if (includesCI(MOES_BSEED_IDS, manufacturerName)) {
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

    // 
    // NEDIS SmartLife - Same as Lidl (Tuya OEM)
    // 
    const NEDIS_IDS = [
      '_TZ3000_w0qqde0g', '_TZ3000_u5u4cakc', '_TZ3000_hdopuwv6'
    ];
    if (includesCI(NEDIS_IDS, manufacturerName)) {
      config.specialHandling = 'nedis_standard';
      return config;
    }

    // 
    // ZEMISMART - High power plugs (30A) with different scaling
    // Source: https:
    // 
    const ZEMISMART_IDS = [
      '_TZ3000_f1bapcit', '_TZ3000_1h2x4akh', '_TZ3000_okaz9tjs'
    ];
    if (includesCI(ZEMISMART_IDS, manufacturerName)) {
      config.energyScaling.current_divisor = 100; // Different current scaling
      config.specialHandling = 'zemismart_high_power';
      return config;
    }

    // 
    // AUBESS/Generic - Standard Tuya TS011F
    // 
    const AUBESS_IDS = [
      '_TZ3000_cphmq0q7', '_TZ3000_ksw8qtmt', '_TZ3000_okaz9tjs',
      '_TZ3000_ps3dmato', '_TZ3000_dksbtrzs'
    ];
    if (includesCI(AUBESS_IDS, manufacturerName)) {
      config.specialHandling = 'aubess_standard';
      return config;
    }

    return config;
  }

  /**
   * v7.0.25: Internal config factory for key-based resolution
   */
  static _getConfigByKey(key, mfr, pid, type) {
    if (key === 'curtain_motor_standard') return this._getCurtainMotorConfig(mfr, pid);
    if (key === 'moes_roller_blind') {
      const c = this._getCurtainMotorConfig(mfr, pid);
      if (!c.capabilities.includes('windowcoverings_tilt_set')) {
        c.capabilities.push('windowcoverings_tilt_set');
      }
      c.specialHandling = 'moes_roller_blind';
      return c;
    }
    if (key === 'radar_mmwave_mains') {
      const c = this._getSensorConfig(mfr, pid, 'motion_sensor');
      c.powerSource = 'mains';
      c.capabilities = ['alarm_motion', 'measure_luminance.distance'];
      c.dpMappings = {
        1: { capability: 'alarm_motion', transform: (v) => Boolean(v) },
        9: { capability: 'measure_luminance.distance', divisor: 100 }, // cm to m
        101: { capability, internal: 'sensitivity' },
        102: { capability, internal: 'detection_delay' }
      };
      return c;
    }
    if (key === 'plug_moes_standard') return this._getPlugConfig(mfr, pid, 'plug');
    if (key === 'bseed_ts0726_4gang') return this._getSwitchConfig(mfr, pid, 'switch_4gang');
    if (key === 'tuya_soil_sensor_standard') {
      const c = this._getSensorConfig(mfr, pid, 'soil_sensor');
      c.dpMappings = {
        1: { capability: 'measure_temperature', divisor: 10 },
        2: { capability: 'measure_humidity', divisor: 1 },
        3: { capability: 'measure_temperature', divisor: 10 },
        4: { capability: 'measure_humidity', divisor: 1 },
        15: { capability: 'measure_battery', divisor: 1 }
      };
      return c;
    }
    return null;
  }


  /**
   * v5.11.99: Resolve expected driver type from productId
   * Same mfr can map to multiple drivers  productId disambiguates
   */
  static resolveDriverType(manufacturerName, productId) {
    if (!productId) return null;
    const p = productId;
    const map = {
      'TS0001': 'switch_1gang', 'TS0002': 'switch_2gang',
      'TS0003': 'switch_3gang', 'TS0004': 'switch_4gang',
      'TS0011': 'switch_1gang', 'TS0012': 'switch_2gang',
      'TS0013': 'switch_3gang', 'TS0014': 'switch_4gang',
      'TS0041': 'button_wireless_1', 'TS0042': 'button_wireless_2',
      'TS0043': 'button_wireless_3', 'TS0044': 'button_wireless_4',
      'TS004F': 'button_wireless_4', // Added for completeness
      'TS0501': 'light_dimmer', 'TS0502': 'light_ct',
      'TS0503': 'light_rgb', 'TS0504': 'light_rgbcct',
      'TS011F': 'plug_energy_monitor', 'TS0121': 'plug_energy_monitor',
      'TS0101': 'plug', 'TS0201': 'temp_humidity_sensor',
      'TS0202': 'motion_sensor', 'TS0203': 'contact_sensor',
      'TS0205': 'smoke_sensor', 'TS0207': 'water_sensor',
      'TS0216': 'siren', 'TS1201': 'ir_remote',
    };
    
    // Case-insensitive lookup
    for (const [key, value] of Object.entries(map)) {
      if (CI.equalsCI(key, p)) return value;
    }
    return null;
  }

  static needsSpecialConfig(manufacturerName, productId, driverType) {
    // Patterns nÃ©cessitant une configuration dynamique
    const specialPatterns = [
      '_TZE200_', '_TZE204_', '_TZE284_', // Pure Tuya DP
      '_TZ3000_', '_TZ3210_', '_TZ3400_', // Mixed protocols
      'Benexmart', 'Dooya', 'MOES'        // Legacy brands
    ];

    return specialPatterns.some(pattern => containsCI(manufacturerName, pattern));
  }
}

module.exports = ManufacturerVariationManager;


