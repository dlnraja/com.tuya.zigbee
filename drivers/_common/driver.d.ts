export = TuyaDriver;
/**
 * Base driver for all Tuya Zigbee devices
 * @extends ZigBeeDriver
 */
declare class TuyaDriver {
    /**
     * Initialize the driver
     * @async
     */
    onInit(): Promise<void>;
    logger: any;
    /**
     * Handle mesh initialization
     * @async
     */
    onMeshInit(): Promise<void>;
    /**
     * Register flow cards for this driver
     * @private
     */
    private registerFlowCards;
    flowCardAction: any;
    /**
     * Handle flow card action
     * @param {Object} args - Flow card arguments
     * @param {Object} state - Device state
     * @returns {Promise<boolean>} - Success status
     * @private
     */
    private _onFlowAction;
    /**
     * Handle device added event
     * @param {Homey.Device} device - The device being added
     */
    onPairListDevices(data: any, callback: any): void;
    /**
     * Clean up resources when driver is being unloaded
     */
    onUninit(): void;
}
//# sourceMappingURL=driver.d.ts.map