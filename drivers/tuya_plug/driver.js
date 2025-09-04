"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TuyaPlugDriver = void 0;
class TuyaPlugDriver extends homey_1.Driver {
    async onInit() {
        this.log('Tuya Smart Plug Driver initialized');
    }
    async onPair(session) {
        let devices = [];
        // Set up pairing session handlers
        session.setHandler('list_devices', async () => {
            return devices;
        });
        session.setHandler('list_devices_selection', async (data) => {
            return data;
        });
        session.setHandler('add_device', async (deviceData) => {
            try {
                const { name, data, settings } = deviceData;
                // Validate required fields
                if (!name || !data?.id) {
                    throw new Error('Missing required device information');
                }
                // Add the device to the list of discovered devices
                devices = [{
                        name,
                        data: {
                            id: data.id,
                        },
                        settings: {
                            polling_interval: 30,
                            power_threshold: 5,
                            ...settings
                        }
                    }];
                return true;
            }
            catch (error) {
                this.error('Error adding device:', error);
                throw error;
            }
        });
    }
    async onPairListDevices() {
        // This is a placeholder for device discovery
        // In a real implementation, you would scan for Tuya devices on the network
        return [];
    }
    async onRepair(session, device) {
        this.log('Starting device repair for', device.getName());
        session.setHandler('repair', async (data) => {
            try {
                // Attempt to reconnect to the device
                await device.initializeTuyaDevice();
                return { success: true };
            }
            catch (error) {
                this.error('Repair failed:', error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        });
    }
    async onUninit() {
        this.log('Tuya Smart Plug Driver uninitialized');
    }
}
exports.TuyaPlugDriver = TuyaPlugDriver;
//# sourceMappingURL=driver.js.map