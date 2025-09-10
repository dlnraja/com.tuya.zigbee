const TuyaZigbeeMultiSensorDevice = require('../../templates/multi-sensor-device');
const { Cluster, CLUSTER } = require("zigbee-clusters");
const { wait } = require('homey-zigbeedriver/lib/util');

// Constants
const MOTION_RESET_DEFAULT = 60; // seconds
const TEMPERATURE_OFFSET_DEFAULT = 0;
const MOTION_TIMEOUT_MS = 60 * 1000; // 1 minute

/**
 * TS0601 Motion Sensor Device
 * @extends TuyaZigbeeMultiSensorDevice
 */
class TS0601MotionSensorDevice extends BaseZigbeeDevice {
  
  /**
   * Device initialization
   */
  async onNodeInit({ zclNode, node }) {
    await super.onNodeInit({ zclNode, node });
    
    // Register capability listeners
    this.registerCapabilityListeners();
    
    // Apply device-specific configuration
    await this.applyDeviceConfiguration();
    
    // Initial device sync
    await this.syncDeviceState();
    
    // Set up periodic polling
    this.setupPolling();
  }
  
  /**
   * Register capability listeners
   */
  registerCapabilityListeners() {
    // Listen for settings changes
    this.registerSetting('motion_reset', this.onMotionResetSettingChanged.bind(this));
    this.registerSetting('temperature_offset', this.onTemperatureOffsetChanged.bind(this));
    
    // Listen for capability changes
    this.registerCapabilityListener('alarm_motion', this.onCapabilityMotionAlarm.bind(this));
  }
  
  /**
   * Apply device-specific configuration
   */
  async applyDeviceConfiguration() {
    this.logger.debug('Applying TS0601 motion sensor specific configuration');
    
    try {
      // Configure motion detection parameters
      await this.configureReporting('ssIasZone', {
        zoneStatus: {
          minInterval: 0, // Report immediately
          maxInterval: 300, // 5 minutes
          minChange: 1, // Report any change
        },
      });
      
      // Configure temperature reporting if supported
      if (this.hasCapability('measure_temperature')) {
        await this.configureReporting('msTemperatureMeasurement', {
          measuredValue: {
            minInterval: 60, // 1 minute
            maxInterval: 600, // 10 minutes
            minChange: 10, // 0.1°C
          },
        });
      }
      
      // Configure battery reporting
      if (this.hasCapability('measure_battery')) {
        await this.configureReporting('genPowerCfg', {
          batteryPercentageRemaining: {
            minInterval: 3600, // 1 hour
            maxInterval: 21600, // 6 hours
            minChange: 5, // 0.5%
          },
        });
      }
      
      // Set up IAS Zone enrollment if needed
      await this.setupIasZoneEnrollment();
      
    } catch (error) {
      this.logger.error('Error applying device configuration:', error);
      throw error;
    }
  }
  
  /**
   * Set up IAS Zone enrollment
   */
  async setupIasZoneEnrollment() {
    try {
      const endpoint = this.getClusterEndpoint(CLUSTER.IAS_ZONE);
      if (endpoint === null) {
        this.logger.debug('No IAS Zone endpoint found');
        return;
      }
      
      // Initiate zone enrollment
      await this.zclNode.endpoints[endpoint].clusters[CLUSTER.IAS_ZONE.NAME].zoneEnrollResponse({
        enrollResponseCode: 0, // Success
        zoneId: 1, // Default zone ID
      });
      
      this.logger.debug('IAS Zone enrollment completed successfully');
    } catch (error) {
      this.logger.error('Error during IAS Zone enrollment:', error);
    }
  }
  
  /**
   * Handle IAS Zone updates for motion detection
   * @param {string} attribute - Attribute name
   * @param {number} value - Zone status value
   */
  handleIasZoneUpdate(attribute, value) {
    if (attribute === 'zoneStatus' && this.hasCapability('alarm_motion')) {
      try {
        // Check if motion is detected (bit 0 of zoneStatus)
        const motionDetected = (value & 0x0001) === 0x0001;
        
        // Update motion state
        this.setCapabilityValue('alarm_motion', motionDetected)
          .then(() => this.logger.debug(`Motion state updated: ${motionDetected ? 'DETECTED' : 'CLEARED'}`))
          .catch(err => this.logger.error('Error updating motion state:', err));
        
        // Handle motion detection
        if (motionDetected) {
          this.onMotionDetected();
        }
      } catch (error) {
        this.logger.error('Error handling IAS Zone update:', error);
      }
    }
  }
  
  /**
   * Handle motion detection event
   */
  onMotionDetected() {
    this.logger.debug('Motion detected');
    
    // Get motion reset time from settings (default to 60 seconds)
    const motionReset = this.getSetting('motion_reset') || MOTION_RESET_DEFAULT;
    
    // Clear any existing timeout
    if (this.motionTimeout) {
      clearTimeout(this.motionTimeout);
    }
    
    // Set timeout to clear motion
    this.motionTimeout = setTimeout(() => {
      this.setCapabilityValue('alarm_motion', false)
        .then(() => this.logger.debug('Motion cleared after timeout'))
        .catch(err => this.logger.error('Error clearing motion state:', err));
    }, motionReset * 1000);
  }
  
  /**
   * Handle motion alarm capability changes
   * @param {boolean} value - New motion alarm value
   * @returns {Promise<void>}
   */
  async onCapabilityMotionAlarm(value) {
    this.logger.debug(`Motion alarm capability changed to: ${value}`);
    
    // If motion is being cleared manually, cancel the auto-clear timeout
    if (!value && this.motionTimeout) {
      clearTimeout(this.motionTimeout);
      this.motionTimeout = null;
    }
  }
  
  /**
   * Handle setting changes
   */
  
  /**
   * Handle motion reset setting change
   * @param {number} newValue - New motion reset value in seconds
   * @returns {Promise<void>}
   */
  async onMotionResetSettingChanged(newValue) {
    this.logger.debug(`Motion reset time changed to: ${newValue} seconds`);
    
    // If motion is currently detected, update the reset timer
    if (this.hasCapability('alarm_motion') && this.getCapabilityValue('alarm_motion')) {
      if (this.motionTimeout) {
        clearTimeout(this.motionTimeout);
      }
      
      this.motionTimeout = setTimeout(() => {
        this.setCapabilityValue('alarm_motion', false)
          .catch(err => this.logger.error('Error clearing motion state:', err));
      }, newValue * 1000);
    }
  }
  
  /**
   * Handle temperature offset setting change
   * @param {number} newValue - New temperature offset value
   * @returns {Promise<void>}
   */
  async onTemperatureOffsetChanged(newValue) {
    this.logger.debug(`Temperature offset changed to: ${newValue}°C`);
    
    // Trigger a temperature reading update
    if (this.hasCapability('measure_temperature')) {
      await this.readTemperature();
    }
  }
  
  /**
   * Set up periodic polling for device state
   */
  setupPolling() {
    // Poll temperature every 15 minutes
    if (this.hasCapability('measure_temperature')) {
      this.pollingInterval = setInterval(() => {
        this.readTemperature().catch(err => 
          this.logger.error('Error during temperature polling:', err)
        );
      }, 15 * 60 * 1000);
    }
    
    // Poll battery every 6 hours
    if (this.hasCapability('measure_battery')) {
      this.batteryPollingInterval = setInterval(() => {
        this.readBattery().catch(err => 
          this.logger.error('Error during battery polling:', err)
        );
      }, 6 * 60 * 60 * 1000);
    }
  }
  
  /**
   * Read temperature from the device
   * @returns {Promise<void>}
   */
  async readTemperature() {
    if (!this.hasCapability('measure_temperature')) return;
    
    try {
      const endpoint = this.getClusterEndpoint(CLUSTER.TEMPERATURE_MEASUREMENT);
      if (endpoint === null) return;
      
      const result = await this.zclNode.endpoints[endpoint].clusters[
        CLUSTER.TEMPERATURE_MEASUREMENT.NAME
      ].readAttributes(['measuredValue']);
      
      if (result.measuredValue !== undefined) {
        // Apply temperature offset from settings
        const offset = this.getSetting('temperature_offset') || TEMPERATURE_OFFSET_DEFAULT;
        const temperature = (result.measuredValue / 100) + offset;
        
        await this.setCapabilityValue('measure_temperature', temperature);
        this.logger.debug(`Temperature updated: ${temperature}°C`);
      }
    } catch (error) {
      this.logger.error('Error reading temperature:', error);
      throw error;
    }
  }
  
  /**
   * Read battery level from the device
   * @returns {Promise<void>}
   */
  async readBattery() {
    if (!this.hasCapability('measure_battery')) return;
    
    try {
      const endpoint = this.getClusterEndpoint(CLUSTER.POWER_CONFIGURATION);
      if (endpoint === null) return;
      
      const result = await this.zclNode.endpoints[endpoint].clusters[
        CLUSTER.POWER_CONFIGURATION.NAME
      ].readAttributes(['batteryPercentageRemaining']);
      
      if (result.batteryPercentageRemaining !== undefined) {
        const batteryLevel = result.batteryPercentageRemaining / 2; // Convert to percentage
        
        await this.setCapabilityValue('measure_battery', batteryLevel);
        
        // Update battery alarm if battery is low
        if (this.hasCapability('alarm_battery')) {
          const isBatteryLow = batteryLevel < 20; // 20% threshold
          await this.setCapabilityValue('alarm_battery', isBatteryLow);
        }
        
        this.logger.debug(`Battery level updated: ${batteryLevel}%`);
      }
    } catch (error) {
      this.logger.error('Error reading battery level:', error);
      throw error;
    }
  }
  
  /**
   * Sync device state with the actual device
   * @returns {Promise<void>}
   */
  async syncDeviceState() {
    try {
      // Read temperature
      if (this.hasCapability('measure_temperature')) {
        await this.readTemperature();
      }
      
      // Read battery level
      if (this.hasCapability('measure_battery')) {
        await this.readBattery();
      }
      
      // Read motion state
      if (this.hasCapability('alarm_motion')) {
        const endpoint = this.getClusterEndpoint(CLUSTER.IAS_ZONE);
        if (endpoint !== null) {
          const result = await this.zclNode.endpoints[endpoint].clusters[
            CLUSTER.IAS_ZONE.NAME
          ].readAttributes(['zoneStatus']);
          
          if (result.zoneStatus !== undefined) {
            const motionDetected = (result.zoneStatus & 0x0001) === 0x0001;
            await this.setCapabilityValue('alarm_motion', motionDetected);
            
            if (motionDetected) {
              this.onMotionDetected();
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('Error syncing device state:', error);
    }
  }
  
  /**
   * Clean up resources when device is deleted
   */
  async onDeleted() {
    // Clear all timeouts and intervals
    if (this.motionTimeout) {
      clearTimeout(this.motionTimeout);
      this.motionTimeout = null;
    }
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    if (this.batteryPollingInterval) {
      clearInterval(this.batteryPollingInterval);
      this.batteryPollingInterval = null;
    }
    
    await super.onDeleted();
  }
}

module.exports = TS0601MotionSensorDevice;
