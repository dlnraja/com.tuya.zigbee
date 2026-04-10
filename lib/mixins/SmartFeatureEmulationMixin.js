'use strict';

/**
 * SmartFeatureEmulationMixin - v1.0.0
 * 
 * Part of v7.2.5 "Autonomous Awakening" update.
 * Provides advanced hub-like features to generic Zigbee devices through software algorithms.
 * 
 * Features:
 * - 🔒 Software Child Lock (Control Lock)
 * - ⏲️ Auto-Off Timer (Precision Cutoff)
 * - 🔌 Overload Protection (Safety Cutoff)
 * - 🌙 Night Mode Behavior (Auto-Dim)
 * - 🏖️ Vacation Mode (Presence Simulation)
 */
const SmartFeatureEmulationMixin = {

  /**
   * Initialize Smart Features
   */
  _initSmartFeatures() {
    this._smartFeatures = this.getSettings();
    this.log('[SMART-FEATURES] 🧠 Initializing Intelligent Compensation Layer...');

    // 1. Setup Auto-Off Timer
    this._setupAutoOffTimer();

    // 2. Setup Overload Protection
    this._setupOverloadProtection();

    // 3. Setup Vacation Mode
    this._setupVacationMode();

    // 4. Setup Motion Cooldown (Adaptive)
    this._setupMotionCooldown();

    // 5. Setup Double Click Emulation
    this._setupDoubleClickEmulation();
  },

  /**
   * 🏃 ADAPTIVE MOTION COOLDOWN
   * Holds the alarm_motion 'true' for a specified duration if hardware resets too fast.
   */
  _setupMotionCooldown() {
    if (!this.hasCapability('alarm_motion')) return;

    this.on('capability:alarm_motion', (value) => {
      const holdTime = parseInt(this.getSetting('emulated_motion_hold')) || 0;
      if (value === false && holdTime > 0) {
        if (this._motionCooldownActive) return; // Prevent loop

        this._motionCooldownActive = true;
        this.log(`[SMART-PIR] 🏃 Holding motion 'ON' for ${holdTime}s...`);
        
        // Re-trigger 'true' immediately
        this.setCapabilityValue('alarm_motion', true).catch(() => {});

        if (this._motionCooldownTimeout) this.clearTimeout(this._motionCooldownTimeout);
        this._motionCooldownTimeout = this.setTimeout(() => {
          this.log('[SMART-PIR] ⏱️ Hold time expired, clearing motion.');
          this._motionCooldownActive = false;
          this.setCapabilityValue('alarm_motion', false).catch(() => {});
        }, holdTime * 1000);
      }
    });
  },

  /**
   * 🔘 DOUBLE CLICK EMULATION
   * Emulates double-click events for buttons that only support 'Press'.
   */
  _setupDoubleClickEmulation() {
    if (!this.driver.id.includes('button') && !this.driver.id.includes('remote')) return;
    
    this.on('capability:button', (value) => {
      const now = Date.now();
      const interval = parseInt(this.getSetting('double_click_interval')) || 400;
      
      if (this._lastClickTime && (now - this._lastClickTime) < interval) {
        this.log('[SMART-BUTTON] 🔘 Double-click detected (Software)');
        const card = this._getFlowCard('button_double_clicked');
        if (card) card.trigger(this, {}, {}).catch(() => {});
        this._lastClickTime = 0; // Reset
      } else {
        this._lastClickTime = now;
      }
    });
  },

  /**
   * ⏲️ AUTO-OFF TIMER
   * Automatically turns off the device after a specified duration.
   */
  _setupAutoOffTimer() {
    this.on('capability:onoff', (value) => {
      // 1. Handle Night Mode (v7.2.5)
      if (value === true) {
        this._applyNightMode().catch(e => this.error('[SMART-NIGHT] Error:', e.message));
      }

      // 2. Handle Auto-off timer
      const duration = parseInt(this.getSetting('auto_off_duration')) || 0;
      if (value === true && duration > 0) {
        this.log(`[SMART-TIMER] ⏲️ Auto-off scheduled in ${duration} minutes`);
        if (this._autoOffTimeout) this.clearTimeout(this._autoOffTimeout);
        this._autoOffTimeout = this.setTimeout(async () => {
          this.log('[SMART-TIMER] ⏲️ Reached duration, turning off...');
          await this._safeSetCapability('onoff', false);
        }, duration * 60000);
      } else if (this._autoOffTimeout) {
        this.clearTimeout(this._autoOffTimeout);
      }
    });
  },

  /**
   * 🔌 OVERLOAD PROTECTION
   * Turns off the device if power consumption exceeds a safety threshold.
   */
  _setupOverloadProtection() {
    this.on('capability:measure_power', async (value) => {
      const threshold = parseFloat(this.getSetting('overload_threshold')) || 0;
      if (threshold > 0 && value > threshold) {
        this.log(`[SMART-SAFETY] 🚨 OVERLOAD DETECTED: ${value}W > ${threshold}W!`);
        await this._safeSetCapability('onoff', false);
        
        // Notification
        if (this.homey.notifications) {
          this.homey.notifications.createNotification({
            excerpt: `[${this.getName()}] 🚨 Safety Cutoff Active: Overload detected (${value}W). Device turned off for protection.`
          }).catch(() => {});
        }
      }
    });
  },

  /**
   * 🔒 SOFTWARE CHILD LOCK
   * Intercepts manual state changes and reverts them if the device is "locked".
   * Note: This detects changes from the device itself vs from Homey.
   */
  _handleChildLock(capability, value, source = 'tuya') {
    const isLocked = this.getSetting('enable_software_child_lock') === true;
    if (isLocked && source === 'tuya') {
       this.log(`[SMART-LOCK] 🔒 Blocked manual action on ${capability}. Reverting...`);
       // Revert to previous value after a short delay
       const prevValue = this.getCapabilityValue(capability);
       this.setTimeout(() => {
         this.setCapabilityValue(capability, prevValue).catch(() => {});
       }, 500);
       return true; // Handled
    }
    return false;
  },

  /**
   * 🌙 NIGHT MODE BEHAVIOR
   * Automatically dims the light when turned on during night hours.
   */
  async _applyNightMode() {
    if (this.getSetting('enable_night_mode') !== true) return;
    if (!this.hasCapability('dim')) return;

    const now = new Date();
    const hour = now.getHours();
    const nightStart = parseInt(this.getSetting('night_mode_start')) || 22;
    const nightEnd = parseInt(this.getSetting('night_mode_end')) || 7;

    const isNight = nightStart > nightEnd 
      ? (hour >= nightStart || hour < nightEnd)
      : (hour >= nightStart && hour < nightEnd);

    if (isNight) {
      const nightDim = (parseInt(this.getSetting('night_mode_dim')) || 10) / 100;
      this.log(`[SMART-NIGHT] 🌙 Night Mode Active: Dimming to ${nightDim * 100}%`);
      await this._safeSetCapability('dim', nightDim);
    }
  },

  /**
   * 🏖️ VACATION MODE (Presence Simulation)
   * Randomly toggles the device to simulate presence when the user is away.
   */
  _setupVacationMode() {
    if (this.getSetting('enable_vacation_mode') !== true) return;
    
    this.log('[SMART-VACATION] 🏖️ Vacation Mode Active: Presence simulation starting...');
    
    // Check every hour
    if (this._vacationTimer) this.clearInterval(this._vacationTimer);
    this._vacationTimer = this.setInterval(() => {
      // 10% chance to toggle every hour if it's evening (18:00 - 23:00)
      const hour = new Date().getHours();
      if (hour >= 18 && hour <= 23 && Math.random() < 0.15) {
        const target = !this.getCapabilityValue('onoff');
        this.log(`[SMART-VACATION] 🎲 Random toggle: target=${target}`);
        this._safeSetCapability('onoff', target);
      }
    }, 3600000);
  },

  /**
   * Cleanup
   */
  _destroySmartFeatures() {
    if (this._autoOffTimeout) this.clearTimeout(this._autoOffTimeout);
    if (this._vacationTimer) this.clearInterval(this._vacationTimer);
  }

};

module.exports = SmartFeatureEmulationMixin;
