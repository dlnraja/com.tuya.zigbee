'use strict';

class Device {
    async onInit() {
        this.log('Device initialized');
    }
    
    async onCapability(capability, value) {
        this.log('Capability ' + capability + ' changed to ' + value);
    }
    
    async onSettings({ oldSettings, newSettings, changedKeys }) {
        this.log('Settings changed');
    }
    
    async onRenamed(name) {
        this.log('Device renamed to', name);
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

module.exports = Device;