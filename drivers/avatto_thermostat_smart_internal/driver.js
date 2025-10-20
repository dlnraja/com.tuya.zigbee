'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmartThermostatDriver extends ZigBeeDriver {

    onInit() {
        this.log('Smart Thermostat Driver has been initialized');
        super.onInit();
    }

}

module.exports = SmartThermostatDriver;
