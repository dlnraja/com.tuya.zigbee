#!/usr/bin/env node
export = Ts0003WallSwitchWallDevice;
declare class Ts0003WallSwitchWallDevice {
    onNodeInit({ zclNode }: {
        zclNode: any;
    }): Promise<void>;
    parseOnoff(value: any): number;
    onDeleted(): Promise<void>;
}
//# sourceMappingURL=device.d.ts.map