'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

class ts0601blindDevice extends ZigbeeDevice {
    async onMeshInit() {
        try {
            await super.onMeshInit();
            this.log('TS0601blind initialized');
            
            // Register capabilities with error handling
            try { this.registerCapability('windowcoverings_state', 'genOnOff'); } catch (error) { this.log('Error registering capability windowcoverings_state:', error); }
            try { this.registerCapability('windowcoverings_set', 'genOnOff'); } catch (error) { this.log('Error registering capability windowcoverings_set:', error); }
            
            // Add metadata
            this.setStoreValue('modelId', 'TS0601blind');
            this.setStoreValue('source', 'generic_pattern_analysis');
            this.setStoreValue('createdAt', '2025-07-31T20:27:53.960Z');
            
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

module.exports = ts0601blindDevice;