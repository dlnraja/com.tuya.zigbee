'use strict';

const Homey = require('homey');
const VirtualPresenceDetector = require('../../lib/presence/VirtualPresenceDetector');
const { PRESENCE_STATE } = require('../../lib/presence/VirtualPresenceDetector');

/**
 * Virtual Presence Detector Device
 *
 * v1.0.0: Virtual device that infers room presence from multiple device signals.
 * This is NOT a Zigbee device - it is a software-only virtual device that
 * monitors capability changes from other Homey devices in the same room.
 *
 * Capabilities:
 *   - alarm_motion (boolean): Whether presence is currently detected
 *   - measure_presence_confidence (number, 0-100): Current confidence score
 *   - measure_presence_duration (number, minutes): How long presence has been active
 *
 * Flow Cards:
 *   - Trigger: "Presence detected in room"
 *   - Trigger: "Presence cleared in room"
 *   - Condition: "Room is occupied"
 *   - Action: "Set presence in room"
 *   - Action: "Clear presence in room"
 */
class PresenceDetectorDevice extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('[PRESENCE_DEVICE] Initializing...');

    this._destroyed = false;

    // Load settings
    const settings = this.getSettings();
    const monitoredDevices = settings.monitored_devices || [];

    // Create the detection engine
    this._detector = new VirtualPresenceDetector(this.homey, {
      deviceId: this.getData()?.id || this.id,
      monitoredDeviceIds: monitoredDevices,
      presenceThreshold: settings.presence_threshold || 40,
      absenceThreshold: settings.absence_threshold || 10,
      timeoutMs: (settings.timeout_minutes || 10) * 60000,
      decayHalfLifeMs: (settings.decay_half_life_seconds || 300) * 1000,
      timeOfDay: {
        enabled: settings.time_of_day_enabled || false,
        nightStartHour: settings.night_start_hour ?? 23,
        nightEndHour: settings.night_end_hour ?? 6,
        nightMultiplier: settings.night_multiplier ?? 0.7,
      },
      logger: (msg) => this.log(msg),
    });

    // Wire up events
    this._wireEvents();

    // Set initial capabilities
    await this._initCapabilities();

    // Start detection
    await this._detector.start();

    // Register settings change listener
    this.registerSettingListener('monitored_devices', async (value) => {
      this.log(`[PRESENCE_DEVICE] Monitored devices updated: ${value?.length || 0} devices`);
      await this._restartDetection();
    });

    this.log(`[PRESENCE_DEVICE] Ready - monitoring ${monitoredDevices.length} devices`);
  }

  /**
   * Wire up detector events to capability updates and flow card triggers.
   * @private
   */
  _wireEvents() {
    // Presence detected
    this._detector.on('presence_detected', async (data) => {
      this.log(`[PRESENCE_DEVICE] Presence detected (confidence: ${data.confidence}%)`);

      // Update capabilities
      await this.safesetCapability('alarm_motion', true);
      await this.safesetCapability('measure_presence_confidence', data.confidence);
      await this.safesetCapability('measure_presence_duration', 0);

      // Trigger flow card
      try {
        const triggerCard = this.homey.flow.getDeviceTriggerCard('virtual_presence_detected');
        await triggerCard.trigger(this, {
          confidence: data.confidence,
          timestamp: data.timestamp,
        });
      } catch (err) {
        this.error('[PRESENCE_DEVICE] Failed to trigger presence_detected:', err.message);
      }
    });

    // Presence cleared
    this._detector.on('presence_cleared', async (data) => {
      this.log(`[PRESENCE_DEVICE] Presence cleared (duration: ${data.durationMinutes} min)`);

      // Update capabilities
      await this.safesetCapability('alarm_motion', false);
      await this.safesetCapability('measure_presence_confidence', 0);
      await this.safesetCapability('measure_presence_duration', 0);

      // Trigger flow card
      try {
        const triggerCard = this.homey.flow.getDeviceTriggerCard('virtual_presence_cleared');
        await triggerCard.trigger(this, {
          duration_minutes: data.durationMinutes,
          timestamp: data.timestamp,
        });
      } catch (err) {
        this.error('[PRESENCE_DEVICE] Failed to trigger presence_cleared:', err.message);
      }
    });

    // Confidence updates
    this._detector.on('confidence', async (data) => {
      await this.safesetCapability('measure_presence_confidence', data.confidence);

      // Update presence duration periodically
      if (this._detector.isPresent) {
        await this.safesetCapability('measure_presence_duration', this._detector.presenceDurationMinutes);
      }
    });
  }

  /**
   * Initialize device capabilities with default values.
   * @private
   */
  async _initCapabilities() {
    try {
      await this.safesetCapability('alarm_motion', false);
      await this.safesetCapability('measure_presence_confidence', 0);
      await this.safesetCapability('measure_presence_duration', 0);
    } catch (err) {
      this.error('[PRESENCE_DEVICE] Failed to init capabilities:', err.message);
    }
  }

  /**
   * Safe setCapabilityValue that checks _destroyed flag.
   * Follows the v8.5.0 pattern from TuyaZigbeeDevice.
   * @private
   */
  async safesetCapability(capability, value) {
    if (this._destroyed) return;
    try {
      await this.safeSetCapabilityValue(capability, value);
    } catch (err) {
      if (!this._destroyed) {
        this.error(`[PRESENCE_DEVICE] Failed to set ${capability}:`, err.message);
      }
    }
  }

  /**
   * onSettings is called when user changes device settings.
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('[PRESENCE_DEVICE] Settings changed:', changedKeys);

    // Apply changed settings
    if (this._detector) {
      this._detector.updateSettings(newSettings);
    }

    // If monitored devices changed, restart detection
    if (changedKeys.includes('monitored_devices')) {
      await this._restartDetection();
    }
  }

  /**
   * Restart the detection engine with updated device list.
   * @private
   */
  async _restartDetection() {
    if (this._detector) {
      await this._detector.stop();
    }

    const settings = this.getSettings();
    const monitoredDevices = settings.monitored_devices || [];

    this._detector = new VirtualPresenceDetector(this.homey, {
      deviceId: this.getData()?.id || this.id,
      monitoredDeviceIds: monitoredDevices,
      presenceThreshold: settings.presence_threshold || 40,
      absenceThreshold: settings.absence_threshold || 10,
      timeoutMs: (settings.timeout_minutes || 10) * 60000,
      decayHalfLifeMs: (settings.decay_half_life_seconds || 300) * 1000,
      timeOfDay: {
        enabled: settings.time_of_day_enabled || false,
        nightStartHour: settings.night_start_hour ?? 23,
        nightEndHour: settings.night_end_hour ?? 6,
        nightMultiplier: settings.night_multiplier ?? 0.7,
      },
      logger: (msg) => this.log(msg),
    });

    this._wireEvents();
    await this._detector.start();
  }

  /**
   * onDeleted is called when the user deletes the device.
   */
  async onDeleted() {
    this._destroyed = true;
    await super.onDeleted();
    this._destroyed = true;
    if (this._detector) {
      await this._detector.stop();
      this._detector = null;
    }
    this.log('[PRESENCE_DEVICE] Deleted');
  }

  /**
   * onUninit is called when the app is unloaded.
   */
  async onUninit() {
    this._destroyed = true;
    if (this._detector) {
      await this._detector.stop();
      this._detector = null;
    }
  }

  // ─── Public API for Flow Cards ────────────────────────────────────────────

  /**
   * Force presence state (called by flow card action).
   */
  async forcePresent() {
    if (this._detector) {
      this._detector.forcePresent();
    }
  }

  /**
   * Force clear state (called by flow card action).
   */
  async forceClear() {
    if (this._detector) {
      this._detector.forceClear();
    }
  }

  /**
   * Get current presence state (called by flow card condition).
   * @returns {boolean}
   */
  isPresent() {
    return this._detector ? this._detector.isPresent : false;
  }

  /**
   * Get current confidence score (called by flow card condition).
   * @returns {number}
   */
  getConfidence() {
    return this._detector ? this._detector.confidence : 0;
  }

  /**
   * Get presence duration in minutes.
   * @returns {number}
   */
  getPresenceDuration() {
    return this._detector ? this._detector.presenceDurationMinutes : 0;
  }

  /**
   * Get detailed status for diagnostics.
   * @returns {Object}
   */
  getPresenceStatus() {
    return this._detector ? this._detector.getStatus() : null;
  }
}

module.exports = PresenceDetectorDevice;
