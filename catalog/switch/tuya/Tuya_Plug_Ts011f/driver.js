/**
 * Tuya Smart Plug TS011F Driver
 * Driver pour prise intelligente Tuya avec monitoring de puissance
 */

const { ZigbeeDevice } = require('homey-meshdriver');
const TuyaDpMapper = require('../../../../lib/tuya');

class TuyaPlugTS011F extends ZigbeeDevice {
  
  async onNodeInit({ zclNode, node }) {
    // Initialiser le mapper Tuya DP
    this.tuyaMapper = new TuyaDpMapper();
    
    // Configuration des paramètres
    this.tuyaDpLogging = this.getSetting('tuya_dp_log') || false;
    this.powerCalibration = this.getSetting('power_calibration') || 1.0;
    
    // Variables d'état
    this._power = 0;
    this._energy = 0;
    this._lastPowerUpdate = 0;
    
    // Découvrir les endpoints et clusters
    await this.discoverEndpointsSafe(zclNode);
    
    // Obtenir le cluster Tuya
    const tuyaCluster = await this.getTuyaCluster(zclNode);
    if (tuyaCluster) {
      // Écouter les rapports Tuya
      tuyaCluster.on('attr.manuSpecificTuya', this._onTuyaReport.bind(this));
      
      // Lire l'état initial
      await this._initialReadSafe(zclNode);
    }
    
    // Enregistrer les capabilities
    this.registerCapability('onoff', 'genOnOff', {
      get: 'onOff',
      set: 'setOnOff',
      setParser: (value) => ({ value }),
      reportParser: (value) => Boolean(value)
    });
    
    this.registerCapability('measure_power', 'haElectricalMeasurement', {
      get: 'activePower',
      reportParser: (value) => this._processPowerValue(value)
    });
    
    this.registerCapability('meter_power', 'seMetering', {
      get: 'instantaneousDemand',
      reportParser: (value) => this._processPowerValue(value)
    });
    
    // Écouter les changements de paramètres
    this.homey.on('settingsChanged', this._onSettingsChanged.bind(this));
    
    this.log('Tuya Smart Plug TS011F initialized successfully');
  }
  
  /**
   * Traite les rapports Tuya DP
   */
  async _onTuyaReport(data) {
    try {
      const { dpId, dpValue } = data;
      
      if (this.tuyaDpLogging) {
        this.log(`Tuya DP Report - ID: ${dpId}, Value: ${dpValue}`);
      }
      
      // Mapper le DP vers une capability
      const mapping = this.tuyaMapper.mapTuyaDpToCapability(dpId, 'outlet');
      
      if (mapping) {
        await this._handleTuyaDp(dpId, dpValue, mapping);
      } else {
        this.log(`Unknown Tuya DP: ${dpId} = ${dpValue}`);
      }
      
    } catch (error) {
      this.error('Error processing Tuya DP report:', error);
    }
  }
  
  /**
   * Gère un DP Tuya mappé
   */
  async _handleTuyaDp(dpId, dpValue, mapping) {
    const { capability, type, unit } = mapping;
    
    try {
      let normalizedValue = dpValue;
      
      // Normaliser la valeur selon le type
      switch (type) {
        case 'bool':
          normalizedValue = Boolean(dpValue);
          break;
        case 'value':
          normalizedValue = Number(dpValue);
          if (unit === '°C') {
            normalizedValue = normalizedValue / 100; // Température en centi-degrés
          } else if (unit === '%') {
            normalizedValue = Math.min(100, Math.max(0, normalizedValue)); // Limiter à 0-100%
          }
          break;
      }
      
      // Mettre à jour la capability
      if (this.hasCapability(capability)) {
        await this.setCapabilityValue(capability, normalizedValue);
        
        if (this.tuyaDpLogging) {
          this.log(`Updated capability ${capability}: ${normalizedValue}${unit || ''}`);
        }
      }
      
    } catch (error) {
      this.error(`Error handling Tuya DP ${dpId}:`, error);
    }
  }
  
  /**
   * Traite une valeur de puissance avec calibration
   */
  _processPowerValue(value) {
    if (typeof value !== 'number' || isNaN(value)) {
      return 0;
    }
    
    // Appliquer le facteur de calibration
    const calibratedValue = value * this.powerCalibration;
    
    // Mettre à jour l'état interne
    this._power = Math.max(0, calibratedValue);
    this._lastPowerUpdate = Date.now();
    
    // Déclencher le flow card si configuré
    if (this.hasCapability('measure_power')) {
      this.triggerFlow('power_changed', { power: this._power });
    }
    
    return this._power;
  }
  
  /**
   * Découvre les endpoints de manière sécurisée
   */
  async discoverEndpointsSafe(zclNode) {
    try {
      const endpoints = await zclNode.endpoints;
      this.log(`Discovered ${Object.keys(endpoints).length} endpoints`);
      
      for (const [endpointId, endpoint] of Object.entries(endpoints)) {
        const clusters = Object.keys(endpoint.clusters);
        this.log(`Endpoint ${endpointId}: ${clusters.join(', ')}`);
      }
      
    } catch (error) {
      this.error('Error discovering endpoints:', error);
    }
  }
  
  /**
   * Obtient le cluster Tuya de manière sécurisée
   */
  async getTuyaCluster(zclNode) {
    try {
      // Essayer d'abord le cluster manuSpecificTuya
      for (const [endpointId, endpoint] of Object.entries(zclNode.endpoints)) {
        if (endpoint.clusters.manuSpecificTuya) {
          this.log(`Found Tuya cluster on endpoint ${endpointId}`);
          return endpoint.clusters.manuSpecificTuya;
        }
      }
      
      // Essayer le cluster 0xEF00
      for (const [endpointId, endpoint] of Object.entries(zclNode.endpoints)) {
        if (endpoint.clusters['0xEF00']) {
          this.log(`Found Tuya EF00 cluster on endpoint ${endpointId}`);
          return endpoint.clusters['0xEF00'];
        }
      }
      
      this.log('No Tuya cluster found');
      return null;
      
    } catch (error) {
      this.error('Error getting Tuya cluster:', error);
      return null;
    }
  }
  
  /**
   * Lecture initiale sécurisée
   */
  async _initialReadSafe(zclNode) {
    try {
      // Lire l'état de base
      const basicCluster = zclNode.endpoints[1].clusters.genBasic;
      if (basicCluster) {
        const manufacturerName = await basicCluster.read('manufacturerName');
        const modelId = await basicCluster.read('modelId');
        this.log(`Device: ${manufacturerName} ${modelId}`);
      }
      
      // Lire l'état on/off
      const onOffCluster = zclNode.endpoints[1].clusters.genOnOff;
      if (onOffCluster) {
        const onOff = await onOffCluster.read('onOff');
        await this.setCapabilityValue('onoff', Boolean(onOff));
      }
      
    } catch (error) {
      this.error('Error during initial read:', error);
    }
  }
  
  /**
   * Gestion des changements de paramètres
   */
  _onSettingsChanged(newSettings) {
    if (newSettings.tuya_dp_log !== undefined) {
      this.tuyaDpLogging = newSettings.tuya_dp_log;
      this.log(`Tuya DP logging: ${this.tuyaDpLogging ? 'enabled' : 'disabled'}`);
    }
    
    if (newSettings.power_calibration !== undefined) {
      this.powerCalibration = newSettings.power_calibration;
      this.log(`Power calibration factor: ${this.powerCalibration}`);
    }
  }
  
  /**
   * Action de flux : Envoyer un DP Tuya
   */
  async onFlowAction_tuya_dp_send(args) {
    try {
      const { dp_id, dp_value } = args;
      
      if (!this.tuyaMapper) {
        throw new Error('Tuya mapper not initialized');
      }
      
      // Valider les paramètres
      if (!dp_id || dp_id < 1 || dp_id > 65535) {
        throw new Error('Invalid DP ID');
      }
      
      // Envoyer le DP
      await this.tuyaMapper.sendTuyaDp(this, dp_id, dp_value, {
        retry: 3,
        timeout: 5000
      });
      
      this.log(`Sent Tuya DP: ${dp_id} = ${dp_value}`);
      
    } catch (error) {
      this.error('Error sending Tuya DP:', error);
      throw error;
    }
  }
  
  /**
   * Nettoyage lors de la suppression
   */
  async onDeleted() {
    if (this.tuyaMapper) {
      this.tuyaMapper.clearHeuristicCache();
    }
    this.log('Tuya Smart Plug TS011F deleted');
  }
}

module.exports = TuyaPlugTS011F;
