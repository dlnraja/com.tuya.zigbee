#!/usr/bin/env node
'use strict';

'use strict';

const { TuyaDevice } = require('homey-tuya');

class Radar24GDevice extends TuyaDevice {
  async onInit() {
    this.log('Radar 24G device initialized');
    
    // Configuration des capabilities
    this.registerCapabilityListener('alarm_motion', this.onMotionAlarm.bind(this));
    
    // Polling des données
    this.pollInterval = setInterval(this.pollData.bind(this), 30000); // 30 secondes
    
    // Initialisation
    await this.pollData();
  }
  
  async onDeleted() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }
  
  async pollData() {
    try {
      const data = await this.getData();
      
      if (data) {
        // Mise à jour de la luminosité avec fallback
        await this.setCapabilityValue('measure_luminance', data.illuminance ?? 0);
        
        // Mise à jour de la distance avec limite (inspiré de HA quirks)
        await this.setCapabilityValue('target_distance', Math.min(data.distance ?? 0, 12));
        
        // Mise à jour du mouvement avec debounce
        if (data.motion !== undefined) {
          if (data.motion !== this.getCapabilityValue('alarm_motion')) {
            await this.setCapabilityValue('alarm_motion', data.motion);
          }
        }
        
        // Ajout sensitivity et illuminance lux (data points from HA)
        if (data.sensitivity) this.setSetting('sensitivity', data.sensitivity);
        if (data.illuminance_lux) await this.setCapabilityValue('measure_luminance', data.illuminance_lux);
      }
    } catch (error) {
      this.log('Error polling data (HA-inspired quirk):', error);
      // Fallback: Reset to defaults
      await this.setCapabilityValue('alarm_motion', false);
    }
  }
  
  async onMotionAlarm(value) {
    try {
      // Activation/désactivation de l'alarme de mouvement
      await this.setData({ motion: value });
      this.log(`Motion alarm ${value ? 'activated' : 'deactivated'}`);
    } catch (error) {
      this.log('Error setting motion alarm:', error);
    }
  }
  
  async getData() {
    try {
      // Simulation des données du capteur radar 24G
      // En production, ces données viendraient du protocole Tuya
      return {
        illuminance: Math.random() * 1000, // 0-1000 lux
        distance: Math.random() * 12,      // 0-12 mètres
        motion: Math.random() > 0.5        // Mouvement détecté ou non
      };
    } catch (error) {
      this.log('Error getting data:', error);
      return null;
    }
  }
  
  async setData(data) {
    try {
      // Envoi des commandes au capteur
      // En production, utilisation du protocole Tuya
      this.log('Setting data:', data);
      return true;
    } catch (error) {
      this.log('Error setting data:', error);
      return false;
    }
  }
}

module.exports = Radar24GDevice;
