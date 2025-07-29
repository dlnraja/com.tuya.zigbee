'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');
const { GenericZigbeeDevice } = require('homey-meshdriver');

class ZigbeelightDevice extends ZigbeeDevice {
    
    async onInit() {
        try {
        await super.onInit();
        
        // Initialize device
        this.log('zigbee-light device initialized (Historical)');
        
        // Register capabilities
        this.registerCapability('onoff', true);
        } catch (error) {
            this.log('Erreur initialisation:', error);
        }
        this.registerCapability('dim', true);
        this.registerCapability('light_hue', true);
        this.registerCapability('light_saturation', true);
        this.registerCapability('light_temperature', true);
        
        // Register flows
        this.registerFlowCards();
    }
    
    async onUninit() {
        await super.onUninit();
        this.log('zigbee-light device uninitialized');
    }
    
    registerFlowCards() {
        // Register flow cards if needed
    }
    
    async onSettings({ oldSettings, newSettings, changedKeys }) {
        await super.onSettings({ oldSettings, newSettings, changedKeys });
        this.log('zigbee-light settings updated');
    }
}

module.exports = ZigbeelightDevice;