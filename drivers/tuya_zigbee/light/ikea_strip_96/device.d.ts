#!/usr/bin/env node
export = IkeaStrip96Device;
declare class IkeaStrip96Device {
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