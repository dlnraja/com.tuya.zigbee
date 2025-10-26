'use strict';

/**
 * Battery Helper
 * Calcul intelligent du niveau de batterie avec profils par type
 */

class BatteryHelper {
  
  static BATTERY_PROFILES = {
    'CR2032': { max: 3.0, min: 2.0, nominal: 3.0 },
    'CR2450': { max: 3.0, min: 2.0, nominal: 3.0 },
    'CR2477': { max: 3.0, min: 2.0, nominal: 3.0 },
    'AAA': { max: 1.5, min: 0.9, nominal: 1.5 },
    'AA': { max: 1.5, min: 0.9, nominal: 1.5 },
    'C': { max: 1.5, min: 0.9, nominal: 1.5 },
    'D': { max: 1.5, min: 0.9, nominal: 1.5 },
    '9V': { max: 9.0, min: 6.0, nominal: 9.0 }
  };
  
  /**
   * Calculate battery percentage from voltage
   */
  static calculateBatteryPercentage(voltage, batteryType = 'CR2032') {
    const profile = this.BATTERY_PROFILES[batteryType] || this.BATTERY_PROFILES['CR2032'];
    
    // Linear approximation
    const percentage = ((voltage - profile.min) / (profile.max - profile.min)) * 100;
    
    // Clamp between 0 and 100
    return Math.max(0, Math.min(100, Math.round(percentage)));
  }
  
  /**
   * Get battery status text
   */
  static getBatteryStatus(percentage) {
    if (percentage > 80) return 'good';
    if (percentage > 50) return 'medium';
    if (percentage > 20) return 'low';
    return 'critical';
  }
  
  /**
   * Check if battery alert should be sent
   */
  static shouldSendBatteryAlert(percentage, lastAlertPercentage = 0) {
    // Send alert at 20%, 10%, and 5%
    const thresholds = [20, 10, 5];
    
    for (const threshold of thresholds) {
      if (percentage <= threshold && lastAlertPercentage > threshold) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Estimate battery life remaining (in days)
   */
  static estimateBatteryLife(percentage, averageDrainPerDay = 1) {
    if (averageDrainPerDay <= 0) return Infinity;
    return Math.round(percentage / averageDrainPerDay);
  }
  
  /**
   * Get battery icon based on percentage
   */
  static getBatteryIcon(percentage) {
    if (percentage > 75) return '[BATTERY]'; // Full
    if (percentage > 50) return '[BATTERY]'; // Good
    if (percentage > 25) return '🪫'; // Medium
    return '🪫'; // Low/Critical
  }
}

module.exports = BatteryHelper;
