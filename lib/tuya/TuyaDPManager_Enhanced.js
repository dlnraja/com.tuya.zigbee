'use strict';

/**
 * TuyaDPManager_Enhanced - Gestion optimale des DataPoints Tuya
 *
 * Améliorations v4.9.336:
 * - Détection automatique des DPs critiques
 * - Mapping intelligent batterie multi-source
 * - Cache des valeurs DP avec timestamp
 * - Retry automatique sur échec
 * - Support complet tous types DP (bool, value, string, enum, bitmap, raw)
 * - Logging diagnostique détaillé
 */

class TuyaDPManager_Enhanced {

  constructor(device) {
    this.device = device;
    this.dpCache = new Map(); // Cache des dernières valeurs DP
    this.dpTimestamps = new Map(); // Timestamps des dernières mises à jour
    this.dpTypes = new Map(); // Types détectés pour chaque DP
    this.retryAttempts = new Map(); // Compteur de retry par DP
    this.maxRetries = 3;

    // Mappings DP critiques par catégorie de device
    this.criticalDPs = {
      battery: [4, 14, 15, 33, 35], // Batterie %
      temperature: [1, 16, 18, 104], // Température
      humidity: [2, 17, 19, 105], // Humidité
      motion: [1, 101, 102, 103], // Mouvement/Présence
      illuminance: [3, 103, 104], // Luminosité
      contact: [1, 101], // Contact door/window
      onoff: [1, 2, 3, 4, 7, 8, 9, 10], // On/Off multi-gang
      power: [18, 19, 20], // Puissance/Voltage/Courant
      soil_moisture: [5], // Humidité du sol
      vibration: [1, 101], // Vibration
      co: [1, 2], // CO level + alarm
      gas: [1, 2], // Gas level + alarm
      smoke: [1, 2], // Smoke level + alarm
      water_leak: [1, 15], // Water detection
    };
  }

  /**
   * Initialiser le manager avec détection automatique du type de device
   */
  async initialize(tuyaCluster, deviceCapabilities = []) {
    if (!tuyaCluster) {
      this.device.log('[DP_MGR] No Tuya cluster provided');
      return false;
    }

    this.tuyaCluster = tuyaCluster;
    this.device.log('[DP_MGR] 🎯 Initializing Enhanced DP Manager...');

    // Détecter le type de device basé sur capabilities
    const deviceType = this._detectDeviceType(deviceCapabilities);
    this.device.log(`[DP_MGR] 📱 Device type detected: ${deviceType}`);

    // Setup listener pour recevoir les DPs
    await this._setupDPListener();

    // Requêter les DPs critiques pour ce type de device
    await this._requestCriticalDPs(deviceType);

    this.device.log('[DP_MGR] ✅ Enhanced DP Manager initialized');
    return true;
  }

  /**
   * Détecter le type de device basé sur capabilities
   */
  _detectDeviceType(capabilities) {
    const caps = Array.isArray(capabilities) ? capabilities : [];

    if (caps.includes('measure_temperature') && caps.includes('measure_humidity')) {
      if (caps.includes('measure_moisture')) return 'soil_sensor';
      return 'climate_sensor';
    }
    if (caps.includes('alarm_motion')) return 'motion_sensor';
    if (caps.includes('alarm_contact')) return 'contact_sensor';
    if (caps.includes('onoff') && caps.includes('measure_power')) return 'smart_plug';
    if (caps.includes('onoff') && !caps.includes('measure_power')) return 'switch';
    if (caps.includes('alarm_co')) return 'co_detector';
    if (caps.includes('alarm_smoke')) return 'smoke_detector';
    if (caps.includes('alarm_water')) return 'water_leak_sensor';
    if (caps.includes('measure_battery')) return 'battery_device';

    return 'generic';
  }

  /**
   * Setup listener pour recevoir les DataPoints
   */
  async _setupDPListener() {
    try {
      // Écouter les rapports de DP (différentes méthodes selon SDK)
      if (this.tuyaCluster.onDataReport) {
        this.tuyaCluster.onDataReport = (data) => this._handleDPReport(data);
      }

      if (this.tuyaCluster.onDatapoint) {
        this.tuyaCluster.onDatapoint = (dp) => this._handleDPReport(dp);
      }

      // Méthode alternative: écouter les commands
      if (this.tuyaCluster.on) {
        this.tuyaCluster.on('dataReport', (data) => this._handleDPReport(data));
        this.tuyaCluster.on('datapoint', (dp) => this._handleDPReport(dp));
      }

      this.device.log('[DP_MGR] ✅ DP listeners configured');
      return true;
    } catch (err) {
      this.device.error('[DP_MGR] ❌ Failed to setup DP listener:', err);
      return false;
    }
  }

  /**
   * Handler pour les rapports DP entrants
   */
  _handleDPReport(data) {
    try {
      this.device.log('[DP_MGR] 📥 DP Report received:', JSON.stringify(data));

      // Parser selon format (peut varier)
      const dpId = data.dp || data.dpid || data.id;
      const dpValue = data.value !== undefined ? data.value : data.data;
      const dpType = data.type || data.datatype || this._detectDPType(dpValue);

      if (dpId === undefined || dpValue === undefined) {
        this.device.log('[DP_MGR] ⚠️ Invalid DP report format');
        return;
      }

      // Stocker dans cache
      this.dpCache.set(dpId, dpValue);
      this.dpTimestamps.set(dpId, Date.now());
      this.dpTypes.set(dpId, dpType);

      // Log détaillé
      this.device.log(`[DP_MGR] DP${dpId} = ${dpValue} (type: ${dpType})`);

      // Émettre événement pour que le device puisse réagir
      this.device.emit('tuyaDP', { dpId, value: dpValue, type: dpType });

      // Traitement automatique des DPs connus
      this._autoProcessDP(dpId, dpValue, dpType);

    } catch (err) {
      this.device.error('[DP_MGR] ❌ Error handling DP report:', err);
    }
  }

  /**
   * Traitement automatique des DPs connus
   */
  _autoProcessDP(dpId, value, type) {
    // Batterie
    if (this.criticalDPs.battery.includes(dpId)) {
      this.device.log(`[DP_MGR] 🔋 Battery DP${dpId} = ${value}%`);
      if (this.device.hasCapability('measure_battery')) {
        this.device.setCapabilityValue('measure_battery', parseFloat(value)).catch(err =>
          this.device.error('[DP_MGR] Failed to set battery:', err)
        );
      }
    }

    // Température
    if (this.criticalDPs.temperature.includes(dpId)) {
      // Tuya envoie en dixièmes de degré
      const tempCelsius = value / 10;
      this.device.log(`[DP_MGR] 🌡️ Temperature DP${dpId} = ${tempCelsius}°C`);
      if (this.device.hasCapability('measure_temperature')) {
        this.device.setCapabilityValue('measure_temperature', parseFloat(tempCelsius)).catch(err =>
          this.device.error('[DP_MGR] Failed to set temperature:', err)
        );
      }
    }

    // Humidité
    if (this.criticalDPs.humidity.includes(dpId)) {
      this.device.log(`[DP_MGR] 💧 Humidity DP${dpId} = ${value}%`);
      if (this.device.hasCapability('measure_humidity')) {
        this.device.setCapabilityValue('measure_humidity', parseFloat(value)).catch(err =>
          this.device.error('[DP_MGR] Failed to set humidity:', err)
        );
      }
    }

    // Mouvement/Présence
    if (this.criticalDPs.motion.includes(dpId) && type === 'bool') {
      this.device.log(`[DP_MGR] 🏃 Motion DP${dpId} = ${value}`);
      if (this.device.hasCapability('alarm_motion')) {
        this.device.setCapabilityValue('alarm_motion', !!value).catch(err =>
          this.device.error('[DP_MGR] Failed to set motion:', err)
        );
      }
    }

    // On/Off
    if (this.criticalDPs.onoff.includes(dpId) && type === 'bool') {
      this.device.log(`[DP_MGR] 💡 OnOff DP${dpId} = ${value}`);
      const capabilityId = dpId === 1 ? 'onoff' : `onoff.switch${dpId}`;
      if (this.device.hasCapability(capabilityId)) {
        this.device.setCapabilityValue(capabilityId, !!value).catch(err =>
          this.device.error(`[DP_MGR] Failed to set ${capabilityId}:`, err)
        );
      }
    }
  }

  /**
   * Détecter le type d'un DP basé sur sa valeur
   */
  _detectDPType(value) {
    if (typeof value === 'boolean') return 'bool';
    if (typeof value === 'number') return Number.isInteger(value) ? 'value' : 'value';
    if (typeof value === 'string') return 'string';
    if (Buffer.isBuffer(value)) return 'raw';
    return 'unknown';
  }

  /**
   * Requêter les DPs critiques pour le type de device
   */
  async _requestCriticalDPs(deviceType) {
    this.device.log(`[DP_MGR] 📦 Requesting critical DPs for ${deviceType}...`);

    // Collecter tous les DPs pertinents
    const dpsToRequest = new Set();

    // DPs génériques (batterie toujours)
    this.criticalDPs.battery.forEach(dp => dpsToRequest.add(dp));

    // DPs spécifiques au type
    switch (deviceType) {
    case 'climate_sensor':
      this.criticalDPs.temperature.forEach(dp => dpsToRequest.add(dp));
      this.criticalDPs.humidity.forEach(dp => dpsToRequest.add(dp));
      break;
    case 'soil_sensor':
      this.criticalDPs.temperature.forEach(dp => dpsToRequest.add(dp));
      this.criticalDPs.humidity.forEach(dp => dpsToRequest.add(dp));
      this.criticalDPs.soil_moisture.forEach(dp => dpsToRequest.add(dp));
      break;
    case 'motion_sensor':
      this.criticalDPs.motion.forEach(dp => dpsToRequest.add(dp));
      this.criticalDPs.illuminance.forEach(dp => dpsToRequest.add(dp));
      break;
    case 'contact_sensor':
      this.criticalDPs.contact.forEach(dp => dpsToRequest.add(dp));
      break;
    case 'smart_plug':
    case 'switch':
      this.criticalDPs.onoff.forEach(dp => dpsToRequest.add(dp));
      this.criticalDPs.power.forEach(dp => dpsToRequest.add(dp));
      break;
    case 'co_detector':
      this.criticalDPs.co.forEach(dp => dpsToRequest.add(dp));
      break;
    }

    // Requêter chaque DP avec retry
    for (const dpId of dpsToRequest) {
      await this.requestDP(dpId);
      await this._wait(200); // Petit délai entre requêtes
    }

    this.device.log(`[DP_MGR] ✅ Requested ${dpsToRequest.size} critical DPs`);
  }

  /**
   * Requêter un DP spécifique avec retry automatique
   */
  async requestDP(dpId, retryCount = 0) {
    try {
      this.device.log(`[DP_MGR] 🔍 Requesting DP${dpId}...`);

      // Méthode 1: dataRequest (if available as function)
      if (typeof this.tuyaCluster?.dataRequest === 'function') {
        await this.tuyaCluster.dataRequest({ dp: dpId });
        this.device.log(`[DP_MGR] ✅ DP${dpId} requested via dataRequest`);
        return true;
      }

      // Use getData command with DP buffer (correct Tuya protocol)
      if (this.tuyaCluster.getData) {
        const dpBuffer = Buffer.from([dpId]);
        const seq = Math.floor(Math.random() * 0xFFFF);

        await this.tuyaCluster.getData({
          seq: seq,
          datapoints: dpBuffer
        });
        this.device.log(`[DP_MGR] ✅ DP${dpId} requested via getData`);
        return true;
      }

      this.device.log('[DP_MGR] ⚠️ No getData method - waiting for passive reports');
      return false;

    } catch (err) {
      this.device.log(`[DP_MGR] ⚠️ Failed to request DP${dpId}:`, err.message);

      // Retry logic
      if (retryCount < this.maxRetries) {
        this.device.log(`[DP_MGR] 🔄 Retrying DP${dpId} (${retryCount + 1}/${this.maxRetries})...`);
        await this._wait(1000 * (retryCount + 1)); // Backoff exponentiel
        return await this.requestDP(dpId, retryCount + 1);
      }

      return false;
    }
  }

  /**
   * Écrire un DP (pour commandes)
   */
  async writeDP(dpId, value, type = 'auto') {
    try {
      // Auto-détection du type si 'auto'
      if (type === 'auto') {
        type = this.dpTypes.get(dpId) || this._detectDPType(value);
      }

      this.device.log(`[DP_MGR] ✍️ Writing DP${dpId} = ${value} (type: ${type})`);

      const dpData = {
        dp: dpId,
        value: value,
        type: type
      };

      // Méthode 1: sendData
      if (this.tuyaCluster.sendData) {
        await this.tuyaCluster.sendData({
          command: 'dataReport',
          ...dpData
        });
        this.device.log(`[DP_MGR] ✅ DP${dpId} written`);

        // Update cache
        this.dpCache.set(dpId, value);
        this.dpTimestamps.set(dpId, Date.now());
        return true;
      }

      // Méthode 2: command
      if (this.tuyaCluster.command) {
        await this.tuyaCluster.command('dataReport', dpData);
        this.device.log(`[DP_MGR] ✅ DP${dpId} written (command)`);

        this.dpCache.set(dpId, value);
        this.dpTimestamps.set(dpId, Date.now());
        return true;
      }

      this.device.log(`[DP_MGR] ⚠️ No method available to write DP${dpId}`);
      return false;

    } catch (err) {
      this.device.error(`[DP_MGR] ❌ Failed to write DP${dpId}:`, err);
      return false;
    }
  }

  /**
   * Obtenir la valeur en cache d'un DP
   */
  getDP(dpId) {
    return this.dpCache.get(dpId);
  }

  /**
   * Vérifier si un DP est récent (< 5 min)
   */
  isDPFresh(dpId, maxAgeMs = 300000) {
    const timestamp = this.dpTimestamps.get(dpId);
    if (!timestamp) return false;
    return (Date.now() - timestamp) < maxAgeMs;
  }

  /**
   * Obtenir tous les DPs connus
   */
  getAllDPs() {
    const dps = {};
    for (const [dpId, value] of this.dpCache.entries()) {
      dps[dpId] = {
        value,
        type: this.dpTypes.get(dpId),
        timestamp: this.dpTimestamps.get(dpId),
        fresh: this.isDPFresh(dpId)
      };
    }
    return dps;
  }

  /**
   * Diagnostic: Afficher l'état de tous les DPs
   */
  logDPStatus() {
    const dps = this.getAllDPs();
    this.device.log('[DP_MGR] 📊 DP Status:');
    for (const [dpId, data] of Object.entries(dps)) {
      const age = Math.floor((Date.now() - data.timestamp) / 1000);
      this.device.log(`  DP${dpId}: ${data.value} (${data.type}) - ${age}s ago ${data.fresh ? '✅' : '⚠️'}`);
    }
  }

  /**
   * Helper: wait
   */
  _wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup lors de la destruction
   */
  destroy() {
    this.dpCache.clear();
    this.dpTimestamps.clear();
    this.dpTypes.clear();
    this.retryAttempts.clear();
    this.device.log('[DP_MGR] 🧹 DP Manager destroyed');
  }
}

module.exports = TuyaDPManager_Enhanced;
