#!/usr/bin/env node
export = GenericSwitchDevice;
declare class GenericSwitchDevice {
    onNodeInit({ zclNode }: {
        zclNode: any;
    }): Promise<void>;
    parseOnoff(value: any): number;
}
//# sourceMappingURL=device.d.ts.map