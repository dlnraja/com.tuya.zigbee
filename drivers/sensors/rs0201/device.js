const BaseZigbeeDevice = require('../../common/BaseZigbeeDevice');
const { CLUSTER } = require('zigbee-clusters');

class RS0201MotionSensor extends BaseZigbeeDevice {
  
  async onNodeInit({ zclNode }) {
    // Store device model info from memories
    this.deviceModel = 'RS0201';
    this.manufacturerId = '_TZ3000_qaaysllp';
    
    await super.onNodeInit({ zclNode });
    
    // Initialize motion state tracking for enhanced algorithm
    this.motionState = {
      lastMotion: null,
      motionCount: 0,
      resetTimer: null,
      sensitivity: this.getSetting('sensitivity') || 5
    };
    
    this.log('RS0201 Motion Sensor initialized with enhanced algorithms');
  }

  async registerCapabilities() {
    try {
      // Enhanced motion detection with community patches
      await this.registerCapability('alarm_motion', CLUSTER.OCCUPANCY_SENSING, {
        report: 'occupancy',
        reportParser: (value) => this.parseMotionValue(value),
        reportConfig: {
          minInterval: 0,
          maxInterval: 300,
          minChange: 1
        }
      });

      // Enhanced battery reporting with community fix
      await this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
        report: 'batteryPercentageRemaining', 
        reportParser: (value) => this.parseBatteryValue(value),
        reportConfig: {
          minInterval: 1800, // 30 min - optimized based on community feedback
          maxInterval: 7200, // 2 hours
          minChange: 2 // 2% - reduced sensitivity for better battery life
        }
      });

      this.log('Capabilities registered with community optimizations');
      
    } catch (error) {
      this.error('Failed to register capabilities:', error);
    }

  parseMotionValue(value) {
    const isMotion = value === 1;
    
    // Enhanced motion detection algorithm from community patches
    if (isMotion) {
      this.motionState.lastMotion = Date.now();
      this.motionState.motionCount++;
      
      // Clear existing reset timer
      if (this.motionState.resetTimer) {
        clearTimeout(this.motionState.resetTimer);
      }
      
      // Set motion reset based on sensitivity setting
      const resetDelay = Math.max(30, (11 - this.motionState.sensitivity) * 6) * 1000;
      
      this.motionState.resetTimer = setTimeout(() => {
        this.setCapabilityValue('alarm_motion', false);
        this.log('Motion automatically reset after timeout');
      }, resetDelay);
      
      this.log("Motion detected (count: ${this.motionState.motionCount})");
    }
    
    return isMotion;
  }

  parseBatteryValue(value) {
    // Community patch for battery reporting fix
    if (this.getSetting('apply_battery_fix') && value !== null && value !== undefined) {
      // Enhanced battery calculation based on community feedback
      let batteryPercentage = value;
      
      // Handle different battery reporting formats
      if (value > 100) {
        batteryPercentage = Math.min(100, value / 2); // Some devices report 0-200
      } else if (value > 1 && value <= 2) {
        batteryPercentage = value * 50; // Some report 0-2 range
      }
      
      // Ensure valid range
      batteryPercentage = Math.max(0, Math.min(100, Math.round(batteryPercentage)));
      
      this.log("Battery level: ${batteryPercentage}% (raw: ${value})");
      return batteryPercentage;
    }
    
    return Math.max(0, Math.min(100, value || 0));
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('RS0201 settings changed:', changedKeys);
    
    for (const key of changedKeys) {
      switch (key) {
        case 'sensitivity':
          this.motionState.sensitivity = newSettings.sensitivity;
          this.log("Motion sensitivity updated to: ${newSettings.sensitivity}");
          break;
          
        case 'apply_battery_fix':
          this.log("Battery fix ${newSettings.apply_battery_fix ? 'enabled' : 'disabled'}");
          if (newSettings.apply_battery_fix) {
            await this.applyBatteryReportingFix();
          }
          break;
          
        default:
          this.log("Setting ${key} changed to ${newSettings[key]}");
      }
  }

  async applyBatteryReportingFix() {
    // Community patch for improved battery reporting
    try {
      await this.configureAttributeReporting([
        {
          endpointId: 1,
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 1800,
          maxInterval: 7200,
          minChange: 2
        }
      ]);
      this.log('Battery reporting fix applied successfully');
    } catch (error) {
      this.error('Failed to apply battery reporting fix:', error);
    }

  onDeleted() {
    if (this.motionState.resetTimer) {
      clearTimeout(this.motionState.resetTimer);
    }
    this.log('RS0201 Motion Sensor removed and cleaned up');
  }

module.exports = RS0201MotionSensor;
