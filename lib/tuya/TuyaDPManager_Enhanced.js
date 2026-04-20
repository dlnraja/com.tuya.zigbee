'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../utils/tuyaUtils.js');


/**
 * TuyaDPManager_Enhanced - Gestion optimale des DataPoints Tuya
 *
 * AmÃ©liorations v4.9.336:
 * - DÃ©tection automatique des DPs critiques
 * - Mapping intelligent batterie multi-source
 * - Cache des valeurs DP avec timestamp
 * - Retry automatique sur Ã©chec
 * - Support complet tous types DP (bool, value, string, enum, bitmap, raw)
 * - Logging diagnostique dÃ©taillÃ©
 */

class TuyaDPManager_Enhanced {

  constructor(device) {
    this.device = device;
    this.dpCache = new Map(); // Cache des derniÃ¨res valeurs DP
    this.dpTimestamps = new Map(); // Timestamps des derniÃ¨res mises Ã jour
    this.dpTypes = new Map(); // Types dÃ©tectÃ©s pour chaque DP
    this.retryAttempts = new Map(); // Compteur de retry par DP
    this.maxRetries = 3;

    // Mappings DP critiques par catÃ©gorie de device
    this.criticalDPs = {
      battery: [4, 14, 15, 33, 35], // Batterie %
      temperature: [1, 16, 18, 104], // TempÃ©rature
      humidity: [2, 17, 19, 105], // HumiditÃ©
      motion: [1, 101, 102, 103], //Mouvement/PrÃ©sence
      illuminance: [3, 103, 104], // LuminositÃ©
      contact: [1, 101], //Contact door/window
      onoff: [1, 2, 3, 4, 7, 8, 9, 10], //On/Off multi-gang
      power: [18, 19, 20], // Puissance / Voltage / Courant
      soil_moisture: [5], // HumiditÃ© du sol
      vibration: [1, 101], // Vibration
      co: [1, 2], // CO level + alarm
      gas: [1, 2], // Gas level + alarm
      smoke: [1, 2], // Smoke level + alarm
      water_leak: [1, 15], // Water detection
    };
  }

  /**
   * Initialiser le manager avec dÃ©tection automatique du type de device
   */
  async initialize(tuyaCluster, deviceCapabilities = []) {
    if (!tuyaCluster) {
      this.device.log('[DP_MGR] No Tuya cluster provided');
      return false;
    }

    this.tuyaCluster = tuyaCluster;
    this.device.log('[DP_MGR]  Initializing Enhanced DP Manager...');

    // DÃ©tecter le type de device basÃ© sur capabilities
    const deviceType = this._detectDeviceType(deviceCapabilities);
    this.device.log(`[DP_MGR]  Device type detected: ${deviceType}`);

    // Setup listener pour recevoir les DPs
    await this._setupDPListener();

    // RequÃªter les DPs critiques pour ce type de device
    await this._requestCriticalDPs(deviceType);

    this.device.log('[DP_MGR]  Enhanced DP Manager initialized');
    return true;
  }

  /**
   * DÃ©tecter le type de device basÃ© sur capabilities
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
      // Ã‰couter les rapports de DP (diffÃ©rentes mÃ©thodes selon SDK)
      if (this.tuyaCluster.onDataReport) {
        this.tuyaCluster.onDataReport = (data) => this._handleDPReport(data);
      }

      if (this.tuyaCluster.onDatapoint) {
        this.tuyaCluster.onDatapoint = (dp) => this._handleDPReport(dp);
      }

      // MÃ©thode alternative: Ã©couter les commands
      if (this.tuyaCluster.on) {
        this.tuyaCluster.on('dataReport', (data) => this._handleDPReport(data));
        this.tuyaCluster.on('datapoint', (dp) => this._handleDPReport(dp));
      }

      this.device.log('[DP_MGR]  DP listeners configured');
      return true;
    } catch (err) {
      this.device.error('[DP_MGR]  Failed to setup DP listener:', err);
      return false;
    }
  }

  /**
   * Handler pour les rapports DP entrants
   */
  _handleDPReport(data) {
    try {
      this.device.log('[DP_MGR]  DP Report received:', JSON.stringify(data));

      // Parser selon format (peut varier)
      const dpId = data.dp || data.dpid || data.id;
      const dpValue = data.value !== undefined ? data.value : data.data;
      const dpType = data.type || data.datatype || this._detectDPType(dpValue);

      if (dpId === undefined || dpValue === undefined) {
        this.device.log('[DP_MGR]  Invalid DP report format');
        return;
      }

      // Stocker dans cache
      this.dpCache.set(dpId, dpValue);
      this.dpTimestamps.set(dpId, Date.now());
      this.dpTypes.set(dpId, dpType);

      // Log dÃ©taillÃ©
      this.device.log(`[DP_MGR] DP${dpId} = ${dpValue} (type: ${dpType})`);

      // Ã‰mettre Ã©vÃ©nement pour que le device puisse rÃ©agir
      this.device.emit('tuyaDP', { dpId, value: dpValue, type: dpType });

      // Traitement automatique des DPs connus
      this._autoProcessDP(dpId, dpValue, dpType);

    } catch (err) {
      this.device.error('[DP_MGR]  Error handling DP report:', err);
    }
  }

  /**
   * Traitement automatique des DPs connus
   */
  _autoProcessDP(dpId, value, type) {
    // Batterie
    if (this.criticalDPs.battery.includes(dpId)) {
      this.device.log(`[DP_MGR]  Battery DP${dpId} = ${value}%`);
      if (this.device.hasCapability('measure_battery')) {
        this.device.setCapabilityValue('measure_battery', parseFloat(value)).catch(err =>
          this.device.error('[DP_MGR] Failed to set battery:', err)
        );
      }
    }

    // TempÃ©rature
    if (this.criticalDPs.temperature.includes(dpId)) {
      // Tuya envoie en dixiÃ¨mes de degrÃ©
      const tempCelsius = safeParse(value, 10);
      this.device.log(`[DP_MGR]  Temperature DP${dpId} = ${tempCelsius}Â°C`);
      if (this.device.hasCapability('measure_temperature')) {
        this.device.setCapabilityValue('measure_temperature', parseFloat(tempCelsius)).catch(err =>
          this.device.error('[DP_MGR] Failed to set temperature:', err)
        );
      }
    }

    // HumiditÃ©
    if (this.criticalDPs.humidity.includes(dpId)) {
      this.device.log(`[DP_MGR]  Humidity DP${dpId} = ${value}%`);
      if (this.device.hasCapability('measure_humidity')) {
        this.device.setCapabilityValue('measure_humidity', parseFloat(value)).catch(err =>
          this.device.error('[DP_MGR] Failed to set humidity:', err)
        );
      }
    }

    // Mouvement/PrÃ©sence
    if (this.criticalDPs.motion.includes(dpId) && type === 'bool') {
      this.device.log(`[DP_MGR]  Motion DP${dpId} = ${value}`);
      if (this.device.hasCapability('alarm_motion')) {
        this.device.setCapabilityValue('alarm_motion', !!value).catch(err =>
          this.device.error('[DP_MGR] Failed to set motion:', err)
        );
      }
    }

    // On/Off
    if (this.criticalDPs.onoff.includes(dpId) && type === 'bool') {
      this.device.log(`[DP_MGR]  OnOff DP${dpId} = ${value}`);
      const capabilityId = dpId === 1 ? 'onoff' : `onoff.switch${dpId}`;
      if (this.device.hasCapability(capabilityId)) {
        this.device.setCapabilityValue(capabilityId, !!value).catch(err =>
          this.device.error(`[DP_MGR] Failed to set ${capabilityId}:`, err)
        );
      }
    }
  }

  /**
   * DÃ©tecter le type d'un DP basÃ© sur sa valeur
   */
  _detectDPType(value) {
    if (typeof value === 'boolean') return 'bool';
    if (typeof value === 'number') return Number.isInteger(value) ? 'value' : 'value';
    if (typeof value === 'string') return 'string';
    if (Buffer.isBuffer(value)) return 'raw';
    return 'unknown';
  }

  /**
   * RequÃªter les DPs critiques pour le type de device
   */
  async _requestCriticalDPs(deviceType) {
    this.device.log(`[DP_MGR]  Requesting critical DPs for ${deviceType}...`);

    // Collecter tous les DPs pertinents
    const dpsToRequest = new Set();

    // DPs gÃ©nÃ©riques (batterie toujours)
    this.criticalDPs.battery.forEach(dp => dpsToRequest.add(dp));

    // DPs spÃ©cifiques au type
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

    // RequÃªter chaque DP avec retry
    for (const dpId of dpsToRequest) {
      await this.requestDP(dpId);
      await this._wait(200); // Petit dÃ©lai entre requÃªtes
    }

    this.device.log(`[DP_MGR]  Requested ${dpsToRequest.size} critical DPs`);
  }

  /**
   * RequÃªter un DP spÃ©cifique avec retry automatique
   */
  async requestDP(dpId, retryCount = 0) {
    try {
      this.device.log(`[DP_MGR]  Requesting DP${dpId}...`);

      // MÃ©thode 1: dataRequest (if available as function)
      if (typeof this.tuyaCluster?.dataRequest === 'function') {
        await this.tuyaCluster.dataRequest({ dp: dpId });
        this.device.log(`[DP_MGR]  DP${dpId} requested via dataRequest`);
        return true;
      }

      // Use getData command with DP buffer (correct Tuya protocol)
      if (this.tuyaCluster.getData) {
        const dpBuffer = Buffer.from([dpId]);
        const seq =safeMultiply(Math.floor(Math.random(), 0xFFFF));

        await this.tuyaCluster.getData({
          seq: seq,
          datapoints: dpBuffer
        });
        this.device.log(`[DP_MGR]  DP${dpId} requested via getData`);
        return true;
      }

      this.device.log('[DP_MGR]  No getData method - waiting for passive reports');
      return false;

    } catch (err) {
      this.device.log(`[DP_MGR]  Failed to request DP${dpId}:`, err.message);

      // Retry logic
      if (retryCount < this.maxRetries) {
        this.device.log(`[DP_MGR]  Retrying DP${dpId} (${retryCount + 1}/${this.maxRetries})...`);
safeMultiply(await this._wait(1000, (retryCount) + 1)); // Backoff exponentiel
        return await this.requestDP(dpId, retryCount + 1);
      }

      return false;
    }
  }

  /**
   * Ã‰crire un DP (pour commandes)
   */
  async writeDP(dpId, value, type = 'auto') {
    try {
      // Auto-dÃ©tection du type si 'auto'
      if (type === 'auto') {
        type = this.dpTypes.get(dpId) || this._detectDPType(value);
      }

      this.device.log(`[DP_MGR]  Writing DP${dpId} = ${value} (type: ${type})`);

      const dpData = {
        dp: dpId,
        value: value,
        type: type
      };

      // MÃ©thode 1: sendData
      if (this.tuyaCluster.sendData) {
        await this.tuyaCluster.sendData({
          command: 'dataReport',
          ...dpData
        });
        this.device.log(`[DP_MGR]  DP${dpId} written`);

        // Update cache
        this.dpCache.set(dpId, value);
        this.dpTimestamps.set(dpId, Date.now());
        return true;
      }

      // MÃ©thode 2: command
      if (this.tuyaCluster.command) {
        await this.tuyaCluster.command('dataReport', dpData);
        this.device.log(`[DP_MGR]  DP${dpId} written (command)`);

        this.dpCache.set(dpId, value);
        this.dpTimestamps.set(dpId, Date.now());
        return true;
      }

      this.device.log(`[DP_MGR]  No method available to write DP${dpId}`);
      return false;

    } catch (err) {
      this.device.error(`[DP_MGR]  Failed to write DP${dpId}:`, err);
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
   * VÃ©rifier si un DP est rÃ©cent (< 5 min)
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
   * Diagnostic: Afficher l'Ã©tat de tous les DPs
   */
  logDPStatus() {
    const dps = this.getAllDPs();
    this.device.log('[DP_MGR]  DP Status:');
    for (const [dpId, data] of Object.entries(dps)) {
      const age = Math.floor((Date.now() -safeParse(data.timestamp), 1000));
      this.device.log(`  DP${dpId}: ${data.value} (${data.type}) - ${age}s ago ${data.fresh ? '' : ''}`);
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
    this.device.log('[DP_MGR]  DP Manager destroyed');
  }
}

module.exports = TuyaDPManager_Enhanced;
