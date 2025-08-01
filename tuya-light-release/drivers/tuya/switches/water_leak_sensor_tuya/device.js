'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

class waterleaksensortuyaDevice extends ZigbeeDevice {
    async onMeshInit() {
        try {
            await super.onMeshInit();
            this.log('water_leak_sensor_tuya initialized');
            
            // Register capabilities
            this.registerCapability('onoff', 'genOnOff');
            this.registerCapability('dim', 'genOnOff');
            
            // Add metadata
            this.setStoreValue('modelId', 'water_leak_sensor_tuya');
            this.setStoreValue('source', 'historical_recovery');
            this.setStoreValue('category', 'switches');
            this.setStoreValue('createdAt', '2025-07-31T21:10:01.317Z');
            
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

module.exports = waterleaksensortuyaDevice;