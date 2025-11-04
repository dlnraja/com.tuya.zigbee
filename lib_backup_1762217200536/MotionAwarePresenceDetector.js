'use strict';

const { EventEmitter } = require('events');

/**
 * Motion Aware Presence Detector
 * 
 * Detects human presence using Zigbee signal strength analysis (RSSI/LQI)
 * Based on Philips Hue Motion Aware technology
 * 
 * @extends EventEmitter
 * @fires MotionAwarePresenceDetector#presence_detected
 * @fires MotionAwarePresenceDetector#presence_cleared
 */
class MotionAwarePresenceDetector extends EventEmitter {
  
  constructor(device, options = {}) {
    super();
    
    this.device = device;
    this.zclNode = device.zclNode;
    
    // Configuration
    this.enabled = false;
    this.sensitivity = options.sensitivity || 'medium';
    this.baselineWindow = options.baselineWindow || 60000; // 60 seconds
    this.checkInterval = options.checkInterval || 5000; // 5 seconds
    this.presenceTimeout = options.presenceTimeout || 30000; // 30 seconds
    
    // State
    this.rssiHistory = [];
    this.baseline = null;
    this.presenceDetected = false;
    this.lastPresenceTime = null;
    this.monitoringInterval = null;
    
    // Sensitivity thresholds
    this.thresholds = {
      low: 15,     // -15 dBm change
      medium: 10,  // -10 dBm change
      high: 5      // -5 dBm change
    };
    
    this.log = (...args) => {
      if (this.device && this.device.log) {
        this.device.log('[MotionAware]', ...args);
      }
    };
    
    this.error = (...args) => {
      if (this.device && this.device.error) {
        this.device.error('[MotionAware]', ...args);
      }
    };
  }
  
  /**
   * Enable Motion Aware presence detection
   */
  async enable() {
    if (this.enabled) {
      this.log('Already enabled');
      return;
    }
    
    this.log('Enabling Motion Aware presence detection...');
    this.enabled = true;
    
    // Initialize baseline
    await this.initializeBaseline();
    
    // Start monitoring
    this.startMonitoring();
    
    this.log(`[OK] Motion Aware enabled (sensitivity: ${this.sensitivity})`);
  }
  
  /**
   * Disable Motion Aware presence detection
   */
  disable() {
    if (!this.enabled) {
      return;
    }
    
    this.log('Disabling Motion Aware...');
    this.enabled = false;
    
    // Stop monitoring
    this.stopMonitoring();
    
    // Clear state
    this.rssiHistory = [];
    this.baseline = null;
    this.presenceDetected = false;
    
    this.log('[OK] Motion Aware disabled');
  }
  
  /**
   * Initialize RSSI baseline
   */
  async initializeBaseline() {
    this.log('Initializing RSSI baseline (60s calibration)...');
    
    const samples = [];
    const sampleCount = 10;
    const sampleDelay = this.baselineWindow / sampleCount;
    
    for (let i = 0; i < sampleCount; i++) {
      try {
        const rssi = await this.measureRSSI();
        if (rssi !== null) {
          samples.push(rssi);
          this.log(`Baseline sample ${i + 1}/${sampleCount}: ${rssi} dBm`);
        }
      } catch (err) {
        this.error('Baseline measurement error:', err.message);
      }
      
      if (i < sampleCount - 1) {
        await this.sleep(sampleDelay);
      }
    }
    
    if (samples.length > 0) {
      this.baseline = this.calculateAverage(samples);
      this.log(`[OK] Baseline established: ${this.baseline.toFixed(1)} dBm (${samples.length} samples)`);
    } else {
      this.error('[ERROR] Failed to establish baseline (no samples)');
      this.baseline = -60; // Default fallback
    }
  }
  
  /**
   * Start monitoring RSSI for presence detection
   */
  startMonitoring() {
    if (this.monitoringInterval) {
      return;
    }
    
    this.log('Starting RSSI monitoring...');
    
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkPresence();
      } catch (err) {
        this.error('Monitoring error:', err.message);
      }
    }, this.checkInterval);
  }
  
  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.log('Monitoring stopped');
    }
  }
  
  /**
   * Check for presence based on RSSI changes
   */
  async checkPresence() {
    if (!this.enabled || this.baseline === null) {
      return;
    }
    
    try {
      const rssi = await this.measureRSSI();
      
      if (rssi === null) {
        return;
      }
      
      // Add to history
      this.rssiHistory.push({
        rssi,
        timestamp: Date.now()
      });
      
      // Keep only recent samples (last 5 minutes)
      const fiveMinutesAgo = Date.now() - 300000;
      this.rssiHistory = this.rssiHistory.filter(s => s.timestamp > fiveMinutesAgo);
      
      // Analyze RSSI deviation
      const deviation = Math.abs(rssi - this.baseline);
      const threshold = this.thresholds[this.sensitivity];
      
      if (deviation > threshold) {
        // Significant deviation detected
        if (!this.presenceDetected) {
          this.log(`[TARGET] Presence DETECTED (RSSI: ${rssi} dBm, baseline: ${this.baseline.toFixed(1)} dBm, deviation: ${deviation.toFixed(1)} dBm)`);
          this.presenceDetected = true;
          this.emit('presence_detected', { rssi, baseline: this.baseline, deviation });
        }
        this.lastPresenceTime = Date.now();
      } else {
        // Check if presence timeout expired
        if (this.presenceDetected && this.lastPresenceTime) {
          const timeSinceLastDetection = Date.now() - this.lastPresenceTime;
          
          if (timeSinceLastDetection > this.presenceTimeout) {
            this.log(`✋ Presence CLEARED (no detection for ${(timeSinceLastDetection / 1000).toFixed(0)}s)`);
            this.presenceDetected = false;
            this.emit('presence_cleared');
          }
        }
      }
      
      // Update rolling baseline (slow adaptation)
      if (this.rssiHistory.length > 20) {
        const recentSamples = this.rssiHistory.slice(-20).map(s => s.rssi);
        this.baseline = this.baseline * 0.95 + this.calculateAverage(recentSamples) * 0.05;
      }
      
    } catch (err) {
      this.error('Presence check error:', err.message);
    }
  }
  
  /**
   * Measure current RSSI
   * @returns {number|null} RSSI in dBm or null if unavailable
   */
  async measureRSSI() {
    try {
      // Method 1: Try to get RSSI from zclNode
      if (this.zclNode && typeof this.zclNode.rssi === 'number') {
        return this.zclNode.rssi;
      }
      
      // Method 2: Try LQI (Link Quality Indicator)
      if (this.zclNode && typeof this.zclNode.lqi === 'number') {
        // Convert LQI (0-255) to approximate RSSI
        // LQI 255 ≈ -30 dBm, LQI 0 ≈ -100 dBm
        const rssi = -100 + (this.zclNode.lqi / 255) * 70;
        return rssi;
      }
      
      // Method 3: Measure response latency as proxy
      const startTime = Date.now();
      
      try {
        await this.zclNode.endpoints[1].clusters.basic.readAttributes(['zclVersion']);
        const latency = Date.now() - startTime;
        
        // Convert latency to pseudo-RSSI
        // Fast response (< 50ms) = strong signal (-40 dBm)
        // Slow response (> 500ms) = weak signal (-90 dBm)
        const pseudoRSSI = -40 - Math.min(latency / 10, 50);
        return pseudoRSSI;
        
      } catch (readErr) {
        // If read fails, assume weak signal
        return -90;
      }
      
    } catch (err) {
      this.error('RSSI measurement failed:', err.message);
      return null;
    }
  }
  
  /**
   * Calculate average of array
   */
  calculateAverage(values) {
    if (!values || values.length === 0) {
      return 0;
    }
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }
  
  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Update sensitivity
   */
  setSensitivity(sensitivity) {
    if (!['low', 'medium', 'high'].includes(sensitivity)) {
      throw new Error('Invalid sensitivity. Must be: low, medium, or high');
    }
    
    this.sensitivity = sensitivity;
    this.log(`Sensitivity updated: ${sensitivity} (threshold: ${this.thresholds[sensitivity]} dBm)`);
  }
  
  /**
   * Get current state
   */
  getState() {
    return {
      enabled: this.enabled,
      presenceDetected: this.presenceDetected,
      baseline: this.baseline,
      sensitivity: this.sensitivity,
      rssiHistoryLength: this.rssiHistory.length,
      lastPresenceTime: this.lastPresenceTime
    };
  }
}

module.exports = MotionAwarePresenceDetector;
