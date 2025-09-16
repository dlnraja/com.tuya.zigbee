'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class SmartBulbTunableDevice extends ZigBeeDevice {

    async onNodeInit() {
        this.log('smart_bulb_tunable device initialized');

        // Register capabilities
                // Register on/off capability
        this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));

        // Register dim capability
        this.registerCapabilityListener('dim', this.onCapabilityDim.bind(this));

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

    async onCapabilityDim(value, opts) {
        this.log('onCapabilityDim:', value);
        
        try {
            const level = Math.round(value * 254);
            await this.zclNode.endpoints[1].clusters.levelControl.moveToLevel({
                level: level,
                transitionTime: 1
            });
            
            return Promise.resolve();
        } catch (error) {
            this.error('Error setting dim:', error);
            return Promise.reject(error);
        }
    }

    async onDeleted() {
        this.log('smart_bulb_tunable device deleted');
    }

}

module.exports = SmartBulbTunableDevice;
