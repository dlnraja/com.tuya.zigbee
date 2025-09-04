#!/usr/bin/env node
export = GenericSensorDevice;
declare class GenericSensorDevice {
    onNodeInit({ zclNode }: {
        zclNode: any;
    }): Promise<void>;
    parseMeasureTemperature(value: any): number;
    parseMeasureHumidity(value: any): number;
    parseMeasurePressure(value: any): number;
    parseMeasureLuminance(value: any): number;
}
//# sourceMappingURL=device.d.ts.map