const Homey = require('homey');

'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

class ts0601smokeDevice extends ZigbeeDevice {
    async onMeshInit() {
        try {
            await super.onMeshInit();
            this.log('TS0601smoke initialized');
            
            // Register capabilities with error handling
            try { this.registerCapability('alarm_smoke', 'genOnOff'); } catch (error) { this.log('Error registering capability alarm_smoke:', error); }
            try { this.registerCapability('measure_temperature', 'genOnOff'); } catch (error) { this.log('Error registering capability measure_temperature:', error); }
            
            // Add metadata
            this.setStoreValue('modelId', 'TS0601smoke');
            this.setStoreValue('source', 'generic_pattern_analysis');
            this.setStoreValue('createdAt', '2025-07-31T20:27:53.924Z');
            
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

    // Optimized methods
    async onSettings(oldSettings, newSettings, changedKeys) {
        this.log('Settings updated:', changedKeys);
    }
    
    async onRenamed(name) {
        this.log('Device renamed to:', name);
    }
    
    async onDeleted() {
        this.log('Device deleted');
    }
    
    // Error handling
    async onError(error) {
        this.log('Device error:', error);
        this.setUnavailable(error.message);
    }
    
    // Availability management
    async onUnavailable() {
        this.log('Device unavailable');
    }
    
    async onAvailable() {
        this.log('Device available');
        this.setAvailable();
    }
}

module.exports = ts0601smokeDevice;