'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TuyaSoilSensorDevice extends ZigBeeDevice {

  async onNodeInit() {
    this.log('TuyaSoilSensorDevice has been initialized');

    // Register capabilities
    this.registerCapability('measure_humidity', 'msRelativeHumidity');
    this.registerCapability('measure_temperature', 'msTemperatureMeasurement');
    this.registerCapability('measure_battery', 'genPowerCfg');
    this.registerCapability('alarm_battery', 'genPowerCfg');

    // Register Tuya cluster for EF00 datapoints
    this.registerCluster('manuSpecificTuya', {
      onDataReport: (data) => {
        this.log('Tuya cluster data:', data);
        this.handleTuyaDataPoint(data);
      }
    });

    // Configure reporting
    this.configureAttributeReporting([
      {
        endpointId: 1,
        cluster: 'msTemperatureMeasurement',
        attributeName: 'measuredValue',
        minInterval: 300,
        maxInterval: 3600,
        minChange: 50
      },
      {
        endpointId: 1,
        cluster: 'msRelativeHumidity', 
        attributeName: 'measuredValue',
        minInterval: 300,
        maxInterval: 3600,
        minChange: 500
      }
    ]).catch(err => {
      this.log('Failed to configure attribute reporting:', err);
    });
  }

  handleTuyaDataPoint(data) {
    const { dp, value, datatype } = data;
    
    switch (dp) {
      case 1: // Soil moisture
        if (typeof value === 'number') {
          const moistureOffset = this.getSetting('moisture_offset') || 0;
          const adjustedValue = Math.max(0, Math.min(100, value + moistureOffset));
          this.setCapabilityValue('measure_humidity', adjustedValue).catch(this.error);
          this.log('Soil moisture updated:', adjustedValue);
        }
        break;
        
      case 2: // Soil temperature  
        if (typeof value === 'number') {
          const tempOffset = this.getSetting('temperature_offset') || 0;
          const adjustedTemp = (value / 10) + tempOffset;
          this.setCapabilityValue('measure_temperature', adjustedTemp).catch(this.error);
          this.log('Soil temperature updated:', adjustedTemp);
        }
        break;
        
      case 101: // Battery percentage
        if (typeof value === 'number') {
          this.setCapabilityValue('measure_battery', value).catch(this.error);
          this.setCapabilityValue('alarm_battery', value < 15).catch(this.error);
          this.log('Battery updated:', value);
        }
        break;
        
      default:
        this.log('Unknown datapoint:', dp, value);
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Settings changed:', changedKeys);
    
    // Trigger recalculation of offset values
    if (changedKeys.includes('moisture_offset') || changedKeys.includes('temperature_offset')) {
      // Force a refresh of current values with new offsets
      const currentMoisture = this.getCapabilityValue('measure_humidity');
      const currentTemp = this.getCapabilityValue('measure_temperature');
      
      if (currentMoisture !== null && changedKeys.includes('moisture_offset')) {
        const moistureOffset = newSettings.moisture_offset - oldSettings.moisture_offset;
        const newMoisture = Math.max(0, Math.min(100, currentMoisture + moistureOffset));
        await this.setCapabilityValue('measure_humidity', newMoisture);
      }
      
      if (currentTemp !== null && changedKeys.includes('temperature_offset')) {
        const tempOffset = newSettings.temperature_offset - oldSettings.temperature_offset;
        await this.setCapabilityValue('measure_temperature', currentTemp + tempOffset);
      }
    }
  }

}

module.exports = TuyaSoilSensorDevice;
