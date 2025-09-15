'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class DoorWindowSensorDevice extends ZigBeeDevice {

    async onNodeInit({ zclNode }) {
        this.printNode();

                this.registerCapability('alarm_contact', 1280);
        this.registerCapability('measure_battery', 1);

        this.log('door_window_sensor device initialized');
    }

    
    onCapabilityOnOff(value) {
        return this.zclNode.endpoints[1].clusters.onOff.setOn(value);
    }

    onCapabilityDim(value) {
        return this.zclNode.endpoints[1].clusters.levelControl.moveToLevel({
            level: Math.round(value * 254),
            transitionTime: 1
        });
    }
}

module.exports = DoorWindowSensorDevice;
