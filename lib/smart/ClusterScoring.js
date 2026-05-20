'use strict';

/**
 * ClusterScoring — Moteur de scoring pour le clustering intelligent
 * 
 * Calcule la similarité entre 2 devices en croisant 5 signaux:
 *   A. Corrélation temporelle (devices activés ensemble, delta < 2s)
 *   B. Activité utilisateur (séquences bouton → lumière → prise)
 *   C. Contexte temporel (nuit → chambre, matin → cuisine)
 *   D. Profil device (class: light, socket, sensor)
 *   E. Topologie Zigbee (même routeur, même endpoint group)
 * 
 * Seuils:
 *   score > 0.7 → même cluster
 *   score > 0.9 → strong cluster (room-level)
 */

const { CLUSTER_TYPES, CONFIDENCE_LEVELS } = require('./ClusterModel');

// Poids des signaux (total = 1.0 max)
const WEIGHTS = {
  TEMPORAL_CORRELATION: 0.35,  // A. Devices activés ensemble
  USER_SEQUENCE: 0.25,         // B. Séquences utilisateur
  TIME_CONTEXT: 0.10,          // C. Contexte horaire
  DEVICE_PROFILE: 0.15,        // D. Type de device
  NETWORK_TOPOLOGY: 0.15,      // E. Topologie Zigbee
};

// Fenêtre de corrélation temporelle (ms)
const CORRELATION_WINDOW_MS = 2000;

// Périodes de la journée
const TIME_PERIODS = {
  NIGHT: { start: 22, end: 6 },      // 22h-6h → chambre
  MORNING: { start: 6, end: 10 },     // 6h-10h → cuisine
  DAY: { start: 10, end: 17 },        // 10h-17h → bureau
  EVENING: { start: 17, end: 22 },    // 17h-22h → salon
};

// Groupes de types compatibles
const COMPATIBLE_TYPES = {
  lighting: ['light', 'dimmer', 'bulb', 'led', 'led_strip'],
  switching: ['switch', 'plug', 'outlet', 'relay'],
  climate: ['thermostat', 'heater', 'fan', 'air_purifier', 'hvac'],
  security: ['sensor', 'contact', 'motion', 'smoke', 'gas', 'water'],
  covering: ['curtain', 'blind', 'shutter', 'roller'],
};

class ClusterScoring {
  constructor(options = {}) {
    this.correlationHistory = new Map(); // `${a}-${b}` → [{ timestamp, delta }]
    this.userSequences = [];             // [{ devices: [id1, id2], timestamp }]
    this.maxHistory = options.maxHistory || 1000;
    this.weights = { ...WEIGHTS, ...options.weights };
  }

  /**
   * Score principal : similarité entre 2 devices
   * @param {object} deviceA - { id, type, manufacturer, networkParent, ... }
   * @param {object} deviceB - { id, type, manufacturer, networkParent, ... }
   * @returns {number} Score entre 0 et 1
   */
  scorePair(deviceA, deviceB) {
    let score = 0;

    // A. Corrélation temporelle
    score += this._scoreTemporalCorrelation(deviceA.id, deviceB.id) * this.weights.TEMPORAL_CORRELATION;

    // B. Séquence utilisateur
    score += this._scoreUserSequence(deviceA.id, deviceB.id) * this.weights.USER_SEQUENCE;

    // C. Contexte temporel
    score += this._scoreTimeContext(deviceA, deviceB) * this.weights.TIME_CONTEXT;

    // D. Profil device
    score += this._scoreDeviceProfile(deviceA, deviceB) * this.weights.DEVICE_PROFILE;

    // E. Topologie réseau
    score += this._scoreNetworkTopology(deviceA, deviceB) * this.weights.NETWORK_TOPOLOGY;

    return Math.min(1, Math.max(0, score));
  }

  /**
   * A. Corrélation temporelle
   * Devices activés ensemble (delta < 2 secondes)
   */
  _scoreTemporalCorrelation(idA, idB) {
    const key = [idA, idB].sort().join('-');
    const history = this.correlationHistory.get(key);
    if (!history || history.length === 0) return 0;

    // Compter les corrélations récentes (dernières 24h)
    const now = Date.now();
    const recent = history.filter(h => now - h.timestamp < 86400000);
    if (recent.length === 0) return 0;

    // Score basé sur la fréquence (logarithmique)
    // 1 corrélation = 0.1, 5 = 0.3, 20 = 0.6, 50+ = 0.8+
    const freq = Math.min(recent.length, 50);
    return Math.log(freq + 1) / Math.log(51); // Normalisé 0-1
  }

  /**
   * B. Séquence utilisateur
   * Patterns: bouton → lumière → prise
   */
  _scoreUserSequence(idA, idB) {
    let sequenceCount = 0;
    const now = Date.now();

    for (const seq of this.userSequences) {
      if (now - seq.timestamp > 86400000) continue; // 24h max
      
      const idxA = seq.devices.indexOf(idA);
      const idxB = seq.devices.indexOf(idB);
      
      // Les 2 devices sont dans la même séquence
      if (idxA !== -1 && idxB !== -1 && Math.abs(idxA - idxB) === 1) {
        sequenceCount++;
      }
    }

    if (sequenceCount === 0) return 0;
    return Math.min(1, sequenceCount * 0.2);
  }

  /**
   * C. Contexte temporel
   * Même période = même zone probable
   */
  _scoreTimeContext(deviceA, deviceB) {
    if (!deviceA.lastActivationHour || !deviceB.lastActivationHour) return 0;

    const periodA = this._getTimePeriod(deviceA.lastActivationHour);
    const periodB = this._getTimePeriod(deviceB.lastActivationHour);

    if (periodA === periodB) return 0.8;
    
    // Périodes adjacentes (ex: evening → night)
    const adjacent = {
      'NIGHT': ['EVENING', 'MORNING'],
      'MORNING': ['NIGHT', 'DAY'],
      'DAY': ['MORNING', 'EVENING'],
      'EVENING': ['DAY', 'NIGHT'],
    };
    
    if (adjacent[periodA] && adjacent[periodA].includes(periodB)) return 0.4;
    return 0.1;
  }

  /**
   * D. Profil device
   * Même type ou types compatibles
   */
  _scoreDeviceProfile(deviceA, deviceB) {
    const typeA = (deviceA.type || deviceA.deviceType || '').toLowerCase();
    const typeB = (deviceB.type || deviceB.deviceType || '').toLowerCase();

    // Même type exact
    if (typeA === typeB) return 1.0;

    // Même groupe compatible
    for (const [, group] of Object.entries(COMPATIBLE_TYPES)) {
      const inA = group.some(t => typeA.includes(t));
      const inB = group.some(t => typeB.includes(t));
      if (inA && inB) return 0.6;
    }

    // Même fabricant
    if (deviceA.manufacturer && deviceA.manufacturer === deviceB.manufacturer) {
      return 0.3;
    }

    return 0;
  }

  /**
   * E. Topologie Zigbee
   * Même routeur parent = probablement même pièce
   */
  _scoreNetworkTopology(deviceA, deviceB) {
    if (!deviceA.networkParent || !deviceB.networkParent) return 0;
    
    if (deviceA.networkParent === deviceB.networkParent) return 1.0;
    
    // Même endpoint group (si disponible)
    if (deviceA.endpointGroup && deviceA.endpointGroup === deviceB.endpointGroup) {
      return 0.8;
    }
    
    return 0;
  }

  /**
   * Enregistre une corrélation temporelle entre 2 devices
   */
  recordCorrelation(idA, idB, deltaMs) {
    if (deltaMs > CORRELATION_WINDOW_MS) return;

    const key = [idA, idB].sort().join('-');
    if (!this.correlationHistory.has(key)) {
      this.correlationHistory.set(key, []);
    }

    const history = this.correlationHistory.get(key);
    history.push({ timestamp: Date.now(), delta: deltaMs });

    // Limiter la taille
    if (history.length > this.maxHistory) {
      history.splice(0, history.length - this.maxHistory);
    }
  }

  /**
   * Enregistre une séquence utilisateur
   */
  recordUserSequence(deviceIds) {
    this.userSequences.push({
      devices: [...deviceIds],
      timestamp: Date.now(),
    });

    if (this.userSequences.length > this.maxHistory) {
      this.userSequences.splice(0, this.userSequences.length - this.maxHistory);
    }
  }

  /**
   * Détermine le type de cluster probable
   */
  inferClusterType(devices) {
    const types = devices.map(d => (d.type || d.deviceType || '').toLowerCase());
    
    // Tous des lumières → functional (lighting)
    if (types.every(t => COMPATIBLE_TYPES.lighting.some(ct => t.includes(ct)))) {
      return CLUSTER_TYPES.FUNCTIONAL;
    }
    
    // Mix de types → probablement une room
    const uniqueTypes = new Set(types.map(t => {
      for (const [group, keywords] of Object.entries(COMPATIBLE_TYPES)) {
        if (keywords.some(k => t.includes(k))) return group;
      }
      return 'other';
    }));
    
    if (uniqueTypes.size > 1) return CLUSTER_TYPES.ROOM;
    
    // Tous des sensors → presence zone
    if (types.every(t => COMPATIBLE_TYPES.security.some(ct => t.includes(ct)))) {
      return CLUSTER_TYPES.PRESENCE;
    }
    
    return CLUSTER_TYPES.FUNCTIONAL;
  }

  _getTimePeriod(hour) {
    if (hour >= TIME_PERIODS.NIGHT.start || hour < TIME_PERIODS.NIGHT.end) return 'NIGHT';
    if (hour >= TIME_PERIODS.MORNING.start && hour < TIME_PERIODS.MORNING.end) return 'MORNING';
    if (hour >= TIME_PERIODS.DAY.start && hour < TIME_PERIODS.DAY.end) return 'DAY';
    return 'EVENING';
  }

  /**
   * Nettoie les anciens historiques
   */
  cleanup(maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
    const now = Date.now();
    
    for (const [key, history] of this.correlationHistory) {
      const filtered = history.filter(h => now - h.timestamp < maxAgeMs);
      if (filtered.length === 0) {
        this.correlationHistory.delete(key);
      } else {
        this.correlationHistory.set(key, filtered);
      }
    }
    
    this.userSequences = this.userSequences.filter(s => now - s.timestamp < maxAgeMs);
  }

  getStats() {
    return {
      correlationPairs: this.correlationHistory.size,
      userSequences: this.userSequences.length,
    };
  }
}

module.exports = { ClusterScoring, WEIGHTS, CORRELATION_WINDOW_MS, COMPATIBLE_TYPES };