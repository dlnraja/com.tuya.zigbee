#!/usr/bin/env node
export = TuyaZigbeeMultiSensorDevice;
/**
 * Multi-sensor device driver for Tuya Zigbee devices
 * Supports: temperature, humidity, motion, contact, illuminance, battery
 * @extends TuyaZigbeeDevice
 */
declare class TuyaZigbeeMultiSensorDevice {
    /**
     * Device initialization
     */
    onNodeInit({ zclNode }: {
        zclNode: any;
    }): Promise<void>;
    zclNode: any;
    sensorData: {
        temperature: null;
        humidity: null;
        motion: null;
        contact: null;
        illuminance: null;
        battery: null;
        lastUpdated: null;
    } | undefined;
    /**
     * Register device capabilities
     */
    registerCapabilities(): Promise<void>;
    /**
     * Configure device
     */
    configureDevice(): Promise<void>;
    /**
     * Set up event listeners
     */
    setupEventListeners(): void;
    pollingInterval: number | undefined;
    /**
     * Handle attribute reports
     * @param {Object} cluster - ZCL cluster
     * @param {Object} data - Attribute data
     */
    handleAttributeReport(cluster: Object, data: Object): void;
    /**
     * Read sensor values
     */
    readSensors(): Promise<void>;
    /**
     * Handle temperature updates
     * @param {string} attribute - Attribute name
     * @param {number} value - Temperature value (in 0.01°C)
     */
    handleTemperatureUpdate(attribute: string, value: number): void;
    /**
     * Handle humidity updates
     * @param {string} attribute - Attribute name
     * @param {number} value - Humidity value (in 0.01%)
     */
    handleHumidityUpdate(attribute: string, value: number): void;
    /**
     * Handle IAS Zone updates
     * @param {string} attribute - Attribute name
     * @param {number} value - Zone status value
     */
    handleIasZoneUpdate(attribute: string, value: number): void;
    /**
     * Handle illuminance updates
     * @param {string} attribute - Attribute name
     * @param {number} value - Illuminance value (in lux)
     */
    handleIlluminanceUpdate(attribute: string, value: number): void;
    /**
     * Handle battery updates
     * @param {string} attribute - Attribute name
     * @param {number} value - Battery value
     */
    handleBatteryUpdate(attribute: string, value: number): void;
    /**
     * Read an attribute from the device
     * @param {string} clusterName - Cluster name
     * @param {string} attributeName - Attribute name
     * @returns {Promise<*>} Attribute value
     */
    readAttribute(clusterName: string, attributeName: string): Promise<any>;
    /**
     * Clean up resources when device is deleted
     */
    onDeleted(): Promise<void>;
}
//# sourceMappingURL=multi-sensor-device.d.ts.map