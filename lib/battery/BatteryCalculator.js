'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║            BATTERY CALCULATOR v5.5.47 - ULTRA PRECISE                        ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  4 MÉTHODES DE CALCUL:                                                       ║
 * ║  ┌─────────────────────────────────────────────────────────────────────────┐ ║
 * ║  │ 1. DIRECT     - Valeur brute = pourcentage                             │ ║
 * ║  │ 2. MULT2      - Valeur × 2 = pourcentage (ZCL standard)                │ ║
 * ║  │ 3. VOLTAGE    - Conversion tension → pourcentage (courbes chimie)      │ ║
 * ║  │ 4. ENUM       - États discrets (low/medium/high → 10/50/100%)          │ ║
 * ║  └─────────────────────────────────────────────────────────────────────────┘ ║
 * ║                                                                              ║
 * ║  COURBES DE DÉCHARGE NON-LINÉAIRES PAR CHIMIE:                               ║
 * ║  - CR2032/CR2450: Plateau 3.0V→2.7V puis chute rapide                       ║
 * ║  - CR123A:        Lithium primaire, très plat jusqu'à 20%                   ║
 * ║  - Alkaline:      Déclin progressif, non-linéaire                           ║
 * ║  - Li-ion:        4.2V→3.0V, courbe sigmoïde                                ║
 * ║  - LiFePO4:       3.6V→2.5V, très plat (90% capacité = 3.2-3.3V)            ║
 * ║  - NiMH:          1.4V→1.0V, plateau à 1.2V                                 ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES - Chimies de batterie
// ═══════════════════════════════════════════════════════════════════════════════

const CHEMISTRY = {
  CR2032: 'cr2032',
  CR2450: 'cr2450',
  CR123A: 'cr123a',
  AAA_ALKALINE: 'aaa_alkaline',
  AAA_LITHIUM: 'aaa_lithium',
  AA_ALKALINE: 'aa_alkaline',
  AA_LITHIUM: 'aa_lithium',
  LIPO: 'lipo',           // Li-ion/LiPo 3.7V nominal
  LIFEPO4: 'lifepo4',     // LiFePO4 3.2V nominal
  NIMH: 'nimh',           // NiMH rechargeable
  LEAD_ACID: 'lead_acid', // 12V lead-acid
  USB: 'usb',             // USB powered (always 100%)
  MAINS: 'mains',         // AC powered
  UNKNOWN: 'unknown',
};

const ALGORITHM = {
  DIRECT: 'direct',           // Value = percentage
  MULT2: 'mult2',             // Value * 2 = percentage (ZCL standard)
  DIV2: 'div2',               // Value / 2 = percentage
  VOLTAGE_LINEAR: 'v_linear', // Linear voltage interpolation
  VOLTAGE_CURVE: 'v_curve',   // Non-linear voltage curve
  ENUM_3: 'enum3',            // 3 states: low/medium/high
  ENUM_4: 'enum4',            // 4 states: critical/low/medium/high
  MILLIVOLT: 'mv',            // Value in mV, convert to V then curve
};

// ═══════════════════════════════════════════════════════════════════════════════
// COURBES DE DÉCHARGE - Données empiriques par chimie
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Courbes de décharge: [voltage] → [capacity %]
 * Basées sur datasheets et mesures empiriques
 * Format: [[V, %], [V, %], ...]
 */
const DISCHARGE_CURVES = {
  // ───────────────────────────────────────────────────────────────────────────
  // CR2032 - Lithium manganese dioxide (Li-MnO2)
  // Caractéristique: Plateau plat 3.0-2.7V, chute rapide après
  // ───────────────────────────────────────────────────────────────────────────
  cr2032: [
    [3.00, 100],  // Neuf
    [2.95, 95],
    [2.90, 85],   // Début plateau
    [2.85, 70],
    [2.80, 55],
    [2.75, 40],
    [2.70, 25],   // Fin plateau
    [2.60, 15],   // Chute rapide
    [2.50, 8],
    [2.40, 3],
    [2.00, 0],    // Mort
  ],

  // ───────────────────────────────────────────────────────────────────────────
  // CR2450 - Plus grande capacité, même chimie
  // ───────────────────────────────────────────────────────────────────────────
  cr2450: [
    [3.00, 100],
    [2.95, 95],
    [2.90, 85],
    [2.85, 70],
    [2.80, 55],
    [2.75, 40],
    [2.70, 25],
    [2.60, 15],
    [2.50, 8],
    [2.40, 3],
    [2.00, 0],
  ],

  // ───────────────────────────────────────────────────────────────────────────
  // CR123A - Lithium primaire 3V, très plat
  // ───────────────────────────────────────────────────────────────────────────
  cr123a: [
    [3.00, 100],
    [2.95, 90],
    [2.90, 80],
    [2.85, 65],
    [2.80, 50],
    [2.70, 35],
    [2.60, 20],
    [2.50, 10],
    [2.00, 0],
  ],

  // ───────────────────────────────────────────────────────────────────────────
  // Alkaline AAA/AA - Déclin non-linéaire
  // 2x en série = 3.0V max, 2.0V min
  // ───────────────────────────────────────────────────────────────────────────
  aaa_alkaline: [
    [3.00, 100],  // 2x 1.5V neuf
    [2.80, 80],
    [2.60, 60],
    [2.40, 40],
    [2.20, 20],
    [2.00, 5],
    [1.80, 0],
  ],
  aa_alkaline: [
    [3.00, 100],
    [2.80, 80],
    [2.60, 60],
    [2.40, 40],
    [2.20, 20],
    [2.00, 5],
    [1.80, 0],
  ],

  // ───────────────────────────────────────────────────────────────────────────
  // Lithium AAA/AA - Très plat (Energizer Lithium)
  // ───────────────────────────────────────────────────────────────────────────
  aaa_lithium: [
    [3.00, 100],
    [2.90, 90],
    [2.80, 70],
    [2.70, 50],
    [2.50, 20],
    [2.00, 0],
  ],
  aa_lithium: [
    [3.00, 100],
    [2.90, 90],
    [2.80, 70],
    [2.70, 50],
    [2.50, 20],
    [2.00, 0],
  ],

  // ───────────────────────────────────────────────────────────────────────────
  // Li-ion / LiPo - Rechargeable 3.7V nominal
  // Courbe sigmoïde caractéristique
  // ───────────────────────────────────────────────────────────────────────────
  lipo: [
    [4.20, 100],  // Pleine charge
    [4.10, 90],
    [4.00, 80],
    [3.90, 70],
    [3.80, 60],
    [3.70, 50],   // Nominal
    [3.60, 35],
    [3.50, 20],
    [3.40, 10],
    [3.30, 5],
    [3.00, 0],    // Cut-off
  ],

  // ───────────────────────────────────────────────────────────────────────────
  // LiFePO4 - Très plat (90% capacité entre 3.2-3.3V)
  // ───────────────────────────────────────────────────────────────────────────
  lifepo4: [
    [3.60, 100],  // Pleine charge
    [3.40, 95],
    [3.35, 90],
    [3.30, 70],   // Plateau principal
    [3.25, 50],
    [3.20, 30],
    [3.10, 15],
    [3.00, 5],
    [2.50, 0],    // Cut-off
  ],

  // ───────────────────────────────────────────────────────────────────────────
  // NiMH - Rechargeable, plateau à 1.2V
  // 2x en série = 2.8V max, 2.0V min
  // ───────────────────────────────────────────────────────────────────────────
  nimh: [
    [2.80, 100],  // 2x 1.4V pleine charge
    [2.60, 90],
    [2.50, 80],
    [2.40, 60],   // Plateau
    [2.30, 40],
    [2.20, 20],
    [2.00, 5],
    [1.80, 0],
  ],

  // ───────────────────────────────────────────────────────────────────────────
  // Default / Unknown - Linéaire 2.0-3.0V
  // ───────────────────────────────────────────────────────────────────────────
  unknown: [
    [3.00, 100],
    [2.75, 75],
    [2.50, 50],
    [2.25, 25],
    [2.00, 0],
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CLASSE PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

class BatteryCalculator {

  /**
   * Méthode principale - Calcul intelligent selon profil
   *
   * @param {number} rawValue - Valeur brute reçue
   * @param {object} options - Options de calcul
   * @param {string} options.algorithm - Algorithme à utiliser
   * @param {string} options.chemistry - Chimie de la batterie
   * @param {number} options.voltageMin - Voltage minimum (0%)
   * @param {number} options.voltageMax - Voltage maximum (100%)
   * @param {number} options.divisor - Diviseur pour valeur brute
   * @param {number} options.multiplier - Multiplicateur pour valeur brute
   * @returns {number} Pourcentage 0-100
   */
  static calculate(rawValue, options = {}) {
    const {
      algorithm = ALGORITHM.DIRECT,
      chemistry = CHEMISTRY.UNKNOWN,
      voltageMin = 2.0,
      voltageMax = 3.0,
      divisor = 1,
      multiplier = 1,
    } = options;

    // Validation
    if (rawValue === null || rawValue === undefined || isNaN(rawValue)) {
      return null;
    }

    let percentage;

    switch (algorithm) {
    // ─────────────────────────────────────────────────────────────────────
    // DIRECT - Valeur = pourcentage
    // ─────────────────────────────────────────────────────────────────────
    case ALGORITHM.DIRECT:
      percentage = rawValue * multiplier / divisor;
      break;

      // ─────────────────────────────────────────────────────────────────────
      // MULT2 - ZCL standard (batteryPercentageRemaining = % × 2)
      // ─────────────────────────────────────────────────────────────────────
    case ALGORITHM.MULT2:
      percentage = rawValue * 2;
      break;

      // ─────────────────────────────────────────────────────────────────────
      // DIV2 - Valeur / 2 (ZCL powerConfiguration)
      // ─────────────────────────────────────────────────────────────────────
    case ALGORITHM.DIV2:
      percentage = rawValue / 2;
      break;

      // ─────────────────────────────────────────────────────────────────────
      // VOLTAGE_LINEAR - Interpolation linéaire
      // ─────────────────────────────────────────────────────────────────────
    case ALGORITHM.VOLTAGE_LINEAR:
      percentage = this.voltageToPercentLinear(rawValue, voltageMin, voltageMax);
      break;

      // ─────────────────────────────────────────────────────────────────────
      // VOLTAGE_CURVE - Courbe de décharge non-linéaire
      // ─────────────────────────────────────────────────────────────────────
    case ALGORITHM.VOLTAGE_CURVE:
      percentage = this.voltageToPercentCurve(rawValue, chemistry);
      break;

      // ─────────────────────────────────────────────────────────────────────
      // MILLIVOLT - Valeur en mV → conversion puis courbe
      // ─────────────────────────────────────────────────────────────────────
    case ALGORITHM.MILLIVOLT:
      const voltage = rawValue / 1000; // mV → V
      percentage = this.voltageToPercentCurve(voltage, chemistry);
      break;

      // ─────────────────────────────────────────────────────────────────────
      // ENUM_3 - États discrets: 0=low, 1=medium, 2=high
      // ─────────────────────────────────────────────────────────────────────
    case ALGORITHM.ENUM_3:
      percentage = this.enumToPercent(rawValue, 3);
      break;

      // ─────────────────────────────────────────────────────────────────────
      // ENUM_4 - États discrets: 0=critical, 1=low, 2=medium, 3=high
      // ─────────────────────────────────────────────────────────────────────
    case ALGORITHM.ENUM_4:
      percentage = this.enumToPercent(rawValue, 4);
      break;

    default:
      percentage = rawValue;
    }

    // Clamp 0-100 et arrondir
    return Math.max(0, Math.min(100, Math.round(percentage)));
  }

  /**
   * Conversion voltage → pourcentage avec courbe de décharge
   *
   * @param {number} voltage - Voltage mesuré (V)
   * @param {string} chemistry - Chimie de la batterie
   * @returns {number} Pourcentage 0-100
   */
  static voltageToPercentCurve(voltage, chemistry = CHEMISTRY.UNKNOWN) {
    const curve = DISCHARGE_CURVES[chemistry] || DISCHARGE_CURVES.unknown;

    // Trouver les deux points encadrant le voltage
    for (let i = 0; i < curve.length - 1; i++) {
      const [v1, p1] = curve[i];
      const [v2, p2] = curve[i + 1];

      if (voltage >= v2 && voltage <= v1) {
        // Interpolation linéaire entre les deux points
        const ratio = (voltage - v2) / (v1 - v2);
        return p2 + ratio * (p1 - p2);
      }
    }

    // Hors bornes
    if (voltage >= curve[0][0]) return 100;
    if (voltage <= curve[curve.length - 1][0]) return 0;

    return 0;
  }

  /**
   * Conversion voltage → pourcentage linéaire
   *
   * @param {number} voltage - Voltage mesuré (V)
   * @param {number} vMin - Voltage minimum (0%)
   * @param {number} vMax - Voltage maximum (100%)
   * @returns {number} Pourcentage 0-100
   */
  static voltageToPercentLinear(voltage, vMin = 2.0, vMax = 3.0) {
    if (voltage >= vMax) return 100;
    if (voltage <= vMin) return 0;

    return ((voltage - vMin) / (vMax - vMin)) * 100;
  }

  /**
   * Conversion enum → pourcentage
   *
   * @param {number} enumValue - Valeur enum (0, 1, 2, ...)
   * @param {number} levels - Nombre de niveaux (3 ou 4)
   * @returns {number} Pourcentage
   */
  static enumToPercent(enumValue, levels = 3) {
    if (levels === 3) {
      // 0=low, 1=medium, 2=high
      switch (enumValue) {
      case 0: return 10;   // Low
      case 1: return 50;   // Medium
      case 2: return 100;  // High
      default: return 50;
      }
    } else if (levels === 4) {
      // 0=critical, 1=low, 2=medium, 3=high
      switch (enumValue) {
      case 0: return 5;    // Critical
      case 1: return 20;   // Low
      case 2: return 60;   // Medium
      case 3: return 100;  // High
      default: return 50;
      }
    }
    return 50;
  }

  /**
   * Détecte si la batterie est faible
   *
   * @param {number} percentage - Pourcentage actuel
   * @param {number} threshold - Seuil (défaut 20%)
   * @returns {boolean}
   */
  static isLow(percentage, threshold = 20) {
    return percentage <= threshold;
  }

  /**
   * Détecte si la batterie est critique
   *
   * @param {number} percentage - Pourcentage actuel
   * @param {number} threshold - Seuil (défaut 10%)
   * @returns {boolean}
   */
  static isCritical(percentage, threshold = 10) {
    return percentage <= threshold;
  }

  /**
   * Obtenir la courbe de décharge pour une chimie
   *
   * @param {string} chemistry - Chimie de la batterie
   * @returns {Array} Courbe [[V, %], ...]
   */
  static getDischargeCurve(chemistry) {
    return DISCHARGE_CURVES[chemistry] || DISCHARGE_CURVES.unknown;
  }

  /**
   * Obtenir les constantes
   */
  static get CHEMISTRY() { return CHEMISTRY; }
  static get ALGORITHM() { return ALGORITHM; }
  static get DISCHARGE_CURVES() { return DISCHARGE_CURVES; }
}

module.exports = BatteryCalculator;
