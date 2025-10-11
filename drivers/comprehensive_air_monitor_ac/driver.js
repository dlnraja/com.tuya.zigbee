'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ComprehensiveAirMonitorDriver extends ZigBeeDriver {

    onInit() {
        this.log('Comprehensive Air Monitor Driver has been initialized');
        super.onInit();
    }

}

module.exports = ComprehensiveAirMonitorDriver;
