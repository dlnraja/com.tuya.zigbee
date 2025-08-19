#!/usr/bin/env node
'use strict';

// Enhanced by Mega Ultimate Bug Fixer
// Device Type: zigbee
// Category: security

// Enrichment Date: 2025-08-07T17:53:56.468Z

'use strict';

const { ZigbeeDevice } = require('homey-zigbee');

class ZigbeeSecurityDevice extends ZigbeeDevice {
  async onInit() {
    await super.onInit();
    
    // Logique d'initialisation spécifique à la sécurité
    this.log('Zigbee Security Device initialized');
    
    // Enregistrer les capacités
    this.registerCapability('onoff', 'genOnOff');
    this.registerCapability('alarm_contact', 'ssIasZone');
    this.registerCapability('alarm_motion', 'ssIasZone');
    
    // Écouteurs d'événements
    this.on('capability:onoff:changed', this.onCapabilityOnOff.bind(this));
    this.on('capability:alarm_contact:changed', this.onCapabilityAlarmContact.bind(this));
    this.on('capability:alarm_motion:changed', this.onCapabilityAlarmMotion.bind(this));
  }

  async onCapabilityOnOff(value, opts) {
    try {
      await this.setClusterData('genOnOff', { onOff: value });
      this.log('OnOff capability changed:', value);
    } catch (error) {
      this.error('Error setting onoff capability:', error);
    }
  }

  async onCapabilityAlarmContact(value, opts) {
    try {
      await this.setClusterData('ssIasZone', { alarmContact: value });
      this.log('Alarm contact capability changed:', value);
    } catch (error) {
      this.error('Error setting alarm contact capability:', error);
    }
  }

  async onCapabilityAlarmMotion(value, opts) {
    try {
      await this.setClusterData('ssIasZone', { alarmMotion: value });
      this.log('Alarm motion capability changed:', value);
    } catch (error) {
      this.error('Error setting alarm motion capability:', error);
    }
  }

  async onSettings(oldSettings, newSettings, changedKeys) {
    // Gestion des paramètres
    this.log('Settings updated:', changedKeys);
  }

  async onDeleted() {
    // Nettoyage lors de la suppression
    this.log('Zigbee Security Device deleted');
  }
}

module.exports = ZigbeeSecurityDevice; 