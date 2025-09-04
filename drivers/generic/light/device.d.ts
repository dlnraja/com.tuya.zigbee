#!/usr/bin/env node
export = GenericLightDevice;
declare class GenericLightDevice {
    onNodeInit({ zclNode }: {
        zclNode: any;
    }): Promise<void>;
    parseOnoff(value: any): number;
    parseDim(value: any): number;
    parseLightTemperature(value: any): number;
    parseLightMode(value: any): number;
}
//# sourceMappingURL=device.d.ts.map