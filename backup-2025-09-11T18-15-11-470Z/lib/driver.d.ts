export = Driver;
declare class Driver {
    capabilities: any[];
    clusters: any[];
    settings: {};
    addCapability(capability: any): this;
    addCluster(cluster: any): this;
    addSetting(key: any, setting: any): this;
    generateConfig(): {
        capabilities: any[];
        clusters: any[];
        settings: {};
    };
}
//# sourceMappingURL=driver.d.ts.map