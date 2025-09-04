#!/usr/bin/env node
export = TuyaSwitchTs0001Device;
declare class TuyaSwitchTs0001Device {
    onNodeInit({ zclNode }: {
        zclNode: any;
    }): Promise<void>;
    parseOnoff(value: any): number;
    onDeleted(): Promise<void>;
}
//# sourceMappingURL=device.d.ts.map