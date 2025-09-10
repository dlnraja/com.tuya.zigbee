#!/usr/bin/env node
export = BaseDevice;
/**
 * Base device class for all Tuya Zigbee devices
 * @extends EventEmitter
 */
declare class BaseDevice {
    /**
     * Create a new BaseDevice
     * @param {Object} device - Device configuration
     * @param {Object} api - Tuya API client
     */
    constructor(device: Object, api: Object);
    device: Object;
    api: Object;
    logger: any;
    initialized: boolean;
    online: boolean;
    status: {};
    capabilities: Set<any>;
    settings: {};
    /**
     * Initialize the device
     * @async
     * @returns {Promise<boolean>} True if initialization was successful
     */
    initialize(): Promise<boolean>;
    /**
     * Destroy the device and clean up resources
     * @async
     */
    destroy(): Promise<void>;
    /**
     * Handle status update
     * @param {Object} status - New status
     * @private
     */
    private _onStatusUpdate;
    /**
     * Handle device online event
     * @private
     */
    private _onDeviceOnline;
    /**
     * Handle device offline event
     * @private
     */
    private _onDeviceOffline;
    /**
     * Handle device update
     * @param {Object} update - Update data
     * @private
     */
    private _onDeviceUpdate;
    /**
     * Set up event listeners
     * @private
     */
    private setupEventListeners;
    /**
     * Load device capabilities
     * @async
     * @protected
     */
    protected loadCapabilities(): Promise<void>;
    /**
     * Load device settings
     * @async
     * @protected
     */
    protected loadSettings(): Promise<void>;
    /**
     * Sync device status
     * @async
     * @returns {Promise<Object>} Device status
     */
    syncStatus(): Promise<Object>;
    /**
     * Get device info
     * @returns {Object} Device information
     */
    getInfo(): Object;
}
//# sourceMappingURL=BaseDevice.d.ts.map