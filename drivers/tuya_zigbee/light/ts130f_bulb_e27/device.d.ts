#!/usr/bin/env node
export = Ts130fBulbE27Device;
declare class Ts130fBulbE27Device {
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