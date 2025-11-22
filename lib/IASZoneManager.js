'use strict';

/**
 * IASZoneManager - Gestion enrollment IAS Zone pour buttons/sensors
 * Port du fix Peter v4.1.0 - Synchronous enrollment CRITICAL!
 * Résout: zoneState "notEnrolled" → Button press ne trigger pas
 */
class IASZoneManager {

  constructor(device) {
    this.device = device;
    this.enrolled = false;
    this.maxRetries = 5; // Increased from 3 to 5 (v4.10.0 improvement)
    this.baseDelay = 1000; // Base delay for exponential backoff
    this.enrollmentAttempts = 0;
  }

  /**
   * Enroll IAS Zone avec RETRY LOGIC - v4.10.0
   * CRITICAL: Doit être appelé IMMÉDIATEMENT après pairing
   * NEW: Exponential backoff pour gérer erreurs temporaires
   */
  async enrollIASZone() {
    const device = this.device;
    this.enrollmentAttempts++;

    try {
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

      // Get IEEE address (multiple methods with retry - v4.10.0)
      const ieeeAddress = await this._getIEEEAddressWithRetry();
      if (!ieeeAddress) {
        device.error('[IAS] ❌ Cannot get IEEE address after all attempts!');
        throw new Error('Failed to get IEEE address');
      }

      device.log('[IAS] IEEE Address:', ieeeAddress);

      // CRITICAL: Set CIE Address FIRST (Peter's fix pattern)
      try {
        await iasZone.writeAttributes({
          iasCIEAddress: ieeeAddress
        });
        device.log('[IAS] ✅ CIE Address written');
      } catch (err) {
        device.log('[IAS] ⚠️ CIE Address write failed (may be OK):', err.message);
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
      device.error(`[IAS] ❌ Enrollment attempt ${this.enrollmentAttempts}/${this.maxRetries} failed:`, err);

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

        const zoneStatus = payload.zoneStatus;

        // Parse zone status bits
        const alarm1 = !!(zoneStatus & 0x01); // Bit 0: Alarm 1
        const alarm2 = !!(zoneStatus & 0x02); // Bit 1: Alarm 2
        const tamper = !!(zoneStatus & 0x04); // Bit 2: Tamper
        const batteryLow = !!(zoneStatus & 0x08); // Bit 3: Battery
        const supervisionReports = !!(zoneStatus & 0x10); // Bit 4
        const restoreReports = !!(zoneStatus & 0x20); // Bit 5
        const trouble = !!(zoneStatus & 0x40); // Bit 6
        const acMains = !!(zoneStatus & 0x80); // Bit 7

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

        // Auto-reset after timeout
        const timeout = device.getSetting?.('motion_timeout') || 30;
        setTimeout(() => {
          device.setCapabilityValue('alarm_motion', false).catch(() => { });
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
}

module.exports = IASZoneManager;
