'use strict';

/**
 * IAS ZONE ENHANCED MANAGER
 *
 * Improved IAS Zone (cluster 1280/0x500) handling for:
 * - Contact sensors
 * - Motion/PIR sensors
 * - Smoke detectors
 * - Water leak sensors
 * - Vibration sensors
 *
 * Based on Homey Apps SDK documentation:
 * https://apps.developer.homey.app/wireless/zigbee
 *
 * Features:
 * - Automatic zone enrollment
 * - Zone status change notifications
 * - Battery supervision
 * - Tamper detection
 *
 * v5.3.30 - Enhanced implementation
 */

const { CLUSTER } = require('zigbee-clusters');

// IAS Zone status bit masks
const ZoneStatusBits = {
  ALARM1: 0x0001,         // Zone alarm 1 (main alarm)
  ALARM2: 0x0002,         // Zone alarm 2 (secondary)
  TAMPER: 0x0004,         // Tamper detected
  BATTERY: 0x0008,        // Low battery
  SUPERVISION: 0x0010,    // Supervision reports
  RESTORE: 0x0020,        // Restore reports
  TROUBLE: 0x0040,        // Trouble
  AC_MAINS: 0x0080,       // AC mains fault
  TEST: 0x0100,           // Test mode
  BATTERY_DEFECT: 0x0200  // Battery defect
};

// IAS Zone types
const ZoneTypes = {
  0x0000: 'standard_cie',
  0x000D: 'motion_sensor',
  0x0015: 'contact_switch',
  0x0028: 'fire_sensor',
  0x002A: 'water_sensor',
  0x002B: 'co_sensor',
  0x002C: 'personal_emergency',
  0x002D: 'vibration_sensor',
  0x010F: 'remote_control',
  0x0115: 'key_fob',
  0x021D: 'keypad',
  0x0225: 'standard_warning',
  0x0226: 'glass_break',
  0x0229: 'security_repeater'
};

class IASZoneEnhanced {
  /**
   * @param {ZigBeeDevice} device - Homey ZigBee device instance
   */
  constructor(device) {
    this.device = device;
    this.enrolled = false;
    this.zoneId = 0;
    this.zoneType = null;
    this.iasCluster = null;
  }

  /**
   * Initialize IAS Zone for the device
   * Call this in onNodeInit after zclNode is available
   */
  async initialize(zclNode) {
    if (!zclNode) {
      this.device.log('[IAS-ZONE] No zclNode provided');
      return false;
    }

    // Find IAS Zone cluster on any endpoint
    let iasEndpoint = null;
    let iasCluster = null;

    for (const [epId, endpoint] of Object.entries(zclNode.endpoints || {})) {
      const cluster = endpoint.clusters?.iasZone ||
        endpoint.clusters?.['1280'] ||
        endpoint.clusters?.[1280] ||
        endpoint.clusters?.[0x0500];
      if (cluster) {
        iasEndpoint = parseInt(epId);
        iasCluster = cluster;
        break;
      }
    }

    if (!iasCluster) {
      this.device.log('[IAS-ZONE] No IAS Zone cluster found');
      return false;
    }

    this.iasCluster = iasCluster;
    this.device.log(`[IAS-ZONE] ✅ Found IAS Zone cluster on endpoint ${iasEndpoint}`);

    // Read zone type if available
    try {
      const zoneType = await iasCluster.readAttributes(['zoneType']);
      this.zoneType = zoneType?.zoneType;
      const typeName = ZoneTypes[this.zoneType] || 'unknown';
      this.device.log(`[IAS-ZONE] Zone type: 0x${this.zoneType?.toString(16)} (${typeName})`);
    } catch (err) {
      this.device.log('[IAS-ZONE] Could not read zone type:', err.message);
    }

    // Setup enrollment handler (SDK documented pattern)
    this._setupEnrollmentHandler();

    // Setup zone status change handler
    this._setupStatusChangeHandler();

    // Send enrollment response on first init (in case we missed the request)
    if (this.device.isFirstInit?.()) {
      await this._sendEnrollmentResponse();
    }

    return true;
  }

  /**
   * Setup handler for zone enrollment requests
   * This is the SDK-documented pattern
   */
  _setupEnrollmentHandler() {
    if (!this.iasCluster) return;

    // SDK Pattern: respond to enrollment requests
    this.iasCluster.onZoneEnrollRequest = async (payload) => {
      this.device.log('[IAS-ZONE] 📥 Received enrollment request:', payload);

      // Generate zone ID (1-254, avoid 0 and 255)
      this.zoneId = Math.floor(Math.random() * 253) + 1;

      try {
        await this.iasCluster.zoneEnrollResponse({
          enrollResponseCode: 0, // Success
          zoneId: this.zoneId
        });
        this.enrolled = true;
        this.device.log(`[IAS-ZONE] ✅ Enrollment response sent (zoneId: ${this.zoneId})`);
      } catch (err) {
        this.device.error('[IAS-ZONE] Enrollment response failed:', err.message);
      }
    };

    this.device.log('[IAS-ZONE] ✅ Enrollment handler registered');
  }

  /**
   * Setup handler for zone status changes
   */
  _setupStatusChangeHandler() {
    if (!this.iasCluster) return;

    // Listen for zone status changes
    this.iasCluster.onZoneStatusChangeNotification = async (payload) => {
      const { zoneStatus, extendedStatus, zoneId, delay } = payload || {};

      this.device.log(`[IAS-ZONE] 📥 Zone status change: 0x${zoneStatus?.toString(16) || '0'}`);

      // Parse status bits
      const status = this._parseZoneStatus(zoneStatus || 0);
      this.device.log('[IAS-ZONE] Parsed status:', JSON.stringify(status));

      // Update capabilities based on status
      await this._updateCapabilitiesFromStatus(status);
    };

    // Also listen for attribute reports
    this.iasCluster.on('attr.zoneStatus', async (zoneStatus) => {
      this.device.log(`[IAS-ZONE] 📥 Zone status attribute: 0x${zoneStatus?.toString(16) || '0'}`);
      const status = this._parseZoneStatus(zoneStatus || 0);
      await this._updateCapabilitiesFromStatus(status);
    });

    this.device.log('[IAS-ZONE] ✅ Status change handler registered');
  }

  /**
   * Send enrollment response (for first init or re-enrollment)
   */
  async _sendEnrollmentResponse() {
    if (!this.iasCluster) return;

    this.zoneId = Math.floor(Math.random() * 253) + 1;

    try {
      await this.iasCluster.zoneEnrollResponse({
        enrollResponseCode: 0, // Success
        zoneId: this.zoneId
      });
      this.enrolled = true;
      this.device.log(`[IAS-ZONE] ✅ Initial enrollment response sent (zoneId: ${this.zoneId})`);
    } catch (err) {
      // Common for devices that are already enrolled
      this.device.log('[IAS-ZONE] ℹ️ Enrollment response:', err.message);
    }
  }

  /**
   * Parse zone status bits into readable object
   */
  _parseZoneStatus(status) {
    return {
      alarm1: !!(status & ZoneStatusBits.ALARM1),
      alarm2: !!(status & ZoneStatusBits.ALARM2),
      tamper: !!(status & ZoneStatusBits.TAMPER),
      batteryLow: !!(status & ZoneStatusBits.BATTERY),
      supervision: !!(status & ZoneStatusBits.SUPERVISION),
      restore: !!(status & ZoneStatusBits.RESTORE),
      trouble: !!(status & ZoneStatusBits.TROUBLE),
      acMains: !!(status & ZoneStatusBits.AC_MAINS),
      test: !!(status & ZoneStatusBits.TEST),
      batteryDefect: !!(status & ZoneStatusBits.BATTERY_DEFECT)
    };
  }

  /**
   * Update device capabilities based on zone status
   */
  async _updateCapabilitiesFromStatus(status) {
    const capabilities = this.device;

    // Main alarm -> appropriate capability based on zone type
    if (status.alarm1 !== undefined) {
      // Motion sensors
      if (capabilities.hasCapability('alarm_motion')) {
        await capabilities.setCapabilityValue('alarm_motion', status.alarm1).catch(() => { });
      }
      // Contact sensors
      if (capabilities.hasCapability('alarm_contact')) {
        await capabilities.setCapabilityValue('alarm_contact', status.alarm1).catch(() => { });
      }
      // Water sensors
      if (capabilities.hasCapability('alarm_water')) {
        await capabilities.setCapabilityValue('alarm_water', status.alarm1).catch(() => { });
      }
      // Smoke sensors
      if (capabilities.hasCapability('alarm_smoke')) {
        await capabilities.setCapabilityValue('alarm_smoke', status.alarm1).catch(() => { });
      }
      // CO sensors
      if (capabilities.hasCapability('alarm_co')) {
        await capabilities.setCapabilityValue('alarm_co', status.alarm1).catch(() => { });
      }
      // Vibration sensors
      if (capabilities.hasCapability('alarm_vibration')) {
        await capabilities.setCapabilityValue('alarm_vibration', status.alarm1).catch(() => { });
      }
    }

    // Tamper detection
    if (status.tamper !== undefined && capabilities.hasCapability('alarm_tamper')) {
      await capabilities.setCapabilityValue('alarm_tamper', status.tamper).catch(() => { });
    }

    // Battery low alarm
    if (status.batteryLow !== undefined && capabilities.hasCapability('alarm_battery')) {
      await capabilities.setCapabilityValue('alarm_battery', status.batteryLow).catch(() => { });
    }

    this.device.log('[IAS-ZONE] ✅ Capabilities updated');
  }

  /**
   * Request current zone status (for polling)
   */
  async requestStatus() {
    if (!this.iasCluster) return null;

    try {
      const result = await this.iasCluster.readAttributes(['zoneStatus']);
      const status = this._parseZoneStatus(result?.zoneStatus || 0);
      await this._updateCapabilitiesFromStatus(status);
      return status;
    } catch (err) {
      this.device.log('[IAS-ZONE] Could not read zone status:', err.message);
      return null;
    }
  }
}

module.exports = IASZoneEnhanced;
module.exports.ZoneStatusBits = ZoneStatusBits;
module.exports.ZoneTypes = ZoneTypes;
