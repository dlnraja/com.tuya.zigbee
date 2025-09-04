#!/usr/bin/env node
export = GenericWallSwitch3gangDevice;
declare class GenericWallSwitch3gangDevice {
    onNodeInit({ zclNode }: {
        zclNode: any;
    }): Promise<void>;
    parseOnoff(value: any): number;
    onDeleted(): Promise<void>;
}
//# sourceMappingURL=device.d.ts.map