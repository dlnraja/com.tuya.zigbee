export = TS0601MotionSensorDevice;
/**
 * TS0601 Motion Sensor Device
 * @extends TuyaZigbeeMultiSensorDevice
 */
declare class TS0601MotionSensorDevice extends TuyaZigbeeMultiSensorDevice {
    /**
     * Device initialization
     */
    onNodeInit({ zclNode, node }: {
        zclNode: any;
        node: any;
    }): Promise<void>;
    /**
     * Register capability listeners
     */
    registerCapabilityListeners(): void;
    /**
     * Apply device-specific configuration
     */
    applyDeviceConfiguration(): Promise<void>;
    /**
     * Set up IAS Zone enrollment
     */
    setupIasZoneEnrollment(): Promise<void>;
    /**
     * Handle motion detection event
     */
    onMotionDetected(): void;
    motionTimeout: number | null | undefined;
    /**
     * Handle motion alarm capability changes
     * @param {boolean} value - New motion alarm value
     * @returns {Promise<void>}
     */
    onCapabilityMotionAlarm(value: boolean): Promise<void>;
    /**
     * Handle setting changes
     */
    /**
     * Handle motion reset setting change
     * @param {number} newValue - New motion reset value in seconds
     * @returns {Promise<void>}
     */
    onMotionResetSettingChanged(newValue: number): Promise<void>;
    /**
     * Handle temperature offset setting change
     * @param {number} newValue - New temperature offset value
     * @returns {Promise<void>}
     */
    onTemperatureOffsetChanged(newValue: number): Promise<void>;
    /**
     * Set up periodic polling for device state
     */
    setupPolling(): void;
    batteryPollingInterval: number | null | undefined;
    /**
     * Read temperature from the device
     * @returns {Promise<void>}
     */
    readTemperature(): Promise<void>;
    /**
     * Read battery level from the device
     * @returns {Promise<void>}
     */
    readBattery(): Promise<void>;
    /**
     * Sync device state with the actual device
     * @returns {Promise<void>}
     */
    syncDeviceState(): Promise<void>;
}
import TuyaZigbeeMultiSensorDevice = require("../../templates/multi-sensor-device");
//# sourceMappingURL=device.d.ts.map