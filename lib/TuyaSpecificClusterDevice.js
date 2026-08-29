'use strict';

const TuyaZigbeeDevice = require("./tuya/TuyaZigbeeDevice");
const { safeSetTimeout, safeClearTimeout } = require('./utils/safe-timers');

/**
 * Class TuyaSpecificClusterDevice
 * 
 * This class handles writing various data types to a Tuya-specific cluster.
 * It abstracts sending boolean, integer, string, enum, and raw data types to
 * the appropriate Tuya datapoints.
 * 
 * Usage: Extend this class in your ZigBee device driver, and call the appropriate
 * write function (writeBool, writeData32, writeString, writeEnum, writeRaw) based
 * on the type of data you want to send.
 *
 * P108: DeviceIOFacade elevated here so legacy `lib/TuyaSpecificClusterDevice`
 * drivers (wall_dimmer_tuya, etc.) get interview compensation + multi-method I/O
 * (forum silent-scan: dimmers pairing but dead without EF00).
 *
 * P206: extends TuyaZigbeeDevice for L14 + universal layer bootstrap.
 */
class TuyaSpecificClusterDevice extends TuyaZigbeeDevice {

    // Transaction ID Management
    // Tuya requires a transaction ID to be incremented with each command. 
    // This is managed internally within this class.
    _transactionID = 0;

    constructor(...args) {
        super(...args);
        try {
            const { installDeviceIO } = require('./io/DeviceIOFacade');
            installDeviceIO(this);
        } catch (_e) {
            this.io = this.io || null;
        }
    }
    
    set transactionID(val) {
        this._transactionID = val % 256;  // Ensure transaction ID stays within the range
    }

    get transactionID() {
        return this._transactionID;
    }

    /**
     * Resolve Tuya cluster with alias + DeviceIO compensation (forum dead-device pattern).
     */
    _resolveTuyaCluster(zclNode) {
        const node = zclNode || this.zclNode;
        if (this.io?._findTuyaClusterAny) {
            const found = this.io._findTuyaClusterAny([1, 2, 0]);
            if (found?.cluster) {return found.cluster;}
        }
        const ep = node?.endpoints?.[1] || node?.endpoints?.[2];
        return ep?.clusters?.tuya
            || ep?.clusters?.tuyaManufacturer
            || ep?.clusters?.manuSpecificTuya
            || ep?.clusters?.[0xEF00]
            || ep?.clusters?.[61184]
            || null;
    }

    async _ensureTuyaIo(zclNode) {
        try {
            if (!this.io) {
                const { installDeviceIO } = require('./io/DeviceIOFacade');
                installDeviceIO(this);
            }
            if (this.io) {
                this.io.attach(zclNode || this.zclNode);
                await this.io.runInterviewCompensation({
                    queryAll: true,
                    sleepyPassive: true,
                }).catch(() => {});
            }
        } catch (_e) { /* non-fatal */ }
    }

    async onNodeInit({ zclNode } = {}) {
        await super.onNodeInit({ zclNode });
        await this._ensureTuyaIo(zclNode);
    }

    /**
     * Multi-path datapoint write: DeviceIO.sendDP → resolved cluster → ep1.tuya.
     * Avoids hard crash when endpoints[1].clusters.tuya is missing.
     */
    async _datapoint(dp, datatype, data) {
        const payload = {
            status: 0,
            transid: this.transactionID++,
            dp,
            datatype,
            length: data.length,
            data,
        };
        if (this.io?.sendDP) {
            try {
                let value = data;
                if (datatype === 1) {value = data[0] === 1;}
                else if (datatype === 2) {value = data.readUInt32BE(0);}
                else if (datatype === 3) {value = data.toString('latin1');}
                else if (datatype === 4) {value = data[0];}
                const ok = await this.io.sendDP(dp, value, { dpType: datatype, type: datatype });
                if (ok) {return true;}
            } catch (_e) { /* fall through */ }
        }
        const cluster = this._resolveTuyaCluster(this.zclNode);
        if (cluster?.datapoint) {
            return cluster.datapoint(payload);
        }
        return this.zclNode.endpoints[1].clusters.tuya.datapoint(payload);
    }

    /**
     * Sends a boolean value to the specified datapoint (dp).
     * 
     * @param {number} dp - The datapoint ID
     * @param {boolean} value - The boolean value to write (true/false)
     * @returns {Promise} - Resolves when the command is sent
     */
    async writeBool(dp, value) {
        const data = Buffer.alloc(1);
        data.writeUInt8(value ? 0x01 : 0x00, 0);
        try {
            return await this._datapoint(dp, 1, data);
        } catch (err) {
            this.error(`Error writing boolean to dp ${dp}:`, err);
        }
    }

    /**
     * Sends a 32-bit integer value to the specified datapoint (dp).
     * 
     * @param {number} dp - The datapoint ID
     * @param {number} value - The integer value to write
     * @returns {Promise} - Resolves when the command is sent
     */
    async writeData32(dp, value) {
        const data = Buffer.alloc(4);
        data.writeUInt32BE(value, 0);
        try {
            return await this._datapoint(dp, 2, data);
        } catch (err) {
            this.error(`Error writing data32 to dp ${dp}:`, err);
        }
    }

    /**
     * Sends a string value to the specified datapoint (dp).
     * 
     * @param {number} dp - The datapoint ID
     * @param {string} value - The string value to write
     * @returns {Promise} - Resolves when the command is sent
     */
    async writeString(dp, value) {
        const data = Buffer.from(String(value), 'latin1');
        try {
            return await this._datapoint(dp, 3, data);
        } catch (err) {
            this.error(`Error writing string to dp ${dp}:`, err);
        }
    }

    /**
     * Sends an enum value to the specified datapoint (dp).
     * 
     * @param {number} dp - The datapoint ID
     * @param {number} value - The enum value to write (must be within the enum range)
     * @returns {Promise} - Resolves when the command is sent
     */
    async writeEnum(dp, value) {
        const data = Buffer.alloc(1);
        data.writeUInt8(value, 0);
        try {
            return await this._datapoint(dp, 4, data);
        } catch (err) {
            this.error(`Error writing enum to dp ${dp}:`, err);
        }
    }

    /**
     * Sends raw data to the specified datapoint (dp).
     * 
     * @param {number} dp - The datapoint ID
     * @param {Buffer} data - The raw data buffer to write
     * @returns {Promise} - Resolves when the command is sent
     */
    async writeRaw(dp, data) {
        try {
            return await this._datapoint(dp, 0, data);
        } catch (err) {
            this.error(`Error writing raw data to dp ${dp}:`, err);
        }
    }

    _isExpectedCapabilitySetFailure(err) {
        const message = String(err?.message || err || '').toLowerCase();
        return this._destroyed
            || this.destroyed
            || !this.homey
            || /destroy|delete|deleted|removed|unavailable|not available|not found|no longer/.test(message);
    }

    /**
     * WHY(P2301 / #532 diag 8c49c683): must NOT call this.setCapabilityValue here.
     * TuyaZigbeeDevice overrides setCapabilityValue → safeSetCapabilityValue, so
     * this.setCapabilityValue creates Maximum call stack size exceeded (OFF / temp RX).
     * Delegate to parent L14 path which uses super.setCapabilityValue.
     */
    async safeSetCapabilityValue(capability, value, meta) {
        if (typeof super.safeSetCapabilityValue === 'function') {
            return super.safeSetCapabilityValue(capability, value, meta);
        }
        if (this._destroyed || this.destroyed) {return undefined;}
        try {
            if (typeof this.hasCapability === 'function' && !this.hasCapability(capability)) {
                return undefined;
            }
            // Last resort: Homey Device native (skip TuyaZigbeeDevice override loop)
            const proto = Object.getPrototypeOf(TuyaZigbeeDevice.prototype);
            if (proto && typeof proto.setCapabilityValue === 'function') {
                return await proto.setCapabilityValue.call(this, capability, value);
            }
            return undefined;
        } catch (err) {
            if (!this._isExpectedCapabilitySetFailure(err) && typeof this.error === 'function') {
                this.error(`[SAFE-SET] ${capability} failed:`, err);
            }
            return undefined;
        }
    }

    async setCapabilityValueSafe(capability, value) {
        return this.safeSetCapabilityValue(capability, value);
    }

    markAppCommand() {
        this._appCommandPending = true;
        if (this._appCommandTimeout) {
            safeClearTimeout(this, this._appCommandTimeout);
        }
        this._appCommandTimeout = safeSetTimeout(this, () => {
            this._appCommandPending = false;
        }, 2000);
    }

    async _triggerPhysicalFlow(parsedValue) {
        if (this._appCommandPending) {return;}
        
        const state = parsedValue ? 'on' : 'off';
        const driverId = this.driver.id;
        const flowId = `${driverId}_physical_${state}`;
        
        try {
            const card = this.homey.flow.getDeviceTriggerCard(flowId);
            if (card) {
                await card.trigger(this, {}, {});
                this.log(`[FLOW] Triggered ${flowId} (Physical)`);
            }
        } catch (err) {
            // Ignore if card doesn't exist for this driver
        }
    }
}

module.exports = TuyaSpecificClusterDevice;
