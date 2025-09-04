#!/usr/bin/env node
export = TuyaAcIkeaAcPlugStandardDefaultDevice;
declare class TuyaAcIkeaAcPlugStandardDefaultDevice {
    onNodeInit({ zclNode }: {
        zclNode: any;
    }): Promise<void>;
    parseOnoff(value: any): number;
    onDeleted(): Promise<void>;
}
//# sourceMappingURL=device.d.ts.map