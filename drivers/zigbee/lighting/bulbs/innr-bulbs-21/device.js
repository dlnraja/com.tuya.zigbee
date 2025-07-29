'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');
const { GenericZigbeeDevice } = require('homey-meshdriver');

class Innrbulbs21Device extends ZigbeeDevice {
    
    async onInit() {
        try {
        await super.onInit();
        
        // Initialize device
        this.log('innr-bulbs-21 device initialized');
        
        // Register capabilities
        this.registerCapability('onoff', true);
        } catch (error) {
            this.log('Erreur initialisation:', error);
        }
        this.registerCapability('dim', true);
        this.registerCapability('light_temperature', true);
        
        // Register flows
        this.registerFlowCards();
    }
    
    async onUninit() {
        await super.onUninit();
        this.log('innr-bulbs-21 device uninitialized');
    }
    
    registerFlowCards() {
        // Register flow cards if needed
    }
    
    async onSettings({ oldSettings, newSettings, changedKeys }) {
        await super.onSettings({ oldSettings, newSettings, changedKeys });
        this.log('innr-bulbs-21 settings updated');
    }
}

module.exports = Innrbulbs21Device;