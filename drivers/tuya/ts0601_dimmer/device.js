'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

class ts0601dimmerDevice extends ZigbeeDevice {
    async onMeshInit() {
        try {
            await super.onMeshInit();
            this.log('TS0601_dimmer initialized');
            
            // Register capabilities with error handling
            try { this.registerCapability('onoff', 'genOnOff'); } catch (error) { this.log('Error registering capability onoff:', error); }
            try { this.registerCapability('dim', 'genOnOff'); } catch (error) { this.log('Error registering capability dim:', error); }
            
            // Add metadata
            this.setStoreValue('modelId', 'TS0601_dimmer');
            this.setStoreValue('source', 'database_analysis');
            this.setStoreValue('createdAt', '2025-07-31T20:27:53.741Z');
            
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

module.exports = ts0601dimmerDevice;