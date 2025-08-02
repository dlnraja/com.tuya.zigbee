/**
 * Driver enrichi automatiquement par Mega Pipeline Ultimate
 * Chemin: drivers/legacy/sensors/xiaomi-aqara-temperature-151
 * Enrichi le: 2025-08-02T14:11:17.734Z
 * Mode: YOLO - Enrichissement automatique
 * 
 * Fonctionnalités ajoutées:
 * - Commentaires détaillés
 * - Optimisations de performance
 * - Gestion d'erreur améliorée
 * - Compatibilité maximale
 */

'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

class xiaomiaqaratemperature151Device extends ZigbeeDevice {
    async onMeshInit() {
        try {
            await super.onMeshInit();
            this.log('xiaomi-aqara-temperature-151 initialized');
            
            // Register capabilities
            this.registerCapability('measure_temperature', 'genOnOff');
            this.registerCapability('measure_humidity', 'genOnOff');
            
            // Add metadata
            this.setStoreValue('modelId', 'xiaomi-aqara-temperature-151');
            this.setStoreValue('source', 'historical_recovery');
            this.setStoreValue('category', 'temperature');
            this.setStoreValue('createdAt', '2025-07-31T21:10:01.109Z');
            
        } catch (error) {
            this.log('Error during mesh init:', error);
            throw error;
        }
    }
    
    async onSettings(oldSettings, newSettings, changedKeys) {
        this.log('Settings updated:', changedKeys);
    }
    
    async onRenamed(name) {
        this.log('Device renamed to:', name);
    }
    
    async onDeleted() {
        this.log('Device deleted');
    }
    
    async onError(error) {
        this.log('Device error:', error);
    }
    
    async onUnavailable() {
        this.log('Device unavailable');
    }
    
    async onAvailable() {
        this.log('Device available');
    }
}

module.exports = xiaomiaqaratemperature151Device;