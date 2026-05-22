'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║         SMART DIVISOR MANAGER - v8.2.0 (Phoenix Sovereign)                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  Auto-détection du bon diviseur pour chaque DP / type de capteur.            ║
 * ║  Résoud le "Double-Division Bug" (AdaptiveDataParser divise /100             ║
 * ║  PUIS dpMappings divise à nouveau → valeurs erronées).                       ║
 * ║                                                                              ║
 * ║  PROBLÈME RACINE :                                                            ║
 * ║  - Certains fabricants Tuya envoient temp ×10 (ex: 206 = 20.6°C)            ║
 * ║  - D'autres envoient temp ×100 (ex: 2060 = 20.6°C)                          ║
 * ║  - Certains envoient humidity ×10, d'autres direct (0-100)                   ║
 * ║  - Les drivers hardcodent ÷10 ou ÷100 manuellement → double-division         ║
 * ║                                                                              ║
 * ║  SOLUTION :                                                                   ║
 * ║  1. Apprentissage par plage de valeurs (range-based auto-detect)              ║
 * ║  2. Cache par manufacturerName + dpId pour éviter de ré-apprendre            ║
 * ║  3. Règles connues embarquées (curated database)                             ║
 * ║  4. Fallback intelligence basée sur le type de capability                    ║
 * ║                                                                              ║
 * ║  Usage:                                                                       ║
 * ║    const smartDivisor = SmartDivisorDetect(value, dpId, {                     ║
 * ║      manufacturerName: '_TZE284_...',                                         ║
 * ║      capability: 'measure_temperature',                                       ║
 * ║      deviceId: 'xxx'                                                          ║
 * ║    });                                                                        ║
 * ║    const parsed = rawValue / smartDivisor;                                    ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// Cache de diviseurs appris par (manufacturerName + dpId) 
// Évite de ré-analyser à chaque rapport
const LEARNED_DIVISORS = new Map();

/**
 * Base de données curée des diviseurs connus par manufacturerName + dpId
 * Sources : Z2M, ZHA, Hubitat, retours forum, tests réels
 */
const KNOWN_DIVISORS = {
  // ═══════════════════════════════════════════════════════════════════════════
  // TEMPERATURE (measure_temperature)
  // ═══════════════════════════════════════════════════════════════════════════
  // La plupart des capteurs Tuya DP envoient °C ×10 (ex: 206 = 20.6°C)
  // Certains envoient ×100 (ex: 2060 = 20.6°C) — rares mais existent
  temperature: {
    default: 10,
    // Cas spécifiques ×100
    '_TZE200_8ygsuhe1': { dp: { 18: 10 } },  // Smart Airbox DP18 = temp ×10
    '_TZE204_upagmtae': { dp: { 1: 10 } },   // HOBEAN ZG-204ZV
    '_TZE284_vvmbj46n': { dp: { 1: 10 } },   // TH05Z LCD Climate
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HUMIDITY (measure_humidity)
  // ═══════════════════════════════════════════════════════════════════════════
  // La plupart envoient 0-100% directement (divisor: 1)
  // Certains ×10 (ex: 650 = 65.0%)
  humidity: {
    default: 1,
    // ×10 models
    '_TZE284_vvmbj46n': { dp: { 2: 10 } },   // TH05Z LCD Climate
    '_TZE200_8ygsuhe1': { dp: { 19: 10 } },  // Smart Airbox DP19 = hum ×10
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CO2 (measure_co2)
  // ═══════════════════════════════════════════════════════════════════════════
  // La plupart envoient ppm direct (divisor: 1)
  // Certains ×10 (ex: 4500 = 450ppm)
  co2: {
    default: 1,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LUMINANCE / LUX (measure_luminance)
  // ═══════════════════════════════════════════════════════════════════════════
  // La plupart envoient lux direct (divisor: 1)
  luminance: {
    default: 1,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DISTANCE (measure_luminance.distance)
  // Z2M/Hubitat standard: cm → meter (divisor: 100)
  // Certains en dm (divisor: 10)
  // Certains en m direct (divisor: 1)
  // ═══════════════════════════════════════════════════════════════════════════
  distance: {
    default: 100,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // POWER (measure_power)
  // ═══════════════════════════════════════════════════════════════════════════
  // La plupart ×10 (ex: 456 = 45.6W), certains ×1 ou ×100
  power: {
    default: 10,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CURRENT (measure_current)
  // ═══════════════════════════════════════════════════════════════════════════
  // La plupart ×1000 (ex: 1234 = 1.234A)
  current: {
    default: 1000,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VOLTAGE (measure_voltage)
  // ═══════════════════════════════════════════════════════════════════════════
  // La plupart ×10 (ex: 2300 = 230.0V)
  voltage: {
    default: 10,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ENERGY (meter_power)
  // ═══════════════════════════════════════════════════════════════════════════
  // La plupart ×100 (ex: 12345 = 123.45kWh)
  energy: {
    default: 100,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BATTERY (measure_battery)
  // ═══════════════════════════════════════════════════════════════════════════
  // La plupart 0-100% direct (divisor: 1)
  // Certains 0-200 (Zigbee scale) → ÷2
  battery: {
    default: 1,
    // TS0601 Tuya DP scale (0-200)
    '_TZE284_vvmbj46n': { dp: { 4: 2 } },    // DP4 ×2 = battery% => divisor: 0.5 (ou multiply: 2)
  },
};

/**
 * Plages de valeurs valides pour auto-détection du diviseur
 * Après division, la valeur doit tomber dans ces plages
 */
const VALID_RANGES = {
  'measure_temperature':        { min: -40, max: 100 },
  'measure_humidity':           { min: 0, max: 100 },
  'measure_co2':                { min: 0, max: 10000 },
  'measure_pm25':               { min: 0, max: 2000 },
  'measure_voc':                { min: 0, max: 60000 },
  'measure_formaldehyde':        { min: 0, max: 10 },
  'measure_luminance':          { min: 0, max: 200000 },
  'measure_luminance.distance': { min: 0, max: 50 },
  'measure_power':              { min: 0, max: 50000 },
  'measure_current':            { min: 0, max: 100 },
  'measure_voltage':            { min: 0, max: 500 },
  'meter_power':                { min: 0, max: 1000000 },
  'measure_battery':            { min: 0, max: 100 },
};

/**
 * Types de capabilities qui utilisent généralement ×10
 */
const CAP_TYPES = {
  'measure_temperature': 'temperature',
  'measure_humidity': 'humidity',
  'measure_co2': 'co2',
  'measure_pm25': 'pm25',
  'measure_voc': 'voc',
  'measure_formaldehyde': 'formaldehyde',
  'measure_luminance': 'luminance',
  'measure_luminance.distance': 'distance',
  'measure_power': 'power',
  'measure_current': 'current',
  'measure_voltage': 'voltage',
  'meter_power': 'energy',
  'measure_battery': 'battery',
};

/**
 * Nettoyer le cache (utile en test ou reset)
 */
function clearDivisorCache() {
  LEARNED_DIVISORS.clear();
}

/**
 * Obtenir le diviseur connu pour un manufacturerName + dpId
 * @param {string} capType - Type de capability (temperature, humidity, etc.)
 * @param {string} manufacturerName - Nom du fabricant
 * @param {number} dpId - Numéro du DP
 * @returns {number|null} Diviseur connu ou null
 */
function getKnownDivisor(capType, manufacturerName, dpId) {
  const capDB = KNOWN_DIVISORS[capType];
  if (!capDB) return null;
  
  // Chercher correspondance exacte manufacturer + dp
  if (manufacturerName && capDB[manufacturerName]) {
    const dpMap = capDB[manufacturerName].dp;
    if (dpMap && dpMap[dpId] !== undefined) {
      return dpMap[dpId];
    }
    // Chercher manufacturerName partiel (startsWith)
    for (const [knownMfr, config] of Object.entries(capDB)) {
      if (knownMfr !== 'default' && manufacturerName.startsWith(knownMfr)) {
        if (config.dp && config.dp[dpId] !== undefined) {
          return config.dp[dpId];
        }
      }
    }
  }
  
  // Chercher manufacturerName partiel
  if (manufacturerName) {
    for (const [knownMfr, config] of Object.entries(capDB)) {
      if (knownMfr !== 'default' && manufacturerName.startsWith(knownMfr)) {
        if (config.dp && config.dp[dpId] !== undefined) {
          return config.dp[dpId];
        }
      }
    }
  }
  
  // Fallback au default
  if (capDB.default !== undefined) {
    return capDB.default;
  }
  
  return null;
}

/**
 * Auto-détecter le diviseur basé sur la plage de valeurs
 * @param {number} rawValue - Valeur brute du DP
 * @param {string} capability - Nom de la capability
 * @returns {number} Diviseur détecté
 */
function autoDetectDivisor(rawValue, capability) {
  const range = VALID_RANGES[capability];
  if (!range) return 1;
  
  // Tester plusieurs diviseurs possibles
  const candidates = [1, 10, 100, 1000];
  
  for (const divisor of candidates) {
    const parsed = rawValue / divisor;
    if (parsed >= range.min && parsed <= range.max) {
      // Vérification supplémentaire : pour temperature, si ÷10 donne un résultat
      // entre -40 et 100, c'est probablement le bon diviseur
      if (capability === 'measure_temperature' && divisor === 10 && parsed >= -40 && parsed <= 100) {
        return 10;
      }
      if (capability === 'measure_humidity' && divisor === 1 && parsed >= 0 && parsed <= 100) {
        return 1;
      }
      return divisor;
    }
  }
  
  // Fallback: déterminer par la magnitude
  const absValue = Math.abs(rawValue);
  if (absValue > 1000000) return 1000;
  if (absValue > 100000) return 100;
  if (absValue > 10000) return 100;
  if (absValue > 1000) return 10;
  return 1;
}

/**
 * Fonction principale : détecter le bon diviseur
 * @param {number} rawValue - Valeur brute du DP
 * @param {number|string} dpId - ID du DP
 * @param {Object} options - Options
 * @param {string} options.manufacturerName - Manufacturer du device
 * @param {string} options.capability - Nom de capability (ex: 'measure_temperature')
 * @param {string} options.deviceId - ID unique du device (pour cache)
 * @param {number} options.defaultDivisor - Diviseur par défaut
 * @returns {number} Diviseur à utiliser
 */
function smartDivisorDetect(rawValue, dpId, options = {}) {
  const {
    manufacturerName = '',
    capability = '',
    deviceId = '',
    defaultDivisor = null,
  } = options;

  // 1. Cache check : clé = manufacturerName + dpId + capability
  const cacheKey = `${manufacturerName}|${dpId}|${capability}`;
  if (LEARNED_DIVISORS.has(cacheKey)) {
    return LEARNED_DIVISORS.get(cacheKey);
  }

  // 2. Base de données connue
  const capType = CAP_TYPES[capability];
  let divisor = null;
  
  if (capType) {
    divisor = getKnownDivisor(capType, manufacturerName, dpId);
  }

  // 3. Si pas de connu, auto-détection par plage
  if (divisor === null) {
    divisor = autoDetectDivisor(rawValue, capability);
  }

  // 4. Fallback au defaultDivisor fourni
  if (divisor === null && defaultDivisor !== null) {
    divisor = defaultDivisor;
  }

  // 5. Dernier fallback : 1 (pas de division)
  if (divisor === null) {
    divisor = 1;
  }

  // 6. Mettre en cache pour les prochains appels (évite re-détection)
  LEARNED_DIVISORS.set(cacheKey, divisor);
  
  // Limiter la taille du cache
  if (LEARNED_DIVISORS.size > 1000) {
    const firstKey = LEARNED_DIVISORS.keys().next().value;
    LEARNED_DIVISORS.delete(firstKey);
  }

  return divisor;
}

/**
 * Parser une valeur brute avec smart divisor
 * @param {number} rawValue - Valeur brute
 * @param {Object} options - Options (idem smartDivisorDetect)
 * @returns {number} Valeur parsée
 */
function smartParse(rawValue, dpId, options = {}) {
  const divisor = smartDivisorDetect(rawValue, dpId, options);
  const result = rawValue / divisor;
  
  // Arrondir à 1 décimale pour éviter les floating point artifacts
  return Math.round(result * 10) / 10;
}

module.exports = {
  smartDivisorDetect,
  smartParse,
  clearDivisorCache,
  KNOWN_DIVISORS,
  VALID_RANGES,
};
