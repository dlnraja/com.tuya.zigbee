const Homey = require('homey');

'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

class ts0601thermostatDevice extends ZigbeeDevice {
    async onMeshInit() {
        try {
            await super.onMeshInit();
            this.log('TS0601thermostat initialized');
            
            // Register capabilities with error handling
            try { this.registerCapability('measure_temperature', 'genOnOff'); } catch (error) { this.log('Error registering capability measure_temperature:', error); }
            try { this.registerCapability('target_temperature', 'genOnOff'); } catch (error) { this.log('Error registering capability target_temperature:', error); }
            try { this.registerCapability('thermostat_mode', 'genOnOff'); } catch (error) { this.log('Error registering capability thermostat_mode:', error); }
            
            // Add metadata
            this.setStoreValue('modelId', 'TS0601thermostat');
            this.setStoreValue('source', 'generic_pattern_analysis');
            this.setStoreValue('createdAt', '2025-07-31T20:27:53.942Z');
            
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

module.exports = ts0601thermostatDevice;