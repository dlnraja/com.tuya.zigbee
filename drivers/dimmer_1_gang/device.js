const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
"use strict";

const { ZigBeeDevice } = require('homey-zigbeedriver');
const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
const { debug, CLUSTER } = require("zigbee-clusters");

const { mapValueRange, calculateLevelControlTransitionTime } = require("../../lib/util");

class dimmer_1_gang extends UnifiedSwitchBase {
    async onNodeInit({ zclNode }) {
        this.printNode();

        this.registerCapability("onoff", CLUSTER.ON_OFF);

        this.registerCapability("dim", CLUSTER.LEVEL_CONTROL, {
            setParser: async (value, opts) => {
                let level = 0;

                if (value >= 1) {
                    level = 255;
                } else if (value > 0) {
                    level = Math.ceil(
                        mapValueRange(
                            0,
                            1,
                            this.getSetting("minBrightness"),
                            this.getSetting("maxBrightness"),
                            value
                        )
                    );
                }

                await this.safeSetCapabilityValue('onoff', value > 0).catch(() => {});

                return {
                    level,
                    transitionTime: calculateLevelControlTransitionTime(opts)
                };
            },
            reportParser: (value) => {
                return mapValueRange(
                    this.getSetting("minBrightness"),
                    this.getSetting("maxBrightness"),
                    0,
                    1,
                    value
                );
            },
        });
    }

    onDeleted() {
      super.onDeleted();
        this.log("1 Gang Dimmer removed");
    }
}

module.exports = dimmer_1_gang;
