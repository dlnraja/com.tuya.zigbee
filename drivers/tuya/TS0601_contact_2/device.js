const Homey = require('homey');

'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

class TS0601contact2Device extends ZigbeeDevice {
    async onMeshInit() {
        try {
            await super.onMeshInit();
            this.log('Tuya TS0601 Contact V2 initialized');
            
            // Register capabilities with error handling
            try { this.registerCapability('alarm_contact', 'genOnOff'); } catch (error) { this.log('Error registering capability alarm_contact:', error); }
            try { this.registerCapability('measure_temperature', 'genOnOff'); } catch (error) { this.log('Error registering capability measure_temperature:', error); }
            try { this.registerCapability('measure_battery', 'genOnOff'); } catch (error) { this.log('Error registering capability measure_battery:', error); }
            
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

module.exports = TS0601contact2Device;