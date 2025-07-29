'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');
const { GenericZigbeeDevice } = require('homey-meshdriver');

class BeveiligingDevice extends ZigbeeDevice {
    async onInit() {
        try {
        await super.onInit();
        this.log('Beveiliging device initialized');
        this.registerCapability('onoff', true);
        } catch (error) {
            this.log('Erreur initialisation:', error);
        }
    }
    
    async onUninit() {
        await super.onUninit();
    }
}

module.exports = BeveiligingDevice;
