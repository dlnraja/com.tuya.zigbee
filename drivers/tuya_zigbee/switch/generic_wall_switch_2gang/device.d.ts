#!/usr/bin/env node
export = GenericWallSwitch2gangDevice;
declare class GenericWallSwitch2gangDevice {
    onNodeInit({ zclNode }: {
        zclNode: any;
    }): Promise<void>;
    parseOnoff(value: any): number;
    onDeleted(): Promise<void>;
}
//# sourceMappingURL=device.d.ts.map