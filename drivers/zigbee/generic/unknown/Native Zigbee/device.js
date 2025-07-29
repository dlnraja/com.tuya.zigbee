'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');
const { GenericZigbeeDevice } = require('homey-meshdriver');

class Native ZigbeeDevice extends ZigbeeDevice {
    async onInit() {
        try {
        await super.onInit();
        this.log('Native Zigbee device initialized');
        this.registerCapability('onoff', true);
        } catch (error) {
            this.log('Erreur initialisation:', error);
        }
    }
    
    async onUninit() {
        await super.onUninit();
    }
}

module.exports = Native ZigbeeDevice;
