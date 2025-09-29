export = TuyaZigbeeApp;
/**
 * Main application class for Tuya Zigbee integration
 * @extends Homey.App
 */
declare class TuyaZigbeeApp {
    /**
     * Initialize the application
     * @async
     */
    onInit(): Promise<void>;
    /**
     * Application initialization
     * @async
     */
    onInit(): Promise<void>;
    logger: any;
    tuyaAPI: any;
    deviceManager: DeviceManager | undefined;
    /**
     * Register flow cards
     * @private
     * @async
     */
    private registerFlowCards;
    flowCards: {
        deviceDiscovered: any;
        syncAllDevices: any;
    } | {
        deviceDiscovered: any;
        syncAllDevices?: undefined;
    } | undefined;
    /**
     * Register event listeners
     * @private
     */
    private registerEventListeners;
    /**
     * Initialize services
     * @private
     * @async
     */
    private initializeServices;
    /**
     * Handle device pairing
     * @param {Object} session - The pairing session
     * @param {Object} device - The device being paired
     * @param {Object} data - Additional pairing data
     * @async
     */
    onPair(session: Object): Promise<void>;
    config: {
        PYTHON_SERVICE_PORT: any;
        PYTHON_SERVICE_PATH: any;
        DEBUG: boolean;
        API_KEY: any;
    };
    /**
     * Load configuration from file or environment variables
     * @async
     * @private
     */
    private loadConfig;
    /**
     * Start the Python microservice
     * @async
     * @private
     */
    private startPythonService;
    pythonService: any;
    drivers: Map<any, any> | undefined;
    /**
     * Check if Python service is running
     * @returns {boolean} True if service is running
     * @private
     */
    private isPythonServiceRunning;
    /**
     * Stop the Python microservice
     * @async
     * @private
     */
    private stopPythonService;
    /**
     * Initialize core application modules
     * @async
     * @private
     */
    private initializeCore;
    /**
     * Initialize device discovery
     * @private
     */
    private initializeDiscovery;
    discoveryInterval: number | null | undefined;
    /**
     * Start device discovery process
     * @async
     */
    startDeviceDiscovery(): Promise<void>;
    /**
     * Handle discovered device
     * @param {Object} device - Discovered device data
     * @private
     */
    private handleDeviceDiscovery;
    /**
     * Register event handlers
     * @private
     */
    private registerEventHandlers;
    /**
     * Clean up resources when app is being unloaded
     * @async
     */
    onUnload(): Promise<void>;
    /**
     * Clean up resources
     * @async
     */
    cleanup(): Promise<void>;
}
declare class DeviceManager {
    constructor(app: any);
    app: any;
    devices: Map<any, any>;
    logger: any;
    /**
     * Add a new device
     * @param {Object} deviceData - Device data
     */
    addDevice(deviceData: Object): void;
    /**
     * Remove a device
     * @param {string} deviceId - Device ID
     */
    removeDevice(deviceId: string): void;
    /**
     * Update device data
     * @param {string} deviceId - Device ID
     * @param {Object} data - Updated device data
     */
    updateDevice(deviceId: string, data: Object): any;
    /**
     * Get device by ID
     * @param {string} deviceId - Device ID
     * @returns {Object|null} Device data or null if not found
     */
    getDevice(deviceId: string): Object | null;
    /**
     * Get all devices
     * @returns {Array} List of devices
     */
    getAllDevices(): any[];
    /**
     * Clean up device manager resources
     * @async
     */
    cleanup(): Promise<void>;
}
import DeviceManager = require("./lib/DeviceManager");
//# sourceMappingURL=app.d.ts.map