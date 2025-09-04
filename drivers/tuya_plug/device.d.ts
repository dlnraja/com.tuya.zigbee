interface TuyaPlugSettings {
    polling_interval: number;
    power_threshold: number;
}
export declare class TuyaPlugDevice extends Device {
    private tuyaDevice?;
    private pollingInterval?;
    private status;
    private settings;
    onInit(): Promise<void>;
    private loadSettings;
    private initializeTuyaDevice;
    private connectToDevice;
    private registerCapabilities;
    private setPowerState;
    private syncStatus;
    private handleDeviceUpdate;
    private updateCapabilities;
    private setupPolling;
    onSettings({ newSettings }: {
        newSettings: TuyaPlugSettings;
    }): Promise<boolean>;
    onDeleted(): Promise<any>;
}
export {};
//# sourceMappingURL=device.d.ts.map