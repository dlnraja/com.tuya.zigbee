#!/usr/bin/env node
export = Ts0601SwitchPlugDevice;
declare class Ts0601SwitchPlugDevice {
    onNodeInit({ zclNode }: {
        zclNode: any;
    }): Promise<void>;
    parseOnoff(value: any): number;
    onDeleted(): Promise<void>;
}
//# sourceMappingURL=device.d.ts.map