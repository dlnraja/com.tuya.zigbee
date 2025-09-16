'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TouchSwitch4gangDevice extends ZigBeeDevice {

    async onNodeInit() {
        this.log('touch_switch_4gang device initialized');

        // Register capabilities
                // Register on/off capability
        this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));

        // Mark device as available
        await this.setAvailable();
    }

        async onCapabilityOnoff(value, opts) {
        this.log('onCapabilityOnoff:', value);
        
        try {
            if (value) {
                await this.zclNode.endpoints[1].clusters.onOff.setOn();
            } else {
                await this.zclNode.endpoints[1].clusters.onOff.setOff();
            }
            
            return Promise.resolve();
        } catch (error) {
            this.error('Error setting onoff:', error);
            return Promise.reject(error);
        }
    }

    async onDeleted() {
        this.log('touch_switch_4gang device deleted');
    }

}

module.exports = TouchSwitch4gangDevice;
