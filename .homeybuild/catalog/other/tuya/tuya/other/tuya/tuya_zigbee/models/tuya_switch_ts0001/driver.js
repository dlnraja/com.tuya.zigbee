#!/usr/bin/env node
'use strict';

/**
 * Tuya Smart Switch TS0001 Driver
 * Driver pour interrupteur intelligent Tuya 1-gang
 */

const { ZigbeeDevice } = require('homey-meshdriver');
const TuyaDpMapper = require('../../../../lib/tuya');

class TuyaSwitchTS0001 extends ZigbeeDevice {
  
  async onNodeInit({ zclNode, node }) {
    // Initialiser le mapper Tuya DP
    this.tuyaMapper = new TuyaDpMapper();
    
    // Configuration des paramètres
    this.tuyaDpLogging = this.getSetting('tuya_dp_log') || false;
    
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
    
    // Écouter les changements de paramètres
    this.homey.on('settingsChanged', this._onSettingsChanged.bind(this));
    
    this.log('Tuya Smart Switch TS0001 initialized successfully');
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
      const mapping = this.tuyaMapper.mapTuyaDpToCapability(dpId, 'switch');
      
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
    const { capability, type } = mapping;
    
    try {
      let normalizedValue = dpValue;
      
      // Normaliser la valeur selon le type
      if (type === 'bool') {
        normalizedValue = Boolean(dpValue);
      }
      
      // Mettre à jour la capability
      if (this.hasCapability(capability)) {
        await this.setCapabilityValue(capability, normalizedValue);
        
        if (this.tuyaDpLogging) {
          this.log(`Updated capability ${capability}: ${normalizedValue}`);
        }
      }
      
    } catch (error) {
      this.error(`Error handling Tuya DP ${dpId}:`, error);
    }
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
    this.log('Tuya Smart Switch TS0001 deleted');
  }
}

module.exports = TuyaSwitchTS0001;
