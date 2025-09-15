'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class RgbBulbDevice extends ZigBeeDevice {

    async onNodeInit({ zclNode }) {
        this.printNode();

                this.registerCapability('onoff', 6);
        this.registerCapability('dim', 8);
        // light_hue capability registration
        // light_saturation capability registration

        this.log('rgb_bulb device initialized');
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

module.exports = RgbBulbDevice;
