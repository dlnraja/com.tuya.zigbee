"use strict";

const TuyaZigbeeDevice = require("../../lib/tuya/TuyaZigbeeDevice");
const { Cluster, CLUSTER, ZCLDataTypes } = require("zigbee-clusters");

/**
 * Tuya Dimmer Module TS110E — P125: TuyaZigbeeDevice (L14) + mainsPowered
 */

class TuyaLevelControl extends Cluster {
    static get ID() { return 8; }
    static get NAME() { return "tuyaLevelCtrl"; }
    static get ATTRIBUTES() {
        return {
            tuyaBrightness: { id: 61440, type: ZCLDataTypes.uint16 }
        };
    }
    static get COMMANDS() {
        return {
            moveToLevelTuya: {
                id: 240,
                args: { level: ZCLDataTypes.uint16, transtime: ZCLDataTypes.uint16 }
            }
        };
    }
}

try {
    Cluster.addCluster(TuyaLevelControl);
} catch (e) {
    // already registered
}

class TuyaDimmerTS110E extends TuyaZigbeeDevice {

    get mainsPowered() { return true; }

    async onNodeInit({ zclNode }) {
        await super.onNodeInit({ zclNode });
        this.printNode();

        if (this.hasCapability("measure_battery")) {
            await this.removeCapability("measure_battery").catch(() => {});
        }

        this.registerCapability("onoff", CLUSTER.ON_OFF);

        const endpointId = this.getClusterEndpoint(CLUSTER.LEVEL_CONTROL) || 1;
        const endpoint = zclNode.endpoints[endpointId];

        if (!endpoint) {
            this.error("No Level Control endpoint found!");
            return;
        }

        this.registerCapabilityListener("dim", async (value) => {
            this.log(`Setting dim value to: ${value}`);

            const minB = this.getSetting("minBrightness") || 10;
            const maxB = this.getSetting("maxBrightness") || 1000;
            const tuyaLevel = Math.round(((value - 0) * (maxB - minB)) / (1 - 0) + minB);

            if (value > 0 && !this.getCapabilityValue("onoff")) {
                await this.safeSetCapabilityValue("onoff", true).catch(() => {});
            }

            if (endpoint.clusters.tuyaLevelCtrl) {
                await endpoint.clusters.tuyaLevelCtrl.moveToLevelTuya({
                    level: tuyaLevel,
                    transtime: 0
                });
            }
        });

        if (endpoint.clusters.tuyaLevelCtrl) {
            endpoint.clusters.tuyaLevelCtrl.on("attr.tuyaBrightness", (parsedValue) => {
                this.log(`Received Tuya brightness update: ${parsedValue}`);

                const minB = this.getSetting("minBrightness") || 10;
                const maxB = this.getSetting("maxBrightness") || 1000;
                const homeyDimValue = Math.max(0, Math.min(1, ((parsedValue - minB) * (1 - 0)) / (maxB - minB) + 0));

                this.safeSetCapabilityValue("dim", homeyDimValue).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
            });

            try {
                await endpoint.clusters.tuyaLevelCtrl.readAttributes(["tuyaBrightness"]);
            } catch (err) {
                this.log("Initial state read failed (normal for Tuya):", err.message);
            }
        }

        this.log("TS110E Dimmer initialized successfully!");
    }

    onDeleted() {
        this.log("TS110E Dimmer removed");
        if (typeof super.onDeleted === "function") super.onDeleted();
    }
}

module.exports = TuyaDimmerTS110E;
