#!/usr/bin/env node
export = Ts0601VibrationPlugDevice;
declare class Ts0601VibrationPlugDevice {
    onNodeInit({ zclNode }: {
        zclNode: any;
    }): Promise<void>;
    parseOnoff(value: any): number;
    onDeleted(): Promise<void>;
}
//# sourceMappingURL=device.d.ts.map