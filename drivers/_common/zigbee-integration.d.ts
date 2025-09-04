declare const _exports: ZigbeeIntegration;
export = _exports;
/**
 * Handles integration with Zigbee2MQTT and ZHA
 */
declare class ZigbeeIntegration {
    logger: any;
    initialized: boolean;
    adapters: {
        zigbee2mqtt: null;
        zha: null;
    };
    /**
     * Initialize the integration
     */
    init(): Promise<void>;
    /**
     * Initialize supported adapters
     * @private
     */
    private _initAdapters;
    /**
     * Initialize Zigbee2MQTT adapter
     * @private
     */
    private _initZigbee2MQTT;
    /**
     * Initialize ZHA adapter
     * @private
     */
    private _initZHA;
    /**
     * Set up event listeners
     * @private
     */
    private _setupEventListeners;
    /**
     * Handle device discovery
     * @param {Object} device - Discovered device
     * @private
     */
    private _handleDeviceDiscovered;
    /**
     * Handle device updates
     * @param {Object} device - Updated device
     * @private
     */
    private _handleDeviceUpdate;
    /**
     * Handle device removal
     * @param {string} deviceId - ID of the removed device
     * @private
     */
    private _handleDeviceRemoved;
    /**
     * Discover devices
     * @returns {Promise<Array>} Array of discovered devices
     */
    discoverDevices(): Promise<any[]>;
    /**
     * Discover devices from Zigbee2MQTT
     * @returns {Promise<Array>} Array of discovered devices
     * @private
     */
    private _discoverZigbee2MQTTDevices;
    /**
     * Discover devices from ZHA
     * @returns {Promise<Array>} Array of discovered devices
     * @private
     */
    private _discoverZHADevices;
    /**
     * Get device by ID
     * @param {string} deviceId - Device ID
     * @returns {Promise<Object|null>} Device object or null if not found
     */
    getDevice(deviceId: string): Promise<Object | null>;
    /**
     * Get device from Zigbee2MQTT
     * @param {string} deviceId - Device ID
     * @returns {Promise<Object|null>} Device object or null if not found
     * @private
     */
    private _getZigbee2MQTTDevice;
    /**
     * Get device from ZHA
     * @param {string} deviceId - Device ID
     * @returns {Promise<Object|null>} Device object or null if not found
     * @private
     */
    private _getZHADevice;
    /**
     * Send command to device
     * @param {string} deviceId - Device ID
     * @param {string} command - Command to send
     * @param {Object} params - Command parameters
     * @returns {Promise<boolean>} True if command was sent successfully
     */
    sendCommand(deviceId: string, command: string, params?: Object): Promise<boolean>;
    /**
     * Send command via Zigbee2MQTT
     * @param {string} deviceId - Device ID
     * @param {string} command - Command to send
     * @param {Object} params - Command parameters
     * @returns {Promise<boolean>} True if command was sent successfully
     * @private
     */
    private _sendZigbee2MQTTCommand;
    /**
     * Send command via ZHA
     * @param {string} deviceId - Device ID
     * @param {string} command - Command to send
     * @param {Object} params - Command parameters
     * @returns {Promise<boolean>} True if command was sent successfully
     * @private
     */
    private _sendZHACommand;
}
//# sourceMappingURL=zigbee-integration.d.ts.map