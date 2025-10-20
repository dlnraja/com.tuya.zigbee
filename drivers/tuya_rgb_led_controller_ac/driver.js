'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class RGBLEDControllerDriver extends ZigBeeDriver {

    onInit() {
        this.log('RGB LED Controller Driver has been initialized');
        super.onInit();
    }

}

module.exports = RGBLEDControllerDriver;
