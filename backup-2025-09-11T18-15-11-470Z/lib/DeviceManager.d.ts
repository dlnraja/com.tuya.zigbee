#!/usr/bin/env node
export = DeviceManager;
declare class DeviceManager {
    constructor(app: any);
    app: any;
    logger: any;
    devices: Map<any, any>;
    init(): Promise<void>;
    addDevice(deviceData: any): Promise<{
        id: any;
        name: any;
        driverId: any;
        data: any;
        settings: any;
        capabilities: any;
        capabilitiesOptions: any;
        createdAt: string;
        updatedAt: string;
    }>;
    updateDevice(deviceId: any, updates: any): Promise<any>;
    removeDevice(deviceId: any): Promise<any>;
    getDevice(deviceId: any): any;
    getAllDevices(): any[];
    getDevicesByDriver(driverId: any): any[];
    cleanup(): Promise<void>;
    _saveDevices(): Promise<void>;
}
//# sourceMappingURL=DeviceManager.d.ts.map