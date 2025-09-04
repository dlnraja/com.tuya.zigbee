export = LockTuyaUniversalDevice;
declare class LockTuyaUniversalDevice {
    onMeshInit(): Promise<void>;
    setupAdvancedMonitoring(): void;
    setupFlowCards(): void;
    onCapabilityLock(value: any, opts: any): Promise<void>;
    onMeshInitFailed(error: any): Promise<void>;
    healthCheck(): Promise<{
        timestamp: string;
        device_id: any;
        capabilities: any;
        battery_level: any;
        status: string;
    } | {
        status: string;
        error: any;
    }>;
}
//# sourceMappingURL=device.d.ts.map