// File: lib/HeimanIasDevice.js
'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * HEIMAN IAS DEVICE BASE CLASS
 *
 * Base class for Heiman IAS (Intruder Alarm System) Zigbee devices.
 * Handles sirens, smoke/CO detectors, alarm panels, strobe lights, fog machines.
 *
 * Supported ZCL Clusters:
 * - 0x0001 (genPowerCfg) - Battery monitoring
 * - 0x0500 (ssIasZone) - IAS Zone for detectors
 * - 0x0501 (ssIasAce) - IAS ACE for keypads/panels
 * - 0x0502 (ssIasWd) - IAS WD for sirens/strobes
 *
 * Supported Heiman Devices:
 * - HS1SA/HS2SA/HS3SA: Smoke Detectors
 * - HS1CA/HS3CA: CO Detectors
 * - HS1CG/HS3CG: Gas Detectors
 * - HS1WL/HS3WL: Water Leak Sensors
 * - HS2WD-E: Siren + Strobe
 * - SRHMP-I1: Smart Siren Indoor
 * - HS2EB/SOS-EF: Emergency/SOS Buttons
 *
 * @author Dylan Rajasekaram
 * @version 5.3.38
 */
class HeimanIasDevice extends ZigBeeDevice {

  /**
   * Initialize Heiman IAS device
   * Must be called in onNodeInit() of derived classes
   */
  async onHeimanInit() {
    this.log('[HeimanIAS] Initializing Heiman IAS device...');

    // Store device info
    this._heimanManufacturer = this.getSetting('zb_manufacturer_name') || 'Unknown';
    this._heimanModel = this.getSetting('zb_product_id') || 'Unknown';

    this.log(`[HeimanIAS] Manufacturer: ${this._heimanManufacturer}, Model: ${this._heimanModel}`);

    // Initialize IAS Zone (0x0500) for detectors
    await this._initIasZone();

    // Initialize IAS WD (0x0502) for sirens/strobes
    await this._initIasWd();

    // Initialize Battery monitoring
    await this._initBattery();

    // Initialize alarm capabilities
    await this._initAlarmCapabilities();

    this.log('[HeimanIAS] Heiman IAS device initialized');
  }

  // ===========================================================================
  // IAS ZONE (0x0500) - Detectors
  // ===========================================================================

  /**
   * Initialize IAS Zone cluster for detectors
   * @private
   */
  async _initIasZone() {
    try {
      const endpoint = this.zclNode.endpoints[1];
      if (!endpoint?.clusters?.iasZone) {
        this.log('[HeimanIAS] No IAS Zone cluster found');
        return;
      }

      this.log('[HeimanIAS] Configuring IAS Zone...');

      // Read zone state and type
      try {
        const zoneState = await endpoint.clusters.iasZone.readAttributes(['zoneState', 'zoneType', 'zoneStatus']);
        this.log('[HeimanIAS] IAS Zone state:', JSON.stringify(zoneState));

        // Determine device type from zone type
        this._iasZoneType = zoneState.zoneType;
        this.log(`[HeimanIAS] Zone Type: 0x${(this._iasZoneType || 0).toString(16)}`);
      } catch (e) {
        this.log('[HeimanIAS] Could not read zone attributes:', e.message);
      }

      // Auto-enroll if not enrolled
      try {
        await this._enrollIasZone(endpoint.clusters.iasZone);
      } catch (e) {
        this.log('[HeimanIAS] Zone enrollment skipped:', e.message);
      }

      // Register zone status listener
      endpoint.clusters.iasZone.on('attr.zoneStatus', this.onIasZoneReport.bind(this));
      endpoint.clusters.iasZone.on('zoneStatusChangeNotification', payload => {
        this.onIasZoneReport(payload.zoneStatus);
      });

      this.log('[HeimanIAS] IAS Zone listener registered');

    } catch (err) {
      this.error('[HeimanIAS] IAS Zone init error:', err.message);
    }
  }

  /**
   * Enroll device in IAS Zone
   * @param {Object} iasZoneCluster - IAS Zone cluster instance
   * @private
   */
  async _enrollIasZone(iasZoneCluster) {
    try {
      const zoneState = await iasZoneCluster.readAttributes(['zoneState']);

      if (zoneState.zoneState === 0) {
        this.log('[HeimanIAS] Attempting IAS Zone enrollment...');
        await iasZoneCluster.zoneEnrollResponse({
          enrollResponseCode: 0, // Success
          zoneId: 1
        });
        this.log('[HeimanIAS] IAS Zone enrolled');
      } else {
        this.log('[HeimanIAS] Already enrolled in IAS Zone');
      }
    } catch (err) {
      this.log('[HeimanIAS] Zone enrollment response:', err.message);
    }
  }

  /**
   * Handle IAS Zone status report (0x0500)
   * @param {number} zoneStatus - 16-bit bitmap
   */
  onIasZoneReport(zoneStatus) {
    this.log(`[HeimanIAS] Zone status: 0x${zoneStatus.toString(16)}`);

    const alarm1 = (zoneStatus & 0x0001) > 0;     // bit 0 - Alarm 1
    const alarm2 = (zoneStatus & 0x0002) > 0;     // bit 1 - Alarm 2
    const tamper = (zoneStatus & 0x0004) > 0;     // bit 2 - Tamper
    const batteryLow = (zoneStatus & 0x0008) > 0; // bit 3 - Battery low
    const supervisionNotify = (zoneStatus & 0x0010) > 0; // bit 4
    const restoreNotify = (zoneStatus & 0x0020) > 0;     // bit 5
    const trouble = (zoneStatus & 0x0040) > 0;           // bit 6
    const acMains = (zoneStatus & 0x0080) > 0;           // bit 7
    const test = (zoneStatus & 0x0100) > 0;              // bit 8
    const batteryDefect = (zoneStatus & 0x0200) > 0;     // bit 9

    // Update smoke alarm
    if (this.hasCapability('alarm_smoke')) {
      this.setCapabilityValue('alarm_smoke', alarm1).catch(this.error);
      if (alarm1) {
        this.emit('heiman_alarm_triggered', { type: 'smoke', active: true });
        this._triggerAlarmFlow('smoke');
      }
    }

    // Update CO alarm
    if (this.hasCapability('alarm_co')) {
      this.setCapabilityValue('alarm_co', alarm1).catch(this.error);
      if (alarm1) {
        this.emit('heiman_alarm_triggered', { type: 'co', active: true });
        this._triggerAlarmFlow('co');
      }
    }

    // Update gas alarm
    if (this.hasCapability('alarm_gas')) {
      this.setCapabilityValue('alarm_gas', alarm1).catch(this.error);
      if (alarm1) {
        this.emit('heiman_alarm_triggered', { type: 'gas', active: true });
        this._triggerAlarmFlow('gas');
      }
    }

    // Update water alarm
    if (this.hasCapability('alarm_water')) {
      this.setCapabilityValue('alarm_water', alarm1).catch(this.error);
      if (alarm1) {
        this.emit('heiman_alarm_triggered', { type: 'water', active: true });
        this._triggerAlarmFlow('water');
      }
    }

    // Update motion alarm (for PIR sensors)
    if (this.hasCapability('alarm_motion')) {
      this.setCapabilityValue('alarm_motion', alarm1).catch(this.error);
    }

    // Update contact alarm (for door/window sensors)
    if (this.hasCapability('alarm_contact')) {
      this.setCapabilityValue('alarm_contact', alarm1).catch(this.error);
    }

    // Update tamper alarm
    if (this.hasCapability('alarm_tamper')) {
      this.setCapabilityValue('alarm_tamper', tamper).catch(this.error);
    }

    // Update battery alarm
    if (this.hasCapability('alarm_battery')) {
      this.setCapabilityValue('alarm_battery', batteryLow || batteryDefect).catch(this.error);
    }

    this.log(`[HeimanIAS] Parsed: alarm1=${alarm1}, alarm2=${alarm2}, tamper=${tamper}, batteryLow=${batteryLow}`);
  }

  /**
   * Trigger alarm flow card
   * @param {string} alarmType - Type of alarm (smoke, co, gas, water)
   * @private
   */
  _triggerAlarmFlow(alarmType) {
    try {
      const triggerCard = this.homey.flow.getDeviceTriggerCard(`heiman_${alarmType}_alarm`);
      if (triggerCard) {
        triggerCard.trigger(this, { alarm_type: alarmType }, {})
          .then(() => this.log(`[HeimanIAS] Flow triggered: ${alarmType} alarm`))
          .catch(err => this.error('[HeimanIAS] Flow trigger error:', err));
      }
    } catch (e) {
      // Flow card may not exist
    }
  }

  // ===========================================================================
  // IAS WD (0x0502) - Sirens & Strobes
  // ===========================================================================

  /**
   * Initialize IAS WD cluster for sirens/strobes
   * @private
   */
  async _initIasWd() {
    try {
      const endpoint = this.zclNode.endpoints[1];
      if (!endpoint?.clusters?.iasWd) {
        this.log('[HeimanIAS] No IAS WD cluster found (not a siren)');
        return;
      }

      this.log('[HeimanIAS] Configuring IAS WD (Siren/Strobe)...');

      // Register siren on/off capability
      if (this.hasCapability('onoff')) {
        this.registerCapabilityListener('onoff', this.onSirenToggle.bind(this));
        this.log('[HeimanIAS] Siren on/off registered');
      }

      // Register volume capability
      if (this.hasCapability('volume_set')) {
        this.registerCapabilityListener('volume_set', this.onSirenVolume.bind(this));
        this.log('[HeimanIAS] Siren volume registered');
      }

      // Initialize siren state
      this._sirenLevel = this.getStoreValue('siren_volume') || 0x03; // High
      this._strobeDuty = this.getStoreValue('strobe_duty') || 50;

      this.log('[HeimanIAS] IAS WD configured');

    } catch (err) {
      this.error('[HeimanIAS] IAS WD init error:', err.message);
    }
  }

  /**
   * Toggle siren on/off
   * @param {boolean} on - Turn siren on or off
   */
  async onSirenToggle(on) {
    this.log(`[HeimanIAS] Siren toggle: ${on}`);

    try {
      const endpoint = this.zclNode.endpoints[1];
      if (!endpoint?.clusters?.iasWd) {
        this.error('[HeimanIAS] No IAS WD cluster for siren control');
        throw new Error('Siren not supported');
      }

      if (on) {
        // Start warning
        await endpoint.clusters.iasWd.startWarning({
          warningMode: 0x01,        // 0=Stop, 1=Burglar, 2=Fire, 3=Emergency
          warningDuration: 300,     // Duration in seconds (5 minutes)
          strobeDutyCircle: this._strobeDuty,
          strobeLevel: 0x02         // 0=Low, 1=Medium, 2=High, 3=Very High
        });
        this.log('[HeimanIAS] Siren started');
      } else {
        // Stop warning
        await endpoint.clusters.iasWd.startWarning({
          warningMode: 0x00,        // Stop
          warningDuration: 0,
          strobeDutyCircle: 0,
          strobeLevel: 0x00
        });
        this.log('[HeimanIAS] Siren stopped');
      }

    } catch (err) {
      this.error('[HeimanIAS] Siren toggle error:', err.message);
      throw err;
    }
  }

  /**
   * Set siren volume level
   * @param {number} volume - Volume 0-100 (mapped to IAS WD levels)
   */
  async onSirenVolume(volume) {
    // IAS WD uses enum levels:
    // 0 = Low
    // 1 = Medium
    // 2 = High
    // 3 = Very High
    let level;
    if (volume > 75) {
      level = 0x03; // Very High
    } else if (volume > 50) {
      level = 0x02; // High
    } else if (volume > 25) {
      level = 0x01; // Medium
    } else {
      level = 0x00; // Low
    }

    this._sirenLevel = level;
    await this.setStoreValue('siren_volume', level);

    this.log(`[HeimanIAS] Siren volume: ${volume}% → level ${level}`);
  }

  /**
   * Trigger squawk (short beep) on siren
   * @param {number} mode - 0=Armed, 1=Disarmed
   */
  async triggerSquawk(mode = 0) {
    this.log(`[HeimanIAS] Squawk mode: ${mode}`);

    try {
      const endpoint = this.zclNode.endpoints[1];
      if (!endpoint?.clusters?.iasWd) {
        throw new Error('No IAS WD cluster');
      }

      await endpoint.clusters.iasWd.squawk({
        squawkMode: mode,
        strobe: true,
        squawkLevel: this._sirenLevel
      });

      this.log('[HeimanIAS] Squawk triggered');

    } catch (err) {
      this.error('[HeimanIAS] Squawk error:', err.message);
    }
  }

  // ===========================================================================
  // BATTERY MONITORING
  // ===========================================================================

  /**
   * Initialize battery monitoring
   * @private
   */
  async _initBattery() {
    if (!this.hasCapability('measure_battery')) {
      return;
    }

    this.log('[HeimanIAS] Configuring battery monitoring...');

    try {
      const endpoint = this.zclNode.endpoints[1];
      if (!endpoint?.clusters?.powerConfiguration) {
        this.log('[HeimanIAS] No genPowerCfg cluster, battery via Tuya DP?');
        return;
      }

      // Register battery report listener
      endpoint.clusters.powerConfiguration.on('attr.batteryPercentageRemaining',
        this.onBatteryReport.bind(this));

      // Try to read current value
      try {
        const batteryAttrs = await endpoint.clusters.powerConfiguration.readAttributes(['batteryPercentageRemaining']);
        if (batteryAttrs.batteryPercentageRemaining !== undefined) {
          this.onBatteryReport(batteryAttrs.batteryPercentageRemaining);
        }
      } catch (e) {
        this.log('[HeimanIAS] Could not read battery:', e.message);
      }

      this.log('[HeimanIAS] Battery listener registered');

    } catch (err) {
      this.error('[HeimanIAS] Battery init error:', err.message);
    }
  }

  /**
   * Handle battery report from genPowerCfg
   * @param {number} rawValue - ZCL value (0-200, representing 0-100% in 0.5% steps)
   */
  onBatteryReport(rawValue) {
    const percentage = Math.round(rawValue / 2);
    const clampedPercentage = Math.min(100, Math.max(0, percentage));

    this.log(`[HeimanIAS] Battery: ${clampedPercentage}%`);

    if (this.hasCapability('measure_battery')) {
      this.setCapabilityValue('measure_battery', clampedPercentage).catch(this.error);
    }

    if (this.hasCapability('alarm_battery')) {
      this.setCapabilityValue('alarm_battery', clampedPercentage < 15).catch(this.error);
    }

    this.emit('heiman_battery', clampedPercentage);
  }

  // ===========================================================================
  // ALARM CAPABILITIES
  // ===========================================================================

  /**
   * Initialize alarm capabilities
   * @private
   */
  async _initAlarmCapabilities() {
    // Set initial values for alarm capabilities
    const alarmCapabilities = [
      'alarm_smoke', 'alarm_co', 'alarm_gas', 'alarm_water',
      'alarm_motion', 'alarm_contact', 'alarm_tamper', 'alarm_battery'
    ];

    for (const cap of alarmCapabilities) {
      if (this.hasCapability(cap)) {
        const currentValue = this.getCapabilityValue(cap);
        if (currentValue === null) {
          await this.setCapabilityValue(cap, false).catch(this.error);
        }
        this.log(`[HeimanIAS] Alarm capability ${cap} initialized`);
      }
    }
  }

  /**
   * Trigger alarm manually (for testing or smoke launcher devices)
   * @param {string} alarmType - Type of alarm to trigger
   */
  async triggerAlarm(alarmType = 'smoke') {
    this.log(`[HeimanIAS] Manual alarm trigger: ${alarmType}`);

    const capabilityMap = {
      smoke: 'alarm_smoke',
      co: 'alarm_co',
      gas: 'alarm_gas',
      water: 'alarm_water'
    };

    const capability = capabilityMap[alarmType];
    if (!capability || !this.hasCapability(capability)) {
      this.error(`[HeimanIAS] No ${alarmType} alarm capability`);
      return;
    }

    // Simulate zone status with alarm1 set
    this.onIasZoneReport(0x0001);

    this.log(`[HeimanIAS] ${alarmType} alarm triggered manually`);
  }

  /**
   * Reset/silence alarm
   */
  async resetAlarm() {
    this.log('[HeimanIAS] Resetting alarms...');

    // Reset all alarm capabilities to false
    const alarmCapabilities = ['alarm_smoke', 'alarm_co', 'alarm_gas', 'alarm_water'];

    for (const cap of alarmCapabilities) {
      if (this.hasCapability(cap)) {
        await this.setCapabilityValue(cap, false).catch(this.error);
      }
    }

    // Turn off siren if present
    if (this.hasCapability('onoff')) {
      await this.setCapabilityValue('onoff', false).catch(this.error);
      try {
        await this.onSirenToggle(false);
      } catch (e) {
        // Ignore if no siren
      }
    }

    this.log('[HeimanIAS] Alarms reset');
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  /**
   * Get device manufacturer
   * @returns {string}
   */
  getManufacturer() {
    return this._heimanManufacturer;
  }

  /**
   * Get device model
   * @returns {string}
   */
  getModel() {
    return this._heimanModel;
  }

  /**
   * Check if device is Heiman brand
   * @returns {boolean}
   */
  isHeiman() {
    const mfr = (this._heimanManufacturer || '').toLowerCase();
    return mfr.includes('heiman') || mfr.includes('hs');
  }

  /**
   * Get IAS Zone type
   * @returns {number|null}
   */
  getZoneType() {
    return this._iasZoneType || null;
  }

  /**
   * Get zone type description
   * @returns {string}
   */
  getZoneTypeDescription() {
    const zoneTypes = {
      0x0000: 'Standard CIE',
      0x000D: 'Motion Sensor',
      0x0015: 'Contact Switch',
      0x0028: 'Fire Sensor',
      0x002A: 'Water Sensor',
      0x002B: 'CO Sensor',
      0x002C: 'Personal Emergency',
      0x002D: 'Vibration/Movement',
      0x010F: 'Remote Control',
      0x0115: 'Key Fob',
      0x021D: 'Keypad',
      0x0225: 'Standard Warning',
      0x0226: 'Glass Break',
      0x0227: 'Security Repeater'
    };

    return zoneTypes[this._iasZoneType] || `Unknown (0x${(this._iasZoneType || 0).toString(16)})`;
  }
}

module.exports = HeimanIasDevice;
