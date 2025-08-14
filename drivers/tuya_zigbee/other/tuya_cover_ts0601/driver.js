'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');
const TuyaDpMapper = require('../../../lib/tuya');

class TuyaCoverTS0601 extends ZigbeeDevice {

  async onNodeInit({ zclNode }) {
    // Initialize Tuya DP mapper
    this.tuyaMapper = new TuyaDpMapper();
    
    // Configure settings
    this.tuyaDpLog = this.getSetting('tuya_dp_log') || false;
    this.coverSpeed = this.getSetting('cover_speed') || 50;
    
    // Discover endpoints safely
    await this.discoverEndpointsSafe(zclNode);
    
    // Setup Tuya listener
    this.setupTuyaListener();
    
    // Initial read
    await this._initialReadSafe();
    
    // Log initialization
    this.log('Tuya Cover TS0601 initialized successfully');
  }

  setupTuyaListener() {
    // Listen for Tuya reports
    this.registerCapabilityListener('windowcoverings_set', async (value) => {
      await this._setCoverPosition(value);
    });

    this.registerCapabilityListener('windowcoverings_tilt_set', async (value) => {
      await this._setCoverTilt(value);
    });
  }

  async _setCoverPosition(position) {
    try {
      // Map position to Tuya DP
      const dpId = 2; // Standard cover position DP
      const tuyaValue = position.toString();
      
      await this.tuyaMapper.sendTuyaDp(this, dpId, tuyaValue, {
        debounce: true,
        retry: 3
      });
      
      // Update capability
      await this.setCapabilityValue('windowcoverings_set', position);
      
      if (this.tuyaDpLog) {
        this.log(`Cover position set to ${position}% via DP${dpId}`);
      }
      
    } catch (error) {
      this.error('Failed to set cover position:', error);
      throw error;
    }
  }

  async _setCoverTilt(tilt) {
    try {
      // Map tilt to Tuya DP
      const dpId = 3; // Standard cover tilt DP
      const tuyaValue = tilt.toString();
      
      await this.tuyaMapper.sendTuyaDp(this, dpId, tuyaValue, {
        debounce: true,
        retry: 3
      });
      
      // Update capability
      await this.setCapabilityValue('windowcoverings_tilt_set', tilt);
      
      if (this.tuyaDpLog) {
        this.log(`Cover tilt set to ${tilt}% via DP${dpId}`);
      }
      
    } catch (error) {
      this.error('Failed to set cover tilt:', error);
      throw error;
    }
  }

  async _onTuyaReport(data) {
    try {
      const { dpId, value } = data;
      
      if (this.tuyaDpLog) {
        this.log(`Tuya report: DP${dpId} = ${value}`);
      }
      
      // Handle different DPs
      await this._handleTuyaDp(dpId, value);
      
    } catch (error) {
      this.error('Error handling Tuya report:', error);
    }
  }

  async _handleTuyaDp(dpId, value) {
    try {
      // Map Tuya DP to capability
      const mapping = this.tuyaMapper.mapTuyaDpToCapability(dpId, 'cover');
      
      if (mapping) {
        const { capability, transform } = mapping;
        
        // Transform value if needed
        let transformedValue = value;
        if (transform) {
          transformedValue = transform(value);
        }
        
        // Update capability
        await this.setCapabilityValue(capability, transformedValue);
        
        // Trigger flow if position changed
        if (capability === 'windowcoverings_set') {
          this.triggerFlow('cover_position_changed', { position: transformedValue });
        }
        
        if (this.tuyaDpLog) {
          this.log(`Updated ${capability} to ${transformedValue} from DP${dpId}`);
        }
      }
      
    } catch (error) {
      this.error(`Error handling DP${dpId}:`, error);
    }
  }

  async discoverEndpointsSafe(zclNode) {
    try {
      const endpoints = await zclNode.endpoints;
      this.log(`Discovered ${endpoints.length} endpoints`);
      
      // Find Tuya cluster
      for (const endpoint of endpoints) {
        const clusters = await endpoint.clusters;
        if (clusters.manuSpecificTuya) {
          this.tuyaEndpoint = endpoint;
          this.log('Found Tuya cluster on endpoint', endpoint.id);
          break;
        }
      }
      
    } catch (error) {
      this.error('Error discovering endpoints:', error);
    }
  }

  async getTuyaCluster() {
    if (this.tuyaEndpoint) {
      return this.tuyaEndpoint.clusters.manuSpecificTuya;
    }
    return null;
  }

  async _initialReadSafe() {
    try {
      // Read initial cover position if available
      const tuyaCluster = await this.getTuyaCluster();
      if (tuyaCluster) {
        // Read DP2 (cover position)
        const position = await tuyaCluster.read('tuyaDataPoint', { dpId: 2 });
        if (position && position.value !== undefined) {
          await this.setCapabilityValue('windowcoverings_set', position.value);
          this.log(`Initial cover position: ${position.value}%`);
        }
      }
    } catch (error) {
      this.log('Could not read initial cover position:', error.message);
    }
  }

  async onSettingsChanged(oldSettings, newSettings) {
    this.tuyaDpLog = newSettings.tuya_dp_log || false;
    this.coverSpeed = newSettings.cover_speed || 50;
    
    this.log('Settings updated:', { tuyaDpLog: this.tuyaDpLog, coverSpeed: this.coverSpeed });
  }

  async onFlowAction_tuya_dp_send(args) {
    try {
      const { dp_id, value } = args;
      
      await this.tuyaMapper.sendTuyaDp(this, dp_id, value, {
        debounce: false,
        retry: 1
      });
      
      this.log(`Sent custom Tuya DP${dp_id} = ${value}`);
      
    } catch (error) {
      this.error('Failed to send custom Tuya DP:', error);
      throw error;
    }
  }

  onDeleted() {
    this.log('Tuya Cover TS0601 deleted');
  }
}

module.exports = TuyaCoverTS0601;
