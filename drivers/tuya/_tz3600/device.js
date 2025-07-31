'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

class tz3600Device extends ZigbeeDevice {
    async onMeshInit() {
        try {
            await super.onMeshInit();
            this.log('_TZ3600 initialized');
            
            // Register capabilities with error handling
            try { this.registerCapability('onoff', 'genOnOff'); } catch (error) { this.log('Error registering capability onoff:', error); }
            try { this.registerCapability('meter_power', 'genOnOff'); } catch (error) { this.log('Error registering capability meter_power:', error); }
            
            // Add metadata
            this.setStoreValue('modelId', '_TZ3600');
            this.setStoreValue('source', 'generic_pattern_analysis');
            this.setStoreValue('createdAt', '2025-07-31T20:27:54.088Z');
            
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

module.exports = tz3600Device;