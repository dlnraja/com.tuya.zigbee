#!/usr/bin/env node
export = Ts0003WallSwitchStandardDevice;
declare class Ts0003WallSwitchStandardDevice {
    onNodeInit({ zclNode }: {
        zclNode: any;
    }): Promise<void>;
    parseOnoff(value: any): number;
    onDeleted(): Promise<void>;
}
//# sourceMappingURL=device.d.ts.map