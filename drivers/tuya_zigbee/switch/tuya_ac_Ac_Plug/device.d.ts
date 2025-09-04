#!/usr/bin/env node
export = TuyaAcAcPlugDevice;
declare class TuyaAcAcPlugDevice {
    onNodeInit({ zclNode }: {
        zclNode: any;
    }): Promise<void>;
    parseOnoff(value: any): number;
    onDeleted(): Promise<void>;
}
//# sourceMappingURL=device.d.ts.map