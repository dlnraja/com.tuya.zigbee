'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class MotionSensorMmwaveDevice extends ZigBeeDevice {
    
    async onNodeInit() {
        this.log('Motion Sensor Mmwave device initialized');
        
        // Register capabilities
        this.registerCapability('alarm_motion', 'occupancySensing');
        this.registerCapability('measure_battery', 'powerConfiguration');
        
        await super.onNodeInit();
    }
    
}

module.exports = MotionSensorMmwaveDevice;