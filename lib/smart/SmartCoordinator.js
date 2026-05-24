'use strict';

/**
 * SmartCoordinator — Orchestrateur des Smart Features
 * 
 * Centralise:
 *   - SmartEnergyEngine (estimation conso sans capteur)
 *   - PresenceEngine (détection présence sans capteur)
 *   - SmartClusterEngine (clustering intelligent de devices)
 *   - SessionManager (L9 - IR Zosung)
 *   - HealthMonitor (L10 - Heartbeat)
 *   - SanityFilter (L11 - Anti-ghost)
 * 
 * Architecture: "Sculpteur & Statue"
 *   - Ce code tourne 100% localement sur Homey Pro
 *   - Aucune dépendance cloud
 *   - Intelligence pré-calculée par le Shadow Engine (GitHub Actions)
 */

const EventEmitter = require('events');
const { SessionManager } = require('../session/SessionManager');
const { HealthMonitor } = require('../health/HealthMonitor');
const { SanityFilter } = require('../filter/SanityFilter');

// Profils de puissance par type de device (Watts)
const POWER_PROFILES = {
  light: { min: 3, max: 12, typical: 8 },
  plug: { min: 0, max: 2200, typical: 100 },
  heater: { min: 800, max: 2000, typical: 1500 },
  fan: { min: 10, max: 60, typical: 30 },
  switch: { min: 0, max: 0.5, typical: 0.3 },
  dimmer: { min: 1, max: 200, typical: 50 },
  thermostat: { min: 0, max: 3000, typical: 1500 },
  air_purifier: { min: 5, max: 60, typical: 25 },
  humidifier: { min: 10, max: 50, typical: 30 },
  dehumidifier: { min: 200, max: 700, typical: 400 },
  tv: { min: 0.5, max: 3, typical: 1.5 }, // standby
  router: { min: 5, max: 15, typical: 8 },
  camera: { min: 3, max: 15, typical: 8 },
  curtain_motor: { min: 0, max: 50, typical: 30 }, // pendant mouvement
  garage_door: { min: 0, max: 500, typical: 300 },
  pool_pump: { min: 300, max: 1500, typical: 750 },
  default: { min: 0, max: 100, typical: 10 },
};

// Poids de présence par type d'activité
const PRESENCE_WEIGHTS = {
  light_on: 0.3,
  switch_on: 0.4,
  motion_detected: 0.8,
  button_pressed: 0.5,
  plug_on: 0.2,
  temperature_change: 0.1,
  humidity_change: 0.1,
  door_opened: 0.6,
  curtain_opened: 0.3,
  dimmer_changed: 0.3,
};

// Seuil de présence
const PRESENCE_THRESHOLD = 0.5;
const PRESENCE_DECAY_RATE = 0.05; // Perte de score par minute d'inactivité
const PRESENCE_TIMEOUT_MS = 15 * 60 * 1000; // 15 min sans activité = absence

class SmartEnergyEngine {
  constructor() {
    this.deviceStates = new Map(); // deviceId → { power, startTime, totalEnergy, ... }
  }

  /**
   * Estime la puissance instantanée d'un device
   */
  estimatePower(device) {
    const deviceId = device.id;
    const state = this.deviceStates.get(deviceId);
    if (!state) return 0;
    
    // Si le device a un vrai capteur de puissance, utiliser la valeur réelle
    if (state.realPower !== null && state.realPower !== undefined) {
      return state.realPower;
    }
    
    // Sinon, estimer selon le profil et l'état
    const profile = POWER_PROFILES[state.deviceType] || POWER_PROFILES.default;
    
    if (!state.isOn) return profile.min; // Standby
    
    // Si dimmable, ajuster selon le niveau
    if (state.dimLevel !== null && state.dimLevel !== undefined) {
      const dim = state.dimLevel / 100;
      return profile.min + (profile.max - profile.min) * dim;
    }
    
    return profile.typical;
  }

  /**
   * Met à jour l'état d'un device pour l'estimation
   */
  updateDeviceState(deviceId, state) {
    let existing = this.deviceStates.get(deviceId);
    if (!existing) {
      existing = {
        deviceType: state.deviceType || 'default',
        isOn: false,
        dimLevel: null,
        realPower: null,
        startTime: null,
        totalEnergy: 0, // Wh
        lastUpdate: Date.now(),
      };
    }
    
    // Mettre à jour les champs
    if (state.isOn !== undefined) {
      if (state.isOn && !existing.isOn) {
        existing.startTime = Date.now();
      } else if (!state.isOn && existing.isOn) {
        // Calculer l'énergie consommée pendant la période ON
        if (existing.startTime) {
          const durationMs = Date.now() - existing.startTime;
          const power = this.estimatePower({ id: deviceId });
          existing.totalEnergy += (power * durationMs) / 3600000; // Wh
        }
        existing.startTime = null;
      }
      existing.isOn = state.isOn;
    }
    
    if (state.dimLevel !== undefined) existing.dimLevel = state.dimLevel;
    if (state.realPower !== undefined) existing.realPower = state.realPower;
    if (state.deviceType !== undefined) existing.deviceType = state.deviceType;
    
    existing.lastUpdate = Date.now();
    this.deviceStates.set(deviceId, existing);
  }

  /**
   * Calcule l'énergie totale estimée d'un device
   */
  getEstimatedEnergy(deviceId) {
    const state = this.deviceStates.get(deviceId);
    if (!state) return 0;
    
    let total = state.totalEnergy;
    
    // Ajouter la consommation en cours si le device est ON
    if (state.isOn && state.startTime) {
      const durationMs = Date.now() - state.startTime;
      const power = this.estimatePower({ id: deviceId });
      total += (power * durationMs) / 3600000;
    }
    
    return total; // Wh
  }

  /**
   * Récupère les stats d'énergie d'un device
   */
  getDeviceEnergyStats(deviceId) {
    const state = this.deviceStates.get(deviceId);
    if (!state) return null;
    
    return {
      deviceId,
      deviceType: state.deviceType,
      isOn: state.isOn,
      currentPower: this.estimatePower({ id: deviceId }),
      totalEnergy: this.getEstimatedEnergy(deviceId),
      hasRealSensor: state.realPower !== null && state.realPower !== undefined,
      uptime: state.startTime ? Date.now() - state.startTime : 0,
    };
  }

  destroy() {
    this.deviceStates.clear();
  }
}

class PresenceEngine extends EventEmitter {
  constructor() {
    super();
    this.zones = new Map(); // zoneId → { devices, score, lastActivity, ... }
    this.deviceActivity = new Map(); // deviceId → { lastEvent, type, zone }
  }

  /**
   * Enregistre un device dans une zone de présence
   */
  registerDevice(deviceId, zoneId = 'default', deviceType = 'unknown') {
    if (!this.zones.has(zoneId)) {
      this.zones.set(zoneId, {
        id: zoneId,
        devices: new Set(),
        score: 0,
        lastActivity: null,
        presence: false,
      });
    }
    
    this.zones.get(zoneId).devices.add(deviceId);
    this.deviceActivity.set(deviceId, {
      lastEvent: null,
      type: deviceType,
      zone: zoneId,
    });
  }

  /**
   * Enregistre une activité et recalcule la présence
   */
  recordActivity(deviceId, activityType, value = true) {
    const activity = this.deviceActivity.get(deviceId);
    if (!activity) return;
    
    const zone = this.zones.get(activity.zone);
    if (!zone) return;
    
    const now = Date.now();
    activity.lastEvent = { type: activityType, value, timestamp: now };
    zone.lastActivity = now;
    
    // Calculer le poids de l'activité
    let weight = PRESENCE_WEIGHTS[activityType] || 0.1;
    
    // Les activités booléennes "off" réduisent le score
    if (value === false || value === 0) {
      weight *= -0.5;
    }
    
    // Appliquer le poids
    zone.score = Math.min(1, Math.max(0, zone.score + weight));
    
    // Vérifier le seuil
    const wasPresent = zone.presence;
    zone.presence = zone.score >= PRESENCE_THRESHOLD;
    
    if (zone.presence && !wasPresent) {
      this.emit('presence_detected', zone.id, zone.score);
    } else if (!zone.presence && wasPresent) {
      this.emit('presence_lost', zone.id);
    }
  }

  /**
   * Met à jour les scores de présence (decay temporel)
   * À appeler périodiquement (ex: toutes les minutes)
   */
  update() {
    const now = Date.now();
    
    for (const [zoneId, zone] of this.zones) {
      if (!zone.lastActivity) continue;
      
      const elapsed = (now - zone.lastActivity) / 60000; // minutes
      const decay = elapsed * PRESENCE_DECAY_RATE;
      
      zone.score = Math.max(0, zone.score - decay);
      
      const wasPresent = zone.presence;
      zone.presence = zone.score >= PRESENCE_THRESHOLD;
      
      // Timeout complet
      if (now - zone.lastActivity > PRESENCE_TIMEOUT_MS) {
        zone.score = 0;
        if (wasPresent) {
          zone.presence = false;
          this.emit('presence_lost', zone.id);
        }
      }
    }
  }

  /**
   * Vérifie si une zone est occupée
   */
  isPresent(zoneId = 'default') {
    const zone = this.zones.get(zoneId);
    return zone ? zone.presence : false;
  }

  /**
   * Récupère le score de présence d'une zone
   */
  getScore(zoneId = 'default') {
    const zone = this.zones.get(zoneId);
    return zone ? zone.score : 0;
  }

  /**
   * Récupère un résumé de toutes les zones
   */
  getSummary() {
    const zones = {};
    for (const [zoneId, zone] of this.zones) {
      zones[zoneId] = {
        presence: zone.presence,
        score: Math.round(zone.score * 100) / 100,
        deviceCount: zone.devices.size,
        lastActivity: zone.lastActivity,
      };
    }
    return zones;
  }

  destroy() {
    this.zones.clear();
    this.deviceActivity.clear();
    this.removeAllListeners();
  }
}

class SmartClusterEngine extends EventEmitter {
  constructor() {
    this.clusters = new Map(); // clusterId → { type, devices, confidence, ... }
    this.correlations = new Map(); // `${a}-${b}` → { score, events, ... }
    this.nextClusterId = 1;
  }

  /**
   * Enregistre une corrélation temporelle entre 2 devices
   */
  recordCorrelation(deviceIdA, deviceIdB, deltaMs) {
    if (deltaMs > 5000) return; // Ignorer si > 5 secondes d'écart
    
    const key = [deviceIdA, deviceIdB].sort().join('-');
    let corr = this.correlations.get(key);
    if (!corr) {
      corr = { score: 0, events: 0, totalDelta: 0 };
    }
    
    corr.events++;
    corr.totalDelta += deltaMs;
    corr.score = Math.min(1, corr.events * 0.1); // Score augmente avec la fréquence
    this.correlations.set(key, corr);
  }

  /**
   * Calcule le score de similarité entre 2 devices
   */
  scorePair(deviceA, deviceB) {
    let score = 0;
    
    // Corrélation temporelle
    const key = [deviceA.id, deviceB.id].sort().join('-');
    const corr = this.correlations.get(key);
    if (corr && corr.score > 0.3) score += 0.4 * corr.score;
    
    // Même type de device
    if (deviceA.deviceType === deviceB.deviceType) score += 0.2;
    
    // Même fabricant
    if (deviceA.manufacturer && deviceA.manufacturer === deviceB.manufacturer) score += 0.1;
    
    // Même zone réseau (si disponible)
    if (deviceA.networkParent && deviceA.networkParent === deviceB.networkParent) score += 0.2;
    
    // Séquence utilisateur (bouton → lumière → prise)
    if (corr && corr.events > 5) score += 0.1;
    
    return Math.min(1, score);
  }

  /**
   * Regroupe automatiquement les devices en clusters
   */
  recalculateClusters(devices) {
    // Algorithme simple de clustering par score de similarité
    const processed = new Set();
    const newClusters = [];
    
    for (const deviceA of devices) {
      if (processed.has(deviceA.id)) continue;
      
      const cluster = {
        id: `cluster_${this.nextClusterId++}`,
        type: 'functional',
        devices: [deviceA.id],
        confidence: 0.5,
        inferredName: null,
        lastUpdated: Date.now(),
      };
      
      for (const deviceB of devices) {
        if (deviceB.id === deviceA.id || processed.has(deviceB.id)) continue;
        
        const score = this.scorePair(deviceA, deviceB);
        if (score > 0.7) {
          cluster.devices.push(deviceB.id);
          cluster.confidence = Math.max(cluster.confidence, score);
          processed.add(deviceB.id);
        }
      }
      
      if (cluster.devices.length > 1) {
        newClusters.push(cluster);
        processed.add(deviceA.id);
      }
    }
    
    // Mettre à jour les clusters
    for (const cluster of newClusters) {
      this.clusters.set(cluster.id, cluster);
      this.emit('cluster_formed', cluster);
    }
    
    return newClusters;
  }

  /**
   * Infère le nom d'un cluster basé sur les devices et patterns
   */
  inferClusterName(cluster) {
    const types = cluster.devices.map(id => {
      const parts = id.split('_');
      return parts[parts.length - 1];
    });
    
    // Logique simple de nommage
    const typeCount = {};
    for (const t of types) {
      typeCount[t] = (typeCount[t] || 0) + 1;
    }
    
    const dominant = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0];
    return dominant ? `Group_${dominant[0]}` : 'Unknown_Cluster';
  }

  getClusters() {
    return Array.from(this.clusters.values());
  }

  destroy() {
    this.clusters.clear();
    this.correlations.clear();
    this.removeAllListeners();
  }
}

/**
 * SmartCoordinator — Orchestrateur principal
 */
class SmartCoordinator extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Smart Engines
    this.energyEngine = new SmartEnergyEngine();
    this.presenceEngine = new PresenceEngine();
    this.clusterEngine = new SmartClusterEngine();
    
    // Elite Layers (L9-L11)
    this.sessionManager = new SessionManager(options.session || {});
    this.healthMonitor = new HealthMonitor(options.health || {});
    this.sanityFilter = new SanityFilter(options.sanity || {});
    
    // Timers
    this._presenceTimer = null;
    this._started = false;
    
    // Propager les événements
    this._setupEventForwarding();
  }

  start() {
    if (this._started) return;
    this._started = true;
    
    this.healthMonitor.start();
    
    // Mise à jour présence toutes les minutes
    this._presenceTimer = setInterval(() => {
      this.presenceEngine.update();
    }, 60000);
    
    this.emit('started');
  }

  stop() {
    if (this._presenceTimer) {
      clearInterval(this._presenceTimer);
      this._presenceTimer = null;
    }
    this.healthMonitor.stop();
    this._started = false;
    this.emit('stopped');
  }

  /**
   * Point d'entrée principal : traite un événement device
   * Appelé depuis BaseHybridDevice / TuyaZigbeeDevice
   */
  onDeviceEvent(device, event) {
    const deviceId = device.id || device.getData?.()?.id;
    if (!deviceId) return;
    
    const { type, capability, value, clusterId, data } = event;
    
    // 1. Filtrer les valeurs aberrantes (L11)
    if (capability && typeof value === 'number') {
      const filterResult = this.sanityFilter.filter(capability, value, device);
      if (!filterResult.accepted) {
        this.emit('value_rejected', { deviceId, capability, value, reason: filterResult.reason });
        return; // Valeur rejetée
      }
    }
    
    // 2. Enregistrer le heartbeat (L10)
    this.healthMonitor.recordHeartbeat(deviceId);
    
    // 3. Mettre à jour l'énergie estimée
    if (type === 'state_change') {
      this.energyEngine.updateDeviceState(deviceId, {
        isOn: value,
        deviceType: event.deviceType,
        dimLevel: event.dimLevel,
        realPower: event.realPower,
      });
    }
    
    // 4. Enregistrer l'activité de présence
    if (type === 'state_change' || type === 'motion' || type === 'button') {
      this.presenceEngine.recordActivity(deviceId, type, value);
    }
    
    // 5. Enregistrer les corrélations pour le clustering
    this._recordEventTimestamp(deviceId);
    
    // 6. Gérer les sessions IR (L9)
    if (clusterId === 0xE004 || clusterId === 0xED00) {
      this.sessionManager.handleIrCommand(event.cmdId, data, device);
    }
  }

  _recordEventTimestamp(deviceId) {
    const now = Date.now();
    if (!this._recentEvents) this._recentEvents = new Map();
    
    // Chercher des événements récents d'autres devices
    for (const [otherId, timestamp] of this._recentEvents) {
      if (otherId !== deviceId && now - timestamp < 2000) {
        this.clusterEngine.recordCorrelation(deviceId, otherId, now - timestamp);
      }
    }
    
    this._recentEvents.set(deviceId, now);
    
    // Nettoyer les anciens événements
    for (const [id, ts] of this._recentEvents) {
      if (now - ts > 10000) this._recentEvents.delete(id);
    }
  }

  _setupEventForwarding() {
    // Session Manager events
    this.sessionManager.on('ir_complete', (id, buffer, device) => {
      this.emit('ir_code_received', { sessionId: id, hex: buffer.toString('hex'), device });
    });
    this.sessionManager.on('ir_timeout', (id, device) => {
      this.emit('ir_session_timeout', { sessionId: id, device });
    });
    
    // Health Monitor events
    this.healthMonitor.on('device_unreachable', (deviceId, health) => {
      this.emit('device_unreachable', { deviceId, health });
    });
    this.healthMonitor.on('device_recovered', (deviceId) => {
      this.emit('device_recovered', { deviceId });
    });
    
    // Sanity Filter events
    this.sanityFilter.on('rejected', (info) => {
      this.emit('ghost_value_rejected', info);
    });
    
    // Presence events
    this.presenceEngine.on('presence_detected', (zoneId, score) => {
      this.emit('presence_detected', { zoneId, score });
    });
    this.presenceEngine.on('presence_lost', (zoneId) => {
      this.emit('presence_lost', { zoneId });
    });
    
    // Cluster events
    this.clusterEngine.on('cluster_formed', (cluster) => {
      this.emit('cluster_formed', cluster);
    });
  }

  /**
   * Récupère un résumé complet de l'état smart
   */
  getSmartSummary() {
    return {
      energy: {
        trackedDevices: this.energyEngine.deviceStates.size,
      },
      presence: this.presenceEngine.getSummary(),
      clusters: this.clusterEngine.getClusters().length,
      health: this.healthMonitor.getSummary(),
      sanity: this.sanityFilter.getStats(),
      sessions: this.sessionManager.getActiveSessionCount(),
    };
  }

  destroy() {
    this.stop();
    this.energyEngine.destroy();
    this.presenceEngine.destroy();
    this.clusterEngine.destroy();
    this.sessionManager.destroy();
    this.healthMonitor.destroy();
    this.sanityFilter.destroy();
    this.removeAllListeners();
  }
}

module.exports = {
  SmartCoordinator,
  SmartEnergyEngine,
  PresenceEngine,
  SmartClusterEngine,
  POWER_PROFILES,
  PRESENCE_WEIGHTS,
};