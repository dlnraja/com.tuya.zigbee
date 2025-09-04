#!/usr/bin/env node
export = IkeaStandard;
declare class IkeaStandard {
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