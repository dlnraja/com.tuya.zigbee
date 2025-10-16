'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const IASZoneEnroller = require('../../lib/IASZoneEnroller');
// Tuya cluster handler removed - using standard Zigbee clusters only

class MotionTempHumidityIlluminationSensorDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('motion_temp_humidity_illumination_sensor device initialized');
    
    this.log('=== DEVICE DEBUG INFO ===');
    this.log('Node:', zclNode ? 'available' : 'undefined');
    this.log('Endpoints:', Object.keys(zclNode?.endpoints || {}));
    
    const endpoint = zclNode.endpoints[1];
    if (endpoint) {
      const clusters = Object.keys(endpoint.clusters || {}).map(c => {
        const cluster = endpoint.clusters[c];
        return `${c} (0x${cluster?.id?.toString(16) || 'NaN'})`;
      }).join(', ');
      this.log('Endpoint 1 clusters:', clusters);
    }
    this.log('========================');

    // Register standard Zigbee clusters
    this.log('Registering standard Zigbee clusters...');
      
      // Temperature (cluster 1026)
      this.registerCapability('measure_temperature', 1026, {
        get: 'measuredValue',
        report: 'measuredValue',
        getOpts: {
          getOnStart: true
        },
        reportParser: value => {
          this.log('Temperature:', value / 100);
          return value / 100;
        }
      });
      this.log('✅ Temperature cluster registered');
      
      // Humidity (cluster 1029)
      this.registerCapability('measure_humidity', 1029, {
        get: 'measuredValue',
        report: 'measuredValue',
        getOpts: {
          getOnStart: true
        },
        reportParser: value => {
          this.log('Humidity:', value / 100);
          return value / 100;
        }
      });
      this.log('✅ Humidity cluster registered');
      
      // Illuminance (cluster 1024)
      this.registerCapability('measure_luminance', 1024, {
        get: 'measuredValue',
        report: 'measuredValue',
        getOpts: {
          getOnStart: true
        },
        reportParser: value => {
          this.log('Illuminance:', Math.pow(10, (value - 1) / 10000));
          return Math.pow(10, (value - 1) / 10000);
        }
      });
      this.log('✅ Illuminance cluster registered');
      
      // Motion IAS Zone
      this.log('🚶 Setting up Motion IAS Zone...');
      try {
        const endpoint = zclNode.endpoints[1];
        const enroller = new IASZoneEnroller(this, endpoint, {
          zoneType: 13, // Motion sensor
          capability: 'alarm_motion',
          pollInterval: 60000,
          autoResetTimeout: 60000 // Auto-reset after 60s
        });
        const method = await enroller.enroll(zclNode);
        this.log(`✅ Motion IAS Zone enrolled via: ${method}`);
      } catch (err) {
        this.error('IAS Zone enrollment failed:', err);
        this.log('⚠️ Device may auto-enroll or work without explicit enrollment');
      }
      
      // Battery
      this.registerCapability('measure_battery', 1, {
        get: 'batteryPercentageRemaining',
        report: 'batteryPercentageRemaining',
        getOpts: {
          getOnStart: true
        },
        reportParser: value => {
          this.log('Battery raw value:', value);
          return value / 2;
        }
      });
      this.log('✅ Battery capability registered');

    await this.setAvailable();
  }

}

module.exports = MotionTempHumidityIlluminationSensorDevice;
