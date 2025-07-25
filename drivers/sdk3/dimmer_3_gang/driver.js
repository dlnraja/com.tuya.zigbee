'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class dimmer3gangDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('dimmer3gangDriver has been initialized');
    }
}

module.exports = dimmer3gangDriver;
