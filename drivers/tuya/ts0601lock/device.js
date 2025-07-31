'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

class ts0601lockDevice extends ZigbeeDevice {
    async onMeshInit() {
        try {
            await super.onMeshInit();
            this.log('TS0601lock initialized');
            
            // Register capabilities with error handling
            try { this.registerCapability('lock_state', 'genOnOff'); } catch (error) { this.log('Error registering capability lock_state:', error); }
            try { this.registerCapability('lock_mode', 'genOnOff'); } catch (error) { this.log('Error registering capability lock_mode:', error); }
            
            // Add metadata
            this.setStoreValue('modelId', 'TS0601lock');
            this.setStoreValue('source', 'generic_pattern_analysis');
            this.setStoreValue('createdAt', '2025-07-31T20:27:53.980Z');
            
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

module.exports = ts0601lockDevice;