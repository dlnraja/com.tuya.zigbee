'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TuyaPresenceIlluminanceSensor extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    
    // Register capabilities
    this.registerCapability('alarm_motion', 'iasZone', {
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 0,
          maxInterval: 43200,
          minChange: 0,
        },
      },
    });

    this.registerCapability('measure_luminance', 'illuminanceMeasurement', {
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 60,
          maxInterval: 3600,
          minChange: 10,
        },
      },
    });

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

    // Handle Tuya specific data points for TS0601 devices
    if (zclNode.endpoints[1].clusters.tuya) {
      zclNode.endpoints[1].clusters.tuya.on('response', (data) => {
        this.log('Tuya cluster response:', data);
        this._handleTuyaData(data);
      });
    }

    this.log('TuyaPresenceIlluminanceSensor has been initialized');
  }

  _handleTuyaData(data) {
    if (!data || !data.datapoints) return;

    data.datapoints.forEach(dp => {
      this.log('Processing Tuya datapoint:', dp);
      
      switch (dp.dp) {
        case 1: // Motion detection
          if (typeof dp.data === 'boolean') {
            this.setCapabilityValue('alarm_motion', dp.data).catch(this.error);
          }
          break;
        case 2: // Illuminance
          if (typeof dp.data === 'number') {
            this.setCapabilityValue('measure_luminance', dp.data).catch(this.error);
          }
          break;
        case 3: // Sensitivity setting
          this.log('Motion sensitivity setting:', dp.data);
          break;
        case 101: // Battery level
          if (typeof dp.data === 'number') {
            this.setCapabilityValue('measure_battery', Math.max(0, Math.min(100, dp.data))).catch(this.error);
          }
          break;
        default:
          this.log('Unknown Tuya datapoint:', dp.dp, dp.data);
      }
    });
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Settings changed:', { oldSettings, newSettings, changedKeys });

    if (changedKeys.includes('sensitivity')) {
      await this._updateMotionSensitivity(newSettings.sensitivity);
    }

    if (changedKeys.includes('illuminance_reporting')) {
      await this._updateIlluminanceReporting(newSettings.illuminance_reporting);
    }
  }

  async _updateMotionSensitivity(sensitivity) {
    try {
      let sensitivityValue = 2; // medium
      switch (sensitivity) {
        case 'low': sensitivityValue = 1; break;
        case 'high': sensitivityValue = 3; break;
        default: sensitivityValue = 2; break;
      }

      // Send Tuya command to update sensitivity
      if (this.zclNode.endpoints[1].clusters.tuya) {
        await this.zclNode.endpoints[1].clusters.tuya.sendData({
          dp: 3,
          datatype: 4, // enum
          data: sensitivityValue
        });
      }
    } catch (error) {
      this.error('Failed to update motion sensitivity:', error);
    }
  }

  async _updateIlluminanceReporting(interval) {
    try {
      await this.configureAttributeReporting([{
        endpointId: 1,
        cluster: 'illuminanceMeasurement',
        attributeName: 'measuredValue',
        minInterval: Math.max(60, interval),
        maxInterval: Math.max(3600, interval * 2),
        minChange: 10,
      }]);
    } catch (error) {
      this.error('Failed to update illuminance reporting:', error);
    }
  }

}

module.exports = TuyaPresenceIlluminanceSensor;
