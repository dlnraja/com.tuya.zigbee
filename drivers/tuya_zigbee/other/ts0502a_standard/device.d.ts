#!/usr/bin/env node
export = Ts0502aStandard;
declare class Ts0502aStandard {
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