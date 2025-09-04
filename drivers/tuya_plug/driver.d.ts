export declare class TuyaPlugDriver extends Driver {
    onInit(): Promise<void>;
    onPair(session: any): Promise<void>;
    onPairListDevices(): Promise<never[]>;
    onRepair(session: any, device: any): Promise<void>;
    onUninit(): Promise<void>;
}
//# sourceMappingURL=driver.d.ts.map