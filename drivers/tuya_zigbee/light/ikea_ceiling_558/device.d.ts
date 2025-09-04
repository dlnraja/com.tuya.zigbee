#!/usr/bin/env node
export = IkeaCeiling558Device;
declare class IkeaCeiling558Device {
    onNodeInit({ zclNode }: {
        zclNode: any;
    }): Promise<void>;
    parseOnoff(value: any): number;
    parseDim(value: any): number;
    parseLightTemperature(value: any): number;
    parseLightMode(value: any): number;
    onDeleted(): Promise<void>;
}
//# sourceMappingURL=device.d.ts.map