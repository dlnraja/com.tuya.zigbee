#!/usr/bin/env node
export = TuyaDevice;
declare class TuyaDevice {
    onNodeInit({ zclNode }: {
        zclNode: any;
    }): Promise<void>;
    configureZigbeeReporting(): Promise<void>;
    registerCapabilities(): Promise<void>;
}
//# sourceMappingURL=device.d.ts.map