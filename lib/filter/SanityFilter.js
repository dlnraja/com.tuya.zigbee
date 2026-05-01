'use strict';

/**
 * SanityFilter — Layer L11
 * Filtre anti-ghost / valeurs aberrantes
 * 
 * Rejette les variations impossibles physiquement:
 *   - Saut de température > 10°C en < 5 secondes
 *   - Humidité = 0% soudain (sauf capteur sec)
 *   - Pression atmosphérique hors limites (< 800 ou > 1100 hPa)
 *   - PM2.5 > 1000 µg/m³ (valeur instrumentale max)
 *   - CO2 > 5000 ppm (hors limites habitables)
 *   - Tension = 0V sur un device alimenté
 * 
 * Exceptions (ne JAMAIS filtrer):
 *   - Capteurs de fumée / gaz / CO
 *   - Capteurs de fuite d'eau
 *   - Alarmes de sécurité
 *   - Capteurs de mouvement (booléens)
 * 
 * Pattern: Sliding window (fenêtre glissante de 3 valeurs)
 * Inspiré de: "Anomaly Detection Using a Sliding Window Technique" (MDPI, 2023)
 */

const EventEmitter = require('events');

// Seuils de variation maximale par type de mesure
const THRESHOLDS = {
  measure_temperature: { maxDelta: 10, timeWindow: 5000, min: -40, max: 80, unit: '°C' },
  measure_humidity: { maxDelta: 30, timeWindow: 5000, min: 0, max: 100, unit: '%' },
  measure_pressure: { maxDelta: 50, timeWindow: 10000, min: 800, max: 1100, unit: 'hPa' },
  measure_pm25: { maxDelta: 500, timeWindow: 3000, min: 0, max: 1000, unit: 'µg/m³' },
  measure_co2: { maxDelta: 2000, timeWindow: 5000, min: 0, max: 5000, unit: 'ppm' },
  measure_power: { maxDelta: 5000, timeWindow: 2000, min: 0, max: 50000, unit: 'W' },
  measure_voltage: { maxDelta: 100, timeWindow: 5000, min: 0, max: 500, unit: 'V' },
  measure_current: { maxDelta: 50, timeWindow: 5000, min: 0, max: 100, unit: 'A' },
  measure_luminance: { maxDelta: 50000, timeWindow: 2000, min: 0, max: 200000, unit: 'lux' },
  measure_battery: { maxDelta: 50, timeWindow: 60000, min: 0, max: 100, unit: '%' },
  measure_noise: { maxDelta: 50, timeWindow: 3000, min: 0, max: 130, unit: 'dB' },
  measure_voc: { maxDelta: 1000, timeWindow: 5000, min: 0, max: 5000, unit: 'ppb' },
  measure_hcho: { maxDelta: 5, timeWindow: 5000, min: 0, max: 10, unit: 'mg/m³' },
  measure_soil_moisture: { maxDelta: 50, timeWindow: 10000, min: 0, max: 100, unit: '%' },
  measure_soil_conductivity: { maxDelta: 500, timeWindow: 10000, min: 0, max: 5000, unit: 'µS/cm' },
};

// Capacités qui ne doivent JAMAIS être filtrées (sécurité)
const EXEMPT_CAPABILITIES = new Set([
  'alarm_smoke',
  'alarm_co',
  'alarm_co2',
  'alarm_gas',
  'alarm_water',
  'alarm_tamper',
  'alarm_contact',
  'alarm_motion',
  'onoff',
  'dim',
  'windowcoverings_state',
  'lock_mode',
  'button',
  'tuya_dp_raw',
  'tuya_dp_bitmap',
  'tuya_dp_enum',
]);

// Nombre de valeurs dans la fenêtre glissante
const WINDOW_SIZE = 3;

class CapabilityFilter {
  constructor(capabilityId, options = {}) {
    this.capabilityId = capabilityId;
    this.window = []; // Circular buffer: [{ value, timestamp }]
    this.windowSize = options.windowSize || WINDOW_SIZE;
    this.threshold = options.threshold || THRESHOLDS[capabilityId] || null;
    this.rejectedCount = 0;
    this.acceptedCount = 0;
    this.lastRejected = null;
    this.lastAccepted = null;
    this.enabled = true;
  }

  /**
   * Ajoute une valeur et vérifie si elle est valide
   * @param {number} value - Valeur à tester
   * @returns {object} - { accepted: boolean, reason?: string, filtered?: number }
   */
  add(value) {
    const now = Date.now();
    
    // Valeurs non-numériques toujours acceptées
    if (typeof value !== 'number' || !isFinite(value)) {
      this.acceptedCount++;
      this.lastAccepted = { value, timestamp: now };
      return { accepted: true };
    }
    
    // Si pas de seuil défini, accepter
    if (!this.threshold) {
      this._addToWindow(value, now);
      this.acceptedCount++;
      this.lastAccepted = { value, timestamp: now };
      return { accepted: true };
    }
    
    // Vérifier les limites absolues
    if (value < this.threshold.min || value > this.threshold.max) {
      this.rejectedCount++;
      this.lastRejected = { value, timestamp: now, reason: 'out_of_range' };
      return {
        accepted: false,
        reason: `Value ${value} outside range [${this.threshold.min}, ${this.threshold.max}]`,
        filtered: this._getMedian(),
      };
    }
    
    // Si la fenêtre est vide ou pas assez de données, accepter
    if (this.window.length < 2) {
      this._addToWindow(value, now);
      this.acceptedCount++;
      this.lastAccepted = { value, timestamp: now };
      return { accepted: true };
    }
    
    // Calculer la variation par rapport à la moyenne de la fenêtre
    const avg = this._getAverage();
    const delta = Math.abs(value - avg);
    const timeSinceLast = now - this.window[this.window.length - 1].timestamp;
    
    // Vérifier le delta dans la fenêtre temporelle
    if (delta > this.threshold.maxDelta && timeSinceLast < this.threshold.timeWindow) {
      this.rejectedCount++;
      this.lastRejected = { value, timestamp: now, reason: 'aberrant_delta', delta, avg };
      return {
        accepted: false,
        reason: `Delta ${delta.toFixed(1)}${this.threshold.unit} exceeds max ${this.threshold.maxDelta}${this.threshold.unit} in ${timeSinceLast}ms`,
        filtered: avg,
      };
    }
    
    // Valeur acceptée
    this._addToWindow(value, now);
    this.acceptedCount++;
    this.lastAccepted = { value, timestamp: now };
    return { accepted: true };
  }

  _addToWindow(value, timestamp) {
    this.window.push({ value, timestamp });
    if (this.window.length > this.windowSize) {
      this.window.shift();
    }
  }

  _getAverage() {
    if (this.window.length === 0) return 0;
    return this.window.reduce((sum, entry) => sum + entry.value, 0) / this.window.length;
  }

  _getMedian() {
    if (this.window.length === 0) return 0;
    const sorted = this.window.map(e => e.value).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  reset() {
    this.window = [];
    this.rejectedCount = 0;
    this.acceptedCount = 0;
  }

  getStats() {
    return {
      capabilityId: this.capabilityId,
      windowSize: this.window.length,
      accepted: this.acceptedCount,
      rejected: this.rejectedCount,
      rejectionRate: this.acceptedCount + this.rejectedCount > 0
        ? (this.rejectedCount / (this.acceptedCount + this.rejectedCount) * 100).toFixed(1) + '%'
        : '0%',
      lastAccepted: this.lastAccepted,
      lastRejected: this.lastRejected,
      currentAverage: this._getAverage(),
    };
  }
}

class SanityFilter extends EventEmitter {
  constructor(options = {}) {
    super();
    this.filters = new Map(); // capabilityId → CapabilityFilter
    this.enabled = options.enabled !== false;
    this.strictMode = options.strict || false;
    this.customThresholds = options.thresholds || {};
    this.stats = {
      totalChecked: 0,
      totalRejected: 0,
      totalAccepted: 0,
    };
  }

  /**
   * Filtre une valeur de capacité
   * @param {string} capabilityId - ID de la capacité (ex: measure_temperature)
   * @param {number} value - Valeur à tester
   * @param {object} device - Device Homey (pour contexte)
   * @returns {object} - { accepted, reason?, filtered? }
   */
  filter(capabilityId, value, device = null) {
    if (!this.enabled) return { accepted: true };
    
    // Capacités exemptées (sécurité)
    if (EXEMPT_CAPABILITIES.has(capabilityId)) {
      return { accepted: true };
    }
    
    // Capacités booléennes toujours acceptées
    if (typeof value === 'boolean') {
      return { accepted: true };
    }
    
    this.stats.totalChecked++;
    
    // Récupérer ou créer le filtre pour cette capacité
    let capFilter = this.filters.get(capabilityId);
    if (!capFilter) {
      const customThreshold = this.customThresholds[capabilityId];
      capFilter = new CapabilityFilter(capabilityId, { threshold: customThreshold });
      this.filters.set(capabilityId, capFilter);
    }
    
    const result = capFilter.add(value);
    
    if (result.accepted) {
      this.stats.totalAccepted++;
    } else {
      this.stats.totalRejected++;
      this.emit('rejected', {
        capabilityId,
        value,
        reason: result.reason,
        filtered: result.filtered,
        deviceId: device?.id,
      });
    }
    
    return result;
  }

  /**
   * Filtre un rapport complet de valeurs (ex: après parsing 0xFF01)
   * @param {object} values - { capabilityId: value, ... }
   * @param {object} device - Device Homey
   * @returns {object} - { accepted: { cap: value }, rejected: { cap: { value, reason } } }
   */
  filterReport(values, device = null) {
    const accepted = {};
    const rejected = {};
    
    for (const [capId, value] of Object.entries(values)) {
      const result = this.filter(capId, value, device);
      if (result.accepted) {
        accepted[capId] = value;
      } else {
        rejected[capId] = { value, reason: result.reason, filtered: result.filtered };
      }
    }
    
    return { accepted, rejected };
  }

  /**
   * Vérifie si une valeur spécifique est aberrante (sans l'ajouter à la fenêtre)
   * @param {string} capabilityId - ID de la capacité
   * @param {number} value - Valeur à tester
   * @returns {boolean} - true si la valeur semble aberrante
   */
  isAberrant(capabilityId, value) {
    if (EXEMPT_CAPABILITIES.has(capabilityId)) return false;
    if (typeof value !== 'number' || !isFinite(value)) return false;
    
    const threshold = this.customThresholds[capabilityId] || THRESHOLDS[capabilityId];
    if (!threshold) return false;
    
    return value < threshold.min || value > threshold.max;
  }

  /**
   * Ajoute ou modifie un seuil personnalisé
   */
  setThreshold(capabilityId, threshold) {
    this.customThresholds[capabilityId] = threshold;
    // Supprimer le filtre existant pour forcer la recréation
    this.filters.delete(capabilityId);
  }

  /**
   * Active/désactive le filtre pour une capacité spécifique
   */
  setCapabilityEnabled(capabilityId, enabled) {
    let capFilter = this.filters.get(capabilityId);
    if (capFilter) {
      capFilter.enabled = enabled;
    }
  }

  getStats() {
    const perCapability = {};
    for (const [capId, filter] of this.filters) {
      perCapability[capId] = filter.getStats();
    }
    
    return {
      global: { ...this.stats },
      rejectionRate: this.stats.totalChecked > 0
        ? (this.stats.totalRejected / this.stats.totalChecked * 100).toFixed(1) + '%'
        : '0%',
      perCapability,
      enabled: this.enabled,
    };
  }

  reset() {
    for (const filter of this.filters.values()) {
      filter.reset();
    }
    this.stats = { totalChecked: 0, totalRejected: 0, totalAccepted: 0 };
  }

  destroy() {
    this.filters.clear();
    this.removeAllListeners();
  }
}

module.exports = { SanityFilter, CapabilityFilter, THRESHOLDS, EXEMPT_CAPABILITIES };