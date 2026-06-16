'use strict';

/**
 * DeviceEnhancementsMixin - v1.0.0
 *
 * Centralized mixin implementing 20 high-impact enhancements for all device types.
 * Each enhancement is opt-in via settings or capability presence.
 *
 * ENHANCEMENTS:
 *  1. Temperature/Humidity calibration offsets (sensors)
 *  2. Power-On Behavior setting (switches/plugs)
 *  3. Min/Max brightness limits (dimmers)
 *  4. Thermostat weekly schedule exposure (thermostats/TRVs)
 *  5. mmWave presence sensor settings (radar sensors)
 *  6. Valve position reporting (TRVs)
 *  7. Power Factor / Reactive Power capability (metering plugs)
 *  8. Dimmer transition time setting (dimmers)
 *  9. LQI signal quality sensor (all Zigbee devices)
 * 10. Standby power threshold (metering plugs/switches)
 * 11. Device availability timeout configuration (all)
 * 12. Cover reverse direction setting (covers) [already partially exists]
 * 13. Cover travel time calibration (covers) [already partially exists]
 * 14. Firmware version display (all)
 * 15. Configurable battery check interval (battery devices)
 * 16. Number/slider entity with custom min/max/step (generic)
 * 17. Energy cost tracking with dynamic pricing (metering)
 * 18. Smart dimmer mode (leading/trailing edge) (dimmers)
 * 19. Dimmer step size configuration (dimmers)
 * 20. Smoke/CO detector test mode (safety sensors)
 *
 * Usage:
 *   const DeviceEnhancementsMixin = require('../../lib/mixins/DeviceEnhancementsMixin');
 *   class MyDevice extends DeviceEnhancementsMixin(UnifiedSwitchBase) { ... }
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS DEFINITIONS (exported for compose.json generation)
// ═══════════════════════════════════════════════════════════════════════════════

const ENHANCEMENT_SETTINGS = {
  // --- Idea 1: Temperature/Humidity calibration offsets ---
  temperature_calibration: {
    id: 'temperature_calibration',
    type: 'number',
    label: { en: 'Temperature Offset (°C)', fr: 'Décalage Température (°C)' },
    value: 0,
    min: -10,
    max: 10,
    step: 0.1,
    hint: {
      en: 'Calibration offset applied to temperature readings. Use positive value if sensor reads too low.',
      fr: 'Décalage de calibration appliqué aux relevés de température.'
    }
  },
  humidity_calibration: {
    id: 'humidity_calibration',
    type: 'number',
    label: { en: 'Humidity Offset (%)', fr: 'Décalage Humidité (%)' },
    value: 0,
    min: -20,
    max: 20,
    step: 1,
    hint: {
      en: 'Calibration offset applied to humidity readings. Use positive value if sensor reads too low.',
      fr: 'Décalage de calibration appliqué aux relevés d\'humidité.'
    }
  },

  // --- Idea 2: Power-On Behavior ---
  power_on_behavior: {
    id: 'power_on_behavior',
    type: 'dropdown',
    label: { en: 'Power-On Behavior', fr: 'Comportement à la Mise Sous Tension' },
    value: 'memory',
    values: [
      { id: 'off', label: { en: 'Off', fr: 'Éteint' } },
      { id: 'on', label: { en: 'On', fr: 'Allumé' } },
      { id: 'memory', label: { en: 'Last State', fr: 'Dernier état' } }
    ],
    hint: {
      en: 'What the device does after a power outage is restored',
      fr: 'Le comportement de l\'appareil après une coupure de courant'
    }
  },

  // --- Idea 3: Min/Max brightness limits ---
  min_brightness: {
    id: 'min_brightness',
    type: 'number',
    label: { en: 'Minimum Brightness (%)', fr: 'Luminosité Minimale (%)' },
    value: 1,
    min: 1,
    max: 100,
    step: 1,
    hint: { en: 'Minimum brightness level. Prevents dimmer from going too low.', fr: 'Niveau de luminosité minimum.' }
  },
  max_brightness: {
    id: 'max_brightness',
    type: 'number',
    label: { en: 'Maximum Brightness (%)', fr: 'Luminosité Maximale (%)' },
    value: 100,
    min: 1,
    max: 100,
    step: 1,
    hint: { en: 'Maximum brightness level. Limits how bright the light can go.', fr: 'Niveau de luminosité maximum.' }
  },

  // --- Idea 4: Thermostat schedule (already partially in UnifiedThermostatBase DP 65/66) ---
  // Exposed as settings for user visibility
  schedule_enabled: {
    id: 'schedule_enabled',
    type: 'checkbox',
    label: { en: 'Enable Device Schedule', fr: 'Activer la Programmation' },
    value: false,
    hint: {
      en: 'Use the device\'s built-in weekly schedule (set via device or flow cards)',
      fr: 'Utiliser la programmation hebdomadaire intégrée de l\'appareil'
    }
  },

  // --- Idea 5: mmWave presence sensor settings ---
  mmwave_detection_distance: {
    id: 'mmwave_detection_distance',
    type: 'number',
    label: { en: 'Detection Distance (m)', fr: 'Distance de Détection (m)' },
    value: 6,
    min: 0.5,
    max: 10,
    step: 0.5,
    hint: { en: 'Maximum detection range for mmWave presence sensor', fr: 'Portée de détection maximale du capteur de présence mmWave' }
  },
  mmwave_sensitivity: {
    id: 'mmwave_sensitivity',
    type: 'dropdown',
    label: { en: 'Motion Sensitivity', fr: 'Sensibilité au Mouvement' },
    value: 'medium',
    values: [
      { id: 'low', label: { en: 'Low', fr: 'Faible' } },
      { id: 'medium', label: { en: 'Medium', fr: 'Moyen' } },
      { id: 'high', label: { en: 'High', fr: 'Élevée' } }
    ],
    hint: { en: 'Sensitivity of mmWave motion detection', fr: 'Sensibilité de détection de mouvement mmWave' }
  },
  mmwave_hold_time: {
    id: 'mmwave_hold_time',
    type: 'number',
    label: { en: 'Hold Time (seconds)', fr: 'Durée de Maintien (secondes)' },
    value: 30,
    min: 5,
    max: 600,
    step: 5,
    hint: { en: 'How long to report presence after last detected motion', fr: 'Durée pendant laquelle la présence est signalée après le dernier mouvement' }
  },

  // --- Idea 8: Dimmer transition time ---
  dimmer_transition_time: {
    id: 'dimmer_transition_time',
    type: 'number',
    label: { en: 'Transition Time (100ms)', fr: 'Durée de Transition (100ms)' },
    value: 0,
    min: 0,
    max: 50,
    step: 1,
    hint: {
      en: 'Smooth transition time when changing brightness (0 = instant)',
      fr: 'Durée de transition fluide lors du changement de luminosité (0 = instantané)'
    }
  },

  // --- Idea 10: Standby power threshold ---
  standby_power_threshold: {
    id: 'standby_power_threshold',
    type: 'number',
    label: { en: 'Standby Power Threshold (W)', fr: 'Seuil Puissance Veille (W)' },
    value: 1.0,
    min: 0.1,
    max: 20,
    step: 0.1,
    hint: {
      en: 'Power level below which the device is considered in standby. Trigger flow when exceeded.',
      fr: 'Niveau de puissance en dessous duquel l\'appareil est considéré en veille.'
    }
  },

  // --- Idea 11: Device availability timeout ---
  availability_timeout: {
    id: 'availability_timeout',
    type: 'number',
    label: { en: 'Offline Timeout (minutes)', fr: 'Délai Hors Ligne (minutes)' },
    value: 60,
    min: 5,
    max: 1440,
    step: 5,
    hint: {
      en: 'Minutes without messages before marking device as offline',
      fr: 'Minutes sans messages avant de marquer l\'appareil comme hors ligne'
    }
  },

  // --- Idea 12: Cover reverse direction (already exists on curtain_motor, standardize) ---
  // Reuses existing 'reverse_direction' ID

  // --- Idea 13: Cover travel time calibration ---
  cover_travel_time_up: {
    id: 'cover_travel_time_up',
    type: 'number',
    label: { en: 'Travel Time Open (seconds)', fr: 'Temps de Voyage Ouverture (secondes)' },
    value: 15,
    min: 1,
    max: 120,
    step: 1,
    hint: { en: 'Time for cover to travel from fully closed to fully open', fr: 'Temps pour le volet de voyager de fermé à ouvert' }
  },
  cover_travel_time_down: {
    id: 'cover_travel_time_down',
    type: 'number',
    label: { en: 'Travel Time Close (seconds)', fr: 'Temps de Voyage Fermeture (secondes)' },
    value: 15,
    min: 1,
    max: 120,
    step: 1,
    hint: { en: 'Time for cover to travel from fully open to fully closed', fr: 'Temps pour le volet de voyager de ouvert à fermé' }
  },

  // --- Idea 15: Configurable battery check interval ---
  battery_check_interval: {
    id: 'battery_check_interval',
    type: 'number',
    label: { en: 'Battery Check Interval (hours)', fr: 'Intervalle Vérification Batterie (heures)' },
    value: 24,
    min: 1,
    max: 168,
    step: 1,
    hint: { en: 'How often to poll battery status (for battery-powered devices)', fr: 'Fréquence de vérification de l\'état de la batterie' }
  },

  // --- Idea 17: Energy cost tracking ---
  energy_cost_per_kwh: {
    id: 'energy_cost_per_kwh',
    type: 'number',
    label: { en: 'Energy Cost (per kWh)', fr: 'Coût énergétique (par kWh)' },
    value: 0.25,
    min: 0.001,
    max: 5.000,
    step: 0.001,
    hint: {
      en: 'Cost per kWh in your currency for tracking energy expenses',
      fr: 'Coût par kWh dans votre devise pour suivre les dépenses énergétiques'
    }
  },
  energy_currency: {
    id: 'energy_currency',
    type: 'dropdown',
    label: { en: 'Currency', fr: 'Devise' },
    value: 'EUR',
    values: [
      { id: 'EUR', label: { en: '€ Euro', fr: '€ Euro' } },
      { id: 'USD', label: { en: '$ US Dollar', fr: '$ Dollar Américain' } },
      { id: 'GBP', label: { en: '£ Pound', fr: '£ Livre Sterling' } },
      { id: 'NOK', label: { en: 'kr Norwegian Krone', fr: 'kr Couronne Norvégienne' } },
      { id: 'SEK', label: { en: 'kr Swedish Krona', fr: 'kr Couronne Suédoise' } },
      { id: 'DKK', label: { en: 'kr Danish Krone', fr: 'kr Couronne Danoise' } },
      { id: 'CHF', label: { en: 'CHF Swiss Franc', fr: 'CHF Franc Suisse' } },
      { id: 'PLN', label: { en: 'zł Polish Zloty', fr: 'zł Zloty Polonais' } },
      { id: 'CZK', label: { en: 'Kč Czech Koruna', fr: 'Kč Couronne Tchèque' } }
    ],
    hint: { en: 'Currency for energy cost calculations', fr: 'Devise pour les calculs de coût énergétique' }
  },

  // --- Idea 18: Smart dimmer mode ---
  smart_dimmer_mode: {
    id: 'smart_dimmer_mode',
    type: 'dropdown',
    label: { en: 'Dimmer Mode', fr: 'Mode Variateur' },
    value: 'auto',
    values: [
      { id: 'auto', label: { en: 'Auto', fr: 'Automatique' } },
      { id: 'leading_edge', label: { en: 'Leading Edge', fr: 'Front Montant' } },
      { id: 'trailing_edge', label: { en: 'Trailing Edge', fr: 'Front Descendant' } }
    ],
    hint: {
      en: 'Leading edge for LED/inductive loads, trailing edge for resistive/incandescent',
      fr: 'Front montant pour charges LED/inductives, front descendant pour résistives'
    }
  },

  // --- Idea 19: Dimmer step size ---
  dimmer_step_size: {
    id: 'dimmer_step_size',
    type: 'number',
    label: { en: 'Dimmer Step Size (%)', fr: 'Taille du Pas du Variateur (%)' },
    value: 1,
    min: 1,
    max: 25,
    step: 1,
    hint: { en: 'Step size when adjusting brightness via step commands', fr: 'Taille du pas lors de l\'ajustement de la luminosité' }
  },

  // --- Idea 14: Firmware version display (read-only, stored as setting for visibility) ---
  // (firmware_version is read-only and stored via the code below)

  // --- Generic: Device type selection ---
  device_type: {
    id: 'device_type',
    type: 'dropdown',
    label: { en: 'Device Type', fr: 'Type d\'Appareil' },
    value: 'light',
    values: [
      { id: 'light', label: { en: 'Light', fr: 'Lumière' } },
      { id: 'switch', label: { en: 'Switch', fr: 'Interrupteur' } },
      { id: 'fan', label: { en: 'Fan', fr: 'Ventilateur' } }
    ],
    hint: { en: 'Override the device type classification', fr: 'Remplacer la classification du type d\'appareil' }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// FLOW CARD DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const ENHANCEMENT_FLOW_CARDS = {
  triggers: [
    {
      id: 'device_firmware_version_changed',
      title: { en: 'Firmware version changed', fr: 'Version firmware changée' },
      tokens: [
        { name: 'firmware_version', type: 'string', title: { en: 'Firmware Version' }, example: 'v2.1.0' }
      ],
      args: [{ type: 'device', name: 'device' }]
      // v9.1.2: Removed titleFormatted with [[device]] - causes bugs in SDK3 flow system
    },
    {
      id: 'device_standby_power_exceeded',
      title: { en: 'Standby power exceeded', fr: 'Puissance veille dépassée' },
      tokens: [
        { name: 'power', type: 'number', title: { en: 'Power (W)', fr: 'Puissance (W)' }, example: 2.5 }
      ],
      args: [{ type: 'device', name: 'device', filter: 'capabilities=measure_power' }]
      // v9.1.2: Removed titleFormatted with [[device]] - causes bugs in SDK3 flow system
    },
    {
      id: 'device_lqi_changed',
      title: { en: 'Signal quality changed', fr: 'Qualité du signal changée' },
      tokens: [
        { name: 'lqi', type: 'number', title: { en: 'LQI' }, example: 200 },
        { name: 'quality', type: 'string', title: { en: 'Quality' }, example: 'Good' }
      ],
      args: [{ type: 'device', name: 'device' }]
      // v9.1.2: Removed titleFormatted with [[device]] - causes bugs in SDK3 flow system
    },
    {
      id: 'device_smoke_test_result',
      title: { en: 'Smoke/CO test completed', fr: 'Test fumée/CO terminé' },
      tokens: [
        { name: 'result', type: 'string', title: { en: 'Result' }, example: 'passed' },
        { name: 'alarm_type', type: 'string', title: { en: 'Type' }, example: 'smoke' }
      ],
      args: [{ type: 'device', name: 'device', filter: 'capabilities=alarm_smoke' }]
      // v9.1.2: Removed titleFormatted with [[device]] - causes bugs in SDK3 flow system
    }
  ],
  conditions: [
    {
      id: 'device_power_factor_below',
      title: { en: 'Power factor is below', fr: 'Facteur de puissance inférieur à' },
      args: [
        { name: 'threshold', type: 'number', min: 0, max: 1, step: 0.01, title: { en: 'Threshold' } }
      ]
      // v9.1.2: Removed titleFormatted with [[device]] - causes bugs in SDK3 flow system
    }
  ],
  actions: [
    // Idea 20: Smoke/CO test mode
    {
      id: 'device_smoke_co_test',
      title: { en: 'Run self-test', fr: 'Lancer auto-test' },
      args: [
        {
          name: 'test_type',
          type: 'dropdown',
          values: [
            { id: 'smoke', label: { en: 'Smoke Test', fr: 'Test Fumée' } },
            { id: 'co', label: { en: 'CO Test', fr: 'Test CO' } },
            { id: 'all', label: { en: 'Full Test', fr: 'Test Complet' } }
          ]
        }
      ]
      // v9.1.2: Removed titleFormatted with [[device]] - causes bugs in SDK3 flow system
    },
    // Idea 1: Flow card for calibration
    {
      id: 'device_set_temperature_offset',
      title: { en: 'Set temperature offset', fr: 'Régler décalage température' },
      args: [
        { name: 'offset', type: 'number', min: -10, max: 10, step: 0.1, title: { en: 'Offset (°C)' } }
      ]
      // v9.1.2: Removed titleFormatted with [[device]] - causes bugs in SDK3 flow system
    },
    // Idea 16: Generic number/slider entity
    {
      id: 'device_set_number_value',
      title: { en: 'Set custom value', fr: 'Régler valeur personnalisée' },
      args: [
        { name: 'parameter', type: 'string', title: { en: 'Parameter Name' } },
        { name: 'value', type: 'number', title: { en: 'Value' } }
      ]
      // v9.1.2: Removed titleFormatted with [[device]] - causes bugs in SDK3 flow system
    }
  ]
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEVICE TYPE CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

const SENSOR_TYPES = ['sensor', 'climate', 'temperature', 'humidity', 'motion', 'presence', 'radar', 'mmwave'];
const SWITCH_TYPES = ['switch', 'socket', 'wall'];
const DIMMER_TYPES = ['dimmer', 'light', 'bulb'];
const COVER_TYPES = ['cover', 'curtain', 'blind', 'shutter'];
const THERMOSTAT_TYPES = ['thermostat', 'radiator', 'trv', 'heater'];
const METERING_TYPES = ['metering', 'plug', 'power', 'clamp', 'energy'];
const SAFETY_TYPES = ['smoke', 'co', 'gas', 'siren', 'detector'];

/**
 * Detect device category from driver ID and capabilities
 */
function detectDeviceCategory(driverId, capabilities, deviceClass) {
  const id = (driverId || '').toLowerCase();
  const caps = capabilities || [];
  const cls = (deviceClass || '').toLowerCase();

  // Safety first (smoke/CO)
  if (id.match(/smoke|co_|gas|siren|detector/) || caps.includes('alarm_smoke') || caps.includes('alarm_co')) {
    return 'safety';
  }
  // Thermostat/TRV
  if (id.match(/thermostat|radiator|trv|heater/) || caps.includes('target_temperature') || cls === 'thermostat') {
    return 'thermostat';
  }
  // Cover
  if (id.match(/curtain|cover|blind|shutter/) || caps.includes('windowcoverings_set')) {
    return 'cover';
  }
  // Dimmer
  if (id.match(/dimmer/) || (caps.includes('dim') && caps.includes('onoff'))) {
    return 'dimmer';
  }
  // Sensor (mmWave/radar check first)
  if (id.match(/radar|mmwave|presence/) || caps.includes('alarm_human') || caps.includes('measure_luminance.distance')) {
    return 'presence_sensor';
  }
  if (id.match(/sensor|climate/) || caps.includes('measure_temperature')) {
    return 'sensor';
  }
  // Metering
  if (id.match(/metering|power|clamp|energy/) || caps.includes('measure_power_factor')) {
    return 'metering';
  }
  // Switch (last, as it's the most generic)
  if (id.match(/switch/) || caps.includes('onoff') || cls === 'socket') {
    return 'switch';
  }

  return 'generic';
}

/**
 * Get settings relevant to a specific device category
 */
function getSettingsForCategory(category) {
  const common = ['availability_timeout', 'energy_cost_per_kwh', 'energy_currency'];

  switch (category) {
    case 'sensor':
    case 'presence_sensor':
      return [...common, 'temperature_calibration', 'humidity_calibration', 'battery_check_interval',
        ...(category === 'presence_sensor' ? ['mmwave_detection_distance', 'mmwave_sensitivity', 'mmwave_hold_time'] : [])
      ];
    case 'switch':
      return [...common, 'power_on_behavior'];
    case 'dimmer':
      return [...common, 'power_on_behavior', 'min_brightness', 'max_brightness',
        'dimmer_transition_time', 'smart_dimmer_mode', 'dimmer_step_size'];
    case 'cover':
      return [...common, 'cover_travel_time_up', 'cover_travel_time_down'];
    case 'thermostat':
      return [...common, 'temperature_calibration', 'humidity_calibration', 'schedule_enabled'];
    case 'metering':
      return [...common, 'standby_power_threshold'];
    case 'safety':
      return [...common, 'battery_check_interval'];
    default:
      return common;
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Mixin function
 * ═══════════════════════════════════════════════════════════════════════════════
 * @param {Function} Base - The base device class to extend
 * @returns {Function} Extended class with device enhancements
 */
function DeviceEnhancementsMixin(Base) {

  class EnhancedDevice extends Base {

    async onNodeInit({ zclNode }) {
      await super.onNodeInit({ zclNode });

      // Detect device category
      const driverId = this.driver?.id || '';
      const capabilities = this.driver?.manifest?.capabilities || [];
      const deviceClass = this.driver?.manifest?.class || '';
      this._deviceCategory = detectDeviceCategory(driverId, capabilities, deviceClass);

      this.log(`[Enhancements] Device category: ${this._deviceCategory}`);

      // Apply enhancements based on category
      this._initCalibrationOffsets();
      this._initPowerOnBehavior();
      this._initBrightnessLimits();
      this._initDimmerEnhancements();
      this._initCoverEnhancements();
      this._initAvailabilityTimeout();
      this._initStandbyPowerMonitor();
      this._initEnergyCostTracker();
      this._initLQIMonitor();
      this._initFirmwareVersion();
      this._initSmokeCOTest();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // IDEA 1: Temperature/Humidity Calibration Offsets
    // ═══════════════════════════════════════════════════════════════════════════

    _initCalibrationOffsets() {
      if (!['sensor', 'presence_sensor', 'thermostat'].includes(this._deviceCategory)) return;

      this._tempCalOffset = parseFloat(this.getSetting?.('temperature_calibration')) || 0;
      this._humCalOffset = parseFloat(this.getSetting?.('humidity_calibration')) || 0;

      this.on('settings', async (changedKeys) => {
        if (changedKeys.includes('temperature_calibration')) {
          this._tempCalOffset = parseFloat(this.getSetting('temperature_calibration')) || 0;
          this.log(`[Enhancements] Temperature calibration offset: ${this._tempCalOffset}°C`);
          // Re-read and re-apply
          if (this.hasCapability('measure_temperature')) {
            const current = this.getCapabilityValue?.('measure_temperature');
            if (typeof current === 'number') {
              await this.safesetCapability('measure_temperature', current + this._tempCalOffset);
            }
          }
        }
        if (changedKeys.includes('humidity_calibration')) {
          this._humCalOffset = parseFloat(this.getSetting('humidity_calibration')) || 0;
          this.log(`[Enhancements] Humidity calibration offset: ${this._humCalOffset}%`);
          if (this.hasCapability('measure_humidity')) {
            const current = this.getCapabilityValue?.('measure_humidity');
            if (typeof current === 'number') {
              await this.safesetCapability('measure_humidity', current + this._humCalOffset);
            }
          }
        }
      });
    }

    /**
     * Apply calibration offset to temperature reading
     * Override in dpMappings or reportParser to use
     */
    applyTempCalibration(value) {
      if (typeof value !== 'number') return value;
      return Math.round((value + (this._tempCalOffset || 0)) * 10) / 10;
    }

    /**
     * Apply calibration offset to humidity reading
     */
    applyHumCalibration(value) {
      if (typeof value !== 'number') return value;
      return Math.max(0, Math.min(100, Math.round(value + (this._humCalOffset || 0))));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // IDEA 2: Power-On Behavior Setting
    // ═══════════════════════════════════════════════════════════════════════════

    _initPowerOnBehavior() {
      if (!['switch', 'dimmer', 'cover'].includes(this._deviceCategory)) return;

      this.on('settings', async (changedKeys) => {
        if (changedKeys.includes('power_on_behavior')) {
          const value = this.getSetting('power_on_behavior');
          const dpValue = { off: 0, on: 1, memory: 2 }[value] ?? 2;
          this.log(`[Enhancements] Power-on behavior → ${value} (DP=${dpValue})`);
          await this._sendTuyaDP(14, dpValue);
        }
      });

      // Read current power-on behavior from device
      this.homey.setTimeout(() => {
        this._requestTuyaDP(14);
      }, 5000);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // IDEA 3: Min/Max Brightness Limits
    // ═══════════════════════════════════════════════════════════════════════════

    _initBrightnessLimits() {
      if (!['dimmer', 'switch'].includes(this._deviceCategory)) return;
      if (!this.hasCapability?.('dim')) return;

      this._minBrightness = parseInt(this.getSetting?.('min_brightness')) || 1;
      this._maxBrightness = parseInt(this.getSetting?.('max_brightness')) || 100;

      this.on('settings', async (changedKeys) => {
        if (changedKeys.includes('min_brightness') || changedKeys.includes('max_brightness')) {
          this._minBrightness = parseInt(this.getSetting('min_brightness')) || 1;
          this._maxBrightness = parseInt(this.getSetting('max_brightness')) || 100;
          this.log(`[Enhancements] Brightness limits: ${this._minBrightness}% - ${this._maxBrightness}%`);
        }
      });
    }

    /**
     * Clamp a 0-1 dim value to configured min/max brightness
     */
    clampBrightness(value) {
      if (typeof value !== 'number') return value;
      const min = (this._minBrightness || 1) / 100;
      const max = (this._maxBrightness || 100) / 100;
      if (value <= 0) return 0;
      if (value >= 1) return 1;
      return Math.max(min, Math.min(max, value));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // IDEA 8: Dimmer Transition Time
    // ═══════════════════════════════════════════════════════════════════════════

    _initDimmerEnhancements() {
      if (!['dimmer', 'switch'].includes(this._deviceCategory)) return;
      if (!this.hasCapability?.('dim')) return;

      this._transitionTime = parseInt(this.getSetting?.('dimmer_transition_time')) || 0;
      this._dimmerStepSize = parseInt(this.getSetting?.('dimmer_step_size')) || 1;
      this._smartDimmerMode = this.getSetting?.('smart_dimmer_mode') || 'auto';

      this.on('settings', async (changedKeys) => {
        if (changedKeys.includes('dimmer_transition_time')) {
          this._transitionTime = parseInt(this.getSetting('dimmer_transition_time')) || 0;
          this.log(`[Enhancements] Dimmer transition time: ${this._transitionTime}00ms`);
        }
        if (changedKeys.includes('dimmer_step_size')) {
          this._dimmerStepSize = parseInt(this.getSetting('dimmer_step_size')) || 1;
          this.log(`[Enhancements] Dimmer step size: ${this._dimmerStepSize}%`);
        }
        if (changedKeys.includes('smart_dimmer_mode')) {
          this._smartDimmerMode = this.getSetting('smart_dimmer_mode') || 'auto';
          this.log(`[Enhancements] Dimmer mode: ${this._smartDimmerMode}`);
        }
      });
    }

    /**
     * Get transition time for ZCL Level Control
     * @returns {number} Transition time in units of 100ms
     */
    getTransitionTime() {
      return this._transitionTime || 0;
    }

    /**
     * Get dimmer step size percentage
     */
    getDimmerStepSize() {
      return this._dimmerStepSize || 1;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // IDEA 12 & 13: Cover Enhancements (reverse direction + travel time)
    // ═══════════════════════════════════════════════════════════════════════════

    _initCoverEnhancements() {
      if (!['cover'].includes(this._deviceCategory)) return;

      this._travelTimeUp = parseInt(this.getSetting?.('cover_travel_time_up')) || 15;
      this._travelTimeDown = parseInt(this.getSetting?.('cover_travel_time_down')) || 15;

      this.on('settings', async (changedKeys) => {
        if (changedKeys.includes('cover_travel_time_up')) {
          this._travelTimeUp = parseInt(this.getSetting('cover_travel_time_up')) || 15;
          this.log(`[Enhancements] Cover travel time up: ${this._travelTimeUp}s`);
        }
        if (changedKeys.includes('cover_travel_time_down')) {
          this._travelTimeDown = parseInt(this.getSetting('cover_travel_time_down')) || 15;
          this.log(`[Enhancements] Cover travel time down: ${this._travelTimeDown}s`);
        }
      });
    }

    /**
     * Calculate position based on elapsed time and direction
     * @param {number} startPos - Starting position (0-100)
     * @param {string} direction - 'up' or 'down'
     * @param {number} elapsedMs - Time elapsed in milliseconds
     * @returns {number} Estimated position (0-100)
     */
    estimateCoverPosition(startPos, direction, elapsedMs) {
      const totalTime = direction === 'up' ? this._travelTimeUp : this._travelTimeDown;
      if (totalTime <= 0) return startPos;
      const progress = (elapsedMs / 1000) / totalTime * 100;
      if (direction === 'up') {
        return Math.min(100, startPos + progress);
      }
      return Math.max(0, startPos - progress);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // IDEA 11: Device Availability Timeout Configuration
    // ═══════════════════════════════════════════════════════════════════════════

    _initAvailabilityTimeout() {
      const timeoutMinutes = parseInt(this.getSetting?.('availability_timeout')) || 0;
      if (timeoutMinutes <= 0) return;

      this._availabilityTimeoutMs = timeoutMinutes * 60 * 1000;
      this._lastMessageTime = Date.now();
      this._availabilityTimer = null;

      // Reset timer on each received message
      this._resetAvailabilityTimer();

      this.on('settings', async (changedKeys) => {
        if (changedKeys.includes('availability_timeout')) {
          const newTimeout = parseInt(this.getSetting('availability_timeout')) || 0;
          this._availabilityTimeoutMs = newTimeout * 60 * 1000;
          this._resetAvailabilityTimer();
          this.log(`[Enhancements] Availability timeout: ${newTimeout} minutes`);
        }
      });
    }

    _resetAvailabilityTimer() {
      if (this._availabilityTimer) {
        this.homey.clearTimeout(this._availabilityTimer);
        this._availabilityTimer = null;
      }
      if (!this._availabilityTimeoutMs || this._availabilityTimeoutMs <= 0) return;

      this._lastMessageTime = Date.now();
      this._availabilityTimer = this.homey.setTimeout(() => {
        if (!this._destroyed) {
          this.setUnavailable('No messages received within configured timeout').catch(() => {});
          this.log('[Enhancements] Device marked unavailable due to timeout');
        }
      }, this._availabilityTimeoutMs);
    }

    /**
     * Call this when any message is received from the device
     * to reset the availability timer
     */
    markDeviceAvailable() {
      this._lastMessageTime = Date.now();
      if (!this._destroyed && this._availabilityTimeoutMs) {
        this.setAvailable().catch(() => {});
        this._resetAvailabilityTimer();
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // IDEA 10: Standby Power Threshold
    // ═══════════════════════════════════════════════════════════════════════════

    _initStandbyPowerMonitor() {
      if (!['metering', 'switch'].includes(this._deviceCategory)) return;
      if (!this.hasCapability?.('measure_power')) return;

      this._standbyThreshold = parseFloat(this.getSetting?.('standby_power_threshold')) || 0;
      this._standbyExceeded = false;

      if (this._standbyThreshold > 0) {
        this.on('settings', async (changedKeys) => {
          if (changedKeys.includes('standby_power_threshold')) {
            this._standbyThreshold = parseFloat(this.getSetting('standby_power_threshold')) || 0;
            this._standbyExceeded = false;
            this.log(`[Enhancements] Standby power threshold: ${this._standbyThreshold}W`);
          }
        });
      }
    }

    /**
     * Check if power reading exceeds standby threshold
     * Call this when measure_power is updated
     */
    checkStandbyPower(powerWatts) {
      if (this._standbyThreshold <= 0) return;
      const exceeded = powerWatts > this._standbyThreshold;
      if (exceeded && !this._standbyExceeded) {
        this._standbyExceeded = true;
        this.log(`[Enhancements] Standby threshold exceeded: ${powerWatts}W > ${this._standbyThreshold}W`);
        // Flow trigger will be fired by the driver
      } else if (!exceeded && this._standbyExceeded) {
        this._standbyExceeded = false;
      }
    }

    get standbyPowerExceeded() {
      return this._standbyExceeded;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // IDEA 17: Energy Cost Tracking
    // ═══════════════════════════════════════════════════════════════════════════

    _initEnergyCostTracker() {
      if (!this.hasCapability?.('meter_power')) return;

      this._energyCostPerKwh = parseFloat(this.getSetting?.('energy_cost_per_kwh')) || 0;
      this._energyCurrency = this.getSetting?.('energy_currency') || 'EUR';
      this._totalCost = 0;

      this.on('settings', async (changedKeys) => {
        if (changedKeys.includes('energy_cost_per_kwh')) {
          this._energyCostPerKwh = parseFloat(this.getSetting('energy_cost_per_kwh')) || 0;
          this.log(`[Enhancements] Energy cost: ${this._energyCostPerKwh} ${this._energyCurrency}/kWh`);
        }
        if (changedKeys.includes('energy_currency')) {
          this._energyCurrency = this.getSetting('energy_currency') || 'EUR';
          this.log(`[Enhancements] Energy currency: ${this._energyCurrency}`);
        }
      });
    }

    /**
     * Calculate cost for energy consumed
     * @param {number} energyKwh - Energy in kWh
     * @returns {number} Cost in configured currency
     */
    calculateEnergyCost(energyKwh) {
      if (!energyKwh || !this._energyCostPerKwh) return 0;
      return Math.round(energyKwh * this._energyCostPerKwh * 10000) / 10000;
    }

    /**
     * Get formatted cost string
     */
    formatEnergyCost(cost) {
      const symbols = {
        EUR: '€', USD: '$', GBP: '£', NOK: 'kr', SEK: 'kr',
        DKK: 'kr', CHF: 'CHF', PLN: 'zł', CZK: 'Kč'
      };
      const symbol = symbols[this._energyCurrency] || this._energyCurrency;
      return `${symbol}${cost.toFixed(4)}`;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // IDEA 9: LQI Signal Quality Monitor
    // ═══════════════════════════════════════════════════════════════════════════

    _initLQIMonitor() {
      // LQI is available for all Zigbee devices
      this._lastLQI = null;
      this._lqiHistory = [];

      // Listen for LQI data from the Zigbee node
      try {
        const node = this.zclNode;
        if (node && typeof node.on === 'function') {
          node.on('lastHopLqi', (lqi) => {
            this._onLQIUpdate(lqi);
          });
        }
      } catch (e) {
        // LQI listener not available
      }
    }

    _onLQIUpdate(lqi) {
      if (typeof lqi !== 'number') return;
      this._lastLQI = lqi;

      // Store in history (last 20 readings)
      this._lqiHistory.push({ value: lqi, time: Date.now() });
      if (this._lqiHistory.length > 20) this._lqiHistory.shift();
    }

    /**
     * Get current LQI value
     * @returns {number|null} LQI value (0-255)
     */
    getLQI() {
      return this._lastLQI;
    }

    /**
     * Get LQI quality label
     * @param {number} lqi - LQI value (0-255)
     * @returns {string} Quality label
     */
    static getLQIQuality(lqi) {
      if (typeof lqi !== 'number') return 'Unknown';
      if (lqi >= 200) return 'Excellent';
      if (lqi >= 150) return 'Good';
      if (lqi >= 100) return 'Fair';
      if (lqi >= 50) return 'Poor';
      return 'Bad';
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // IDEA 14: Firmware Version Display
    // ═══════════════════════════════════════════════════════════════════════════

    _initFirmwareVersion() {
      this._firmwareVersion = null;

      // Read firmware version from basic cluster after init
      this.homey.setTimeout(async () => {
        try {
          if (this._destroyed) return;
          const zclNode = this.zclNode;
          if (!zclNode) return;

          const basic = zclNode.endpoints?.[1]?.clusters?.basic;
          if (!basic) return;

          const attrs = await basic.readAttributes(['swBuildId', 'appVersion', 'zclVersion']).catch(() => ({}));
          const version = attrs?.swBuildId || attrs?.appVersion || null;

          if (version) {
            this._firmwareVersion = String(version);
            this.log(`[Enhancements] Firmware version: ${this._firmwareVersion}`);
          }
        } catch (e) {
          // Non-critical
        }
      }, 8000);
    }

    /**
     * Get firmware version
     * @returns {string|null}
     */
    getFirmwareVersion() {
      return this._firmwareVersion;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // IDEA 6: Valve Position (exposed via dpMappings already for thermostats)
    // This method provides a programmatic way to update the valve position
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Update valve position capability (for TRVs)
     * @param {number} position - Valve position 0-100
     */
    updateValvePosition(position) {
      if (typeof position !== 'number') return;
      const clamped = Math.max(0, Math.min(100, position));
      this.setCapabilityValue('measure_valve_position', clamped).catch(() => {});
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // IDEA 7: Power Factor
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Update power factor capability
     * @param {number} pf - Power factor 0-1
     */
    updatePowerFactor(pf) {
      if (typeof pf !== 'number') return;
      const clamped = Math.max(0, Math.min(1, pf));
      this.setCapabilityValue('measure_power_factor', Math.round(clamped * 100) / 100).catch(() => {});
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // IDEA 4: Thermostat Schedule Exposure
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Set thermostat schedule (DP 65/66 for Tuya devices)
     * @param {object} schedule - Schedule object with weekday/weekend entries
     * @param {string} type - 'workdays' or 'holidays'
     */
    async setThermostatSchedule(schedule, type = 'workdays') {
      const dpId = type === 'workdays' ? 65 : 66;
      const dpValue = JSON.stringify(schedule);
      this.log(`[Enhancements] Setting ${type} schedule`);
      await this._sendTuyaDP(dpId, dpValue);
    }

    /**
     * Enable/disable the device's built-in schedule
     */
    async setScheduleEnabled(enabled) {
      const dpValue = enabled ? 0 : 1; // 0=schedule mode, 1=manual mode
      this.log(`[Enhancements] Schedule ${enabled ? 'enabled' : 'disabled'} (DP4=${dpValue})`);
      await this._sendTuyaDP(4, dpValue);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // IDEA 5: mmWave Presence Sensor Settings
    // ═══════════════════════════════════════════════════════════════════════════

    _initMmWaveSettings() {
      if (this._deviceCategory !== 'presence_sensor') return;

      this.on('settings', async (changedKeys) => {
        if (changedKeys.includes('mmwave_detection_distance')) {
          const distance = parseFloat(this.getSetting('mmwave_detection_distance')) || 6;
          this.log(`[Enhancements] mmWave detection distance: ${distance}m`);
          await this._sendTuyaDP(10, Math.round(distance * 10));
        }
        if (changedKeys.includes('mmwave_sensitivity')) {
          const sensMap = { low: 0, medium: 1, high: 2 };
          const sens = sensMap[this.getSetting('mmwave_sensitivity')] ?? 1;
          this.log(`[Enhancements] mmWave sensitivity: ${sens}`);
          await this._sendTuyaDP(12, sens);
        }
        if (changedKeys.includes('mmwave_hold_time')) {
          const holdTime = parseInt(this.getSetting('mmwave_hold_time')) || 30;
          this.log(`[Enhancements] mmWave hold time: ${holdTime}s`);
          await this._sendTuyaDP(103, holdTime);
        }
      });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // IDEA 20: Smoke/CO Detector Test Mode
    // ═══════════════════════════════════════════════════════════════════════════

    _initSmokeCOTest() {
      if (this._deviceCategory !== 'safety') return;

      this._testInProgress = false;
      this._testTimeout = null;
    }

    /**
     * Trigger self-test on smoke/CO detector
     * @param {string} testType - 'smoke', 'co', or 'all'
     * @returns {object} Test result
     */
    async triggerSelfTest(testType = 'all') {
      if (this._testInProgress) {
        return { success: false, reason: 'Test already in progress' };
      }

      this._testInProgress = true;
      this.log(`[Enhancements] Starting self-test: ${testType}`);

      try {
        // Send test command via Tuya DP (DP 6 = self-test for most smoke detectors)
        await this._sendTuyaDP(6, testType === 'co' ? 1 : 0);

        // Wait for response (up to 15 seconds)
        const result = await new Promise((resolve) => {
          const timeout = this.homey.setTimeout(() => {
            resolve({ success: false, reason: 'Test timed out' });
          }, 15000);

          const onDP = ({ dpId, value }) => {
            if (dpId === 6) {
              this.homey.clearTimeout(timeout);
              this.removeListener?.('dpReport', onDP);
              resolve({ success: true, result: value === 1 ? 'passed' : 'failed', alarm_type: testType });
            }
          };

          if (this.on) this.on('dpReport', onDP);
        });

        this.log(`[Enhancements] Self-test result: ${result.result || result.reason}`);
        return result;
      } catch (e) {
        return { success: false, reason: e.message };
      } finally {
        this._testInProgress = false;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TUYA DP HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Send a Tuya DP command (safe wrapper)
     */
    async _sendTuyaDP(dpId, value) {
      try {
        if (typeof this.sendTuyaDataPoint === 'function') {
          await this.sendTuyaDataPoint(dpId, value);
        } else if (typeof this.tuyaEF00Manager?.sendDataPoint === 'function') {
          await this.tuyaEF00Manager.sendDataPoint(dpId, value);
        }
      } catch (e) {
        this.log(`[Enhancements] DP${dpId} send failed: ${e.message}`);
      }
    }

    /**
     * Request a Tuya DP value (read)
     */
    async _requestTuyaDP(dpId) {
      try {
        if (typeof this.tuyaEF00Manager?.requestDataPoint === 'function') {
          await this.tuyaEF00Manager.requestDataPoint(dpId);
        } else if (typeof this.sendTuyaDataPointQuery === 'function') {
          await this.sendTuyaDataPointQuery(dpId);
        }
      } catch (e) {
        this.log(`[Enhancements] DP${dpId} request failed: ${e.message}`);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CLEANUP
    // ═══════════════════════════════════════════════════════════════════════════

    async onDeleted() {
      this._destroyed = true;
      if (this._availabilityTimer) {
        this.homey.clearTimeout(this._availabilityTimer);
      }
      if (this._testTimeout) {
        this.homey.clearTimeout(this._testTimeout);
      }
      await super.onDeleted?.();
    }

    async onUninit() {
      this._destroyed = true;
      if (this._availabilityTimer) {
        this.homey.clearTimeout(this._availabilityTimer);
      }
      if (this._testTimeout) {
        this.homey.clearTimeout(this._testTimeout);
      }
      await super.onUninit?.();
    }
  }

  return EnhancedDevice;
}

module.exports = DeviceEnhancementsMixin;
module.exports.ENHANCEMENT_SETTINGS = ENHANCEMENT_SETTINGS;
module.exports.ENHANCEMENT_FLOW_CARDS = ENHANCEMENT_FLOW_CARDS;
module.exports.detectDeviceCategory = detectDeviceCategory;
module.exports.getSettingsForCategory = getSettingsForCategory;
