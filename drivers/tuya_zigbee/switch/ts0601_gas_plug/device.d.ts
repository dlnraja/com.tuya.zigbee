#!/usr/bin/env node
export = Ts0601GasPlugDevice;
declare class Ts0601GasPlugDevice {
    onNodeInit({ zclNode }: {
        zclNode: any;
    }): Promise<void>;
    parseOnoff(value: any): number;
    onDeleted(): Promise<void>;
}
//# sourceMappingURL=device.d.ts.map