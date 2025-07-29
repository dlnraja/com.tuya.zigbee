'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');
const { GenericZigbeeDevice } = require('homey-meshdriver');

class Mode Local OnlyDevice extends ZigbeeDevice {
    async onInit() {
        try {
        await super.onInit();
        this.log('Mode Local Only device initialized');
        this.registerCapability('onoff', true);
        } catch (error) {
            this.log('Erreur initialisation:', error);
        }
    }
    
    async onUninit() {
        await super.onUninit();
    }
}

module.exports = Mode Local OnlyDevice;
