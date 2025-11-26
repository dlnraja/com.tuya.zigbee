'use strict';

/**
 * BATTERY CALCULATOR - Calcul adaptatif par type
 *
 * Calcule le pourcentage de batterie selon le type de batterie utilisé
 * Prend en compte les voltage ranges spécifiques à chaque type
 */

class BatteryCalculator {
  /**
   * Voltage ranges par type de batterie
   *
   * Format: {
   *   min: voltage minimum (0% batterie)
   *   max: voltage maximum (100% batterie)
   * }
   */
  static VOLTAGE_RANGES = {
    'CR2032': {
      min: 2.0,  // En dessous = batterie morte
      max: 3.0,  // Voltage nominal neuf
      nominal: 3.0
    },
    'CR2450': {
      min: 2.0,
      max: 3.0,
      nominal: 3.0
    },
    'CR123A': {
      min: 2.0,
      max: 3.0,
      nominal: 3.0
    },
    'AAA': {
      min: 2.0,  // 2x AAA en série (1.0V × 2)
      max: 3.0,  // 2x AAA neuves (1.5V × 2)
      nominal: 3.0
    },
    'AA': {
      min: 2.0,  // 2x AA en série
      max: 3.0,  // 2x AA neuves
      nominal: 3.0
    },
    'INTERNAL': {
      min: 3.0,  // Rechargeable Li-ion typical
      max: 4.2,
      nominal: 3.7
    },
    'OTHER': {
      min: 2.0,
      max: 3.0,
      nominal: 3.0
    }
  };

  /**
   * Calcule le pourcentage de batterie
   *
   * @param {number} voltage - Voltage mesuré (en V)
   * @param {string} batteryType - Type de batterie (CR2032, AAA, etc.)
   * @returns {number} Pourcentage 0-100
   */
  static calculatePercentage(voltage, batteryType = 'CR2032') {
    const range = this.VOLTAGE_RANGES[batteryType] || this.VOLTAGE_RANGES['CR2032'];

    if (voltage >= range.max) return 100;
    if (voltage <= range.min) return 0;

    // Calcul linéaire
    const percentage = ((voltage - range.min) / (range.max - range.min)) * 100;

    // Arrondir et limiter 0-100
    return Math.max(0, Math.min(100, Math.round(percentage)));
  }

  /**
   * Calcule avec courbe de décharge (plus précis)
   *
   * Les batteries ne se déchargent pas linéairement
   * Utilise une courbe de décharge typique
   */
  static calculatePercentageWithCurve(voltage, batteryType = 'CR2032') {
    const range = this.VOLTAGE_RANGES[batteryType] || this.VOLTAGE_RANGES['CR2032'];

    if (voltage >= range.max) return 100;
    if (voltage <= range.min) return 0;

    // Normaliser voltage (0-1)
    const normalized = (voltage - range.min) / (range.max - range.min);

    // Courbe de décharge typique (exponentielle)
    // Les batteries button cells gardent ~90% voltage jusqu'à 50% capacité
    let percentage;

    if (batteryType.startsWith('CR')) {
      // Button cells: plateau puis chute rapide
      if (normalized > 0.8) {
        percentage = 50 + (normalized - 0.8) * 250; // 80-100% voltage = 50-100% capacité
      } else {
        percentage = normalized * 62.5; // 0-80% voltage = 0-50% capacité
      }
    } else if (batteryType === 'AAA' || batteryType === 'AA') {
      // Alkaline: déclin plus linéaire
      percentage = Math.pow(normalized, 0.8) * 100;
    } else if (batteryType === 'INTERNAL') {
      // Li-ion: très linéaire
      percentage = normalized * 100;
    } else {
      // Default: linéaire
      percentage = normalized * 100;
    }

    return Math.max(0, Math.min(100, Math.round(percentage)));
  }

  /**
   * Détecte si batterie est faible
   *
   * @param {number} voltage - Voltage mesuré
   * @param {string} batteryType - Type de batterie
   * @param {number} threshold - Seuil en % (défaut 20%)
   * @returns {boolean} True si batterie faible
   */
  static isLow(voltage, batteryType = 'CR2032', threshold = 20) {
    const percentage = this.calculatePercentageWithCurve(voltage, batteryType);
    return percentage <= threshold;
  }

  /**
   * Get voltage range pour un type
   *
   * @param {string} batteryType - Type de batterie
   * @returns {object} {min, max, nominal}
   */
  static getRange(batteryType) {
    return this.VOLTAGE_RANGES[batteryType] || this.VOLTAGE_RANGES['CR2032'];
  }

  /**
   * MÉTHODE PRINCIPALE pour Zigbee devices
   * Calcule pourcentage à partir de la valeur brute du cluster Power Configuration
   *
   * La plupart des devices Zigbee Tuya utilisent:
   * - batteryPercentageRemaining attribute (0-200 scale = 0-100%)
   * - Certains ont des quirks spécifiques au modèle
   *
   * @param {number} rawValue - Valeur brute du cluster (0-200 ou 0-100 selon device)
   * @param {string} modelId - Model ID du device pour quirks spécifiques
   * @returns {number} Pourcentage 0-100
   */
  static calculate(rawValue, modelId = 'unknown') {
    // Sécurité: valeurs invalides
    if (rawValue === null || rawValue === undefined || isNaN(rawValue)) {
      return 0;
    }

    // La plupart des devices Zigbee: scale 0-200 = 0-100%
    // Spec Zigbee: batteryPercentageRemaining = percentage * 2
    let percentage = rawValue / 2;

    // Quirks spécifiques par modèle
    // Certains devices Tuya ont des comportements différents
    const modelLower = modelId.toLowerCase();

    // Modèles connus avec scale 0-100 direct (pas de division)
    const directScaleModels = [
      // Ajouter ici les modèles avec scale directe si identifiés
    ];

    if (directScaleModels.some(m => modelLower.includes(m))) {
      percentage = rawValue; // Pas de division
    }

    // Modèles avec offset (certains reportent 0-100 comme 0-50)
    const halfScaleModels = [
      // Ajouter ici si nécessaire
    ];

    if (halfScaleModels.some(m => modelLower.includes(m))) {
      percentage = rawValue; // Déjà en %
    }

    // Limiter à 0-100
    percentage = Math.max(0, Math.min(100, percentage));

    // Arrondir à 1 décimale
    return Math.round(percentage * 10) / 10;
  }

  /**
   * Instance method wrapper for static calculate
   * Permet d'utiliser comme: calculator.calculate(value, model)
   */
  calculate(rawValue, modelId) {
    return BatteryCalculator.calculate(rawValue, modelId);
  }

  /**
   * Instance method wrapper for voltage calculation
   */
  calculatePercentage(voltage, batteryType) {
    return BatteryCalculator.calculatePercentage(voltage, batteryType);
  }

  /**
   * Instance method wrapper for curve calculation
   */
  calculatePercentageWithCurve(voltage, batteryType) {
    return BatteryCalculator.calculatePercentageWithCurve(voltage, batteryType);
  }
}

module.exports = BatteryCalculator;
