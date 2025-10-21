'use strict';

/**
 * IAS ZONE ENROLLMENT HANDLER v4.0.6 - SIMPLE VERSION THAT WORKS
 * 
 * REGRESSION FIX (2025-10-21):
 * Retour à la version SIMPLE qui fonctionnait (v2.15.128)
 * 
 * PROBLÈME IDENTIFIÉ:
 * - Version v3.1.18/v4.0.5 avait trop de complexité
 * - Checks excessifs bloquaient l'enrollment
 * - Délais artificiels cassaient le timing critique  
 * - Async dans listener créait race conditions
 * 
 * SOLUTION:
 * - Listener SYNCHRONE (pas async)
 * - Réponse proactive IMMÉDIATE (pas de délai)
 * - Minimal checks (seulement ce qui est nécessaire)
 * - Simple try-catch (pas de error swallowing)
 * 
 * LEÇON: "Keep It Simple, Stupid" (KISS)
 * La version simple (v2.15.128) marchait.
 * La version complexe (v4.0.5) a régressé.
 * 
 * Author: Dylan Rajasekaram
 * Last Updated: 2025-10-21
 * Based on: v2.15.128 (working version)
 */

const { CLUSTER } = require('zigbee-clusters');

class IASZoneEnroller {
  constructor(device, endpoint, options = {}) {
    this.device = device;
    this.endpoint = endpoint;
    this.options = {
      zoneType: options.zoneType || 13, // 13=motion, 21=emergency, 4=contact
      capability: options.capability || 'alarm_motion',
      autoResetTimeout: options.autoResetTimeout || 60000, // 60s for motion sensors
      zoneId: options.zoneId || 10,
      ...options
    };
    
    this.enrolled = false;
    this.enrollmentMethod = null;
    this.resetTimer = null;
  }
  
  log(message, ...args) {
    this.device.log(`[IASZone] ${message}`, ...args);
  }
  
  error(message, ...args) {
    this.device.error(`[IASZone] ${message}`, ...args);
  }
  
  /**
   * CRITICAL METHOD: Setup Zone Enroll Request Listener (Official Homey Method)
   * 
   * SIMPLE VERSION - NO ASYNC, NO DELAYS, NO EXCESSIVE CHECKS
   * This is the version that WORKED in v2.15.128
   */
  setupZoneEnrollListener() {
    this.log('🎧 Setting up Zone Enroll Request listener (simple method)...');
    
    try {
      // Setup listener for Zone Enroll Request (SYNCHRONOUS)
      this.endpoint.clusters.iasZone.onZoneEnrollRequest = () => {
        this.log('📨 Zone Enroll Request received!');
        
        try {
          // Send response IMMEDIATELY (no async, no delay)
          this.endpoint.clusters.iasZone.zoneEnrollResponse({
            enrollResponseCode: 0, // 0 = Success
            zoneId: this.options.zoneId
          });
          
          this.log('✅ Zone Enroll Response sent (zoneId: ' + this.options.zoneId + ')');
          this.enrolled = true;
          this.enrollmentMethod = 'zone-enroll-request';
        } catch (err) {
          this.error('Failed to send Zone Enroll Response:', err.message);
        }
      };
      
      // CRITICAL: Send proactive response IMMEDIATELY
      // Per Homey SDK: "the driver could send a Zone Enroll Response when initializing
      // regardless of having received the Zone Enroll Request"
      this.log('📤 Sending proactive Zone Enroll Response (official fallback)...');
      
      try {
        this.endpoint.clusters.iasZone.zoneEnrollResponse({
          enrollResponseCode: 0, // Success
          zoneId: this.options.zoneId
        });
        
        this.log('✅ Proactive Zone Enroll Response sent');
        this.enrolled = true;
        this.enrollmentMethod = 'proactive-enroll-response';
      } catch (err) {
        this.log('⚠️ Proactive response failed (normal if device not ready):', err.message);
      }
      
      return true;
    } catch (err) {
      this.error('⚠️ Zone enroll listener setup failed:', err.message);
      return false;
    }
  }
  
  /**
   * Setup IAS Zone listeners for status changes
   * SIMPLE VERSION - Just the basics that work
   */
  setupListeners() {
    this.log('🎧 Setting up IAS Zone status listeners...');
    
    try {
      // Listen for zone status change notifications
      this.endpoint.clusters.iasZone.onZoneStatusChangeNotification = (payload) => {
        this.log('📨 Zone notification received:', payload);
        if (payload && payload.zoneStatus !== undefined) {
          this.handleZoneStatus(payload.zoneStatus);
        }
      };
      
      // Listen for zone status attribute reports
      this.endpoint.clusters.iasZone.onZoneStatus = (zoneStatus) => {
        this.log('📊 Zone attribute report:', zoneStatus);
        this.handleZoneStatus(zoneStatus);
      };
      
      this.log('✅ Status listeners configured');
    } catch (err) {
      this.error('Failed to setup status listeners:', err.message);
    }
  }
  
  /**
   * Handle zone status changes
   * SIMPLE VERSION - Direct capability update
   */
  handleZoneStatus(zoneStatus) {
    try {
      // Convert Bitmap to object if needed
      let status = zoneStatus;
      if (zoneStatus && typeof zoneStatus.valueOf === 'function') {
        status = zoneStatus.valueOf();
      }
      
      // Check if alarm is triggered (alarm1 or alarm2)
      const alarmTriggered = !!(status.alarm1 || status.alarm2);
      
      this.log('Zone status (object):', status);
      this.log(alarmTriggered ? '🚨 ALARM TRIGGERED' : '✅ Alarm cleared');
      
      // Update capability directly
      if (this.device.hasCapability(this.options.capability)) {
        this.device.setCapabilityValue(this.options.capability, alarmTriggered)
          .catch(err => this.error('Failed to update capability:', err.message));
      }
      
      // Auto-reset after timeout (for motion sensors)
      if (alarmTriggered && this.options.autoResetTimeout > 0) {
        // Clear existing timer
        if (this.resetTimer) {
          clearTimeout(this.resetTimer);
        }
        
        // Set new timer
        this.resetTimer = setTimeout(() => {
          this.log('⏰ Auto-resetting alarm after timeout');
          if (this.device.hasCapability(this.options.capability)) {
            this.device.setCapabilityValue(this.options.capability, false)
              .catch(err => this.error('Failed to reset alarm:', err.message));
          }
        }, this.options.autoResetTimeout);
      }
    } catch (err) {
      this.error('Failed to handle zone status:', err.message);
    }
  }
  
  /**
   * Main enrollment method
   * SIMPLE VERSION - Just setup listener and proactive response
   */
  async enroll(zclNode) {
    this.log('🚀 Starting IAS Zone enrollment (simple method)...');
    
    // Setup the official Homey method (listener + proactive response)
    if (this.setupZoneEnrollListener()) {
      this.log('✅ Zone Enroll listener configured (official method)');
      
      // Setup status listeners
      this.setupListeners();
      
      this.log('✅ Enrollment complete (method: ' + this.enrollmentMethod + ')');
      return this.enrollmentMethod;
    }
    
    this.error('❌ Enrollment failed');
    return null;
  }
  
  /**
   * Destroy and cleanup
   */
  destroy() {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
    this.log('🧹 IAS Zone enroller destroyed');
  }
}

module.exports = IASZoneEnroller;
