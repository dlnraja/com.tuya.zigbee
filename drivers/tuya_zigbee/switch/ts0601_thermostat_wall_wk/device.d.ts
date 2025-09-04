#!/usr/bin/env node
export = Ts0601ThermostatWallWkDevice;
declare class Ts0601ThermostatWallWkDevice {
    onNodeInit({ zclNode }: {
        zclNode: any;
    }): Promise<void>;
    parseOnoff(value: any): number;
    onDeleted(): Promise<void>;
}
//# sourceMappingURL=device.d.ts.map