export = TuyaZigbeeSwitch;
declare class TuyaZigbeeSwitch {
    onNodeInit({ node }: {
        node: any;
    }): Promise<void>;
    onSettings(oldSettings: any, newSettings: any, changedKeys: any): Promise<void>;
    onDeleted(): Promise<void>;
    toggle(): Promise<any>;
    getDeviceInfo(): Promise<{
        name: any;
        model: any;
        manufacturer: any;
        firmware: any;
        ieeeAddr: any;
    }>;
}
//# sourceMappingURL=device.d.ts.map