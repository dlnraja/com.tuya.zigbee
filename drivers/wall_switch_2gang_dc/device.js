'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class WallSwitch2gangDcDevice extends ZigBeeDevice {

    async onNodeInit() {
        this.log('wall_switch_2gang_dc device initialized');

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
        this.log('wall_switch_2gang_dc device deleted');
    }

}

module.exports = WallSwitch2gangDcDevice;
