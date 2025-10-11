'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class MotionTempHumidityIlluminationSensorDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('motion_temp_humidity_illumination_sensor device initialized');

    // Call parent
    await super.onNodeInit({ zclNode });

    // This device uses Tuya custom cluster (0xEF00 / 61184)
    // We need to listen to Tuya datapoint reports instead of standard clusters

    // Get the Tuya cluster
    const tuyaCluster = zclNode.endpoints[1].clusters[61184];
    
    if (tuyaCluster) {
      this.log('✅ Tuya cluster found, setting up datapoint listeners');
      
      // Listen to Tuya datapoint reports
      tuyaCluster.on('response', this._handleTuyaData.bind(this));
      tuyaCluster.on('reporting', this._handleTuyaData.bind(this));
      
      // Request initial data
      try {
        await tuyaCluster.read('dataPoints');
        this.log('✅ Initial data requested');
      } catch (err) {
        this.error('Failed to read initial data:', err);
      }
    }

    // Battery from standard cluster (this usually works)
    if (this.hasCapability('measure_battery')) {
      try {
        this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
          get: 'batteryPercentageRemaining',
          report: 'batteryPercentageRemaining',
          reportParser: value => Math.max(0, Math.min(100, value / 2)),
          getParser: value => Math.max(0, Math.min(100, value / 2))
        });
        this.log('✅ Battery capability registered');
      } catch (err) {
        this.error('Failed to register battery:', err);
      }
    }

    // Mark device as available
    await this.setAvailable();
  }

  /**
   * Handle Tuya datapoint reports
   * Based on Zigbee2MQTT converter for ZG-204ZV
   */
  _handleTuyaData(data) {
    this.log('Tuya data received:', JSON.stringify(data));
    
    if (!data || !data.dataPoints) return;
    
    // Tuya datapoints for ZG-204ZV:
    // DP 1: motion (bool)
    // DP 2: battery (0-100)
    // DP 4: temperature (int, divide by 10)
    // DP 5: humidity (int)
    // DP 9: illuminance (int, lux)
    
    Object.entries(data.dataPoints).forEach(([dp, value]) => {
      this.log(`Processing DP ${dp}:`, value);
      
      switch(parseInt(dp)) {
        case 1: // Motion
          if (this.hasCapability('alarm_motion')) {
            this.setCapabilityValue('alarm_motion', value === true || value === 1).catch(this.error);
            this.log('✅ Motion:', value);
          }
          break;
          
        case 2: // Battery
          if (this.hasCapability('measure_battery')) {
            const battery = Math.max(0, Math.min(100, parseInt(value)));
            this.setCapabilityValue('measure_battery', battery).catch(this.error);
            this.log('✅ Battery:', battery + '%');
          }
          break;
          
        case 4: // Temperature
          if (this.hasCapability('measure_temperature')) {
            const temp = parseInt(value) / 10;
            this.setCapabilityValue('measure_temperature', temp).catch(this.error);
            this.log('✅ Temperature:', temp + '°C');
          }
          break;
          
        case 5: // Humidity
          if (this.hasCapability('measure_humidity')) {
            const humidity = Math.max(0, Math.min(100, parseInt(value)));
            this.setCapabilityValue('measure_humidity', humidity).catch(this.error);
            this.log('✅ Humidity:', humidity + '%');
          }
          break;
          
        case 9: // Illuminance (lux)
          if (this.hasCapability('measure_luminance')) {
            const lux = parseInt(value);
            this.setCapabilityValue('measure_luminance', lux).catch(this.error);
            this.log('✅ Luminance:', lux + ' lux');
          }
          break;
          
        default:
          this.log(`Unknown datapoint ${dp}:`, value);
      }
    });
  }

  async onDeleted() {
    this.log('motion_temp_humidity_illumination_sensor device deleted');
  }

}

module.exports = MotionTempHumidityIlluminationSensorDevice;
