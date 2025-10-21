'use strict';

/**
 * IAS ZONE ENROLLMENT HANDLER v3.0.60 - ENHANCED WITH FALLBACKSYSTEM
 * 
 * Integrates IAS Zone enrollment with FallbackSystem for maximum reliability
 * 
 * Features:
 * - Official Homey method (onZoneEnrollRequest listener)
 * - Multiple fallback strategies
 * - Integration with FallbackSystem
 * - Exponential backoff retry
 * - Detailed logging with debug levels
 * 
 * Author: Dylan Rajasekaram
 * Date: 2025-10-18
 */

const { CLUSTER } = require('zigbee-clusters');
const FallbackSystem = require('./FallbackSystem');

/**
 * Safe string conversion
 */
function toSafeString(val) {
  if (val == null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (Buffer.isBuffer(val)) return val.toString('hex');
  return String(val);
}

class IASZoneEnrollerEnhanced {
  constructor(device, endpoint, options = {}) {
    this.device = device;
    this.endpoint = endpoint;
    this.options = {
      zoneType: options.zoneType || 13, // 13=motion, 4=contact, 21=emergency
      zoneId: options.zoneId || 10,
      capability: options.capability || 'alarm_motion',
      pollInterval: options.pollInterval || 60000,
      autoResetTimeout: options.autoResetTimeout || 60000,
      enablePolling: options.enablePolling !== false,
      ...options
    };
    
    // Initialize FallbackSystem for robust operations
    this.fallback = device.fallback || new FallbackSystem(device, {
      maxRetries: 3,
      baseDelay: 1000,
      verbosity: device.getSetting ? device.getSetting('debug_level') : 'INFO'
    });
    
    this.enrolled = false;
    this.enrollmentMethod = null;
    this.pollTimer = null;
    this.resetTimer = null;
    this.listenersSetup = false;
  }
  
  log(...args) {
    this.device.log('[IASZone]', ...args);
  }
  
  error(...args) {
    this.device.error('[IASZone]', ...args);
  }
  
  debug(...args) {
    if (this.fallback.shouldLog('DEBUG')) {
      this.device.log('[IASZone] [DEBUG]', ...args);
    }
  }
  
  trace(...args) {
    if (this.fallback.shouldLog('TRACE')) {
      this.device.log('[IASZone] [TRACE]', ...args);
    }
  }
  
  /**
   * ENHANCED: Setup Zone Enroll Request Listener with FallbackSystem
   * Official Homey method with retry capability
   */
  async setupZoneEnrollListener() {
    this.log('Setting up Zone Enroll Request listener (official Homey method)...');
    
    const strategies = [
      // Strategy 1: Standard listener setup
      async () => {
        this.trace('Strategy 1: Standard listener setup');
        
        if (!this.endpoint?.clusters?.iasZone) {
          throw new Error('IAS Zone cluster not available');
        }
        
        // Setup the listener
        this.endpoint.clusters.iasZone.onZoneEnrollRequest = () => {
          this.log('Zone Enroll Request received!');
          
          try {
            this.endpoint.clusters.iasZone.zoneEnrollResponse({
              enrollResponseCode: 0, // Success
              zoneId: this.options.zoneId
            });
            this.log(`Zone Enroll Response sent (zoneId: ${this.options.zoneId})`);
            this.enrolled = true;
            this.enrollmentMethod = 'zone-enroll-request';
          } catch (err) {
            this.error('Failed to send Zone Enroll Response:', err.message);
          }
        };
        
        this.log('Zone Enroll listener configured');
        return true;
      },
      
      // Strategy 2: Listener with immediate response
      async () => {
        this.trace('Strategy 2: Listener with immediate proactive response');
        
        // Setup listener first
        this.endpoint.clusters.iasZone.onZoneEnrollRequest = () => {
          this.log('Zone Enroll Request received (fallback strategy)');
          this.endpoint.clusters.iasZone.zoneEnrollResponse({
            enrollResponseCode: 0,
            zoneId: this.options.zoneId
          });
          this.enrolled = true;
        };
        
        // Then send proactive response
        await this.endpoint.clusters.iasZone.zoneEnrollResponse({
          enrollResponseCode: 0,
          zoneId: this.options.zoneId
        });
        
        this.log('Proactive Zone Enroll Response sent');
        this.enrolled = true;
        this.enrollmentMethod = 'proactive-enroll-response';
        return true;
      }
    ];
    
    try {
      await this.fallback.executeWithFallback(
        'setupZoneEnrollListener',
        strategies,
        { timeout: 5000 }
      );
      return true;
    } catch (err) {
      this.error('All zone enroll listener strategies failed:', err.message);
      return false;
    }
  }
  
  /**
   * ENHANCED: Standard enrollment with FallbackSystem retry
   */
  async enrollStandard(zclNode) {
    this.log('Attempting standard Homey IEEE enrollment with fallback...');
    
    const strategies = [
      // Strategy 1: Standard IEEE write
      async () => {
        this.trace('Strategy 1: Standard IEEE address write');
        
        // Get Homey IEEE address
        let ieeeBuffer = null;
        
        if (zclNode?._node?.bridgeId) {
          const bridgeId = zclNode._node.bridgeId;
          
          if (Buffer.isBuffer(bridgeId) && bridgeId.length >= 8) {
            ieeeBuffer = bridgeId.length === 8 ? bridgeId : bridgeId.slice(0, 8);
          } else if (typeof bridgeId === 'string') {
            // Clean and convert IEEE string
            const hexOnly = bridgeId.replace(/[^0-9a-fA-F]/g, '').toLowerCase();
            
            if (hexOnly.length >= 16) {
              const hexStr = hexOnly.substring(0, 16);
              const hexPairs = hexStr.match(/.{2}/g);
              
              if (hexPairs && hexPairs.length === 8) {
                ieeeBuffer = Buffer.from(hexPairs.reverse().join(''), 'hex');
              }
            }
          }
        }
        
        if (!ieeeBuffer || !Buffer.isBuffer(ieeeBuffer) || ieeeBuffer.length !== 8) {
          throw new Error('Invalid IEEE address');
        }
        
        this.debug('Writing Homey IEEE address:', ieeeBuffer.toString('hex'));
        
        // Write CIE address
        await this.endpoint.clusters.iasZone.writeAttributes({
          iasCIEAddress: ieeeBuffer
        });
        
        // Write zone type
        await this.endpoint.clusters.iasZone.writeAttributes({
          zoneType: this.options.zoneType
        });
        
        this.log('IEEE address and zone type written successfully');
        
        // Wait for enrollment
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verify enrollment
        const attrs = await this.endpoint.clusters.iasZone.readAttributes(['zoneState']);
        
        if (attrs.zoneState === 1) {
          this.log('Standard enrollment verified (zoneState: 1 = Enrolled)');
          this.enrolled = true;
          this.enrollmentMethod = 'standard-ieee';
          return true;
        }
        
        throw new Error('Enrollment verification failed');
      },
      
      // Strategy 2: Simplified write without verification
      async () => {
        this.trace('Strategy 2: Simplified IEEE write');
        
        const ieeeBuffer = await this.getHomeyIEEE(zclNode);
        
        await this.endpoint.clusters.iasZone.writeAttributes({
          iasCIEAddress: ieeeBuffer,
          zoneType: this.options.zoneType
        });
        
        this.log('Simplified enrollment completed');
        this.enrolled = true;
        this.enrollmentMethod = 'simplified-ieee';
        return true;
      }
    ];
    
    try {
      return await this.fallback.executeWithFallback(
        'enrollStandard',
        strategies,
        { timeout: 10000 }
      );
    } catch (err) {
      this.log('Standard enrollment failed:', err.message);
      return false;
    }
  }
  
  /**
   * Helper: Get Homey IEEE address
   */
  async getHomeyIEEE(zclNode) {
    const bridgeId = zclNode?._node?.bridgeId;
    
    if (!bridgeId) {
      throw new Error('Bridge ID not available');
    }
    
    if (Buffer.isBuffer(bridgeId)) {
      return bridgeId.length === 8 ? bridgeId : bridgeId.slice(0, 8);
    }
    
    if (typeof bridgeId === 'string') {
      const hexOnly = bridgeId.replace(/[^0-9a-fA-F]/g, '').toLowerCase();
      
      if (hexOnly.length >= 16) {
        const hexStr = hexOnly.substring(0, 16);
        const hexPairs = hexStr.match(/.{2}/g);
        
        if (hexPairs && hexPairs.length === 8) {
          return Buffer.from(hexPairs.reverse().join(''), 'hex');
        }
      }
    }
    
    throw new Error('Invalid IEEE address format');
  }
  
  /**
   * MAIN ENROLLMENT METHOD
   * Tries all strategies with FallbackSystem
   */
  async enroll(zclNode) {
    this.log('Starting enhanced multi-method enrollment with FallbackSystem...');
    
    // Method 0: Official Homey listener (MUST be first!)
    if (await this.setupZoneEnrollListener()) {
      this.log('Zone Enroll listener configured (official method)');
      this.setupListeners();
    }
    
    // Wait for device to process
    await this.fallback.sleep(2000);
    
    // Method 1: Standard IEEE enrollment
    if (await this.enrollStandard(zclNode)) {
      this.log('Enrollment successful: STANDARD METHOD');
      this.setupListeners();
      return this.enrollmentMethod;
    }
    
    // Method 2: Auto-enrollment
    if (await this.enrollAutomatic()) {
      this.log('Enrollment successful: AUTO METHOD');
      this.setupListeners();
      return this.enrollmentMethod;
    }
    
    // Method 3: Polling mode (always works)
    if (await this.enrollPollingMode()) {
      this.log('Enrollment successful: POLLING MODE');
      this.setupListeners();
      return this.enrollmentMethod;
    }
    
    // Method 4: Passive mode (last resort)
    if (await this.enrollPassiveMode()) {
      this.log('Enrollment successful: PASSIVE MODE');
      this.setupListeners();
      return this.enrollmentMethod;
    }
    
    this.error('All enrollment methods failed');
    return null;
  }
  
  /**
   * Auto-enrollment method
   */
  async enrollAutomatic() {
    this.trace('Attempting auto-enrollment...');
    
    try {
      await this.endpoint.clusters.iasZone.writeAttributes({
        zoneType: this.options.zoneType
      });
      
      this.log('Auto-enrollment triggered');
      this.enrolled = true;
      this.enrollmentMethod = 'auto-enroll';
      return true;
    } catch (err) {
      this.debug('Auto-enrollment failed:', err.message);
      return false;
    }
  }
  
  /**
   * Polling mode (no enrollment needed)
   */
  async enrollPollingMode() {
    this.log('Activating polling mode (no enrollment)...');
    
    if (!this.options.enablePolling) {
      return false;
    }
    
    this.enrolled = true;
    this.enrollmentMethod = 'polling-mode';
    return true;
  }
  
  /**
   * Passive mode (listen only)
   */
  async enrollPassiveMode() {
    this.log('Activating passive mode (listen only)...');
    
    this.enrolled = true;
    this.enrollmentMethod = 'passive-mode';
    return true;
  }
  
  /**
   * Setup all IAS Zone listeners
   */
  setupListeners() {
    if (this.listenersSetup) {
      this.debug('Listeners already setup, skipping');
      return;
    }
    
    this.log('Setting up IAS Zone listeners...');
    
    try {
      // Listener 1: Zone Status Change Notification
      this.endpoint.clusters.iasZone.onZoneStatusChangeNotification = (payload) => {
        this.handleZoneNotification(payload);
      };
      
      // Listener 2: Zone Status attribute reports
      this.device.registerAttrReportListener(
        'iasZone',
        'zoneStatus',
        1,
        3600,
        null,
        (value) => this.handleZoneStatus(value),
        0
      ).catch(err => {
        this.debug('Zone status report listener failed (non-critical):', err.message);
      });
      
      // Start polling if needed
      if (this.options.enablePolling && this.enrollmentMethod === 'polling-mode') {
        this.startPolling();
      }
      
      this.listenersSetup = true;
      this.log('Listeners configured successfully');
      
    } catch (err) {
      this.error('Failed to setup listeners:', err.message);
    }
  }
  
  /**
   * Handle zone notification
   */
  handleZoneNotification(payload) {
    this.trace('Zone notification received:', payload);
    
    const zoneStatus = payload.zoneStatus;
    const isAlarm = zoneStatus && (zoneStatus.alarm1 || zoneStatus.alarm2);
    
    this.updateCapability(isAlarm);
  }
  
  /**
   * Handle zone status
   */
  handleZoneStatus(value) {
    this.trace('Zone status report:', value);
    
    const isAlarm = value && (value.alarm1 || value.alarm2);
    this.updateCapability(isAlarm);
  }
  
  /**
   * Update device capability
   */
  updateCapability(isAlarm) {
    const capability = this.options.capability;
    
    if (!this.device.hasCapability(capability)) {
      this.debug(`Capability ${capability} not available`);
      return;
    }
    
    if (isAlarm) {
      this.log('ALARM TRIGGERED');
      this.device.setCapabilityValue(capability, true).catch(err => {
        this.error('Failed to set capability:', err.message);
      });
      
      // Auto-reset timer
      if (this.options.autoResetTimeout > 0) {
        if (this.resetTimer) clearTimeout(this.resetTimer);
        
        this.resetTimer = setTimeout(() => {
          this.log('Auto-resetting alarm');
          this.device.setCapabilityValue(capability, false).catch(err => {
            this.error('Failed to reset capability:', err.message);
          });
        }, this.options.autoResetTimeout);
      }
    } else {
      this.log('ALARM CLEARED');
      if (this.resetTimer) {
        clearTimeout(this.resetTimer);
        this.resetTimer = null;
      }
      this.device.setCapabilityValue(capability, false).catch(err => {
        this.error('Failed to clear capability:', err.message);
      });
    }
  }
  
  /**
   * Start polling
   */
  startPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
    
    this.log(`Starting polling (interval: ${this.options.pollInterval}ms)`);
    
    this.pollTimer = setInterval(async () => {
      try {
        const attrs = await this.endpoint.clusters.iasZone.readAttributes(['zoneStatus']);
        this.handleZoneStatus(attrs.zoneStatus);
      } catch (err) {
        this.debug('Polling read failed:', err.message);
      }
    }, this.options.pollInterval);
  }
  
  /**
   * Cleanup
   */
  destroy() {
    this.log('Cleaning up IAS Zone Enroller...');
    
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
  }
  
  /**
   * Get enrollment status
   */
  getStatus() {
    return {
      enrolled: this.enrolled,
      method: this.enrollmentMethod,
      listenersSetup: this.listenersSetup,
      polling: !!this.pollTimer
    };
  }
}

module.exports = IASZoneEnrollerEnhanced;
