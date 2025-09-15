'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class WallSwitch1gangDevice extends ZigBeeDevice {

    async onNodeInit({ zclNode }) {
        this.printNode();

                this.registerCapability('onoff', 6);

        this.log('wall_switch_1gang device initialized');
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

module.exports = WallSwitch1gangDevice;
