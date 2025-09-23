'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class AirQualityDevice extends ZigBeeDevice {
    async onNodeInit() {
        this.enableDebug();
        this.printNode();
        
        // Register capabilities with proper clusters (SDK3)
        this.registerCapability('measure_pm25', 'CLUSTER_TUYA_SPECIFIC', {
            reportOpts: {
                configureAttributeReporting: {
                    minInterval: 300,
                    maxInterval: 3600,
                    minChange: 1
                }
            }
        });
        
        this.registerCapability('measure_temperature', 'CLUSTER_TUYA_SPECIFIC', {
            reportOpts: {
                configureAttributeReporting: {
                    minInterval: 300,
                    maxInterval: 3600, 
                    minChange: 0.5
                }
            }
        });
        
        this.registerCapability('measure_humidity', 'CLUSTER_TUYA_SPECIFIC', {
            reportOpts: {
                configureAttributeReporting: {
                    minInterval: 300,
                    maxInterval: 3600,
                    minChange: 1
                }
            }
        });
        
        this.registerCapability('measure_co2', 'CLUSTER_TUYA_SPECIFIC');
        this.registerCapability('measure_battery', 'genPowerCfg');
        this.registerCapability('alarm_battery', 'genPowerCfg');
        
        // Tuya specific data parsing
        this.registerTuyaCapabilityListener('CLUSTER_TUYA_SPECIFIC', (data) => {
            this.log('Tuya data received:', data);
            
            switch(data.dp) {
                case 1: // PM2.5
                    if (data.datatype === 2 && typeof data.data === 'number') {
                        this.setCapabilityValue('measure_pm25', data.data).catch(this.error);
                    }
                    break;
                case 2: // Temperature  
                    if (data.datatype === 2 && typeof data.data === 'number') {
                        this.setCapabilityValue('measure_temperature', data.data / 10).catch(this.error);
                    }
                    break;
                case 3: // Humidity
                    if (data.datatype === 2 && typeof data.data === 'number') {
                        this.setCapabilityValue('measure_humidity', data.data).catch(this.error);
                    }
                    break;
                case 4: // CO2
                    if (data.datatype === 2 && typeof data.data === 'number') {
                        this.setCapabilityValue('measure_co2', data.data).catch(this.error);
                    }
                    break;
            }
        });
        
        this.log('Air Quality Monitor initialized');
    }
}

module.exports = AirQualityDevice;