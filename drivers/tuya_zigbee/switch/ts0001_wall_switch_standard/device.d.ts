#!/usr/bin/env node
export = Ts0001WallSwitchStandardDevice;
declare class Ts0001WallSwitchStandardDevice {
    onNodeInit({ zclNode }: {
        zclNode: any;
    }): Promise<void>;
    parseOnoff(value: any): number;
    onDeleted(): Promise<void>;
}
//# sourceMappingURL=device.d.ts.map