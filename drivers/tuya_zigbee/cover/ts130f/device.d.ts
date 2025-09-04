#!/usr/bin/env node
export = Ts130fDevice;
declare class Ts130fDevice {
    onNodeInit({ zclNode }: {
        zclNode: any;
    }): Promise<void>;
    parseWindowcoveringsState(value: any): number;
    parseWindowcoveringsSet(value: any): number;
    onDeleted(): Promise<void>;
}
//# sourceMappingURL=device.d.ts.map