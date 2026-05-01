'use strict';

/**
 * ClusterModel — Modèle de données pour les clusters intelligents
 * 
 * Types de clusters:
 *   - room: pièce implicite (devices corrélés spatialement)
 *   - functional: groupe fonctionnel (toutes les lumières, tous les switches)
 *   - energy: cluster énergétique (devices consommant ensemble)
 *   - presence: zone de présence (devices détectant activité humaine)
 */

const CLUSTER_TYPES = {
  ROOM: 'room',
  FUNCTIONAL: 'functional',
  ENERGY: 'energy',
  PRESENCE: 'presence',
};

const CONFIDENCE_LEVELS = {
  WEAK: 0.5,      // Corrélation faible
  MODERATE: 0.7,  // Même cluster
  STRONG: 0.9,    // Room-level (même pièce)
};

class Cluster {
  constructor(options = {}) {
    this.id = options.id || `cluster_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.type = options.type || CLUSTER_TYPES.FUNCTIONAL;
    this.devices = options.devices || [];
    this.confidence = options.confidence || 0.5;
    this.inferredName = options.inferredName || null;
    this.lastUpdated = options.lastUpdated || Date.now();
    this.createdAt = options.createdAt || Date.now();
    this.userOverride = options.userOverride || false;
    this.userLabel = options.userLabel || null;
    this.metadata = options.metadata || {};
    
    // Historique des activations (circular buffer)
    this.activationHistory = [];
    this.maxHistory = 50;
    
    // Stats
    this.stats = {
      totalActivations: 0,
      lastActivation: null,
      avgActivationHour: null,
      peakHour: null,
    };
  }

  addDevice(deviceId) {
    if (!this.devices.includes(deviceId)) {
      this.devices.push(deviceId);
      this.lastUpdated = Date.now();
    }
  }

  removeDevice(deviceId) {
    const idx = this.devices.indexOf(deviceId);
    if (idx !== -1) {
      this.devices.splice(idx, 1);
      this.lastUpdated = Date.now();
    }
  }

  hasDevice(deviceId) {
    return this.devices.includes(deviceId);
  }

  recordActivation(deviceId, timestamp = Date.now()) {
    this.activationHistory.push({ deviceId, timestamp });
    if (this.activationHistory.length > this.maxHistory) {
      this.activationHistory.shift();
    }
    this.stats.totalActivations++;
    this.stats.lastActivation = timestamp;
    
    // Calculer l'heure moyenne d'activation
    const hour = new Date(timestamp).getHours();
    if (this.stats.avgActivationHour === null) {
      this.stats.avgActivationHour = hour;
    } else {
      this.stats.avgActivationHour = (this.stats.avgActivationHour + hour) / 2;
    }
  }

  updateConfidence(newScore) {
    // Moyenne pondérée : 70% ancien + 30% nouveau (apprentissage lent)
    this.confidence = this.confidence * 0.7 + newScore * 0.3;
    this.lastUpdated = Date.now();
  }

  isRoomLevel() {
    return this.confidence >= CONFIDENCE_LEVELS.STRONG && this.type === CLUSTER_TYPES.ROOM;
  }

  isUserOverridden() {
    return this.userOverride === true;
  }

  /**
   * Infère un nom basé sur les patterns d'utilisation
   */
  inferName() {
    if (this.userLabel) return this.userLabel;
    
    const avgHour = this.stats.avgActivationHour;
    const deviceTypes = this.metadata.deviceTypes || [];
    
    // Logique de nommage contextuelle
    if (deviceTypes.includes('light') && avgHour !== null) {
      if (avgHour >= 22 || avgHour < 6) return 'Chambre (nuit)';
      if (avgHour >= 6 && avgHour < 10) return 'Cuisine (matin)';
      if (avgHour >= 17 && avgHour < 22) return 'Salon (soir)';
    }
    
    if (deviceTypes.includes('sensor') && deviceTypes.includes('light')) {
      return 'Zone sensor + lumière';
    }
    
    if (deviceTypes.length === 1) {
      const type = deviceTypes[0];
      const count = this.devices.length;
      return `${type.charAt(0).toUpperCase() + type.slice(1)}s (${count})`;
    }
    
    return this.inferredName || `Cluster_${this.id.slice(-6)}`;
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      devices: [...this.devices],
      confidence: Math.round(this.confidence * 100) / 100,
      inferredName: this.inferName(),
      lastUpdated: this.lastUpdated,
      createdAt: this.createdAt,
      userOverride: this.userOverride,
      userLabel: this.userLabel,
      deviceCount: this.devices.length,
      stats: { ...this.stats },
      metadata: { ...this.metadata },
    };
  }

  static fromJSON(data) {
    const cluster = new Cluster(data);
    if (data.stats) cluster.stats = { ...data.stats };
    if (data.metadata) cluster.metadata = { ...data.metadata };
    return cluster;
  }
}

module.exports = { Cluster, CLUSTER_TYPES, CONFIDENCE_LEVELS };