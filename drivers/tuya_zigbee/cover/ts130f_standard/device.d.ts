#!/usr/bin/env node
export = Ts130fStandardDevice;
declare class Ts130fStandardDevice {
    onNodeInit({ zclNode }: {
        zclNode: any;
    }): Promise<void>;
    parseWindowcoveringsState(value: any): number;
    parseWindowcoveringsSet(value: any): number;
    onDeleted(): Promise<void>;
}
//# sourceMappingURL=device.d.ts.map