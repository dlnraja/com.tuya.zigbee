export = TuyaDeviceTemplate;
declare class TuyaDeviceTemplate {
    onMeshInit(): Promise<void>;
    registerCapabilities(): void;
    setupMonitoring(): void;
    setupFlowCards(): void;
    onMeshInitFailed(error: any): Promise<void>;
}
//# sourceMappingURL=device.d.ts.map