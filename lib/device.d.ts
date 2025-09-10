export = Device;
declare class Device {
    onInit(): Promise<void>;
    onCapability(capability: any, value: any): Promise<void>;
    onSettings({ oldSettings, newSettings, changedKeys }: {
        oldSettings: any;
        newSettings: any;
        changedKeys: any;
    }): Promise<void>;
    onRenamed(name: any): Promise<void>;
    onDeleted(): Promise<void>;
    onUnavailable(): Promise<void>;
    onAvailable(): Promise<void>;
    onError(error: any): Promise<void>;
}
//# sourceMappingURL=device.d.ts.map