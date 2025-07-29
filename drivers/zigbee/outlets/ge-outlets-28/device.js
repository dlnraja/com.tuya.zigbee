'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');
const { GenericZigbeeDevice } = require('homey-meshdriver');

class Geoutlets28Device extends ZigbeeDevice {
    
    async onInit() {
        try {
        await super.onInit();
        
        // Initialize device
        this.log('ge-outlets-28 device initialized');
        
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
        this.log('ge-outlets-28 device uninitialized');
    }
    
    registerFlowCards() {
        // Register flow cards if needed
    }
    
    async onSettings({ oldSettings, newSettings, changedKeys }) {
        await super.onSettings({ oldSettings, newSettings, changedKeys });
        this.log('ge-outlets-28 settings updated');
    }
}

module.exports = Geoutlets28Device;