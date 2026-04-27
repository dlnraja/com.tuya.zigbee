'use strict';

const crypto = require('crypto');

/**
 * ManufacturerResolver - v1.0.0
 * Implementation of Rule 24: Identity Resolution & Manufacturer Normalization
 */
class ManufacturerResolver {
  /**
   * Normalise un manufacturerName selon Rule 24
   * Insensible à la casse, Unicode-safe, collapse des séparateurs
   */
  static normalize(name) {
    if (!name || typeof name !== 'string') return null;
    
    return name
      .trim()                                    // Supprime espaces début/fin
      .normalize('NFKD')                        // Décompose Unicode (accents)
      .replace(/[\u0300-\u036f]/g, '')          // Supprime diacritiques
      .toLowerCase()                            // Insensible à la casse
      .replace(/[^a-z0-9]+/g, '_')              // Remplace non-alphanum par _
      .replace(/^_+|_+$/g, '')                  // Supprime _ début/fin
      .replace(/_+/g, '_');                     // Collapse underscores multiples
  }

  /**
   * Résout vers le nom canonique via mapping de variants
   */
  static resolve(rawName, mapping = {}) {
    const normalized = this.normalize(rawName);
    if (!normalized) return null;
    
    // Recherche dans le mapping, fallback sur la forme normalisée
    return mapping[normalized] || normalized;
  }

  /**
   * Génère un ID unique stable pour indexation
   */
  static generateId(canonicalName) {
    if (!canonicalName) return null;
    return crypto
      .createHash('sha256')
      .update(canonicalName)
      .digest('hex')
      .slice(0, 12); // 12 chars = ~72 bits d'entropie
  }
}

module.exports = ManufacturerResolver;
