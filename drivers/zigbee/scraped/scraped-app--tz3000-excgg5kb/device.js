'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

class ScrapedDevice extends ZigbeeDevice {
    async onMeshInit() {
        await super.onMeshInit();
        
        this.log('Scraped device initialized:', this.getData());
        
        // Configuration basée sur les capacités scrapées
        this.configureCapabilities();
    }
    
    configureCapabilities() {
        if (this.hasCapability('onoff')) {
            this.registerCapability('onoff', 'genOnOff');
        }
        
        if (this.hasCapability('measure_power')) {
            this.registerCapability('measure_power', 'genPowerCfg', {
                get: 'instantaneousDemand',
                report: 'instantaneousDemand',
                reportParser: (value) => value / 1000
            });
        }
        
        if (this.hasCapability('measure_voltage')) {
            this.registerCapability('measure_voltage', 'genPowerCfg', {
                get: 'rmsVoltage',
                report: 'rmsVoltage',
                reportParser: (value) => value / 10
            });
        }
        
        if (this.hasCapability('measure_current')) {
            this.registerCapability('measure_current', 'genPowerCfg', {
                get: 'rmsCurrent',
                report: 'rmsCurrent',
                reportParser: (value) => value / 1000
            });
        }
    }
}

module.exports = ScrapedDevice;