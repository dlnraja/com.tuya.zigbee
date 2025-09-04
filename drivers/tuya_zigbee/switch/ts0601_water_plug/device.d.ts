#!/usr/bin/env node
export = Ts0601WaterPlugDevice;
declare class Ts0601WaterPlugDevice {
    onNodeInit({ zclNode }: {
        zclNode: any;
    }): Promise<void>;
    parseOnoff(value: any): number;
    onDeleted(): Promise<void>;
}
//# sourceMappingURL=device.d.ts.map