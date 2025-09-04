#!/usr/bin/env node
export = TuyaAcAqaraAcPlugStandardDefaultDevice;
declare class TuyaAcAqaraAcPlugStandardDefaultDevice {
    onNodeInit({ zclNode }: {
        zclNode: any;
    }): Promise<void>;
    parseOnoff(value: any): number;
    onDeleted(): Promise<void>;
}
//# sourceMappingURL=device.d.ts.map