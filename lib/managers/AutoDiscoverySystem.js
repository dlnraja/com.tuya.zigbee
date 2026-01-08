'use strict';

/**
 * AutoDiscoverySystem - v5.5.390
 *
 * SYSTÈME AUTOMATIQUE DE DÉCOUVERTE ET MISE À JOUR
 * - Découvre capabilities/features/flows dynamiquement
 * - Met à jour après 15min puis toutes les heures
 * - Génère flow cards automatiquement
 * - Gère tous les formats de synchronisation temporelle
 */

const { EventEmitter } = require('events');

// Import des dépendances
let TuyaTimeSyncFormats, UniversalDataHandler;
try {
  TuyaTimeSyncFormats = require('../tuya/TuyaTimeSyncFormats');
  UniversalDataHandler = require('../utils/UniversalDataHandler');
} catch (e) { /* Optional */ }

// DP → Capability mapping exhaustif
const DP_CAPABILITY_MAP = {
  // === COMMON ===
  1: { cap: 'onoff', type: 'bool' },
  2: { cap: 'onoff.2', type: 'bool' },
  3: { cap: 'onoff.3', type: 'bool' },
  4: { cap: 'onoff.4', type: 'bool' },
  7: { cap: 'onoff.usb1', type: 'bool' },
  8: { cap: 'onoff.usb2', type: 'bool' },

  // === CLIMATE ===
  101: { cap: 'measure_temperature', type: 'value', conv: 'div10' },
  102: { cap: 'measure_humidity', type: 'value', conv: 'div10' },
  103: { cap: 'measure_pressure', type: 'value', conv: 'div100' },
  104: { cap: 'measure_battery', type: 'value', conv: 'div2' },

  // === THERMOSTAT ===
  16: { cap: 'target_temperature', type: 'value', conv: 'div10' },
  24: { cap: 'measure_temperature', type: 'value', conv: 'div10' },

  // === COVER ===
  2: { cap: 'windowcoverings_state', type: 'enum', values: { 0: 'up', 1: 'stop', 2: 'down' } },
  3: { cap: 'windowcoverings_set', type: 'value', conv: 'percent' },

  // === ENERGY ===
  17: { cap: 'measure_current', type: 'value', conv: 'div1000' },
  18: { cap: 'measure_power', type: 'value', conv: 'div10' },
  19: { cap: 'measure_voltage', type: 'value', conv: 'div10' },
  20: { cap: 'meter_power', type: 'value', conv: 'div100' },

  // === PRESENCE/MOTION ===
  1: { cap: 'alarm_motion', type: 'bool' },
  105: { cap: 'measure_luminance', type: 'value' },

  // === SAFETY ===
  1: { cap: 'alarm_smoke', type: 'bool' },
  14: { cap: 'alarm_tamper', type: 'bool' },
  15: { cap: 'measure_battery', type: 'value' },

  // === AIR QUALITY ===
  114: { cap: 'measure_co2', type: 'value' },
  115: { cap: 'measure_pm25', type: 'value' },
  117: { cap: 'measure_voc', type: 'value' },
  118: { cap: 'measure_formaldehyde', type: 'value', conv: 'div100' }
};

// Conversions
const CONVERSIONS = {
  div10: v => v / 10,
  div100: v => v / 100,
  div1000: v => v / 1000,
  div2: v => Math.min(100, v * 2),
  percent: v => Math.min(100, Math.max(0, v)),
  invert: v => 100 - v
};

class AutoDiscoverySystem extends EventEmitter {

  constructor(device) {
    super();
    this.device = device;
    this.discoveredDPs = new Map();
    this.discoveredCaps = new Set();
    this.updateTimer = null;
    this.firstUpdateDone = false;
    this.timeSyncFormat = null;
    this.stats = { dpsReceived: 0, capsAdded: 0, flowsGenerated: 0 };
  }

  /**
   * Initialise le système de découverte automatique
   */
  async initialize() {
    this._log('🚀 AutoDiscoverySystem initializing...');

    // Premier update après 15 minutes
    this.updateTimer = setTimeout(() => this._scheduledUpdate(), 15 * 60 * 1000);

    // Setup time sync listener
    this._setupTimeSyncListener();

    this._log('✅ AutoDiscoverySystem ready - first update in 15min');
  }

  /**
   * Traite un DP reçu et découvre/crée les capabilities
   */
  async processDP(dpId, dpType, rawValue, parsedValue) {
    this.stats.dpsReceived++;
    const dpKey = `${dpId}:${dpType}`;

    // Enregistre le DP
    if (!this.discoveredDPs.has(dpKey)) {
      this.discoveredDPs.set(dpKey, {
        id: dpId, type: dpType, firstSeen: Date.now(),
        values: [], lastValue: null
      });
      this._log(`🆕 New DP discovered: ${dpId} (type ${dpType})`);
    }

    const dpInfo = this.discoveredDPs.get(dpKey);
    dpInfo.lastValue = parsedValue;
    dpInfo.values.push({ value: parsedValue, time: Date.now() });
    if (dpInfo.values.length > 100) dpInfo.values.shift();

    // Tente de mapper à une capability
    await this._mapDPToCapability(dpId, dpType, parsedValue);

    // Émet l'événement
    this.emit('dp', { dpId, dpType, rawValue, parsedValue });
  }

  /**
   * Map un DP à une capability Homey
   */
  async _mapDPToCapability(dpId, dpType, value) {
    const mapping = DP_CAPABILITY_MAP[dpId];
    if (!mapping) return;

    const capId = mapping.cap;

    // Convertit la valeur
    let finalValue = value;
    if (mapping.conv && CONVERSIONS[mapping.conv]) {
      finalValue = CONVERSIONS[mapping.conv](value);
    }
    if (mapping.values && mapping.values[value] !== undefined) {
      finalValue = mapping.values[value];
    }

    // Ajoute la capability si nécessaire
    if (!this.device.hasCapability(capId)) {
      try {
        await this.device.addCapability(capId);
        this.discoveredCaps.add(capId);
        this.stats.capsAdded++;
        this._log(`✅ Auto-added capability: ${capId}`);

        // Génère flow card
        await this._generateFlowCard(capId, mapping);
      } catch (e) {
        this._error(`Failed to add ${capId}: ${e.message}`);
        return;
      }
    }

    // Met à jour la valeur
    try {
      await this.device.setCapabilityValue(capId, finalValue);
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Génère une flow card pour une capability
   */
  async _generateFlowCard(capId, mapping) {
    // Les flow cards sont définies au niveau driver, pas device
    // On émet un événement pour que le driver puisse les générer
    this.emit('flowCardNeeded', {
      capability: capId,
      type: mapping.type,
      driverId: this.device.driver?.id
    });
    this.stats.flowsGenerated++;
  }

  /**
   * Mise à jour planifiée (15min puis toutes les heures)
   */
  async _scheduledUpdate() {
    this._log('⏰ Scheduled update running...');

    // Analyse les DPs découverts
    await this._analyzeDiscoveredDPs();

    // Envoie time sync si nécessaire
    await this._sendTimeSync();

    // Statistiques
    this._log(`📊 Stats: ${this.stats.dpsReceived} DPs, ${this.stats.capsAdded} caps, ${this.discoveredDPs.size} unique DPs`);

    // Planifie le prochain update (1 heure)
    this.firstUpdateDone = true;
    this.updateTimer = setTimeout(() => this._scheduledUpdate(), 60 * 60 * 1000);
  }

  /**
   * Analyse les DPs découverts pour affiner le support
   */
  async _analyzeDiscoveredDPs() {
    for (const [key, dpInfo] of this.discoveredDPs.entries()) {
      // Analyse le pattern de valeurs
      const values = dpInfo.values.map(v => v.value);
      const uniqueValues = [...new Set(values)];

      // Détecte le type probable
      let probableType = 'unknown';
      if (uniqueValues.length === 2 && uniqueValues.every(v => v === 0 || v === 1)) {
        probableType = 'boolean';
      } else if (uniqueValues.length <= 10 && uniqueValues.every(v => Number.isInteger(v) && v >= 0 && v < 100)) {
        probableType = 'enum';
      } else if (values.some(v => v > 100)) {
        probableType = 'value_scaled';
      }

      dpInfo.probableType = probableType;
      dpInfo.uniqueValues = uniqueValues;
    }
  }

  /**
   * Setup du listener pour les requêtes de time sync
   */
  _setupTimeSyncListener() {
    // Écoute les requêtes de sync temporelle
    this.on('timeRequest', async (format) => {
      await this._sendTimeSync(format);
    });
  }

  /**
   * Envoie la synchronisation temporelle
   */
  async _sendTimeSync(format = null) {
    if (!TuyaTimeSyncFormats) return;

    try {
      // Détecte le format si non spécifié
      if (!format) {
        const mfg = this.device.getSetting?.('manufacturerName') ||
          this.device.getData?.()?.manufacturerName || '';
        const model = this.device.getSetting?.('modelId') ||
          this.device.getData?.()?.modelId || '';
        format = TuyaTimeSyncFormats.detectFormat(mfg, model);
      }

      this.timeSyncFormat = format;

      // Construit le payload
      const tz = this.device.getSetting?.('time_sync_timezone') || 'auto';
      const payload = TuyaTimeSyncFormats.buildPayload(format, { timezone: tz });

      this._log(`⏰ Time sync: ${format} → ${TuyaTimeSyncFormats.toHex(payload)}`);

      // Envoie via le TuyaManager si disponible
      if (this.device.tuyaManager?.sendTimeSync) {
        await this.device.tuyaManager.sendTimeSync(format, tz);
      }

    } catch (e) {
      this._error(`Time sync failed: ${e.message}`);
    }
  }

  /**
   * Retourne les statistiques de découverte
   */
  getStats() {
    return {
      ...this.stats,
      discoveredDPs: this.discoveredDPs.size,
      discoveredCaps: this.discoveredCaps.size,
      timeSyncFormat: this.timeSyncFormat
    };
  }

  /**
   * Exporte les DPs découverts (pour debug/analyse)
   */
  exportDiscoveredDPs() {
    const result = {};
    for (const [key, info] of this.discoveredDPs.entries()) {
      result[key] = {
        id: info.id,
        type: info.type,
        probableType: info.probableType,
        uniqueValues: info.uniqueValues,
        lastValue: info.lastValue
      };
    }
    return result;
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
    this.removeAllListeners();
    this._log('🧹 AutoDiscoverySystem destroyed');
  }

  _log(...args) {
    if (this.device?.log) this.device.log('[AUTO]', ...args);
  }

  _error(...args) {
    if (this.device?.error) this.device.error('[AUTO]', ...args);
  }
}

module.exports = AutoDiscoverySystem;
