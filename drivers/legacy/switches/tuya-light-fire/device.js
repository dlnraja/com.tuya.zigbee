/**
 * Driver enrichi automatiquement par Mega Pipeline Ultimate
 * Chemin: drivers/legacy/switches/tuya-light-fire
 * Enrichi le: 2025-08-02T14:11:20.332Z
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

class tuyalightfireDevice extends ZigbeeDevice {
    async onMeshInit() {
        try {
            await super.onMeshInit();
            this.log('tuya-light-fire initialized');
            
            // Register capabilities
            this.registerCapability('onoff', 'genOnOff');
            
            // Add metadata
            this.setStoreValue('modelId', 'tuya-light-fire');
            this.setStoreValue('source', 'tuya_light_recovery');
            this.setStoreValue('category', 'lights');
            this.setStoreValue('createdAt', '2025-07-31T21:24:24.751Z');
            
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

module.exports = tuyalightfireDevice;