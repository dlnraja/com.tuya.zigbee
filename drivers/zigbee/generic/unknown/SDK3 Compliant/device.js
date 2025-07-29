'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');
const { GenericZigbeeDevice } = require('homey-meshdriver');

class SDK3 CompliantDevice extends ZigbeeDevice {
    async onInit() {
        try {
        await super.onInit();
        this.log('SDK3 Compliant device initialized');
        this.registerCapability('onoff', true);
        } catch (error) {
            this.log('Erreur initialisation:', error);
        }
    }
    
    async onUninit() {
        await super.onUninit();
    }
}

module.exports = SDK3 CompliantDevice;
