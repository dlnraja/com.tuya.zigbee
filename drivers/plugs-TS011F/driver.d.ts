export = TuyaTS011FDriver;
declare class TuyaTS011FDriver {
    onInit(): Promise<void>;
    _registerFlowCards(): void;
    triggerDeviceOn: any;
    triggerDeviceOff: any;
    conditionDeviceOn: any;
    actionToggleDevice: any;
    onPairListDevices(): Promise<never[]>;
    onPair(session: any): Promise<void>;
}
//# sourceMappingURL=driver.d.ts.map