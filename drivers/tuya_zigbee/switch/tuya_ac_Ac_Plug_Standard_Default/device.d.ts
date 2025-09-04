#!/usr/bin/env node
export = TuyaAcAcPlugStandardDefaultDevice;
declare class TuyaAcAcPlugStandardDefaultDevice {
    onNodeInit({ zclNode }: {
        zclNode: any;
    }): Promise<void>;
    parseOnoff(value: any): number;
    onDeleted(): Promise<void>;
}
//# sourceMappingURL=device.d.ts.map