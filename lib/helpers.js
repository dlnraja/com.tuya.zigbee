#!/usr/bin/env node
'use strict';

/**
 * @file lib/helpers.js
 * @description Helpers utilitaires anti-crash pour le projet Tuya/Zigbee
 * @author dlnraja
 * @date 2025-01-29
 */

'use strict';

/**
 * Convertit n'importe quelle valeur en array sûr pour .map/.filter
 * @param {*} value - Valeur à convertir
 * @returns {Array} Array sûr (jamais undefined/null)
 */
function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  if (typeof value === 'string') return value.length > 0 ? [value] : [];
  if (typeof value === 'object') {
    // Si c'est un objet avec des clés, retourner les valeurs
    if (Object.keys(value).length > 0) return Object.values(value);
    return [];
  }
  // Pour les primitifs (number, boolean), les wrapper dans un array
  return [value];
}

/**
 * Normalise une valeur name en objet {en, fr}
 * @param {*} name - Nom à normaliser
 * @returns {Object} Objet {en: string, fr?: string}
 */
function normalizeName(name) {
  if (!name) return { en: 'Unknown Device' };
  
  if (typeof name === 'string') {
    return { en: name };
  }
  
  if (typeof name === 'object') {
    return {
      en: name.en || name.name || 'Unknown Device',
      ...(name.fr && { fr: name.fr })
    };
  }
  
  return { en: String(name) };
}

/**
 * Normalise les capabilities en array
 * @param {*} capabilities - Capabilities à normaliser
 * @returns {Array<string>} Array de capabilities
 */
function normalizeCapabilities(capabilities) {
  const caps = toArray(capabilities);
  return caps.filter(cap => typeof cap === 'string' && cap.length > 0);
}

/**
 * Merge sécurisé de deux arrays (union sans doublons)
 * @param {*} arr1 - Premier array
 * @param {*} arr2 - Deuxième array  
 * @returns {Array} Array fusionné sans doublons
 */
function mergeArrays(arr1, arr2) {
  const safe1 = toArray(arr1);
  const safe2 = toArray(arr2);
  const merged = [...safe1, ...safe2];
  return [...new Set(merged.filter(item => item != null && item !== ''))];
}

/**
 * Lecture sécurisée de JSON avec fallback
 * @param {string} content - Contenu JSON à parser
 * @param {*} fallback - Valeur de fallback si parsing échoue
 * @returns {*} Objet parsé ou fallback
 */
function safeJsonParse(content, fallback = {}) {
  try {
    if (!content || typeof content !== 'string') return fallback;
    return JSON.parse(content);
  } catch (err) {
    console.warn(`[helpers] JSON parse failed: ${err.message}`);
    return fallback;
  }
}

/**
 * Écriture sécurisée de JSON avec validation
 * @param {*} data - Données à sérialiser
 * @returns {string} JSON sérialisé ou objet vide
 */
function safeJsonStringify(data) {
  try {
    return JSON.stringify(data || {}, null, 2);
  } catch (err) {
    console.warn(`[helpers] JSON stringify failed: ${err.message}`);
    return '{}';
  }
}

/**
 * Slug sécurisé pour les IDs de drivers
 * @param {string} text - Texte à convertir en slug
 * @returns {string} Slug valide
 */
function toSlug(text) {
  if (!text || typeof text !== 'string') return 'unknown';
  
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50) || 'unknown';
}

/**
 * Détermine le domaine (tuya/zigbee) depuis un manufacturer
 * @param {string} manufacturer - Nom du manufacturer
 * @returns {string} 'tuya' ou 'zigbee'
 */
function getDomain(manufacturer) {
  if (!manufacturer || typeof manufacturer !== 'string') return 'zigbee';
  
  const man = manufacturer.toLowerCase();
  if (man.includes('tuya') || man.startsWith('_tz') || man.startsWith('_ty')) {
    return 'tuya';
  }
  
  return 'zigbee';
}

/**
 * Détermine le vendor depuis un manufacturer avec heuristiques
 * @param {string} manufacturer - Nom du manufacturer
 * @returns {string} Vendor normalisé
 */
function getVendor(manufacturer) {
  if (!manufacturer || typeof manufacturer !== 'string') return 'generic';
  
  const man = manufacturer.toLowerCase();
  
  if (man.includes('tuya') || man.startsWith('_tz') || man.startsWith('_ty')) return 'tuya';
  if (man.includes('aqara') || man.includes('lumi')) return 'aqara';
  if (man.includes('ikea') || man.includes('tradfri')) return 'ikea';
  if (man.includes('philips') || man.includes('signify') || man.includes('hue')) return 'philips';
  if (man.includes('sonoff') || man.includes('itead')) return 'sonoff';
  if (man.includes('ledvance') || man.includes('osram')) return 'ledvance';
  
  return 'generic';
}

/**
 * Détermine la catégorie depuis les capabilities avec heuristiques
 * @param {Array} capabilities - Liste des capabilities
 * @returns {string} Catégorie déterminée
 */
function getCategory(capabilities) {
  const caps = toArray(capabilities);
  const capSet = new Set(caps.map(c => String(c).toLowerCase()));
  
  if (capSet.has('windowcoverings_set') || capSet.has('windowcoverings_state')) return 'cover';
  if (capSet.has('onoff') && capSet.has('dim')) return 'light';
  if (capSet.has('alarm_motion')) return 'sensor-motion';
  if (capSet.has('alarm_contact')) return 'sensor-contact';
  if (capSet.has('measure_temperature')) return 'sensor-temp';
  if (capSet.has('measure_humidity')) return 'sensor-humidity';
  if (capSet.has('measure_luminance')) return 'sensor-lux';
  if (capSet.has('alarm_smoke')) return 'sensor-smoke';
  if (capSet.has('alarm_water')) return 'sensor-leak';
  if (capSet.has('measure_power') || capSet.has('meter_power')) return 'meter-power';
  if (capSet.has('target_temperature')) return 'climate-thermostat';
  if (capSet.has('locked')) return 'lock';
  if (capSet.has('alarm_siren')) return 'siren';
  if (capSet.has('onoff') && (capSet.has('measure_power') || capSet.has('meter_power'))) return 'plug';
  if (capSet.has('onoff')) return 'switch';
  
  return 'other';
}

module.exports = {
  toArray,
  normalizeName,
  normalizeCapabilities,
  mergeArrays,
  safeJsonParse,
  safeJsonStringify,
  toSlug,
  getDomain,
  getVendor,
  getCategory
};
