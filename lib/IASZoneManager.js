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
    this.maxRetries = 3;
  }

  /**
   * Enroll IAS Zone - SYNCHRONOUS comme Peter v4.1.0
   * CRITICAL: Doit être appelé IMMÉDIATEMENT après pairing
   */
  async enrollIASZone() {
    const device = this.device;
    
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

      // Get IEEE address (multiple methods like Peter)
      const ieeeAddress = await this._getIEEEAddress();
      if (!ieeeAddress) {
        device.error('[IAS] ❌ Cannot get IEEE address!');
        return false;
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
      const finalState = await iasZone.readAttributes(['zoneState']).catch(() => null);
      if (finalState?.zoneState === 'enrolled') {
        device.log('[IAS] 🎉 ENROLLMENT SUCCESS!');
        this.enrolled = true;
        return true;
      } else {
        device.log('[IAS] ⚠️ Enrollment uncertain, state:', finalState?.zoneState);
        return false;
      }

    } catch (err) {
      device.error('[IAS] ❌ Enrollment failed:', err);
      return false;
    }
  }

  /**
   * Get IEEE Address (multi-method like Peter)
   */
  async _getIEEEAddress() {
    const device = this.device;
    
    // Method 1: zclNode
    if (device.zclNode?.ieeeAddress) {
      return device.zclNode.ieeeAddress;
    }

    // Method 2: Homey Zigbee
    if (device.homey?.zigbee?.ieeeAddress) {
      return device.homey.zigbee.ieeeAddress;
    }

    // Method 3: getData
    const data = device.getData?.();
    if (data?.ieeeAddress) {
      return data.ieeeAddress;
    }

    // Method 4: Try getIeeeAddress method
    try {
      if (typeof device.homey?.zigbee?.getIeeeAddress === 'function') {
        return await device.homey.zigbee.getIeeeAddress();
      }
    } catch (err) {
      device.log('[IAS] getIeeeAddress failed:', err.message);
    }

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
        
        // Trigger flow
        if (device.homey?.flow) {
          device.homey.flow.getDeviceTriggerCard('button_pressed')
            ?.trigger(device, {}, {})
            .catch(err => device.log('[IAS] Flow trigger failed:', err.message));
        }
        
        // Set alarm capability
        if (device.hasCapability('alarm_generic')) {
          device.setCapabilityValue('alarm_generic', true).catch(() => {});
          // Reset after 1s
          setTimeout(() => {
            device.setCapabilityValue('alarm_generic', false).catch(() => {});
          }, 1000);
        }
      }

      // Motion detected (alarm1)
      if (status.alarm1 && device.hasCapability('alarm_motion')) {
        device.log('[IAS] 🚶 MOTION DETECTED!');
        device.setCapabilityValue('alarm_motion', true).catch(() => {});
        
        // Auto-reset after timeout
        const timeout = device.getSetting?.('motion_timeout') || 30;
        setTimeout(() => {
          device.setCapabilityValue('alarm_motion', false).catch(() => {});
        }, timeout * 1000);
      }

      // Contact sensor (alarm1)
      if (status.alarm1 && device.hasCapability('alarm_contact')) {
        device.log('[IAS] 🚪 CONTACT OPENED!');
        device.setCapabilityValue('alarm_contact', true).catch(() => {});
      } else if (!status.alarm1 && device.hasCapability('alarm_contact')) {
        device.setCapabilityValue('alarm_contact', false).catch(() => {});
      }

      // Tamper alarm
      if (status.tamper && device.hasCapability('alarm_tamper')) {
        device.log('[IAS] ⚠️ TAMPER!');
        device.setCapabilityValue('alarm_tamper', true).catch(() => {});
      }

      // Battery low
      if (status.batteryLow) {
        device.log('[IAS] 🔋 BATTERY LOW!');
        if (device.hasCapability('alarm_battery')) {
          device.setCapabilityValue('alarm_battery', true).catch(() => {});
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
