'use strict';

/**
 * HELPERS SÉCURISÉS - RÈGLES D'OR POUR IA REFAIT TOUT LE PROJET
 * Évite les crashes et garantit la robustesse
 */

// Règle d'or // 1: Jamais .map() sur valeur non assurée
function toArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

// Règle d'or // 2: JSON sécurisé
function safeJsonParse(text, fallback = null) {
  try {
    return JSON.parse(text);
  } } catch (error) {
    return fallback;
  }
}

function safeJsonStringify(obj, space = 2) {
  try {
    return JSON.stringify(obj, null, space);
  } } catch (error) {
    return '{}';
  }
}

// Règle d'or // 3: Chemins sécurisés
function safePath(...parts) {
  const path = require('path');
  try {
    return path.join(...parts.filter(Boolean));
  } } catch (error) {
    return '';
  }
}

// Règle d'or // 4: Lecture fichier sécurisée
function safeReadFile(filePath, encoding = 'utf8') {
  const fs = require('fs');
  try {
    return fs.readFileSync(filePath, encoding);
  } } catch (error) {
    return null;
  }
}

// Règle d'or // 5: Écriture fichier sécurisée
function safeWriteFile(filePath, content, options = {}) {
  const fs = require('fs');
  const path = require('path');
  try {
    // Créer le répertoire parent si nécessaire
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content, options);
    return true;
  } } catch (error) {
    return false;
  }
}

// Règle d'or // 6: Normalisation des noms
function normalizeName(name) {
  if (name == null) return { en: 'Device', fr: 'Appareil' };
  if (typeof name === 'string') return { en: name, fr: name };
  if (typeof name === 'object' && name !== null) {
    const result = { ...name };
    if (!result.en) result.en = Object.values(name)[0] || 'Device';
    if (!result.fr) result.fr = result.en;
    return result;
  }
  return { en: 'Device', fr: 'Appareil' };
}

// Règle d'or // 7: Slug sécurisé
function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Règle d'or // 8: Merge arrays sécurisé
function mergeArrays(...arrays) {
  const result = new Set();
  for (const arr of arrays) {
    for (const item of toArray(arr)) {
      if (item != null && item !== '') {
        result.add(item);
      }
    }
  }
  return [...result];
}

// Règle d'or // 9: Vérification structure driver
function validateDriverStructure(driverPath) {
  const path = require('path');
  const fs = require('fs');
  
  const parts = driverPath.split(path.sep);
  if (parts.length < 4) {
    return { valid: false, reason: 'Profondeur insuffisante' };
  }
  
  const domain = parts[parts.length - 4];
  const category = parts[parts.length - 3];
  const vendor = parts[parts.length - 2];
  const model = parts[parts.length - 1];
  
  if (!['tuya', 'zigbee'].includes(domain)) {
    return { valid: false, reason: `Domain invalide: ${domain}` };
  }
  
  return {
    valid: true,
    domain,
    category,
    vendor,
    model,
    expectedId: `${category}-${vendor}-${model}`
  };
}

// Règle d'or // 10: Logger sécurisé
function createLogger(prefix) {
  return {
    info: (msg, ...args) => console.log(`[${prefix}]`, msg, ...args),
    warn: (msg, ...args) => console.warn(`[${prefix}] ⚠️`, msg, ...args),
    error: (msg, ...args) => console.error(`[${prefix}] ❌`, msg, ...args),
    success: (msg, ...args) => console.log(`[${prefix}] ✅`, msg, ...args)
  };
}

// Export des helpers
module.exports = {
  toArray,
  safeJsonParse,
  safeJsonStringify,
  safePath,
  safeReadFile,
  safeWriteFile,
  normalizeName,
  slugify,
  mergeArrays,
  validateDriverStructure,
  createLogger
};
