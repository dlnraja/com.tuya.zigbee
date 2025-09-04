#!/usr/bin/env node
export = Ts0002WallSwitchWallDevice;
declare class Ts0002WallSwitchWallDevice {
    onNodeInit({ zclNode }: {
        zclNode: any;
    }): Promise<void>;
    parseOnoff(value: any): number;
    onDeleted(): Promise<void>;
}
//# sourceMappingURL=device.d.ts.map