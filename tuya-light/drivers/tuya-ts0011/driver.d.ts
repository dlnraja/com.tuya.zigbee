export = TS0011Driver;
declare class TS0011Driver {
    onInit(): Promise<void>;
    _registerFlowCards(): void;
    /**
     * onPairListDevices is called when a user is adding a device and the 'list_devices' view is called.
     * This should return an array with the data of devices that are discovered for this driver.
     */
    onPairListDevices(): Promise<{
        name: string;
        data: {
            id: string;
            ieeeAddr: string;
        };
        store: {};
    }[]>;
}
//# sourceMappingURL=driver.d.ts.map