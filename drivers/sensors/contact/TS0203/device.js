const TuyaBaseDevice = require('../../../_base/TuyaBaseDevice');

/**
 * Tuya TS0203 Contact Sensor (Door/Window)
 * Supports: Contact detection, Battery
 */
class TS0203Device extends TuyaBaseDevice {
  
  async onTuyaInit() {
    this.log('Initializing TS0203 Contact sensor');
    
    // Contact alarm
    if (this.hasCapability('alarm_contact')) {
      this.registerCapability('alarm_contact', 'ssIasZone', {
        get: 'zoneStatus',
        report: 'zoneStatus',
        reportParser: value => (value & 0x0001) === 0,
        getOpts: {
          getOnStart: true
        }
      });
    }
    
    // Battery
    if (this.hasCapability('measure_battery')) {
      this.registerCapability('measure_battery', 'genPowerCfg', {
        get: 'batteryPercentageRemaining',
        report: 'batteryPercentageRemaining',
        reportParser: value => value / 2,
        getOpts: {
          getOnStart: true,
          pollInterval: 3600000
        }
      });
    }
    
    // Tamper alarm
    if (this.hasCapability('alarm_tamper')) {
      this.registerCapability('alarm_tamper', 'ssIasZone', {
        get: 'zoneStatus',
        report: 'zoneStatus',
        reportParser: value => (value & 0x0004) > 0
      });
    }
    
    await this.setupReporting();
  }
  
  getDatapointMap() {
    return {
      1: { 
        capability: 'alarm_contact',
        converter: data => data[0] === 0x00
      },
      3: { 
        capability: 'measure_battery',
        converter: data => data[0]
      },
      4: {
        capability: 'alarm_battery',
        converter: data => data[0] < 20
      }
    };
  }
  
  async setupReporting() {
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'ssIasZone',
          attributeName: 'zoneStatus',
          minInterval: 0,
          maxInterval: 3600,
          minChange: 1
        },
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 21600,
          minChange: 2
        }
      ]);
      
      this.log('Contact sensor reporting configured');
    } catch (err) {
      this.error('Failed to setup reporting:', err);
    }
  }
  
  isSleepingDevice() {
    return true;
  }
}

module.exports = TS0203Device;
