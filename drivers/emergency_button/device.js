'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class EmergencyButtonDevice extends ZigBeeDevice {

    async onNodeInit({ zclNode }) {
        this.printNode();

        

        this.log('emergency_button device initialized');
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

module.exports = EmergencyButtonDevice;
