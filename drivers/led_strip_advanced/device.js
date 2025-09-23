'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TuyaZigbeeDevice extends ZigBeeDevice {

    async onNodeInit() {
        this.enableDebug();
        this.printNode();
        
        // Register capabilities based on driver config
        const capabilities = this.getCapabilities();
        
        // Register measure capabilities
        capabilities.filter(cap => cap.startsWith('measure_')).forEach(capability => {
            this.registerCapability(capability, 'CLUSTER_TUYA_SPECIFIC');
        });
        
        // Register alarm capabilities  
        capabilities.filter(cap => cap.startsWith('alarm_')).forEach(capability => {
            this.registerCapability(capability, 'CLUSTER_TUYA_SPECIFIC');
        });
        
        // Register onoff capability
        if (capabilities.includes('onoff')) {
            this.registerCapability('onoff', 'CLUSTER_ON_OFF');
        }
        
        // Register dim capability
        if (capabilities.includes('dim')) {
            this.registerCapability('dim', 'CLUSTER_LEVEL_CONTROL');
        }
        
        this.log('Tuya Zigbee device initialized');
    }

}

module.exports = TuyaZigbeeDevice;