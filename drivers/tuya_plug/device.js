"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TuyaPlugDevice = void 0;
const tuyapi_1 = __importDefault(require("tuyapi"));
class TuyaPlugDevice extends homey_1.Device {
    constructor() {
        super(...arguments);
        this.status = {};
        this.settings = {
            polling_interval: 30,
            power_threshold: 5
        };
    }
    async onInit() {
        this.log('Initializing Tuya Smart Plug...');
        try {
            // Load settings
            await this.loadSettings();
            // Initialize Tuya device
            this.initializeTuyaDevice();
            // Register capabilities
            await this.registerCapabilities();
            // Initial sync
            await this.syncStatus();
            this.log('Tuya Smart Plug initialized');
        }
        catch (error) {
            this.error('Failed to initialize device:', error);
            this.setUnavailable(error instanceof Error ? error.message : 'Unknown error');
        }
    }
    async loadSettings() {
        try {
            const settings = await this.getSettings();
            this.settings = {
                polling_interval: settings.polling_interval || 30,
                power_threshold: settings.power_threshold || 5
            };
            this.log('Settings loaded:', this.settings);
        }
        catch (error) {
            this.error('Failed to load settings:', error);
            throw error;
        }
    }
    initializeTuyaDevice() {
        const { id, key, ip } = this.getData();
        if (!id || !key) {
            throw new Error('Missing required device ID or key');
        }
        this.tuyaDevice = new tuyapi_1.default({
            id,
            key,
            ip,
            version: '3.3',
            issueRefreshOnConnect: true
        });
        // Set up event listeners
        this.tuyaDevice.on('connected', () => {
            this.log('Connected to Tuya device');
            this.setAvailable();
        });
        this.tuyaDevice.on('disconnected', () => {
            this.log('Disconnected from Tuya device');
            this.setUnavailable('Device disconnected');
        });
        this.tuyaDevice.on('error', (error) => {
            this.error('Tuya device error:', error);
            this.setUnavailable(`Error: ${error.message}`);
        });
        this.tuyaDevice.on('data', (data) => {
            this.handleDeviceUpdate(data);
        });
        // Connect to the device
        this.connectToDevice();
    }
    async connectToDevice() {
        if (!this.tuyaDevice)
            return;
        try {
            await this.tuyaDevice.find();
            await this.tuyaDevice.connect();
            this.setAvailable();
        }
        catch (error) {
            this.error('Failed to connect to device:', error);
            this.setUnavailable(`Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            // Try to reconnect after a delay
            setTimeout(() => this.connectToDevice(), 30000);
        }
    }
    async registerCapabilities() {
        // Register capability listeners
        this.registerCapabilityListener('onoff', async (value) => {
            try {
                await this.setPowerState(value);
                return true;
            }
            catch (error) {
                this.error('Failed to set power state:', error);
                throw error;
            }
        });
    }
    async setPowerState(on) {
        if (!this.tuyaDevice) {
            throw new Error('Device not connected');
        }
        try {
            const result = await this.tuyaDevice.set({
                dps: 1, // DPS index for power state
                set: on
            });
            if (result) {
                this.status.onoff = on;
                this.log(`Power turned ${on ? 'on' : 'off'}`);
                return true;
            }
            throw new Error('Failed to set power state');
        }
        catch (error) {
            this.error('Error setting power state:', error);
            throw error;
        }
    }
    async syncStatus() {
        if (!this.tuyaDevice) {
            throw new Error('Device not connected');
        }
        try {
            const status = await this.tuyaDevice.get({ schema: true });
            this.handleDeviceUpdate(status);
        }
        catch (error) {
            this.error('Failed to sync status:', error);
            throw error;
        }
    }
    handleDeviceUpdate(data) {
        try {
            const status = {
                onoff: data.dps?.['1'],
                power: data.dps?.['18'],
                voltage: data.dps?.['20'],
                current: data.dps?.['19'],
            };
            this.updateCapabilities(status);
            this.status = { ...this.status, ...status };
            // Emit events for flow cards
            this.emit('powerChanged', { state: status.onoff });
            if (status.power !== undefined) {
                this.emit('powerConsumptionChanged', { power: status.power });
            }
        }
        catch (error) {
            this.error('Error handling device update:', error);
        }
    }
    async updateCapabilities(status) {
        try {
            if (status.onoff !== undefined) {
                await this.setCapabilityValue('onoff', status.onoff);
            }
            if (status.power !== undefined) {
                await this.setCapabilityValue('measure_power', status.power);
            }
            if (status.voltage !== undefined) {
                await this.setCapabilityValue('measure_voltage', status.voltage);
            }
            if (status.current !== undefined) {
                await this.setCapabilityValue('measure_current', status.current);
            }
            // Calculate and update power consumption if needed
            if (status.power !== undefined) {
                const powerConsumed = (this.getStoreValue('power_consumed') || 0) +
                    (status.power * (this.settings.polling_interval / 3600) / 1000);
                await this.setStoreValue('power_consumed', powerConsumed);
                await this.setCapabilityValue('measure_power.consumed', powerConsumed);
            }
        }
        catch (error) {
            this.error('Error updating capabilities:', error);
        }
    }
    setupPolling() {
        // Clear existing interval if any
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        // Set up new polling interval
        this.pollingInterval = setInterval(async () => {
            try {
                await this.syncStatus();
            }
            catch (error) {
                this.error('Polling error:', error);
            }
        }, this.settings.polling_interval * 1000);
    }
    async onSettings({ newSettings }) {
        this.log('Settings updated:', newSettings);
        this.settings = { ...this.settings, ...newSettings };
        this.setupPolling();
        return true;
    }
    async onDeleted() {
        this.log('Device removed');
        // Clean up
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        if (this.tuyaDevice) {
            try {
                await this.tuyaDevice.disconnect();
            }
            catch (error) {
                this.error('Error disconnecting device:', error);
            }
        }
        return super.onDeleted();
    }
}
exports.TuyaPlugDevice = TuyaPlugDevice;
//# sourceMappingURL=device.js.map