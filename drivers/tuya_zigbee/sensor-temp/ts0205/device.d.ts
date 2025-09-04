#!/usr/bin/env node
export = Ts0205;
declare class Ts0205 {
    onNodeInit({ zclNode, node }: {
        zclNode: any;
        node: any;
    }): Promise<void>;
    discoverDeviceCapabilities(zclNode: any): Promise<void>;
    registerCapabilitiesIntelligently(zclNode: any): Promise<void>;
    configureZigbeeReporting(zclNode: any): Promise<void>;
    onSettings(oldSettings: any, newSettings: any, changedKeys: any): Promise<any>;
    onRenamed(name: any): Promise<any>;
    onDeleted(): Promise<any>;
}
//# sourceMappingURL=device.d.ts.map