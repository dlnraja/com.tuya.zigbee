const Homey = require('homey');

'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

class ts0601switch3Device extends ZigbeeDevice {
    async onMeshInit() {
        try {
            await super.onMeshInit();
            this.log('TS0601_switch_3 initialized');
            
            // Register capabilities with error handling
            try { this.registerCapability('onoff', 'genOnOff'); } catch (error) { this.log('Error registering capability onoff:', error); }
            try { this.registerCapability('dim', 'genOnOff'); } catch (error) { this.log('Error registering capability dim:', error); }
            try { this.registerCapability('light_temperature', 'genOnOff'); } catch (error) { this.log('Error registering capability light_temperature:', error); }
            try { this.registerCapability('light_mode', 'genOnOff'); } catch (error) { this.log('Error registering capability light_mode:', error); }
            try { this.registerCapability('light_hue', 'genOnOff'); } catch (error) { this.log('Error registering capability light_hue:', error); }
            
            // Add metadata
            this.setStoreValue('modelId', 'TS0601_switch_3');
            this.setStoreValue('source', 'database_analysis');
            this.setStoreValue('createdAt', '2025-07-31T20:27:53.842Z');
            
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

module.exports = ts0601switch3Device;