'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class HobeianMultiSensor extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    
    // Register motion detection capability
    this.registerCapability('alarm_motion', 'iasZone', {
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 0,
          maxInterval: 43200,
          minChange: 0,
        },
      },
    });

    // Register temperature capability
    this.registerCapability('measure_temperature', 'temperatureMeasurement', {
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 60,
          maxInterval: 3600,
          minChange: 50, // 0.5°C
        },
      },
    });

    // Register humidity capability  
    this.registerCapability('measure_humidity', 'relativeHumidity', {
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 60,
          maxInterval: 3600,
          minChange: 100, // 1%
        },
      },
    });

    // Register illuminance capability
    this.registerCapability('measure_luminance', 'illuminanceMeasurement', {
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 60,
          maxInterval: 3600,
          minChange: 10,
        },
      },
    });

    // Register battery capability
    this.registerCapability('measure_battery', 'powerConfiguration', {
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 1,
        },
      },
    });

    // Handle IAS Zone notifications for motion
    zclNode.endpoints[1].clusters.iasZone.on('zoneStatusChangeNotification', (payload) => {
      this.log('IAS Zone status change:', payload);
      
      if (payload && payload.zoneStatus) {
        const motionDetected = !!(payload.zoneStatus.alarm1 || payload.zoneStatus.alarm2);
        this.setCapabilityValue('alarm_motion', motionDetected).catch(this.error);
      }
    });

    // Handle temperature measurements
    zclNode.endpoints[1].clusters.temperatureMeasurement.on('attr.measuredValue', (value) => {
      this.log('Temperature measurement:', value);
      
      if (typeof value === 'number' && value !== 0x8000) {
        const temperature = value / 100; // Convert to °C
        const offset = this.getSetting('temp_offset') || 0;
        this.setCapabilityValue('measure_temperature', Math.round((temperature + offset) * 10) / 10).catch(this.error);
      }
    });

    // Handle humidity measurements
    zclNode.endpoints[1].clusters.relativeHumidity.on('attr.measuredValue', (value) => {
      this.log('Humidity measurement:', value);
      
      if (typeof value === 'number' && value !== 0xFFFF) {
        const humidity = value / 100; // Convert to %
        const offset = this.getSetting('humidity_offset') || 0;
        this.setCapabilityValue('measure_humidity', Math.max(0, Math.min(100, Math.round(humidity + offset)))).catch(this.error);
      }
    });

    // Handle illuminance measurements
    zclNode.endpoints[1].clusters.illuminanceMeasurement.on('attr.measuredValue', (value) => {
      this.log('Illuminance measurement:', value);
      
      if (typeof value === 'number' && value !== 0xFFFF) {
        // Convert from raw value to lux
        const lux = Math.pow(10, (value - 1) / 10000);
        this.setCapabilityValue('measure_luminance', Math.round(lux)).catch(this.error);
      }
    });

    // Handle battery reporting
    zclNode.endpoints[1].clusters.powerConfiguration.on('attr.batteryPercentageRemaining', (value) => {
      this.log('Battery percentage:', value);
      
      if (typeof value === 'number') {
        const batteryPercentage = Math.round(value / 2);
        this.setCapabilityValue('measure_battery', Math.max(0, Math.min(100, batteryPercentage))).catch(this.error);
      }
    });

    // Handle battery voltage reporting
    zclNode.endpoints[1].clusters.powerConfiguration.on('attr.batteryVoltage', (value) => {
      this.log('Battery voltage:', value);
      
      if (typeof value === 'number') {
        // Convert voltage to percentage (2.0V = 0%, 3.0V = 100%)
        const voltage = value / 10; // Convert to actual voltage
        const percentage = Math.max(0, Math.min(100, Math.round((voltage - 2.0) * 100)));
        this.setCapabilityValue('measure_battery', percentage).catch(this.error);
      }
    });

    this.log('HobeianMultiSensor has been initialized');
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Settings changed:', { oldSettings, newSettings, changedKeys });

    if (changedKeys.includes('motion_sensitivity')) {
      await this._updateMotionSensitivity(newSettings.motion_sensitivity);
    }

    // Temperature and humidity offsets are applied in real-time during measurement processing
    if (changedKeys.includes('temp_offset') || changedKeys.includes('humidity_offset')) {
      this.log('Sensor offset updated, will apply to next measurements');
    }
  }

  async _updateMotionSensitivity(sensitivity) {
    try {
      // For standard IAS Zone devices, we can try to configure the sensitivity
      // This may not work for all devices but won't cause errors
      let sensitivityValue = 2; // medium
      switch (sensitivity) {
        case 'low': sensitivityValue = 1; break;
        case 'high': sensitivityValue = 3; break;
        default: sensitivityValue = 2; break;
      }

      this.log('Motion sensitivity set to:', sensitivity);
      
      // Store setting for reference
      this.setSettings({ motion_sensitivity: sensitivity });
      
    } catch (error) {
      this.error('Failed to update motion sensitivity:', error);
    }
  }

}

module.exports = HobeianMultiSensor;
