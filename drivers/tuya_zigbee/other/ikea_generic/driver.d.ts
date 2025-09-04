#!/usr/bin/env node
export = IkeaGenericDriver;
declare class IkeaGenericDriver {
    onNodeInit({ zclNode, node }: {
        zclNode: any;
        node: any;
    }): Promise<void>;
    discoverDeviceType(zclNode: any): Promise<void>;
    determineDeviceType(clusters: any): "switch" | "dimmable_light" | "temperature_sensor" | "humidity_sensor" | "motion_sensor" | "generic_device";
    configureDeviceIntelligently(zclNode: any, deviceType: any): Promise<void>;
    configureDimmableLight(zclNode: any): Promise<void>;
    configureSwitch(zclNode: any): Promise<void>;
    configureTemperatureSensor(zclNode: any): Promise<void>;
    configureHumiditySensor(zclNode: any): Promise<void>;
    configureMotionSensor(zclNode: any): Promise<void>;
    configureGenericDevice(zclNode: any): Promise<void>;
    onSettings(oldSettings: any, newSettings: any, changedKeys: any): Promise<any>;
}
//# sourceMappingURL=driver.d.ts.map