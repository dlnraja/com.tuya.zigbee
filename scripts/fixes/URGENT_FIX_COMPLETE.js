const fs = require('fs');
const path = require('path');

console.log('🚨 URGENT FIX - COMPLETE DEVICE RESTORATION\n');

// Template COMPLET avec TOUTES les capabilities
const motionComplete = `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const TuyaClusterHandler = require('../../utils/tuya-cluster-handler');
const IASZoneEnroller = require('../../lib/IASZoneEnroller');

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
        return \`\${c} (0x\${cluster?.id?.toString(16) || 'NaN'})\`;
      }).join(', ');
      this.log('Endpoint 1 clusters:', clusters);
    }
    this.log('========================');

    // Try Tuya cluster first
    const deviceType = TuyaClusterHandler.detectDeviceType('motion_temp_humidity_illumination_multi_battery');
    const tuyaInitialized = await TuyaClusterHandler.init(this, zclNode, deviceType);
    
    if (tuyaInitialized) {
      this.log('✅ Tuya cluster initialized');
    } else {
      this.log('⚠️ No Tuya cluster found, using standard Zigbee clusters');
      this.log('Registering standard Zigbee clusters...');
      
      // Temperature
      this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT, {
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
      
      // Humidity
      this.registerCapability('measure_humidity', CLUSTER.RELATIVE_HUMIDITY, {
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
      
      // Illuminance
      this.registerCapability('measure_luminance', CLUSTER.ILLUMINANCE_MEASUREMENT, {
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
        await IASZoneEnroller.enroll(this, zclNode);
        
        this.registerCapability('alarm_motion', CLUSTER.IAS_ZONE, {
          get: 'zoneStatus',
          report: 'zoneStatus',
          reportParser: value => {
            this.log('Motion IAS Zone status:', value);
            return value.alarm1;
          }
        });
        
        // Listen for zone status change notifications
        zclNode.endpoints[1].clusters.iasZone.on('zoneStatusChangeNotification', data => {
          this.log('Motion detected! Zone status:', data);
          this.setCapabilityValue('alarm_motion', data.zoneStatus.alarm1).catch(this.error);
        });
        
        this.log('✅ Motion IAS Zone registered with notification listener');
      } catch (err) {
        this.error('IAS Zone enrollment failed:', err);
        this.log('Device may auto-enroll or require manual pairing');
        
        // Still register the capability
        this.registerCapability('alarm_motion', CLUSTER.IAS_ZONE, {
          get: 'zoneStatus',
          report: 'zoneStatus',
          reportParser: value => {
            return value.alarm1;
          }
        });
        this.log('✅ Motion IAS Zone registered with notification listener');
      }
      
      // Battery
      this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
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
    }

    await this.setAvailable();
  }

}

module.exports = MotionTempHumidityIlluminationSensorDevice;
`;

const sosComplete = `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const IASZoneEnroller = require('../../lib/IASZoneEnroller');

class SOSEmergencyButtonDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('sos_emergency_button_cr2032 initialized');

    // Battery
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
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
    
    // SOS Button IAS Zone
    this.log('🚨 Setting up SOS button IAS Zone...');
    try {
      await IASZoneEnroller.enroll(this, zclNode);
    } catch (err) {
      this.error('IAS Zone enrollment failed:', err);
      this.log('⚠️ Cannot get Homey IEEE, device may auto-enroll');
    }
    
    this.registerCapability('alarm_generic', CLUSTER.IAS_ZONE, {
      get: 'zoneStatus',
      report: 'zoneStatus',
      reportParser: value => {
        this.log('🚨 SOS Button zone status:', value);
        return value.alarm1;
      }
    });
    
    // Listen for zone status change notifications
    if (zclNode.endpoints[1] && zclNode.endpoints[1].clusters.iasZone) {
      zclNode.endpoints[1].clusters.iasZone.on('zoneStatusChangeNotification', data => {
        this.log('🚨 SOS BUTTON PRESSED! Zone status:', data);
        this.setCapabilityValue('alarm_generic', data.zoneStatus.alarm1).catch(this.error);
      });
    }
    
    this.log('✅ SOS Button IAS Zone registered');

    await this.setAvailable();
  }

}

module.exports = SOSEmergencyButtonDevice;
`;

// Fix motion sensor
const motionPath = path.join(__dirname, 'drivers', 'motion_temp_humidity_illumination_multi_battery', 'device.js');
fs.writeFileSync(motionPath, motionComplete);
console.log('✅ COMPLETE FIX: motion_temp_humidity_illumination_multi_battery/device.js');

// Fix SOS button
const sosPath = path.join(__dirname, 'drivers', 'sos_emergency_button_cr2032', 'device.js');
fs.writeFileSync(sosPath, sosComplete);
console.log('✅ COMPLETE FIX: sos_emergency_button_cr2032/device.js');

console.log('\n🎉 ALL CAPABILITIES RESTORED WITH PARSERS!\n');
