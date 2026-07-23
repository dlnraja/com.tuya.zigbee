// lib/utils/manufacturerResolver.js
// Résolution d'identité des fabricants selon la Rule 24 (normalisation insensible à la casse)
// v10.0.0: Now delegates NFKD + accents to TuyaNormalizer (single source of truth)
const crypto = require('crypto');
const TU = require('./TuyaNormalizer');

class ManufacturerResolver {
  /**
   * Normalise un nom de fabricant selon la Rule 24
   * @param {string} name - Nom brut du fabricant
   * @returns {string|null} Nom normalisé ou null si invalide
   */
  static normalize(name) {
    if (!name || typeof name !== 'string') {return null;}
    // v10.0.0: Use TuyaNormalizer for NFKD + accents + lowercase (single source of truth)
    return TU.normalize(name)
      .replace(/[^a-z0-9]+/g, '_')              // Remplace les non-alphanumériques par _
      .replace(/^_+|_+$/g, '')                  // Supprime les _ en début/fin
      .replace(/_+/g, '_');                     // Collapse les underscores multiples
  }

  /**
   * Résout un nom brut vers une forme canonique via un mapping
   * @param {string} rawName - Nom brut
   * @param {Object} mapping - Table de mapping variants → canonique
   * @returns {string|null} Nom canonique ou null si inconnu
   */
  static resolve(rawName, mapping = {}) {
    const normalized = this.normalize(rawName);
    if (!normalized) {return null;}
    // Recherche dans le mapping fourni
    if (mapping[normalized]) {
      return mapping[normalized];
    }
    // Fallback : retourne la forme normalisée comme canonique
    return normalized;
  }

  /**
   * Génère un ID unique stable pour un fabricant
   * @param {string} canonicalName - Nom canonique
   * @returns {string|null} Hash SHA-256 tronqué (12 caractères)
   */
  static generateId(canonicalName) {
    if (!canonicalName) {return null;}
    return crypto
      .createHash('sha256')
      .update(canonicalName)
      .digest('hex')
      .slice(0, 12);
  }

  /**
   * Construit une table de mapping à partir d'une liste d'entrées
   * @param {Array<{variants: string[], canonical: string}>} entries
   * @returns {Object} Mapping normalized → canonical
   */
  static buildMapping(entries) {
    const mapping = {};
    for (const entry of entries) {
      const canonical = this.normalize(entry.canonical);
      if (!canonical) {continue;}
      // Mappe tous les variants vers le canonique
      for (const variant of entry.variants) {
        const normalized = this.normalize(variant);
        if (normalized) {
          mapping[normalized] = canonical;
        }
      }
      // Assure que le canonique pointe vers lui-même
      mapping[canonical] = canonical;
    }
    return mapping;
  }
}

module.exports = ManufacturerResolver;
