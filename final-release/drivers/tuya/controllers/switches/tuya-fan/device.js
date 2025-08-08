'use strict';

const { TuyaDevice } = require('homey-tuya');
const { TuyaZigbeeDevice } = require('homey-tuya-zigbee');

class TuyafanDevice extends TuyaDevice {
    
    async onInit() {
        try {
        await super.onInit();
        
        // Initialize device
        this.log('tuya-fan device initialized (Historical)');
        
        // Register capabilities
        this.registerCapability('onoff', true);
        } catch (error) {
            this.log('Erreur initialisation:', error);
        }
        this.registerCapability('dim', true);
        
        // Register flows
        this.registerFlowCards();
    }
    
    async onUninit() {
        await super.onUninit();
        this.log('tuya-fan device uninitialized');
    }
    
    registerFlowCards() {
        // Register flow cards if needed
    }
    
    async onSettings({ oldSettings, newSettings, changedKeys }) {
        await super.onSettings({ oldSettings, newSettings, changedKeys });
        this.log('tuya-fan settings updated');
    }
}

module.exports = TuyafanDevice;