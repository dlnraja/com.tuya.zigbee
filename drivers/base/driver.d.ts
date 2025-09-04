export = TuyaZigbeeDriver;
/**
 * Base driver for all Tuya Zigbee devices
 * @extends Homey.Driver
 */
declare class TuyaZigbeeDriver {
    /**
     * Driver initialization
     */
    onInit(): Promise<void>;
    logger: any;
    /**
     * Register flow cards for this driver
     * @private
     */
    private _registerFlowCards;
    flowAction: {
        exampleAction: any;
    } | undefined;
    /**
     * Handle device pairing
     * @param {Homey.Device} device - The device being paired
     * @param {Object} data - Pairing data
     * @param {Object} pairData - Additional pairing data
     */
    onPair(session: any): Promise<void>;
    /**
     * Discover Tuya Zigbee devices
     * @returns {Promise<Array>} Array of discovered devices
     */
    discoverDevices(): Promise<any[]>;
    /**
     * Handle device initialization
     * @param {Homey.Device} device - The device being initialized
     */
    onPairDevice(device: Homey.Device): Promise<void>;
    /**
     * Handle device deletion
     * @param {Homey.Device} device - The device being deleted
     */
    onDeleted(device: Homey.Device): Promise<void>;
}
import Homey = require("homey");
//# sourceMappingURL=driver.d.ts.map