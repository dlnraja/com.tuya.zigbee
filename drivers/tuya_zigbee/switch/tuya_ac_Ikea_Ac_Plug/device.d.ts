#!/usr/bin/env node
export = TuyaAcIkeaAcPlugDevice;
declare class TuyaAcIkeaAcPlugDevice {
    onNodeInit({ zclNode }: {
        zclNode: any;
    }): Promise<void>;
    parseOnoff(value: any): number;
    onDeleted(): Promise<void>;
}
//# sourceMappingURL=device.d.ts.map