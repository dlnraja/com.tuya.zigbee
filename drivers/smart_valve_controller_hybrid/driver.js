'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmartValveControllerDriver extends ZigBeeDriver {

    onInit() {
        this.log('Smart Valve Controller Driver has been initialized');
        super.onInit();
    }

}

module.exports = SmartValveControllerDriver;
