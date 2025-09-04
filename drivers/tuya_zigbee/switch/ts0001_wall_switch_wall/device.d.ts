#!/usr/bin/env node
export = Ts0001WallSwitchWallDevice;
declare class Ts0001WallSwitchWallDevice {
    onNodeInit({ zclNode }: {
        zclNode: any;
    }): Promise<void>;
    parseOnoff(value: any): number;
    onDeleted(): Promise<void>;
}
//# sourceMappingURL=device.d.ts.map