#!/usr/bin/env node
declare namespace _exports {
    export { Device, Driver };
}
declare namespace _exports {
    export function normalizeModel(m: any): any;
    export function mapDpToCapability(dp: any, value: any): void;
    export function safeJSON(s: any): any;
    export { TuyaHelpers };
}
export = _exports;
type Device = import("homey").Device;
type Driver = import("homey").Driver;
declare class TuyaHelpers {
    /**
     * Normalize device model string
     * @param {string} model - The device model string
     * @returns {string} Normalized model
     */
    static normalizeModel(model: string): string;
    /**
     * Get Data Point value from state
     * @param {number} dp - Data Point ID
     * @param {Record<number, any>} state - Device state object
     * @returns {*} Value of the Data Point
     */
    static getDpValue(dp: number, state: Record<number, any>): any;
    /**
     * Set Data Point value in state
     * @param {number} dp - Data Point ID
     * @param {*} value - Value to set
     * @param {Record<number, any>} state - Device state object
     */
    static setDpValue(dp: number, value: any, state: Record<number, any>): void;
    /**
     * Map capability to Data Point ID
     * @param {string} capability - Capability ID
     * @param {Record<string, number>} mappings - Capability to DP mappings
     * @returns {number} Data Point ID
     */
    static mapCapabilityToDp(capability: string, mappings: Record<string, number>): number;
    /**
     * Send command to device
     * @param {any} device - Homey device instance (expected to have sendCommand method)
     * @param {Object[]} commands - Array of commands to send
     * @returns {Promise<boolean>} True if successful
     */
    static sendCommand(device: any, commands: Object[]): Promise<boolean>;
    /**
     * Discover devices using the provided discovery function
     * @param {function} discoveryFunction - Function to discover devices
     * @returns {Promise<any[]>} Array of discovered devices
     */
    static discoverDevices(discoveryFunction: Function): Promise<any[]>;
    /**
     * Validate a device object
     * @param {object} device - Device object to validate
     * @throws {Error} If the device object is invalid
     */
    static validateDevice(device: object): void;
    static tuyaHelpers: {
        normalizeDeviceModel: (model: any) => any;
        dpToCapabilityMap: {};
    };
}
//# sourceMappingURL=tuyaHelpers.d.ts.map