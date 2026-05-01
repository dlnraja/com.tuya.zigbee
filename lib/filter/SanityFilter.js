'use strict';

/**
 * L11 - Sanity Filter
 * Filtre anti-valeurs aberrantes pour capteurs
 * Fenêtre glissante 3 valeurs, seuil Δ>40% ou Δ>10°C/s
 * Exceptions pour capteurs critiques (fumée/gaz/fuite)
 */
class SanityFilter {
  constructor(device, options = {}) {
    this.device = device;
    this.windows = new Map(); // capabilityId -> { values[], timestamps[], config }
    this.defaultConfig = {
      windowSize: options.windowSize || 3,
      maxDeltaPercent: options.maxDeltaPercent || 40,
      maxDeltaPerSecond: options.maxDeltaPerSecond || 10,
      cooldownMs: options.cooldownMs || 5000
    };
    // Capteurs critiques: jamais filtrés
    this.criticalCapabilities = new Set([
      'alarm_smoke', 'alarm_co', 'alarm_gas', 'alarm_water',
      'alarm_tamper', 'alarm_fire', 'alarm_co2'
    ]);
  }

  /**
   * Configure le filtre pour une capability spécifique
   * @param {string} capabilityId - ID de la capability
   * @param {Object} config - Configuration spécifique
   */
  configure(capabilityId, config = {}) {
    this.windows.set(capabilityId, {
      values: [],
      timestamps: [],
      config: { ...this.defaultConfig, ...config },
      lastRejected: 0
    });
  }

  /**
   * Filtre une valeur entrante
   * @param {string} capabilityId - ID de la capability
   * @param {number} value - Valeur à filtrer
   * @returns {{ accepted: boolean, value: number, reason?: string }}
   */
  filter(capabilityId, value) {
    // Capteurs critiques: toujours acceptés
    if (this.criticalCapabilities.has(capabilityId)) {
      return { accepted: true, value };
    }

    // Valeurs non-numériques: toujours acceptées
    if (typeof value !== 'number' || !isFinite(value)) {
      return { accepted: true, value };
    }

    // Initialiser si nécessaire
    if (!this.windows.has(capabilityId)) {
      this.configure(capabilityId);
    }

    const window = this.windows.get(capabilityId);
    const now = Date.now();

    // Pas assez de données pour filtrer
    if (window.values.length < 2) {
      this._addValue(window, value, now);
      return { accepted: true, value };
    }

    const lastValue = window.values[window.values.length - 1];
    const lastTime = window.timestamps[window.timestamps.length - 1];
    const timeDelta = (now - lastTime) / 1000; // en secondes

    // Vérifier variation absolue par seconde
    if (timeDelta > 0) {
      const deltaPerSecond = Math.abs(value - lastValue) / timeDelta;
      if (deltaPerSecond > window.config.maxDeltaPerSecond) {
        // Cooldown: rejeter seulement si pas déjà rejeté récemment
        if (now - window.lastRejected > window.config.cooldownMs) {
          window.lastRejected = now;
          this.device.log(`[L11] ${capabilityId}: valeur ${value} rejetée (Δ/s=${deltaPerSecond.toFixed(1)} > ${window.config.maxDeltaPerSecond})`);
          return { accepted: false, value: lastValue, reason: `delta_per_second=${deltaPerSecond.toFixed(1)}` };
        }
      }
    }

    // Vérifier variation en pourcentage
    if (lastValue !== 0) {
      const deltaPercent = Math.abs((value - lastValue) / lastValue) * 100;
      if (deltaPercent > window.config.maxDeltaPercent) {
        if (now - window.lastRejected > window.config.cooldownMs) {
          window.lastRejected = now;
          this.device.log(`[L11] ${capabilityId}: valeur ${value} rejetée (Δ%=${deltaPercent.toFixed(1)} > ${window.config.maxDeltaPercent}%)`);
          return { accepted: false, value: lastValue, reason: `delta_percent=${deltaPercent.toFixed(1)}` };
        }
      }
    }

    this._addValue(window, value, now);
    return { accepted: true, value };
  }

  /**
   * Ajoute une valeur à la fenêtre glissante
   * @private
   */
  _addValue(window, value, timestamp) {
    window.values.push(value);
    window.timestamps.push(timestamp);

    // Garder seulement les N dernières valeurs
    while (window.values.length > window.config.windowSize) {
      window.values.shift();
      window.timestamps.shift();
    }
  }

  /**
   * Retourne la médiane des valeurs de la fenêtre
   * @param {string} capabilityId
   * @returns {number|null}
   */
  getMedian(capabilityId) {
    const window = this.windows.get(capabilityId);
    if (!window || window.values.length === 0) return null;

    const sorted = [...window.values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Réinitialise le filtre pour une capability
   * @param {string} capabilityId
   */
  reset(capabilityId) {
    this.windows.delete(capabilityId);
  }

  /**
   * Détruit le filtre
   */
  destroy() {
    this.windows.clear();
    this.criticalCapabilities.clear();
  }
}

module.exports = SanityFilter;