export = TuyaPlugUniversalDevice;
declare class TuyaPlugUniversalDevice {
    onMeshInit(): Promise<void>;
    setupAdvancedMonitoring(): void;
    setupFlowCards(): void;
    onCapabilityOnoff(value: any, opts: any): Promise<void>;
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