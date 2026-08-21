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


/**
 * Coerce zigbee-clusters IAS zoneStatus to uint16.
 * Homey may deliver Number, Buffer, JSON-Buffer `{type:'Buffer',data:[]}`,
 * or a Bitmap object (`{alarm1, alarm2, ...}`).
 * Returns null when unparseable — callers MUST NOT treat that as 0
 * (Peter #2184: `0x${zoneStatus}` logged `0x[object Object]`, bits all false,
 * overlay Tuya DP1 → contact pulse).
 */
function coerceZoneStatusToUint16(raw) {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? (raw & 0xFFFF) : null;
  }
  if (typeof raw === 'boolean') {
    return raw ? 1 : 0;
  }
  if (Buffer.isBuffer(raw)) {
    if (raw.length === 0) {
      return null;
    }
    return (raw.length >= 2 ? raw.readUInt16LE(0) : raw[0]) & 0xFFFF;
  }
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s || s === '[object Object]') {
      return null;
    }
    const n = (s.startsWith('0x') || s.startsWith('0X')) ? parseInt(s, 16) : parseInt(s, 10);
    return Number.isFinite(n) ? (n & 0xFFFF) : null;
  }
  if (typeof raw === 'object') {
    if (raw.type === 'Buffer' && Array.isArray(raw.data)) {
      return coerceZoneStatusToUint16(Buffer.from(raw.data));
    }
    if (Array.isArray(raw) && raw.length > 0 && raw.every((x) => Number.isInteger(x))) {
      return coerceZoneStatusToUint16(Buffer.from(raw));
    }
    if ('alarm1' in raw || 'alarm2' in raw) {
      return (
        (raw.alarm1 ? 0x0001 : 0)
        | (raw.alarm2 ? 0x0002 : 0)
        | (raw.tamper ? 0x0004 : 0)
        | ((raw.batteryLow || raw.battery) ? 0x0008 : 0)
        | ((raw.supervisionReports || raw.supervision) ? 0x0010 : 0)
        | ((raw.restoreReports || raw.restore) ? 0x0020 : 0)
        | (raw.trouble ? 0x0040 : 0)
        | ((raw.acMains || raw.ac) ? 0x0080 : 0)
        | (raw.test ? 0x0100 : 0)
        | (raw.batteryDefect ? 0x0200 : 0)
      ) & 0xFFFF;
    }
    if (typeof raw.get === 'function') {
      const a1 = raw.get('alarm1');
      const a2 = raw.get('alarm2');
      if (a1 !== undefined || a2 !== undefined) {
        return ((a1 ? 1 : 0) | (a2 ? 2 : 0)) & 0xFFFF;
      }
    }
    if (typeof raw.value === 'number' && Number.isFinite(raw.value)) {
      return raw.value & 0xFFFF;
    }
  }
  return null;
}

function formatZoneStatusHex(raw) {
  const n = coerceZoneStatusToUint16(raw);
  if (n === null) {
    const kind = Buffer.isBuffer(raw) ? 'Buffer' : Object.prototype.toString.call(raw);
    return `INVALID(${kind})`;
  }
  return `0x${n.toString(16)}`;
}

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
    if (!this.iasCluster) {return;}

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
    if (!this.iasCluster) {return;}

    // Listen for zone status changes
    this.iasCluster.onZoneStatusChangeNotification = async (payload) => {
      const { zoneStatus, extendedStatus, zoneId, delay } = payload || {};

      const coerced = coerceZoneStatusToUint16(zoneStatus);
      this.device.log(`[IAS-ZONE] 📥 Zone status change: ${formatZoneStatusHex(zoneStatus)}`);

      // Peter #2184: invalid Buffer/object parse used to yield alarm1=false and overlay Tuya DP1
      if (coerced === null) {
        this.device.log('[IAS-ZONE] Ignoring invalid zoneStatus — do not overlay DP1');
        return;
      }

      // Parse status bits
      const status = this._parseZoneStatus(coerced);
      this.device.log('[IAS-ZONE] Parsed status:', JSON.stringify(status));

      // Update capabilities based on status
      await this._updateCapabilitiesFromStatus(status);
    };

    // Also listen for attribute reports
    this.iasCluster.on('attr.zoneStatus', async (zoneStatus) => {
      const coerced = coerceZoneStatusToUint16(zoneStatus);
      this.device.log(`[IAS-ZONE] 📥 Zone status attribute: ${formatZoneStatusHex(zoneStatus)}`);
      if (coerced === null) {
        this.device.log('[IAS-ZONE] Ignoring invalid zoneStatus — do not overlay DP1');
        return;
      }
      const status = this._parseZoneStatus(coerced);
      await this._updateCapabilitiesFromStatus(status);
    });

    this.device.log('[IAS-ZONE] ✅ Status change handler registered');
  }

  /**
   * Send enrollment response (for first init or re-enrollment)
   */
  async _sendEnrollmentResponse() {
    if (!this.iasCluster) {return;}

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
    const n = typeof status === 'number' ? status : coerceZoneStatusToUint16(status);
    if (n === null || !Number.isFinite(n)) {
      return null;
    }
    return {
      alarm1: !!(n & ZoneStatusBits.ALARM1),
      alarm2: !!(n & ZoneStatusBits.ALARM2),
      tamper: !!(n & ZoneStatusBits.TAMPER),
      batteryLow: !!(n & ZoneStatusBits.BATTERY),
      supervision: !!(n & ZoneStatusBits.SUPERVISION),
      restore: !!(n & ZoneStatusBits.RESTORE),
      trouble: !!(n & ZoneStatusBits.TROUBLE),
      acMains: !!(n & ZoneStatusBits.AC_MAINS),
      test: !!(n & ZoneStatusBits.TEST),
      batteryDefect: !!(n & ZoneStatusBits.BATTERY_DEFECT)
    };
  }

  /**
   * Update device capabilities based on zone status
   */
  async _updateCapabilitiesFromStatus(status) {
    if (!status) {
      return;
    }
    const capabilities = this.device;

      // Main alarm -> appropriate capability based on zone type
      // Prefer safeSetCapabilityValue (L14) when available — historical crash harden
      const setCap = async (cap, val) => {
        if (typeof capabilities.safeSetCapabilityValue === 'function') {
          await capabilities.safeSetCapabilityValue(cap, val);
        } else if (typeof capabilities.setCapabilityValue === 'function') {
          await capabilities.setCapabilityValue(cap, val).catch(() => {});
        }
      };

      if (status.alarm1 !== undefined) {
        // Motion sensors
        if (capabilities.hasCapability('alarm_motion')) {
          await setCap('alarm_motion', status.alarm1);
        }
        // Contact sensors
        if (capabilities.hasCapability('alarm_contact')) {
          await setCap('alarm_contact', status.alarm1);
        }
        // Water sensors
        if (capabilities.hasCapability('alarm_water')) {
          await setCap('alarm_water', status.alarm1);
        }
        // Smoke sensors
        if (capabilities.hasCapability('alarm_smoke')) {
          await setCap('alarm_smoke', status.alarm1);
        }
        // CO sensors
        if (capabilities.hasCapability('alarm_co')) {
          await setCap('alarm_co', status.alarm1);
        }
        // Vibration sensors
        if (capabilities.hasCapability('alarm_generic.vibration')) {
          await setCap('alarm_generic.vibration', status.alarm1);
        }
        // SOS / personal emergency zone types
        if (capabilities.hasCapability('alarm_sos')) {
          await setCap('alarm_sos', status.alarm1);
        }
      }

      // Tamper detection
      if (status.tamper !== undefined && capabilities.hasCapability('alarm_tamper')) {
        await setCap('alarm_tamper', status.tamper);
      }

      // Battery low alarm
      if (status.batteryLow !== undefined && capabilities.hasCapability('alarm_battery')) {
        await setCap('alarm_battery', status.batteryLow);
      }

    this.device.log('[IAS-ZONE] ✅ Capabilities updated');
  }

  /**
   * Request current zone status (for polling)
   */
  async requestStatus() {
    if (!this.iasCluster) {return null;}

    try {
      const result = await this.iasCluster.readAttributes(['zoneStatus']);
      const status = this._parseZoneStatus(result?.zoneStatus);
      if (!status) {
        this.device.log('[IAS-ZONE] Ignoring invalid zoneStatus read — do not overlay DP1');
        return null;
      }
      await this._updateCapabilitiesFromStatus(status);
      return status;
    } catch (err) {
      this.device.log('[IAS-ZONE] Could not read zone status:', err.message);
      return null;
    }
  }
}

module.exports = IASZoneEnhanced;
module.exports.coerceZoneStatusToUint16 = coerceZoneStatusToUint16;
module.exports.ZoneStatusBits = ZoneStatusBits;
module.exports.ZoneTypes = ZoneTypes;
