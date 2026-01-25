'use strict';

const IEEEAddressManager = require('./IEEEAddressManager');

/**
 * IASZoneManager - Gestion enrollment IAS Zone pour buttons/sensors
 * Port du fix Peter v4.1.0 - Synchronous enrollment CRITICAL!
 * Résout: zoneState "notEnrolled" → Button press ne trigger pas
 * 
 * v5.5.807: SDK3 COMPLIANCE - Per Homey documentation
 * - Use method assignment for onZoneEnrollRequest (not event listener)
 * - Send proactive Zone Enroll Response on init (SDK3 best practice)
 * - Homey v8.1.1+ auto-writes CIE address during pairing
 * - Removed hardcoded fallback IEEE address
 * - Better handling when coordinator IEEE unavailable
 * 
 * v5.5.795: Enhanced CIE address handling
 * - Added CIE address verification after write
 * - Added raw status interpretation fallback
 * - Improved IEEE address recovery methods
 * 
 * v5.5.797: REFACTOR - Use centralized IEEEAddressManager
 * - Unified IEEE address retrieval across all methods
 * - Consistent CIE address write with verification
 * - Better coordinator IEEE address handling
 */
class IASZoneManager {

  constructor(device) {
    this.device = device;
    this.enrolled = false;
    this.maxRetries = 5; // Increased from 3 to 5 (v4.10.0 improvement)
    this.baseDelay = 1000; // Base delay for exponential backoff
    this.enrollmentAttempts = 0;
    
    // v5.5.797: Use centralized IEEE address manager
    this.ieeeManager = new IEEEAddressManager(device);
  }

  /**
   * Enroll IAS Zone avec RETRY LOGIC - v5.5.181
   * CRITICAL: Doit être appelé IMMÉDIATEMENT après pairing
   * NEW: Exponential backoff + Zigbee startup detection
   * FIX: Handle "Zigbee is aan het opstarten" error gracefully
   */
  async enrollIASZone() {
    const device = this.device;
    this.enrollmentAttempts++;

    try {
      // v5.5.181: Wait for Zigbee to be ready before enrollment
      await this._waitForZigbeeReady();

      device.log('[IAS] 🔒 Starting IAS Zone enrollment...');

      const endpoint = device.zclNode?.endpoints?.[1];
      if (!endpoint) {
        device.log('[IAS] ⚠️ No endpoint 1, skipping enrollment');
        return false;
      }

      const iasZone = endpoint.clusters?.iasZone;
      if (!iasZone) {
        device.log('[IAS] ⚠️ No IAS Zone cluster, skipping');
        return false;
      }

      // Check current enrollment status
      try {
        const zoneState = await iasZone.readAttributes(['zoneState']).catch(() => null);
        if (zoneState?.zoneState === 'enrolled') {
          device.log('[IAS] ✅ Already enrolled!');
          this.enrolled = true;
          return true;
        }
      } catch (err) {
        device.log('[IAS] Cannot read zoneState:', err.message);
      }

      // v5.5.807: SDK3 COMPLIANCE - Try to get coordinator IEEE, but don't fail if unavailable
      // Per Homey SDK3 docs: "Homey Pro (as of v8.1.1) and Homey Cloud will ensure
      // that a device that supports the IAS Zone cluster will receive a Write 
      // Attribute command to set the IAS_CIE_Address attribute with Homey's IEEE address"
      const coordIeee = await this.ieeeManager.getCoordinatorIeeeAddress();
      
      if (coordIeee) {
        device.log('[IAS] Coordinator IEEE:', coordIeee);

        // Try to write CIE Address (may not be needed on Homey v8.1.1+)
        try {
          const cieWriteSuccess = await this.ieeeManager.writeCieAddress(iasZone, {
            maxRetries: 3,
            verify: true
          });
          
          if (cieWriteSuccess) {
            device.log('[IAS] ✅ CIE Address written and verified');
          } else {
            device.log('[IAS] ⚠️ CIE Address write may have failed');
          }
        } catch (err) {
          device.log('[IAS] ⚠️ CIE Address write failed (may be OK):', err.message);
        }
      } else {
        // v5.5.807: Don't fail - Homey v8.1.1+ handles CIE address during pairing
        device.log('[IAS] ℹ️ Could not get coordinator IEEE - Homey v8.1.1+ handles this during pairing');
        device.log('[IAS] ℹ️ Continuing with enrollment response only...');
      }

      // CRITICAL: Setup listener BEFORE sending response (Peter pattern)
      // This is SYNCHRONOUS, NO delays!
      iasZone.onZoneEnrollRequest = () => {
        device.log('[IAS] 📥 Zone Enroll Request received!');

        // IMMEDIATE response (Peter's synchronous fix)
        iasZone.zoneEnrollResponse({
          enrollResponseCode: 0, // Success
          zoneId: 10
        }).then(() => {
          device.log('[IAS] ✅ Enrollment Response sent (via request)');
          this.enrolled = true;
        }).catch(err => {
          device.log('[IAS] ⚠️ Response failed:', err.message);
        });
      };

      // CRITICAL: Proactive enrollment response (SDK best practice + Peter)
      // "driver could send Zone Enroll Response when initializing
      // regardless of having received Zone Enroll Request"
      try {
        await iasZone.zoneEnrollResponse({
          enrollResponseCode: 0,
          zoneId: 10
        });
        device.log('[IAS] ✅ Proactive Enrollment Response sent');
        this.enrolled = true;
      } catch (err) {
        device.log('[IAS] ⚠️ Proactive response failed (may be OK):', err.message);
      }

      // Setup status change listener
      this._setupStatusListener(iasZone);

      // Verify enrollment
      await this._wait(2000); // Give device time to process
      const finalState = await iasZone.readAttributes(['zoneState']).catch(err => {
        device.log('[IAS] Could not verify zoneState:', err.message);
        return null;
      });
      if (finalState?.zoneState === 'enrolled') {
        device.log('[IAS] 🎉 ENROLLMENT SUCCESS!');
        this.enrolled = true;
        return true;
      } else {
        device.log('[IAS] ⚠️ Enrollment uncertain, state:', finalState?.zoneState);
        // Consider it enrolled anyway if we got here without errors
        this.enrolled = true;
        return true;
      }

    } catch (err) {
      const errorMsg = err.message || '';

      // v5.5.181: Special handling for Zigbee startup error
      if (errorMsg.includes('opstarten') || errorMsg.includes('starting up')) {
        device.log('[IAS] ⏳ Zigbee not ready, will retry after delay...');
        // Use longer delay for Zigbee startup errors
        const delay = 5000; // 5 seconds
        if (this.enrollmentAttempts < this.maxRetries) {
          await this._wait(delay);
          return this.enrollIASZone();
        }
      }

      device.error(`[IAS] ❌ Enrollment attempt ${this.enrollmentAttempts}/${this.maxRetries} failed:`, err.message);

      // Retry with exponential backoff if we haven't exceeded max retries
      if (this.enrollmentAttempts < this.maxRetries) {
        const delay = this.baseDelay * Math.pow(2, this.enrollmentAttempts - 1);
        device.log(`[IAS] 🔄 Retrying enrollment in ${delay}ms...`);
        await this._wait(delay);
        return this.enrollIASZone(); // Recursive retry
      } else {
        device.error('[IAS] ❌ All enrollment attempts exhausted!');
        // Mark as enrolled anyway to prevent blocking device functionality
        this.enrolled = true;
        return false;
      }
    }
  }

  /**
   * Get IEEE Address with retry logic - v4.10.0
   * NEW: Retries with delay if initial attempts fail
   */
  async _getIEEEAddressWithRetry(maxAttempts = 3) {
    const device = this.device;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const ieeeAddress = await this._getIEEEAddress();

      if (ieeeAddress) {
        device.log(`[IAS] ✅ IEEE address obtained on attempt ${attempt}`);
        return ieeeAddress;
      }

      if (attempt < maxAttempts) {
        const delay = 500 * attempt; // Progressive delay: 500ms, 1000ms, 1500ms
        device.log(`[IAS] ⚠️ IEEE attempt ${attempt} failed, retrying in ${delay}ms...`);
        await this._wait(delay);
      }
    }

    device.error(`[IAS] ❌ Failed to get IEEE address after ${maxAttempts} attempts`);
    return null;
  }

  /**
   * Get IEEE Address (multi-method like Peter)
   */
  async _getIEEEAddress() {
    const device = this.device;

    // Method 1: zclNode.ieeeAddr (SDK3 property name!)
    if (device.zclNode?.ieeeAddr) {
      device.log('[IAS] IEEE from zclNode.ieeeAddr');
      return device.zclNode.ieeeAddr;
    }

    // Method 1b: zclNode.ieeeAddress (fallback)
    if (device.zclNode?.ieeeAddress) {
      device.log('[IAS] IEEE from zclNode.ieeeAddress');
      return device.zclNode.ieeeAddress;
    }

    // Method 2: Homey Zigbee API (SDK3) - getNode()
    try {
      if (device.homey?.zigbee?.getNode) {
        const node = await device.homey.zigbee.getNode(device);
        if (node?.ieeeAddress) {
          device.log('[IAS] IEEE from homey.zigbee.getNode()');
          return node.ieeeAddress;
        }
      }
    } catch (err) {
      device.log('[IAS] homey.zigbee.getNode() failed:', err.message);
    }

    // Method 3: getData
    const data = device.getData?.();
    if (data?.ieeeAddress) {
      device.log('[IAS] IEEE from getData().ieeeAddress');
      return data.ieeeAddress;
    }

    // Method 4: Try reading from Basic cluster
    try {
      const endpoint = device.zclNode?.endpoints?.[1];
      if (endpoint?.clusters?.basic) {
        const attrs = await endpoint.clusters.basic.readAttributes(['ieeeAddress']).catch(() => null);
        if (attrs?.ieeeAddress) {
          device.log('[IAS] IEEE from Basic cluster');
          return attrs.ieeeAddress;
        }
      }
    } catch (err) {
      device.log('[IAS] Basic cluster read failed:', err.message);
    }

    device.error('[IAS] ❌ ALL methods failed to get IEEE address!');
    return null;
  }

  /**
   * Setup status change listener (for button press, motion, etc.)
   */
  _setupStatusListener(iasZone) {
    const device = this.device;

    try {
      iasZone.onZoneStatusChangeNotification = (payload) => {
        device.log('[IAS] 🚨 Status Change:', payload);

        // v5.2.76: CRITICAL FIX - Bitmap object handling
        // The zoneStatus is a Bitmap object with properties, NOT a number
        // Method 1: Direct property access (preferred for zigbee-clusters Bitmap)
        // Method 2: Numeric conversion with proper bit extraction
        const zoneStatus = payload.zoneStatus;

        let alarm1, alarm2, tamper, batteryLow, supervisionReports, restoreReports, trouble, acMains;

        if (zoneStatus && typeof zoneStatus === 'object') {
          // Method 1: Direct property access from Bitmap object
          // zigbee-clusters Bitmap has properties like .alarm1, .alarm2, etc.
          alarm1 = Boolean(zoneStatus.alarm1);
          alarm2 = Boolean(zoneStatus.alarm2);
          tamper = Boolean(zoneStatus.tamper);
          batteryLow = Boolean(zoneStatus.batteryLow || zoneStatus.battery);
          supervisionReports = Boolean(zoneStatus.supervisionReports);
          restoreReports = Boolean(zoneStatus.restoreReports);
          trouble = Boolean(zoneStatus.trouble);
          acMains = Boolean(zoneStatus.acMains || zoneStatus.ac);

          device.log('[IAS] Bitmap direct access - alarm1:', zoneStatus.alarm1, '→', alarm1);
        } else if (typeof zoneStatus === 'number') {
          // Method 2: Numeric bit extraction (fallback)
          alarm1 = !!(zoneStatus & 0x01);
          alarm2 = !!(zoneStatus & 0x02);
          tamper = !!(zoneStatus & 0x04);
          batteryLow = !!(zoneStatus & 0x08);
          supervisionReports = !!(zoneStatus & 0x10);
          restoreReports = !!(zoneStatus & 0x20);
          trouble = !!(zoneStatus & 0x40);
          acMains = !!(zoneStatus & 0x80);

          device.log('[IAS] Numeric extraction - value:', zoneStatus);
        } else {
          // Method 3: Last resort - try to extract from string representation
          const str = String(zoneStatus);
          alarm1 = str.includes('alarm1');
          alarm2 = str.includes('alarm2');
          tamper = str.includes('tamper');
          batteryLow = str.includes('battery');
          supervisionReports = false;
          restoreReports = false;
          trouble = str.includes('trouble');
          acMains = str.includes('ac');

          device.log('[IAS] String parsing fallback - str:', str, 'alarm1:', alarm1);
        }

        device.log('[IAS] Parsed:', {
          alarm1, alarm2, tamper, batteryLow,
          supervisionReports, restoreReports, trouble, acMains
        });

        // Trigger capabilities based on zone type
        this._handleZoneStatusChange({
          alarm1, alarm2, tamper, batteryLow
        });
      };

      device.log('[IAS] ✅ Status listener registered');
    } catch (err) {
      device.error('[IAS] ⚠️ Listener setup failed:', err.message);
    }
  }

  /**
   * Handle zone status changes (button press, motion, etc.)
   */
  _handleZoneStatusChange(status) {
    const device = this.device;

    try {
      // Button press (alarm1)
      if (status.alarm1) {
        device.log('[IAS] 🔘 BUTTON PRESSED!');

        // Trigger flow - use driver-specific trigger ID
        if (device.homey?.flow && device.driver?.id) {
          const triggerIds = [
            `${device.driver.id}_pressed`,           // Standard format
            `${device.driver.id}_button_pressed`,    // Alternative format
            'button_pressed',                         // Generic fallback
          ];

          for (const triggerId of triggerIds) {
            try {
              const trigger = device.homey.flow.getDeviceTriggerCard(triggerId);
              if (trigger) {
                device.log(`[IAS] Triggering flow: ${triggerId}`);
                trigger.trigger(device, {}, {}).catch(err =>
                  device.log(`[IAS] Flow ${triggerId} failed:`, err.message)
                );
                break; // Success, stop trying
              }
            } catch (err) {
              // Try next trigger ID
            }
          }
        }

        // Set alarm capability
        if (device.hasCapability('alarm_generic')) {
          device.setCapabilityValue('alarm_generic', true).catch(() => { });
          // Reset after 1s
          setTimeout(() => {
            device.setCapabilityValue('alarm_generic', false).catch(() => { });
          }, 1000);
        }
      }

      // Motion detected (alarm1)
      if (status.alarm1 && device.hasCapability('alarm_motion')) {
        device.log('[IAS] 🚶 MOTION DETECTED!');
        device.setCapabilityValue('alarm_motion', true).catch(() => { });

        // v5.2.83: Log to data logger
        if (device.dpLogger && typeof device.dpLogger.logMotion === 'function') {
          device.dpLogger.logMotion(true);
        }

        // Auto-reset after timeout
        const timeout = device.getSetting?.('motion_timeout') || 30;
        setTimeout(() => {
          device.setCapabilityValue('alarm_motion', false).catch(() => { });
          // v5.2.83: Log motion cleared
          if (device.dpLogger && typeof device.dpLogger.logMotion === 'function') {
            device.dpLogger.logMotion(false);
          }
        }, timeout * 1000);
      }

      // Contact sensor (alarm1)
      if (status.alarm1 && device.hasCapability('alarm_contact')) {
        device.log('[IAS] 🚪 CONTACT OPENED!');
        device.setCapabilityValue('alarm_contact', true).catch(() => { });
      } else if (!status.alarm1 && device.hasCapability('alarm_contact')) {
        device.setCapabilityValue('alarm_contact', false).catch(() => { });
      }

      // Tamper alarm
      if (status.tamper && device.hasCapability('alarm_tamper')) {
        device.log('[IAS] ⚠️ TAMPER!');
        device.setCapabilityValue('alarm_tamper', true).catch(() => { });
      }

      // Battery low - trigger measure_battery update
      if (status.batteryLow) {
        device.log('[IAS] 🔋 BATTERY LOW WARNING!');
        // Set measure_battery to low percentage if not already set
        if (device.hasCapability('measure_battery')) {
          device.getCapabilityValue('measure_battery').then(current => {
            if (current === null || current > 20) {
              device.setCapabilityValue('measure_battery', 15).catch(() => { });
              device.log('[IAS] ⚠️ Battery set to 15% (low warning)');
            }
          }).catch(() => { });
        }
        // Also set alarm_battery if available (SDK3 compatible)
        if (device.hasCapability('alarm_battery')) {
          device.setCapabilityValue('alarm_battery', true).catch(() => { });
        }
      }

    } catch (err) {
      device.error('[IAS] Status handling failed:', err);
    }
  }

  /**
   * v5.5.181: Wait for Zigbee to be ready
   * Prevents crash during Homey startup when Zigbee stack isn't ready yet
   * Error: "Zigbee is aan het opstarten. Wacht even en probeer het opnieuw."
   */
  async _waitForZigbeeReady(maxWaitMs = 30000) {
    const device = this.device;
    const startTime = Date.now();
    const checkInterval = 2000; // Check every 2 seconds

    while (Date.now() - startTime < maxWaitMs) {
      try {
        // Try a simple operation to check if Zigbee is ready
        const endpoint = device.zclNode?.endpoints?.[1];
        if (endpoint?.clusters?.basic) {
          // If we can access clusters, Zigbee is likely ready
          device.log('[IAS] ✅ Zigbee stack appears ready');
          return true;
        }
      } catch (err) {
        const errorMsg = err.message || '';
        // Check for Zigbee startup error (Dutch/English)
        if (errorMsg.includes('opstarten') || errorMsg.includes('starting up')) {
          device.log(`[IAS] ⏳ Zigbee starting up, waiting ${checkInterval}ms...`);
          await this._wait(checkInterval);
          continue;
        }
        // Other error - might be ready but cluster unavailable
        device.log('[IAS] Zigbee check error:', errorMsg);
      }

      // Wait before next check
      await this._wait(checkInterval);
    }

    device.log('[IAS] ⚠️ Zigbee ready check timeout, proceeding anyway...');
    return false;
  }

  /**
   * Wait utility
   */
  _wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if enrolled
   */
  isEnrolled() {
    return this.enrolled;
  }

  /**
   * v5.5.795: Verify CIE address was written correctly
   * Reads back the iasCIEAddress attribute to confirm
   */
  async _verifyCIEAddress(iasZone, expectedAddress) {
    const device = this.device;
    
    try {
      const attrs = await iasZone.readAttributes(['iasCIEAddress']);
      const writtenAddress = attrs?.iasCIEAddress;
      
      if (writtenAddress) {
        // Normalize addresses for comparison (remove colons, lowercase)
        const normalize = (addr) => String(addr).replace(/:/g, '').toLowerCase();
        const expected = normalize(expectedAddress);
        const actual = normalize(writtenAddress);
        
        if (expected === actual) {
          device.log('[IAS] ✅ CIE Address verified:', writtenAddress);
          return true;
        } else {
          device.log('[IAS] ⚠️ CIE Address mismatch!');
          device.log('[IAS]    Expected:', expectedAddress);
          device.log('[IAS]    Got:', writtenAddress);
          return false;
        }
      } else {
        device.log('[IAS] ⚠️ CIE Address read returned null');
        return false;
      }
    } catch (err) {
      device.log('[IAS] ⚠️ CIE Address verification failed:', err.message);
      // Not a critical failure - some devices don't support reading this attribute
      return true;
    }
  }

  /**
   * v5.5.795: Interpret raw IAS Zone status for flow triggers
   * Useful when status doesn't come through standard listener
   * @param {Buffer|number} rawStatus - Raw zone status
   * @returns {Object} Parsed status bits
   */
  interpretRawStatus(rawStatus) {
    let statusValue;
    
    if (Buffer.isBuffer(rawStatus)) {
      statusValue = rawStatus.length >= 2 ? rawStatus.readUInt16LE(0) : rawStatus.readUInt8(0);
    } else if (typeof rawStatus === 'number') {
      statusValue = rawStatus;
    } else if (typeof rawStatus === 'object' && rawStatus !== null) {
      // Already parsed object
      return rawStatus;
    } else {
      return null;
    }

    return {
      raw: statusValue,
      alarm1: !!(statusValue & 0x0001),
      alarm2: !!(statusValue & 0x0002),
      tamper: !!(statusValue & 0x0004),
      batteryLow: !!(statusValue & 0x0008),
      supervisionReports: !!(statusValue & 0x0010),
      restoreReports: !!(statusValue & 0x0020),
      trouble: !!(statusValue & 0x0040),
      acMains: !!(statusValue & 0x0080),
      test: !!(statusValue & 0x0100),
      batteryDefect: !!(statusValue & 0x0200)
    };
  }

  /**
   * v5.5.795: Get enrollment diagnostics for debugging
   * @returns {Object} Diagnostic information
   */
  async getDiagnostics() {
    const device = this.device;
    const diagnostics = {
      enrolled: this.enrolled,
      enrollmentAttempts: this.enrollmentAttempts,
      ieeeAddress: null,
      zoneState: null,
      zoneType: null,
      zoneId: null,
      cieCIEAddress: null
    };

    try {
      diagnostics.ieeeAddress = await this._getIEEEAddress();

      const endpoint = device.zclNode?.endpoints?.[1];
      const iasZone = endpoint?.clusters?.iasZone;
      
      if (iasZone) {
        const attrs = await iasZone.readAttributes([
          'zoneState', 'zoneType', 'zoneId', 'iasCIEAddress'
        ]).catch(() => ({}));
        
        diagnostics.zoneState = attrs.zoneState;
        diagnostics.zoneType = attrs.zoneType;
        diagnostics.zoneId = attrs.zoneId;
        diagnostics.cieCIEAddress = attrs.iasCIEAddress;
      }
    } catch (err) {
      diagnostics.error = err.message;
    }

    return diagnostics;
  }
}

module.exports = IASZoneManager;
