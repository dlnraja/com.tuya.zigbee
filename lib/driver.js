'use strict';

/**
 * Enhanced function/class
 */
class Driver {
    constructor() {
        this.capabilities = [];
        this.clusters = [];
        this.settings = {};
    }
    
    addCapability(capability) {
        this.capabilities.push(capability);
        return this;
    }
    
    addCluster(cluster) {
        this.clusters.push(cluster);
        return this;
    }
    
    addSetting(key, setting) {
        this.settings[key] = setting;
        return this;
    }
    
    generateConfig() {
        return {
            capabilities: this.capabilities,
            clusters: this.clusters,
            settings: this.settings
        };
    }
}

module.exports = Driver;