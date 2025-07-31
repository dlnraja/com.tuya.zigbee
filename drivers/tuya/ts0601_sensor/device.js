'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

class ts0601sensorDevice extends ZigbeeDevice {
    async onMeshInit() {
        try {
            await super.onMeshInit();
            this.log('TS0601_sensor initialized');
            
            // Register capabilities with error handling
            try { this.registerCapability('measure_temperature', 'genOnOff'); } catch (error) { this.log('Error registering capability measure_temperature:', error); }
            try { this.registerCapability('measure_humidity', 'genOnOff'); } catch (error) { this.log('Error registering capability measure_humidity:', error); }
            
            // Add metadata
            this.setStoreValue('modelId', 'TS0601_sensor');
            this.setStoreValue('source', 'database_analysis');
            this.setStoreValue('createdAt', '2025-07-31T20:27:53.773Z');
            
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

module.exports = ts0601sensorDevice;