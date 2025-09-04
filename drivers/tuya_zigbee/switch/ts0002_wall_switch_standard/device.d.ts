#!/usr/bin/env node
export = Ts0002WallSwitchStandardDevice;
declare class Ts0002WallSwitchStandardDevice {
    onNodeInit({ zclNode }: {
        zclNode: any;
    }): Promise<void>;
    parseOnoff(value: any): number;
    onDeleted(): Promise<void>;
}
//# sourceMappingURL=device.d.ts.map