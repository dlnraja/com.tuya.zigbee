/**
 * Error handling utilities for Tuya Zigbee devices
 */

class ErrorHandler {
  constructor() {
    this.errorCounts = new Map(); // deviceId -> { count, timestamp }
    this.maxErrors = 5;
    this.errorWindow = 60000; // 60 seconds
  }
  
  /**
   * Handle Tuya cluster errors
   */
  handleClusterError(error, device, operation) {
    const deviceId = device.getId();
    
    // Record error
    this.recordError(deviceId);
    
    // Log error with context
    device.error(`Cluster error in ${operation}:`, {
      error: error.message,
      type: error.type || 'Unknown',
      deviceId,
      timestamp: new Date().toISOString()
    });
    
    // Check if device should be throttled
    if (this.isThrottled(deviceId)) {
      device.setUnavailable('Temporarily throttled due to errors')
        .catch(() => {}); // Ignore setUnavailable errors
      return 'throttled';
    }
    
    // Return error type for handling
    return error.type || 'Unknown';
  }
  
  /**
   * Handle DP conversion errors
   */
  handleConversionError(error, device, dp, value) {
    device.log(`DP conversion error for ${dp}:`, {
      value,
      error: error.message,
      dp
    });
    
    // Return safe fallback value
    return this.getSafeFallback(dp, value);
  }
  
  /**
   * Record error for device
   */
  recordError(deviceId) {
    const now = Date.now();
    const record = this.errorCounts.get(deviceId) || { count: 0, timestamp: now };
    
    // Reset if outside window
    if (now - record.timestamp > this.errorWindow) {
      record.count = 1;
      record.timestamp = now;
    } else {
      record.count++;
    }
    
    this.errorCounts.set(deviceId, record);
  }
  
  /**
   * Check if device is throttled
   */
  isThrottled(deviceId) {
    const record = this.errorCounts.get(deviceId);
    if (!record) return false;
    
    const now = Date.now();
    if (now - record.timestamp > this.errorWindow) {
      this.errorCounts.delete(deviceId);
      return false;
    }
    
    return record.count >= this.maxErrors;
  }
  
  /**
   * Reset error count for device
   */
  resetErrors(deviceId) {
    this.errorCounts.delete(deviceId);
  }
  
  /**
   * Get safe fallback value for DP
   */
  getSafeFallback(dp, value) {
    // Try to infer type from DP ID
    if (dp === 1) return false; // Usually onoff
    if (dp >= 16 && dp <= 19) return 0; // Usually power/energy
    if (dp >= 2 && dp <= 4) return 20; // Usually temperature
    
    return value;
  }
  
  /**
   * Get error statistics
   */
  getErrorStats() {
    const stats = {};
    
    for (const [deviceId, record] of this.errorCounts) {
      stats[deviceId] = {
        count: record.count,
        lastError: new Date(record.timestamp).toISOString(),
        throttled: this.isThrottled(deviceId)
      };
    }
    
    return stats;
  }
}

module.exports = ErrorHandler;
