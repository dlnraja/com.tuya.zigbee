#!/usr/bin/env node
export = Ts0601CurtainCoverDevice;
declare class Ts0601CurtainCoverDevice {
    onNodeInit({ zclNode }: {
        zclNode: any;
    }): Promise<void>;
    parseWindowcoveringsState(value: any): number;
    parseWindowcoveringsSet(value: any): number;
    onDeleted(): Promise<void>;
}
//# sourceMappingURL=device.d.ts.map