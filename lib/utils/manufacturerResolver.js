// lib/utils/manufacturerResolver.js
// Résolution d'identité des fabricants selon la Rule 24 (normalisation insensible à la casse)
'use strict';

const crypto = require('crypto');

/**
 * ManufacturerResolver - Rule 24 Implementation
 * Normalisation insensible à la casse et Unicode-safe pour les noms de fabricants
 */
class ManufacturerResolver {
  /**
   * Normalise un nom de fabricant selon la Rule 24
   * @param {string} name - Nom brut du fabricant
   * @returns {string|null} Nom normalisé ou null si invalide
   */
  static normalize(name) {
    if (!name || typeof name !== 'string') return null;
    return name
      .trim()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_');
  }

  /**
   * Résout un nom brut vers une forme canonique via un mapping
   * @param {string} rawName - Nom brut
   * @param {Object} mapping - Table de mapping variants → canonique
   * @returns {string|null} Nom canonique ou null si inconnu
   */
  static resolve(rawName, mapping = {}) {
    const normalized = this.normalize(rawName);
    if (!normalized) return null;
    if (mapping[normalized]) {
      return mapping[normalized];
    }
    return normalized;
  }

  /**
   * Génère un ID unique stable pour un fabricant
   * @param {string} canonicalName - Nom canonique
   * @returns {string|null} Hash SHA-256 tronqué (12 caractères)
   */
  static generateId(canonicalName) {
    if (!canonicalName) return null;
    return crypto
      .createHash('sha256')
      .update(canonicalName)
      .digest('hex')
      .slice(0, 12);
  }

  /**
   * Construit une table de mapping à partir d'une liste d'entrées
   * @param {Array} entries - Liste des entrées {variants: [], canonical: string}
   * @returns {Object} Mapping normalized → canonical
   */
  static buildMapping(entries) {
    const mapping = {};
    for (const entry of entries) {
      const canonical = this.normalize(entry.canonical);
      if (!canonical) continue;
      for (const variant of entry.variants) {
        const normalized = this.normalize(variant);
        if (normalized) {
          mapping[normalized] = canonical;
        }
      }
      mapping[canonical] = canonical;
    }
    return mapping;
  }
}

module.exports = ManufacturerResolver;
