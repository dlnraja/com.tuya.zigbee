'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SceneControllerDriver extends ZigBeeDriver {

    onInit() {
        this.log('Scene Controller Driver has been initialized');
        super.onInit();
    }

}

module.exports = SceneControllerDriver;
