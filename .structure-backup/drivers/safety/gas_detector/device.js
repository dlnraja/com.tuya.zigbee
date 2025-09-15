'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class GasDetectorDevice extends ZigBeeDevice {

    async onNodeInit({ zclNode }) {
        this.printNode();

        

        this.log('gas_detector device initialized');
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

module.exports = GasDetectorDevice;
