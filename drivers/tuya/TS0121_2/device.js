const Homey = require('homey');

'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

class TS01212Device extends ZigbeeDevice {
    async onMeshInit() {
        try {
            await super.onMeshInit();
            this.log('Tuya TS0121 Plug V2 initialized');
            
            // Register capabilities with error handling
            try { this.registerCapability('onoff', 'genOnOff'); } catch (error) { this.log('Error registering capability onoff:', error); }
            try { this.registerCapability('meter_power', 'genOnOff'); } catch (error) { this.log('Error registering capability meter_power:', error); }
            try { this.registerCapability('measure_current', 'genOnOff'); } catch (error) { this.log('Error registering capability measure_current:', error); }
            try { this.registerCapability('measure_voltage', 'genOnOff'); } catch (error) { this.log('Error registering capability measure_voltage:', error); }
            try { this.registerCapability('measure_power_factor', 'genOnOff'); } catch (error) { this.log('Error registering capability measure_power_factor:', error); }
            
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

module.exports = TS01212Device;