#!/usr/bin/env node
export = Ts0601CurtainCoverStandardDevice;
declare class Ts0601CurtainCoverStandardDevice {
    onNodeInit({ zclNode }: {
        zclNode: any;
    }): Promise<void>;
    parseWindowcoveringsState(value: any): number;
    parseWindowcoveringsSet(value: any): number;
    onDeleted(): Promise<void>;
}
//# sourceMappingURL=device.d.ts.map