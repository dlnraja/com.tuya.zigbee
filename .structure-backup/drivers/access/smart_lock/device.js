'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class SmartLockDevice extends ZigBeeDevice {

    async onNodeInit({ zclNode }) {
        this.printNode();

        

        this.log('smart_lock device initialized');
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

module.exports = SmartLockDevice;
