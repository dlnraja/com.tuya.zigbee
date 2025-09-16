'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class FingerprintLockDevice extends ZigBeeDevice {

    async onNodeInit() {
        this.log('fingerprint_lock device initialized');

        // Register capabilities
                // Register lock capability
        this.registerCapabilityListener('locked', this.onCapabilityLocked.bind(this));

        // Register alarm_generic capability

        // Mark device as available
        await this.setAvailable();
    }

        async onCapabilityLocked(value, opts) {
        this.log('onCapabilityLocked:', value);
        
        try {
            if (value) {
                await this.zclNode.endpoints[1].clusters.doorLock.lockDoor();
            } else {
                await this.zclNode.endpoints[1].clusters.doorLock.unlockDoor();
            }
            
            return Promise.resolve();
        } catch (error) {
            this.error('Error setting locked:', error);
            return Promise.reject(error);
        }
    }

    async onDeleted() {
        this.log('fingerprint_lock device deleted');
    }

}

module.exports = FingerprintLockDevice;
