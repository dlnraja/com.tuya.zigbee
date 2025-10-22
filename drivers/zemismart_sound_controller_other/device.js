'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * SoundControllerBatteryDevice
 * 
 * SUPPORTED BRANDS:
 * - IKEA
 * 
 * COMPATIBLE PRODUCTS:
 * - IKEA SYMFONISK Sound Controller
 * - Remote control for audio systems
 * 
 * Note: Driver ID and folder name are UNBRANDED for universal compatibility.
 * Brand identification happens via manufacturerName and productId fields.
 */

class SoundControllerBatteryDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.printNode();
    
    // IKEA SYMFONISK Sound Controller
    
    this.log('Sound Controller (IKEA) initialized');
    // Battery management
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      get: 'batteryPercentageRemaining',
      reportParser: value => {
        const percentage = Math.round(value / 2); // Zigbee reports in 0.5% increments
        this.log('Battery percentage:', percentage + '%');
        
        // Check low battery threshold
        const threshold = this.getSetting('battery_threshold') || 20;
        if (percentage <= threshold && percentage > 0) {
          this.setWarning('Low battery: ' + percentage + '%').catch(this.error);
        } else if (percentage > threshold) {
          this.unsetWarning().catch(this.error);
        }
        
        return percentage;
      },
      report: 'batteryPercentageRemaining',
      reportParser: value => Math.round(value / 2),
      getOpts: {
        getOnStart: true,
        pollInterval: (this.getSetting('battery_report_interval') || 1) * 3600000
      }
    });
    
    // Battery alarm capability
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      get: 'batteryAlarmState',
      reportParser: value => {
        const isLowBattery = value > 0;
        if (isLowBattery) {
          this.log('⚠️ Low battery alarm triggered!');
          this.setWarning('Low battery detected').catch(this.error);
        }
        return isLowBattery;
      }
    });
  }
  
  /**
   * Calculate battery voltage from percentage
   * @param {number} percentage - Battery percentage (0-100)
   * @returns {number} Estimated voltage
   */
  getBatteryVoltage(percentage) {
    const maxVoltage = 3;
    const minVoltage = maxVoltage * 0.7; // 70% of max = critical
    return minVoltage + ((maxVoltage - minVoltage) * percentage / 100);
  }
  
  /**
   * Get battery capacity in mAh
   * @returns {number} Battery capacity
   */
  getBatteryCapacity() {
    return 300;
  }
  
  /**
   * Estimate remaining battery life in days
   * @param {number} percentage - Current battery percentage
   * @returns {number} Estimated days remaining
   */
  estimateBatteryLife(percentage) {
    const capacity = this.getBatteryCapacity();
    const avgCurrentDraw = 0.1; // mA average (conservative estimate)
    const remainingCapacity = capacity * (percentage / 100);
    const hoursRemaining = remainingCapacity / avgCurrentDraw;
    return Math.floor(hoursRemaining / 24);
  }
}

module.exports = SoundControllerBatteryDevice;
