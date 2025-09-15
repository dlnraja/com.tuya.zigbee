'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class Gu10SpotDevice extends ZigBeeDevice {

    async onNodeInit({ zclNode }) {
        this.printNode();

                this.registerCapability('onoff', 6);
        this.registerCapability('dim', 8);

        this.log('gu10_spot device initialized');
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

module.exports = Gu10SpotDevice;
