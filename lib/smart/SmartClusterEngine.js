'use strict';

/**
 * SmartClusterEngine — Moteur de clustering intelligent
 * 
 * Architecture demandée:
 *   lib/smart/
 *     ├── SmartClusterEngine.js  ← ce fichier
 *     ├── ClusterModel.js
 *     ├── ClusterScoring.js
 *     ├── ClusterStorage.js
 *     └── SmartCoordinator.js
 * 
 * Pipeline: Devices → Signals → Scoring → Clusters → Continuous Learning
 * 
 * Types de clusters:
 *   🏠 room: pièces implicites
 *   💡 functional: groupes fonctionnels (lights, switches, climate…)
 *   ⚡ energy: clusters énergétiques
 *   👤 presence: zones de présence
 * 
 * Signaux utilisés:
 *   A. Corrélation temporelle (delta < 2s)
 *   B. Séquences utilisateur (bouton → lumière → prise)
 *   C. Contexte temporel (nuit → chambre, matin → cuisine)
 *   D. Profil device (class: light, socket, sensor)
 *   E. Topologie Zigbee (même routeur, même endpoint group)
 * 
 * Mode Safe: userOverride = true bloque l'IA sur ce cluster
 */

const EventEmitter = require('events');
const { Cluster, CLUSTER_TYPES, CONFIDENCE_LEVELS } = require('./ClusterModel');
const { ClusterScoring } = require('./ClusterScoring');
const { ClusterStorage } = require('./ClusterStorage');

// Intervalle de recalcul (10 minutes)
const RECALC_INTERVAL_MS = 10 * 60 * 1000;
// Nombre minimum de corrélations pour former un cluster
const MIN_CORRELATIONS = 3;
// Taille max d'un cluster
const MAX_CLUSTER_SIZE = 50;

class SmartClusterEngine extends EventEmitter {
  constructor(homey, options = {}) {
    super();
    this.homey = homey;
    this.clusters = new Map();
    this.scoring = new ClusterScoring(options.scoring || {});
    this.storage = new ClusterStorage(homey, options.storage || {});
    this.enabled = options.enabled !== false;
    this.recalcInterval = options.recalcInterval || RECALC_INTERVAL_MS;
    this._recalcTimer = null;
    this._started = false;
    this._recentEvents = new Map(); // deviceId → timestamp
  }

  /**
   * Démarre le moteur de clustering
   */
  start() {
    if (this._started || !this.enabled) return;
    this._started = true;

    // Charger les clusters persistés
    const saved = this.storage.load();
    for (const [id, cluster] of saved) {
      this.clusters.set(id, cluster);
    }

    // Démarrer l'auto-save
    this.storage.startAutoSave(() => this.clusters);

    // Recalcul périodique
    this._recalcTimer = setInterval(() => {
      this.recalculateAll();
    }, this.recalcInterval);

    this.emit('started', { clusterCount: this.clusters.size });
  }

  /**
   * Arrête le moteur
   */
  stop() {
    if (this._recalcTimer) {
      clearInterval(this._recalcTimer);
      this._recalcTimer = null;
    }
    this.storage.stopAutoSave();
    this.storage.save(this.clusters);
    this._started = false;
    this.emit('stopped');
  }

  /**
   * Point d'entrée principal : traite un événement device
   * Appelé depuis SmartCoordinator ou BaseHybridDevice
   * 
   * @param {object} device - Device Homey
   * @param {object} event - { type, capability, value, ... }
   */
  onDeviceEvent(device, event) {
    if (!this.enabled) return;

    const deviceId = device.id || device.getData?.()?.id;
    if (!deviceId) return;

    const now = Date.now();

    // 1. Enregistrer la corrélation temporelle
    for (const [otherId, timestamp] of this._recentEvents) {
      if (otherId !== deviceId && now - timestamp < 2000) {
        this.scoring.recordCorrelation(deviceId, otherId, now - timestamp);
      }
    }
    this._recentEvents.set(deviceId, now);

    // 2. Nettoyer les anciens événements
    for (const [id, ts] of this._recentEvents) {
      if (now - ts > 10000) this._recentEvents.delete(id);
    }

    // 3. Enregistrer l'activation dans les clusters existants
    for (const [, cluster] of this.clusters) {
      if (cluster.hasDevice(deviceId)) {
        cluster.recordActivation(deviceId, now);
      }
    }

    // 4. Émettre l'événement pour le SmartCoordinator
    this.emit('device_event', { deviceId, event });
  }

  /**
   * Recalcule tous les clusters à partir des corrélations observées
   * Algorithme: Union-Find simplifié avec seuils
   */
  recalculateAll() {
    if (!this.enabled) return;

    // Récupérer tous les devices connus
    const allDeviceIds = new Set();
    for (const [, cluster] of this.clusters) {
      for (const id of cluster.devices) {
        allDeviceIds.add(id);
      }
    }
    for (const [id] of this._recentEvents) {
      allDeviceIds.add(id);
    }

    if (allDeviceIds.size < 2) return;

    // Construire la matrice de scores
    const deviceIds = Array.from(allDeviceIds);
    const edges = []; // { a, b, score }

    for (let i = 0; i < deviceIds.length; i++) {
      for (let j = i + 1; j < deviceIds.length; j++) {
        const score = this.scoring.scorePair(
          { id: deviceIds[i] },
          { id: deviceIds[j] }
        );
        if (score >= CONFIDENCE_LEVELS.MODERATE) {
          edges.push({ a: deviceIds[i], b: deviceIds[j], score });
        }
      }
    }

    // Trier par score décroissant
    edges.sort((a, b) => b.score - a.score);

    // Union-Find
    const parent = {};
    for (const id of deviceIds) parent[id] = id;

    const find = (x) => {
      while (parent[x] !== x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
      }
      return x;
    };

    const union = (a, b) => {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent[ra] = rb;
    };

    for (const edge of edges) {
      union(edge.a, edge.b);
    }

    // Regrouper par racine
    const groups = new Map();
    for (const id of deviceIds) {
      const root = find(id);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root).push(id);
    }

    // Mettre à jour les clusters
    const newClusters = new Map();
    for (const [root, members] of groups) {
      if (members.length < 2) continue; // Ignorer les singletons

      // Chercher un cluster existant qui contient la majorité des membres
      let bestExisting = null;
      let bestOverlap = 0;
      for (const [, cluster] of this.clusters) {
        const overlap = members.filter(m => cluster.hasDevice(m)).length;
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          bestExisting = cluster;
        }
      }

      if (bestExisting && bestOverlap >= members.length * 0.5) {
        // Mettre à jour le cluster existant
        for (const id of members) bestExisting.addDevice(id);
        bestExisting.lastUpdated = Date.now();
        newClusters.set(bestExisting.id, bestExisting);
      } else {
        // Créer un nouveau cluster
        const cluster = new Cluster({
          devices: members,
          type: this.scoring.inferClusterType(members.map(id => ({ type: 'unknown', id }))),
          confidence: edges.length > 0 ? edges[0].score : 0.5,
        });
        newClusters.set(cluster.id, cluster);
        this.emit('cluster_formed', cluster.toJSON());
      }
    }

    this.clusters = newClusters;
    this.storage.markDirty();
    this.emit('clusters_updated', this.getSummary());
  }

  /**
   * Ajoute manuellement un device à un cluster
   * (Mode Safe: crée un override utilisateur)
   */
  addDeviceToCluster(deviceId, clusterId) {
    const cluster = this.clusters.get(clusterId);
    if (!cluster) return false;
    cluster.addDevice(deviceId);
    cluster.userOverride = true;
    this.storage.markDirty();
    this.emit('cluster_modified', cluster.toJSON());
    return true;
  }

  /**
   * Retire un device d'un cluster
   */
  removeDeviceFromCluster(deviceId, clusterId) {
    const cluster = this.clusters.get(clusterId);
    if (!cluster) return false;
    cluster.removeDevice(deviceId);
    cluster.userOverride = true;
    this.storage.markDirty();
    this.emit('cluster_modified', cluster.toJSON());
    return true;
  }

  /**
   * Renomme un cluster (override utilisateur)
   */
  labelCluster(clusterId, label) {
    const cluster = this.clusters.get(clusterId);
    if (!cluster) return false;
    cluster.userLabel = label;
    cluster.userOverride = true;
    this.storage.markDirty();
    this.emit('cluster_labeled', { clusterId, label });
    return true;
  }

  /**
   * Récupère le cluster d'un device
   */
  getDeviceCluster(deviceId) {
    for (const [, cluster] of this.clusters) {
      if (cluster.hasDevice(deviceId)) return cluster;
    }
    return null;
  }

  /**
   * Récupère tous les clusters d'un type donné
   */
  getClustersByType(type) {
    const result = [];
    for (const [, cluster] of this.clusters) {
      if (cluster.type === type) result.push(cluster);
    }
    return result;
  }

  /**
   * Récupère un résumé de tous les clusters
   */
  getSummary() {
    const clusters = [];
    for (const [, cluster] of this.clusters) {
      clusters.push(cluster.toJSON());
    }
    return {
      total: clusters.length,
      byType: {
        room: clusters.filter(c => c.type === CLUSTER_TYPES.ROOM).length,
        functional: clusters.filter(c => c.type === CLUSTER_TYPES.FUNCTIONAL).length,
        energy: clusters.filter(c => c.type === CLUSTER_TYPES.ENERGY).length,
        presence: clusters.filter(c => c.type === CLUSTER_TYPES.PRESENCE).length,
      },
      clusters,
      scoring: this.scoring.getStats(),
    };
  }

  /**
   * Nettoie les clusters vides et les anciens historiques
   */
  cleanup() {
    // Supprimer les clusters vides
    for (const [id, cluster] of this.clusters) {
      if (cluster.devices.length === 0) {
        this.clusters.delete(id);
      }
    }

    // Nettoyer les historiques de scoring
    this.scoring.cleanup();

    this.storage.markDirty();
  }

  destroy() {
    this.stop();
    this.clusters.clear();
    this._recentEvents.clear();
    this.removeAllListeners();
  }
}

module.exports = { SmartClusterEngine };