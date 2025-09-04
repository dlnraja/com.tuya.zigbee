#!/usr/bin/env node
export = Ts0601SmokePlugDevice;
declare class Ts0601SmokePlugDevice {
    onNodeInit({ zclNode }: {
        zclNode: any;
    }): Promise<void>;
    parseOnoff(value: any): number;
    onDeleted(): Promise<void>;
}
//# sourceMappingURL=device.d.ts.map