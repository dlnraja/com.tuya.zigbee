'use strict';

/**
 * ProductValueValidator - Système intelligent de validation et auto-correction des valeurs
 * v1.0.0 - Vérifie la cohérence des valeurs par type de produit et applique des corrections
 *
 * FONCTIONNALITÉS:
 * - Validation des plages de valeurs par type de capability
 * - Détection automatique de mauvais diviseurs
 * - Auto-correction intelligente basée sur le type de produit
 * - Apprentissage des patterns par manufacturerName
 * - Logging des anomalies pour analyse
 */

class ProductValueValidator {

  /**
   * Règles de validation par type de produit
   * Chaque règle définit: min, max, typicalRange, possibleDivisors
   */
  static PRODUCT_RULES = {
    // ═══════════════════════════════════════════════════════════════════════
    // PLUGS & OUTLETS - Energy monitoring
    // ═══════════════════════════════════════════════════════════════════════
    plug: {
      measure_power: {
        min: 0, max: 4000, // Max 4kW for standard plugs
        typicalRange: [0, 3500],
        unit: 'W',
        possibleDivisors: [1, 10, 100, 1000],
        autoCorrect: true
      },
      measure_voltage: {
        min: 80, max: 280, // EU: 230V, US: 120V
        typicalRange: [100, 250],
        unit: 'V',
        possibleDivisors: [1, 10, 100],
        autoCorrect: true
      },
      measure_current: {
        min: 0, max: 20, // Max 20A for most plugs
        typicalRange: [0, 16],
        unit: 'A',
        possibleDivisors: [1, 10, 100, 1000],
        autoCorrect: true
      },
      meter_power: {
        min: 0, max: 100000, // Max 100,000 kWh lifetime
        typicalRange: [0, 10000],
        unit: 'kWh',
        possibleDivisors: [1, 10, 100, 1000],
        possibleMultipliers: [0.001], // Wh → kWh
        autoCorrect: true
      }
    },

    // ═══════════════════════════════════════════════════════════════════════
    // HIGH POWER PLUGS (30A+)
    // ═══════════════════════════════════════════════════════════════════════
    plug_high_power: {
      measure_power: {
        min: 0, max: 8000, // Max 8kW
        typicalRange: [0, 7000],
        unit: 'W',
        possibleDivisors: [1, 10, 100],
        autoCorrect: true
      },
      measure_current: {
        min: 0, max: 40, // Max 40A
        typicalRange: [0, 32],
        unit: 'A',
        possibleDivisors: [1, 10, 100],
        autoCorrect: true
      }
    },

    // ═══════════════════════════════════════════════════════════════════════
    // CLIMATE SENSORS - Temperature & Humidity
    // ═══════════════════════════════════════════════════════════════════════
    climate_sensor: {
      measure_temperature: {
        min: -40, max: 80, // Reasonable indoor/outdoor range
        typicalRange: [-10, 50],
        unit: '°C',
        possibleDivisors: [1, 10, 100],
        autoCorrect: true
      },
      measure_humidity: {
        min: 0, max: 100,
        typicalRange: [20, 95],
        unit: '%',
        possibleDivisors: [1, 10],
        autoCorrect: true
      },
      measure_pressure: {
        min: 800, max: 1200, // hPa/mbar
        typicalRange: [950, 1050],
        unit: 'hPa',
        possibleDivisors: [1, 10, 100],
        autoCorrect: true
      },
      measure_battery: {
        min: 0, max: 100,
        typicalRange: [0, 100],
        unit: '%',
        possibleDivisors: [1, 2], // Some report 0-200
        autoCorrect: true
      }
    },

    // ═══════════════════════════════════════════════════════════════════════
    // THERMOSTATS & RADIATOR VALVES
    // ═══════════════════════════════════════════════════════════════════════
    thermostat: {
      measure_temperature: {
        min: -10, max: 50,
        typicalRange: [5, 35],
        unit: '°C',
        possibleDivisors: [1, 10, 100],
        autoCorrect: true
      },
      target_temperature: {
        min: 4, max: 35, // Typical TRV range
        typicalRange: [5, 30],
        unit: '°C',
        possibleDivisors: [1, 10, 100],
        autoCorrect: true
      },
      dim: { // Valve position
        min: 0, max: 1,
        typicalRange: [0, 1],
        unit: '%',
        possibleDivisors: [1, 100],
        autoCorrect: true
      }
    },

    // ═══════════════════════════════════════════════════════════════════════
    // MOTION & PRESENCE SENSORS
    // ═══════════════════════════════════════════════════════════════════════
    motion_sensor: {
      measure_luminance: {
        min: 0, max: 100000, // Lux
        typicalRange: [0, 10000],
        unit: 'lux',
        possibleDivisors: [1, 10],
        autoCorrect: true
      },
      measure_battery: {
        min: 0, max: 100,
        typicalRange: [0, 100],
        unit: '%',
        possibleDivisors: [1, 2],
        autoCorrect: true
      },
      measure_distance: {
        min: 0, max: 10, // Meters for radar
        typicalRange: [0, 8],
        unit: 'm',
        possibleDivisors: [1, 100],
        autoCorrect: true
      }
    },

    // ═══════════════════════════════════════════════════════════════════════
    // CURTAIN MOTORS
    // ═══════════════════════════════════════════════════════════════════════
    curtain: {
      windowcoverings_set: {
        min: 0, max: 1,
        typicalRange: [0, 1],
        unit: '%',
        possibleDivisors: [1, 100],
        autoCorrect: true
      },
      dim: { // Alternative for position
        min: 0, max: 1,
        typicalRange: [0, 1],
        unit: '%',
        possibleDivisors: [1, 100],
        autoCorrect: true
      }
    },

    // ═══════════════════════════════════════════════════════════════════════
    // DIMMERS & LIGHTS
    // ═══════════════════════════════════════════════════════════════════════
    light: {
      dim: {
        min: 0, max: 1,
        typicalRange: [0, 1],
        unit: '%',
        possibleDivisors: [1, 100, 254, 255, 1000],
        autoCorrect: true
      },
      light_temperature: {
        min: 0, max: 1, // Homey uses 0-1
        typicalRange: [0, 1],
        unit: '%',
        possibleDivisors: [1, 100, 255, 1000],
        autoCorrect: true
      },
      light_hue: {
        min: 0, max: 1,
        typicalRange: [0, 1],
        unit: '',
        possibleDivisors: [1, 360, 65535],
        autoCorrect: true
      },
      light_saturation: {
        min: 0, max: 1,
        typicalRange: [0, 1],
        unit: '',
        possibleDivisors: [1, 100, 254, 255],
        autoCorrect: true
      }
    },

    // ═══════════════════════════════════════════════════════════════════════
    // AIR QUALITY SENSORS
    // ═══════════════════════════════════════════════════════════════════════
    air_quality: {
      measure_co2: {
        min: 300, max: 5000, // ppm
        typicalRange: [400, 2000],
        unit: 'ppm',
        possibleDivisors: [1],
        autoCorrect: false // Usually correct
      },
      measure_pm25: {
        min: 0, max: 500, // µg/m³
        typicalRange: [0, 150],
        unit: 'µg/m³',
        possibleDivisors: [1, 10],
        autoCorrect: true
      },
      measure_voc: {
        min: 0, max: 1000, // ppb or index
        typicalRange: [0, 500],
        unit: 'ppb',
        possibleDivisors: [1, 10],
        autoCorrect: true
      }
    }
  };

  /**
   * Détecte le type de produit basé sur le driverType ou manufacturerName
   */
  static detectProductType(driverType, manufacturerName = '') {
    const dt = (driverType || '').toLowerCase();
    const mfr = (manufacturerName || '').toLowerCase();

    // High power plugs
    if (dt.includes('30a') || mfr.includes('f1bapcit')) {
      return 'plug_high_power';
    }

    // Standard plugs
    if (dt.includes('plug') || dt.includes('outlet') || dt.includes('socket') || dt.includes('usb')) {
      return 'plug';
    }

    // Thermostats & Valves
    if (dt.includes('thermostat') || dt.includes('radiator') || dt.includes('valve') || dt.includes('trv')) {
      return 'thermostat';
    }

    // Climate sensors
    if (dt.includes('climate') || dt.includes('temperature') || dt.includes('humidity')) {
      return 'climate_sensor';
    }

    // Motion sensors
    if (dt.includes('motion') || dt.includes('presence') || dt.includes('radar') || dt.includes('pir')) {
      return 'motion_sensor';
    }

    // Curtains
    if (dt.includes('curtain') || dt.includes('blind') || dt.includes('cover') || dt.includes('shutter')) {
      return 'curtain';
    }

    // Lights & Dimmers
    if (dt.includes('light') || dt.includes('bulb') || dt.includes('dimmer') || dt.includes('led')) {
      return 'light';
    }

    // Air quality
    if (dt.includes('air_quality') || dt.includes('co2') || dt.includes('voc')) {
      return 'air_quality';
    }

    return 'unknown';
  }

  /**
   * Valide et corrige une valeur pour une capability donnée
   * @returns {object} { isValid, correctedValue, correction, message }
   */
  static validateAndCorrect(value, capability, productType, options = {}) {
    const rules = this.PRODUCT_RULES[productType];
    if (!rules) {
      return { isValid: true, correctedValue: value, correction: null };
    }

    const rule = rules[capability];
    if (!rule) {
      return { isValid: true, correctedValue: value, correction: null };
    }

    const result = {
      isValid: true,
      originalValue: value,
      correctedValue: value,
      correction: null,
      message: null,
      divisorApplied: null,
      multiplierApplied: null
    };

    // Skip if value is null/undefined
    if (value === null || value === undefined) {
      return result;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 1: Check if value is within valid range
    // ═══════════════════════════════════════════════════════════════════════
    if (value >= rule.min && value <= rule.max) {
      // Value is valid
      return result;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 2: Value out of range - try auto-correction
    // ═══════════════════════════════════════════════════════════════════════
    if (!rule.autoCorrect) {
      result.isValid = false;
      result.message = `Value ${value} out of range [${rule.min}-${rule.max}] for ${capability}`;
      return result;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3: Try dividing by possible divisors
    // ═══════════════════════════════════════════════════════════════════════
    if (value > rule.max && rule.possibleDivisors) {
      for (const divisor of rule.possibleDivisors.sort((a, b) => b - a)) {
        if (divisor === 1) continue;
        const divided = value / divisor;
        if (divided >= rule.min && divided <= rule.max) {
          // Check if result is in typical range (more likely correct)
          const inTypical = divided >= rule.typicalRange[0] && divided <= rule.typicalRange[1];
          if (inTypical || divided <= rule.max) {
            result.correctedValue = divided;
            result.correction = 'divisor';
            result.divisorApplied = divisor;
            result.message = `Auto-corrected: ${value} / ${divisor} = ${divided}${rule.unit}`;
            return result;
          }
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 4: Try multiplying by possible multipliers (e.g., Wh → kWh)
    // ═══════════════════════════════════════════════════════════════════════
    if (value > rule.max && rule.possibleMultipliers) {
      for (const multiplier of rule.possibleMultipliers) {
        const multiplied = value * multiplier;
        if (multiplied >= rule.min && multiplied <= rule.max) {
          result.correctedValue = multiplied;
          result.correction = 'multiplier';
          result.multiplierApplied = multiplier;
          result.message = `Auto-corrected: ${value} × ${multiplier} = ${multiplied}${rule.unit}`;
          return result;
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 5: Clamp to valid range as last resort
    // ═══════════════════════════════════════════════════════════════════════
    if (value < rule.min) {
      result.correctedValue = rule.min;
      result.correction = 'clamped_min';
      result.message = `Clamped: ${value} → ${rule.min}${rule.unit} (below minimum)`;
    } else if (value > rule.max) {
      // Value still too high after trying divisors - likely erratic
      result.isValid = false;
      result.correctedValue = null;
      result.correction = 'rejected';
      result.message = `Rejected: ${value} exceeds max ${rule.max}${rule.unit} (erratic value)`;
    }

    return result;
  }

  /**
   * Détecte automatiquement le diviseur correct basé sur les valeurs reçues
   * Utilise un historique de valeurs pour déterminer le pattern
   */
  static detectCorrectDivisor(values, capability, productType) {
    if (!values || values.length < 3) return null;

    const rules = this.PRODUCT_RULES[productType]?.[capability];
    if (!rules) return null;

    const { typicalRange, possibleDivisors } = rules;

    // Count how many values fall in typical range for each divisor
    const divisorScores = {};

    for (const divisor of possibleDivisors) {
      divisorScores[divisor] = 0;
      for (const value of values) {
        const divided = value / divisor;
        if (divided >= typicalRange[0] && divided <= typicalRange[1]) {
          divisorScores[divisor]++;
        }
      }
    }

    // Find divisor with highest score
    let bestDivisor = 1;
    let bestScore = 0;

    for (const [divisor, score] of Object.entries(divisorScores)) {
      if (score > bestScore) {
        bestScore = score;
        bestDivisor = parseInt(divisor);
      }
    }

    // Only return if score is significant (>50% of values match)
    if (bestScore >= values.length * 0.5) {
      return bestDivisor;
    }

    return null;
  }

  /**
   * Crée un validateur avec état pour un device spécifique
   * Permet l'apprentissage des patterns
   */
  static createDeviceValidator(device, productType) {
    return new DeviceValueValidator(device, productType);
  }
}

/**
 * Validateur avec état pour un device spécifique
 * Garde un historique des valeurs pour apprendre les patterns
 */
class DeviceValueValidator {
  constructor(device, productType) {
    this.device = device;
    this.productType = productType;
    this.valueHistory = {}; // { capability: [last N values] }
    this.learnedDivisors = {}; // { capability: divisor }
    this.correctionCount = {}; // { capability: count }
    this.maxHistorySize = 20;
  }

  /**
   * Valide et corrige une valeur, avec apprentissage
   */
  validate(value, capability) {
    // Add to history
    if (!this.valueHistory[capability]) {
      this.valueHistory[capability] = [];
    }
    this.valueHistory[capability].push(value);
    if (this.valueHistory[capability].length > this.maxHistorySize) {
      this.valueHistory[capability].shift();
    }

    // Check if we have a learned divisor
    if (this.learnedDivisors[capability]) {
      const divided = value / this.learnedDivisors[capability];
      const rules = ProductValueValidator.PRODUCT_RULES[this.productType]?.[capability];
      if (rules && divided >= rules.min && divided <= rules.max) {
        return {
          isValid: true,
          correctedValue: divided,
          correction: 'learned_divisor',
          divisorApplied: this.learnedDivisors[capability],
          message: `Applied learned divisor: ${this.learnedDivisors[capability]}`
        };
      }
    }

    // Standard validation
    const result = ProductValueValidator.validateAndCorrect(
      value, capability, this.productType
    );

    // Learn from corrections
    if (result.correction === 'divisor' && result.divisorApplied) {
      if (!this.correctionCount[capability]) {
        this.correctionCount[capability] = {};
      }
      const divisor = result.divisorApplied;
      this.correctionCount[capability][divisor] = (this.correctionCount[capability][divisor] || 0) + 1;

      // If same divisor applied 3+ times, learn it
      if (this.correctionCount[capability][divisor] >= 3) {
        this.learnedDivisors[capability] = divisor;
        this.device?.log?.(`[VALIDATOR] 🎓 Learned divisor for ${capability}: ${divisor}`);
      }
    }

    // Try to detect correct divisor from history
    if (this.valueHistory[capability].length >= 5 && !this.learnedDivisors[capability]) {
      const detectedDivisor = ProductValueValidator.detectCorrectDivisor(
        this.valueHistory[capability], capability, this.productType
      );
      if (detectedDivisor && detectedDivisor !== 1) {
        this.learnedDivisors[capability] = detectedDivisor;
        this.device?.log?.(`[VALIDATOR] 🔍 Detected divisor for ${capability}: ${detectedDivisor}`);
      }
    }

    return result;
  }

  /**
   * Réinitialise l'apprentissage pour une capability
   */
  resetLearning(capability) {
    delete this.learnedDivisors[capability];
    delete this.correctionCount[capability];
    this.valueHistory[capability] = [];
  }

  /**
   * Obtient les statistiques du validateur
   */
  getStats() {
    return {
      productType: this.productType,
      learnedDivisors: { ...this.learnedDivisors },
      historySize: Object.fromEntries(
        Object.entries(this.valueHistory).map(([k, v]) => [k, v.length])
      ),
      correctionCount: { ...this.correctionCount }
    };
  }
}

module.exports = { ProductValueValidator, DeviceValueValidator };
