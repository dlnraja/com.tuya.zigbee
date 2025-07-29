'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');
const { GenericZigbeeDevice } = require('homey-meshdriver');

class Wyzesecurity15Device extends ZigbeeDevice {
    
    async onInit() {
        try {
        await super.onInit();
        
        // Initialize device
        this.log('wyze-security-15 device initialized');
        
        // Register capabilities
        this.registerCapability('onoff', true);
        } catch (error) {
            this.log('Erreur initialisation:', error);
        }
        this.registerCapability('dim', true);
        this.registerCapability('alarm_motion', true);
        this.registerCapability('alarm_contact', true);
        this.registerCapability('measure_temperature', true);
        
        // Register flows
        this.registerFlowCards();
    }
    
    async onUninit() {
        await super.onUninit();
        this.log('wyze-security-15 device uninitialized');
    }
    
    registerFlowCards() {
        // Register flow cards if needed
    }
    
    async onSettings({ oldSettings, newSettings, changedKeys }) {
        await super.onSettings({ oldSettings, newSettings, changedKeys });
        this.log('wyze-security-15 settings updated');
    }
}

module.exports = Wyzesecurity15Device;