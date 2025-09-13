
/**
 * Universal Fallback Driver
 * Handles unknown Zigbee devices with basic functionality
 */

const { ZigBeeDevice } = require('homey-zigbeedriver');

class UniversalFallbackDevice extends ZigBeeDevice {
    async onNodeInit() {
        await super.onNodeInit();
        
        // Auto-detect capabilities based on available clusters
        await this.autoDetectCapabilities();
        
        // Set up basic functionality
        await this.setupBasicControls();
    }
    
    async autoDetectCapabilities() {
        const clusters = this.getClusterKeys();
        const capabilities = [];
        
        if (clusters.includes('onOff')) capabilities.push('onoff');
        if (clusters.includes('levelControl')) capabilities.push('dim');
        if (clusters.includes('colorControl')) capabilities.push('light_hue', 'light_saturation');
        if (clusters.includes('temperatureMeasurement')) capabilities.push('measure_temperature');
        
        // Add detected capabilities
        for (const capability of capabilities) {
            if (!this.hasCapability(capability)) {
                await this.addCapability(capability);
            }
        }
    }
}

module.exports = UniversalFallbackDevice;
