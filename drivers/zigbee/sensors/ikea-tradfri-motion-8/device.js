'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

class ikeaTradfriMotion_8Device extends ZigbeeDevice {
    async onMeshInit() {
        this.log('ikea-tradfri-motion-8 initialized');
        
        // Enable debugging
        this.enableDebug();
        
        // Set device info
        this.setStoreValue('modelId', 'ikea-tradfri-motion-8');
        
        // Initialize capabilities
        await this.initializeCapabilities();
    }
    
    async initializeCapabilities() {
        // Initialize device-specific capabilities
        if (this.hasCapability('onoff')) {
            await this.registerCapability('onoff', 'genOnOff');
        }
        
        if (this.hasCapability('dim')) {
            await this.registerCapability('dim', 'genLevelCtrl');
        }
        
        if (this.hasCapability('measure_temperature')) {
            await this.registerCapability('measure_temperature', 'msTemperatureMeasurement');
        }
        
        if (this.hasCapability('measure_humidity')) {
            await this.registerCapability('measure_humidity', 'msRelativeHumidity');
        }
        
        if (this.hasCapability('alarm_motion')) {
            await this.registerCapability('alarm_motion', 'msOccupancySensing');
        }
        
        if (this.hasCapability('alarm_contact')) {
            await this.registerCapability('alarm_contact', 'genOnOff');
        }
    }
    
    async onSettings(oldSettings, newSettings, changedKeys) {
        this.log('Settings changed:', changedKeys);
    }
    
    async onRenamed(name) {
        this.log('Device renamed to:', name);
    }
    
    async onDeleted() {
        this.log('Device deleted');
    }
    
    async onUnavailable() {
        this.log('Device unavailable');
    }
    
    async onAvailable() {
        this.log('Device available');
    }
    
    async onError(error) {
        this.log('Device error:', error);
    }
}

module.exports = ikeaTradfriMotion_8Device;
