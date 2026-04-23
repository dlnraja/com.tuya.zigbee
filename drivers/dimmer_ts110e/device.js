"use strict";

const { ZigBeeDevice } = require("homey-zigbeedriver");
const { Cluster, CLUSTER, ZCLDataTypes } = require("zigbee-clusters");

/**
 * Tuya Dimmer Module TS110E - v5.12.0
 * 
 * Supports proprietary Tuya dimming commands on Cluster 0x0008.
 * Manufacturers: _TZ3210_ngqk6jia, _TZ3210_weaqkhab
 */

// 1. Define the custom cluster with a UNIQUE name
class TuyaLevelControl extends Cluster {
    static get ID() { return 8; } // 0x0008 - Same Zigbee ID as Level Control
    static get NAME() { return "tuyaLevelCtrl"; } // Unique name to prevent global conflicts!
    static get ATTRIBUTES() {
        return {
            tuyaBrightness: { id: 61440, type: ZCLDataTypes.uint16 }
        };
    }
    static get COMMANDS() {
        return {
            moveToLevelTuya: {
                id: 240, // 0xF0 - Tuya proprietary dim command
                args: { level: ZCLDataTypes.uint16, transtime: ZCLDataTypes.uint16 }
            }
        };
    }
}

// 2. Register it globally
try {
    Cluster.addCluster(TuyaLevelControl);
} catch (e) {
    // Already added? 
}

class TuyaDimmerTS110E extends ZigBeeDevice {
    async onNodeInit({ zclNode }) {
        this.printNode();

        // 3. Register standard On/Off
        this.registerCapability("onoff", CLUSTER.ON_OFF);

        // A8: NaN Safety - use safeDivide/safeMultiply
        const endpointId = this.getClusterEndpoint(CLUSTER.LEVEL_CONTROL) || 1;
        const endpoint = zclNode.endpoints[endpointId];

        if (!endpoint) {
            this.error("No Level Control endpoint found!");
            return;
        }

        // 4. Register custom Dim listener 
        this.registerCapabilityListener("dim", async (value, opts) => {
            this.log(`Setting dim value to: ${value}`);

            const minB = this.getSetting("minBrightness") || 10;
            const maxB = this.getSetting("maxBrightness") || 1000;
            const tuyaLevel = Math.round(((value - 0) * (maxB - minB)) / (1 - 0) + minB);

            // Turn on if dragging from 0
            if (value > 0 && !this.getCapabilityValue("onoff")) {
                await this.setCapabilityValue("onoff", true).catch(() => {});
            }

            // Send command via custom cluster
            if (endpoint.clusters.tuyaLevelCtrl) {
                await endpoint.clusters.tuyaLevelCtrl.moveToLevelTuya({
                    level: tuyaLevel,
                    transtime: 0
                });
            }
        });

        // 5. Listen to the custom attribute for physical switch updates
        if (endpoint.clusters.tuyaLevelCtrl) {
            endpoint.clusters.tuyaLevelCtrl.on("attr.tuyaBrightness", (parsedValue) => {
                this.log(`Received Tuya brightness update: ${parsedValue}`);
                
                const minB = this.getSetting("minBrightness") || 10;
                const maxB = this.getSetting("maxBrightness") || 1000;
                const homeyDimValue = Math.max(0, Math.min(1, ((parsedValue - minB) * (1 - 0)) / (maxB - minB) + 0));
                
                this.setCapabilityValue("dim", homeyDimValue).catch(this.error);
      });
            
            // Attempt to sync the slider state on start
            try {
                await endpoint.clusters.tuyaLevelCtrl.readAttributes(["tuyaBrightness"]);
            } catch (err) {
                this.log("Initial state read failed (normal for Tuya):", err.message);
            }
        }

        this.log("TS110E Dimmer initialized successfully! ");
    }

    onDeleted() {
        this.log("TS110E Dimmer removed");
    }
}

module.exports = TuyaDimmerTS110E;

