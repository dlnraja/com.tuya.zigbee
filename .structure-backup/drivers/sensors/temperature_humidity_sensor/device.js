'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TemperatureHumiditySensorDevice extends ZigBeeDevice {

    async onNodeInit({ zclNode }) {
        this.printNode();

                this.registerCapability('measure_temperature', 1026);
        this.registerCapability('measure_humidity', 1029);
        this.registerCapability('measure_battery', 1);

        this.log('temperature_humidity_sensor device initialized');
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

module.exports = TemperatureHumiditySensorDevice;
