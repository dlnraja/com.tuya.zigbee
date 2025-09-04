#!/usr/bin/env node
export = TuyaAcAqaraAcPlugDevice;
declare class TuyaAcAqaraAcPlugDevice {
    onNodeInit({ zclNode }: {
        zclNode: any;
    }): Promise<void>;
    parseOnoff(value: any): number;
    onDeleted(): Promise<void>;
}
//# sourceMappingURL=device.d.ts.map