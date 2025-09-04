#!/usr/bin/env node
export = GenericCoverDevice;
declare class GenericCoverDevice {
    onNodeInit({ zclNode }: {
        zclNode: any;
    }): Promise<void>;
    parseWindowcoveringsState(value: any): number;
    parseWindowcoveringsSet(value: any): number;
}
//# sourceMappingURL=device.d.ts.map