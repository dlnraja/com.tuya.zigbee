'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class MotionSensorRadarHybrid extends ZigBeeDevice {
    
    async onNodeInit({ zclNode }) {
        await super.onNodeInit({ zclNode });
        
        this.printNode();
        
        // Register capabilities
        this.registerCapability('alarm_motion', CLUSTER.IAS_ZONE);
        this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION);
    }
}

module.exports = MotionSensorRadarHybrid;