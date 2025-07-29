'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');
const { GenericZigbeeDevice } = require('homey-meshdriver');

class Geoutlets8Device extends ZigbeeDevice {
    
    async onInit() {
        try {
        await super.onInit();
        
        // Initialize device
        this.log('ge-outlets-8 device initialized');
        
        // Register capabilities
        this.registerCapability('onoff', true);
        } catch (error) {
            this.log('Erreur initialisation:', error);
        }
        this.registerCapability('dim', true);
        this.registerCapability('measure_power', true);
        
        // Register flows
        this.registerFlowCards();
    }
    
    async onUninit() {
        await super.onUninit();
        this.log('ge-outlets-8 device uninitialized');
    }
    
    registerFlowCards() {
        // Register flow cards if needed
    }
    
    async onSettings({ oldSettings, newSettings, changedKeys }) {
        await super.onSettings({ oldSettings, newSettings, changedKeys });
        this.log('ge-outlets-8 settings updated');
    }
}

module.exports = Geoutlets8Device;