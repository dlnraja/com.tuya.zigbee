'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║   EVENT DEDUPLICATION LAYER v9.0.47 (porté de stable-v5 v5.5.670)          ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  RÈGLE D'OR : 1 action physique = 1 event Homey                             ║
 * ║                                                                              ║
 * ║  CONTEXTE — pourquoi ce module existait et a été perdu :                     ║
 * ║  stable-v5 portait cette couche (lib/EventDeduplicationLayer.js) qui         ║
 * ║  empêche les événements dupliqués quand un device parle à la fois ZCL        ║
 * ║  et Tuya DP (TS0601 hybrides). Le commit TITAN V5 GOD-MODE (53234799d)       ║
 * ║  l'a supprimé en croyant que les mixins suffiraient — mais les mixins       ║
 * ║  gèrent la déduplication par-gang, pas par (device, capability, valeur).     ║
 * ║                                                                              ║
 * ║  CAS D'USAGE :                                                               ║
 * ║   - TS0601 qui envoie un DP report ET un ZCL attr report pour le même       ║
 * ║     changement d'état → 2 events au lieu d'1                                 ║
 * ║   - Mesh Zigbee qui retransmet un frame (déjà couvert par TSN dedup,         ║
 * ║     mais EventDedupLayer ajoute une 2ème ligne de défense par valeur)        ║
 * ║   - Boutons stateless qui trigger scenes + onOff simultanément               ║
 * ║                                                                              ║
 * ║  AMÉLIORATIONS v9.0.47 vs stable-v5 :                                        ║
 * ║   - Timer via homey.setInterval (règle R32, pas de bare setInterval)         ║
 * ║   - Guard _destroyed dans toutes les méthodes                                ║
 * ║   - Cleanup explicite sur destroy() (règle B7)                               ║
 * ║   - Stats exposées pour diagnostics                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

class EventDeduplicationLayer {
  /**
   * @param {Object} options
   * @param {number} [options.windowMs=300] - Fenêtre de déduplication (ms)
   * @param {number} [options.cleanupIntervalMs=60000] - Intervalle de nettoyage
   * @param {Object} [options.homey] - Instance Homey (requis pour setInterval R32)
   * @param {number} [options.maxCacheSize=1000] - Taille max du cache
   */
  constructor(options = {}) {
    this.windowMs = options.windowMs || 300;
    this.maxCacheSize = options.maxCacheSize || 1000;
    this._destroyed = false;
    this.cache = new Map();
    this.stats = { total: 0, deduped: 0 };

    // v9.0.47: Timer via homey.setInterval (règle R32 anti memory leak)
    const homey = options.homey;
    const setter = homey?.setInterval ? homey.setInterval.bind(homey) : globalThis.setInterval;
    this._cleanupInterval = setter.call(homey || global, () => {
      if (this._destroyed) return;
      this._periodicCleanup();
    }, options.cleanupIntervalMs || 60000);
  }

  /**
   * Vérifie si un event doit être traité ou est un doublon.
   * @param {string} deviceId - ID du device
   * @param {string} capability - Nom de la capability (ex: 'onoff', 'measure_temperature')
   * @param {*} value - Valeur de l'event
   * @returns {boolean} true si l'event doit être traité, false si doublon
   */
  shouldProcess(deviceId, capability, value) {
    if (this._destroyed) return true; // Fail-open si détruit

    this.stats.total++;
    const key = `${deviceId}:${capability}`;
    const hash = `${key}:${JSON.stringify(value)}`;
    const now = Date.now();
    const cached = this.cache.get(key);

    // Doublon : même device + même capability + même valeur + dans la fenêtre
    if (cached && cached.hash === hash && (now - cached.time) < this.windowMs) {
      this.stats.deduped++;
      return false;
    }

    this.cache.set(key, { hash, time: now, value });
    this._cleanup();
    return true;
  }

  /**
   * Wrap un setter de capability avec déduplication.
   * @param {Object} device - Instance du device Homey
   * @param {string} capability - Nom de la capability
   * @param {Function} setter - Fonction setter originale
   * @returns {Function} Setter wrappé avec déduplication
   */
  wrap(device, capability, setter) {
    return async (value) => {
      const id = device.getData?.()?.id || device.id || 'unknown';
      if (this.shouldProcess(id, capability, value)) {
        return setter(value);
      }
    };
  }

  /**
   * Nettoyage incrémental quand le cache approche de sa limite.
   */
  _cleanup() {
    if (this.cache.size > this.maxCacheSize) {
      const cutoff = Date.now() - this.windowMs * 10;
      for (const [k, v] of this.cache) {
        if (v.time < cutoff) this.cache.delete(k);
      }
    }
  }

  /**
   * Nettoyage périodique complet.
   */
  _periodicCleanup() {
    const cutoff = Date.now() - this.windowMs * 10;
    for (const [k, v] of this.cache) {
      if (v.time < cutoff) this.cache.delete(k);
    }
  }

  /**
   * Destruction propre (règle B7). À appeler dans onUninit/onDeleted.
   */
  destroy() {
    this._destroyed = true;
    if (this._cleanupInterval) {
      try { clearInterval(this._cleanupInterval); } catch (_e) {}
      this._cleanupInterval = null;
    }
    this.cache.clear();
  }

  /**
   * Statistiques pour diagnostics.
   * @returns {Object} { total, deduped, cacheSize, dedupRate }
   */
  getStats() {
    const rate = this.stats.total > 0
      ? (this.stats.deduped / this.stats.total * 100).toFixed(1)
      : '0.0';
    return { ...this.stats, cacheSize: this.cache.size, dedupRate: `${rate}%` };
  }
}

module.exports = EventDeduplicationLayer;
