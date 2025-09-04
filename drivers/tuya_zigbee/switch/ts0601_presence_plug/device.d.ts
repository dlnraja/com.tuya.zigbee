#!/usr/bin/env node
export = Ts0601PresencePlugDevice;
declare class Ts0601PresencePlugDevice {
    onNodeInit({ zclNode }: {
        zclNode: any;
    }): Promise<void>;
    parseOnoff(value: any): number;
    onDeleted(): Promise<void>;
}
//# sourceMappingURL=device.d.ts.map