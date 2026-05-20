'use strict';

/**
 * ClusterStorage — Persistance des clusters intelligents
 * 
 * Stocke les clusters dans Homey settings (homey.settings)
 * pour survivre aux redémarrages de l'app.
 * 
 * Mode Safe: userOverride = true bloque l'IA sur ce cluster
 */

const { Cluster } = require('./ClusterModel');

const STORAGE_KEY = 'smart_clusters';
const STORAGE_VERSION = 1;

class ClusterStorage {
  constructor(homey, options = {}) {
    this.homey = homey;
    this.storageKey = options.storageKey || STORAGE_KEY;
    this.autoSave = options.autoSave !== false;
    this.saveInterval = options.saveInterval || 300000; // 5 min
    this._saveTimer = null;
    this._dirty = false;
    this._cache = null;
  }

  /**
   * Charge les clusters depuis le stockage Homey
   * @returns {Map<string, Cluster>}
   */
  load() {
    try {
      const raw = this.homey.settings.get(this.storageKey);
      if (!raw || !raw.clusters || raw.version !== STORAGE_VERSION) {
        return new Map();
      }

      const clusters = new Map();
      for (const [id, data] of Object.entries(raw.clusters)) {
        clusters.set(id, Cluster.fromJSON(data));
      }
      this._cache = clusters;
      return clusters;
    } catch (err) {
      return new Map();
    }
  }

  /**
   * Sauvegarde les clusters dans le stockage Homey
   * @param {Map<string, Cluster>} clusters
   */
  save(clusters) {
    if (!clusters || clusters.size === 0) return;

    try {
      const data = {
        version: STORAGE_VERSION,
        lastSaved: Date.now(),
        clusterCount: clusters.size,
        clusters: {},
      };

      for (const [id, cluster] of clusters) {
        data.clusters[id] = cluster.toJSON();
      }

      this.homey.settings.set(this.storageKey, data);
      this._cache = clusters;
      this._dirty = false;
    } catch (err) {
      // Silencieux — le stockage peut échouer si Homey est en mode restreint
    }
  }

  /**
   * Marque les données comme modifiées (pour auto-save)
   */
  markDirty() {
    this._dirty = true;
  }

  /**
   * Démarre l'auto-save périodique
   */
  startAutoSave(clustersGetter) {
    if (this._saveTimer) return;
    
    this._saveTimer = setInterval(() => {
      if (this._dirty) {
        const clusters = clustersGetter();
        if (clusters) this.save(clusters);
      }
    }, this.saveInterval);
  }

  /**
   * Arrête l'auto-save
   */
  stopAutoSave() {
    if (this._saveTimer) {
      clearInterval(this._saveTimer);
      this._saveTimer = null;
    }
  }

  /**
   * Exporte les clusters en JSON (pour backup/debug)
   */
  exportJSON(clusters) {
    const data = [];
    for (const [, cluster] of clusters) {
      data.push(cluster.toJSON());
    }
    return JSON.stringify(data, null, 2);
  }

  /**
   * Importe des clusters depuis un JSON
   */
  importJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      const clusters = new Map();
      for (const item of data) {
        const cluster = Cluster.fromJSON(item);
        clusters.set(cluster.id, cluster);
      }
      return clusters;
    } catch (err) {
      return new Map();
    }
  }

  /**
   * Supprime un cluster du stockage
   */
  deleteCluster(clusters, clusterId) {
    clusters.delete(clusterId);
    this.markDirty();
    if (this.autoSave) this.save(clusters);
  }

  /**
   * Fusionne un cluster existant avec de nouvelles données
   * Respecte le mode Safe (userOverride)
   */
  mergeCluster(existing, updates) {
    if (existing.isUserOverridden()) {
      // Ne pas modifier les clusters override par l'utilisateur
      return existing;
    }

    if (updates.confidence !== undefined) {
      existing.updateConfidence(updates.confidence);
    }
    if (updates.devices) {
      for (const deviceId of updates.devices) {
        existing.addDevice(deviceId);
      }
    }
    if (updates.type) {
      existing.type = updates.type;
    }
    if (updates.metadata) {
      existing.metadata = { ...existing.metadata, ...updates.metadata };
    }

    this.markDirty();
    return existing;
  }

  destroy() {
    this.stopAutoSave();
    this._cache = null;
  }
}

module.exports = { ClusterStorage };