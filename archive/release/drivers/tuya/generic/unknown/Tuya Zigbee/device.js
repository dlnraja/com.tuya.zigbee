#!/usr/bin/env node
'use strict';

﻿'use strict';

const { TuyaDevice } = require('homey-tuya');
const { TuyaZigbeeDevice } = require('homey-tuya-zigbee');

class Tuya ZigbeeDevice extends TuyaDevice {
    async onInit() {
        try {
        await super.onInit();
        this.log('Tuya Zigbee device initialized');
        this.registerCapability('onoff', true);
        } catch (error) {
            this.log('Erreur initialisation:', error);
        }
    }
    
    async onUninit() {
        await super.onUninit();
    }
}

module.exports = Tuya ZigbeeDevice;
