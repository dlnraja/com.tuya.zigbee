const TuyaBaseDevice = require('../../../_base/TuyaBaseDevice');

/**
 * Tuya TS0202 Motion Sensor
 * Supports: Motion detection, Luminance, Battery
 */
class TS0202Device extends TuyaBaseDevice {
  
  async onTuyaInit() {
    this.log('Initializing TS0202 Motion sensor');
    
    // Motion detection
    if (this.hasCapability('alarm_motion')) {
      this.registerCapability('alarm_motion', 'ssIasZone', {
        get: 'zoneStatus',
        report: 'zoneStatus',
        reportParser: value => (value & 0x0001) > 0,
        getOpts: {
          getOnStart: true
        }
      });
    }
    
    // Luminance
    if (this.hasCapability('measure_luminance')) {
      this.registerCapability('measure_luminance', 'msIlluminanceMeasurement', {
        get: 'measuredValue',
        report: 'measuredValue',
        reportParser: value => value,
        getOpts: {
          getOnStart: true,
          pollInterval: 300000
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
    
    // Motion timeout setting
    this.motionTimeout = null;
    this.motionResetTime = this.getSetting('motion_reset_time') || 30000; // 30 seconds default
    
    await this.setupReporting();
  }
  
  getDatapointMap() {
    return {
      1: { 
        capability: 'alarm_motion',
        converter: data => {
          const motion = data[0] === 0x01;
          if (motion) {
            this.handleMotionDetected();
          }
          return motion;
        }
      },
      3: { 
        capability: 'measure_battery',
        converter: data => data[0]
      },
      4: { 
        capability: 'measure_luminance',
        converter: data => data.readUInt16BE(0)
      },
      5: { 
        capability: 'motion_sensitivity',
        converter: data => data[0]
      },
      102: { 
        capability: 'detection_delay',
        converter: data => data.readUInt16BE(0)
      }
    };
  }
  
  handleMotionDetected() {
    // Clear existing timeout
    if (this.motionTimeout) {
      clearTimeout(this.motionTimeout);
    }
    
    // Set new timeout to reset motion
    this.motionTimeout = setTimeout(() => {
      this.setCapabilityValue('alarm_motion', false)
        .catch(err => this.error('Failed to reset motion:', err));
    }, this.motionResetTime);
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
      
      this.log('Motion sensor reporting configured');
    } catch (err) {
      this.error('Failed to setup reporting:', err);
    }
  
  isSleepingDevice() {
    return true;
  }
  
  onDeleted() {
    if (this.motionTimeout) {
      clearTimeout(this.motionTimeout);
    }
    super.onDeleted();
  }

module.exports = TS0202Device;
