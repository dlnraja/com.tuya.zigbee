'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class EnergyPlugDevice extends ZigBeeDevice {

    async onNodeInit({ zclNode }) {
        this.printNode();

                this.registerCapability('onoff', 6);
        this.registerCapability('measure_power', 2820);

        this.log('energy_plug device initialized');
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

module.exports = EnergyPlugDevice;
