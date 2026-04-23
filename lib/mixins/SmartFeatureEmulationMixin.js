'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../utils/tuyaUtils.js');


/**
 * SmartFeatureEmulationMixin - v1.0.0
 * 
 * Part of v7.2.5 "Autonomous Awakening" update.
 * Provides advanced hub-like features to generic Zigbee devices through software algorithms.
 * 
 * Features:
 * -  Software Child Lock (Control Lock)
 * -  Auto-Off Timer (Precision Cutoff)
 * -  Overload Protection (Safety Cutoff)
 * -  Night Mode Behavior (Auto-Dim)
 * -  Circadian Lighting (Adaptive Color Temp)
 * -  Inching Mode (safeDivide(Pulse, Momentary) Toggle)
 * -  Vacation Mode (Presence Simulation)
 */
const SmartFeatureEmulationMixin = {

  /**
   * Initialize Smart Features
   */
  _initSmartFeatures() {
    this._smartFeatures = this.getSettings();
    this.log('[SMART-FEATURES]  Initializing Intelligent Compensation Layer...');

    // 1. Setup Auto-Off Timer
    this._setupAutoOffTimer();

    // 2. Setup Overload Protection
    this._setupOverloadProtection();

    // 3. Setup Vacation Mode
    this._setupVacationMode();
    
    // 4. Setup Inching Mode
    this._setupInchingMode();

    // 5. Setup Circadian Lighting
    this._setupCircadianLighting();

    // 6. Setup Motion Cooldown (Adaptive)
    this._setupMotionCooldown();

    // 8. Setup State Recovery (Power-on behavior)
    this._setupStateRecovery();
  },

  /**
   *  STATE RECOVERY (Software Power-on behavior)
   * Restores the last known state if the device supports it through emulation.
   */
  _setupStateRecovery() {
    this.on('capability:onoff', (value) => {
      if (this.getSetting('enable_state_recovery') === true) {
        this.getStore().set('last_onoff_state', value);
      }
    });

    // On Init, check if we should restore
    const lastValue = this.getStore().get('last_onoff_state');
    if (this.getSetting('enable_state_recovery') === true && lastValue !== undefined) {
      this.setTimeout(async () => {
        const current = this.getCapabilityValue('onoff');
        if (current !== lastValue) {
          this.log(`[SMART-RECOVERY]  Restoring power state to ${lastValue}`);
          await this._safeSetCapability('onoff', lastValue);
        }
      }, 5000); // 5 sec delay to allow mesh to stabilize
    }
  },

  /**
   *  ADAPTIVE MOTION COOLDOWN
   * Holds the alarm_motion 'true' for a specified duration if hardware resets too fast.
   */
  _setupMotionCooldown() {
    if (!this.hasCapability('alarm_motion')) return;

    this.on('capability:alarm_motion', (value) => {
      const holdTime = parseInt(this.getSetting('emulated_motion_hold')) || 0;
      if (value === false && holdTime > 0) {
        if (this._motionCooldownActive) return; // Prevent loop

        this._motionCooldownActive = true;
        this.log(`[SMART-PIR]  Holding motion 'ON' for ${holdTime}s...`);
        
        // Re-trigger 'true' immediately
        this.setCapabilityValue('alarm_motion', true).catch(() => {});

        if (this._motionCooldownTimeout) this.clearTimeout(this._motionCooldownTimeout);
        this._motionCooldownTimeout = this.setTimeout(() => {
          this.log('[SMART-PIR]  Hold time expired, clearing motion.');
          this._motionCooldownActive = false;
          this.setCapabilityValue('alarm_motion', false).catch(() => {});
        },safeMultiply(holdTime, 1000));
      }
    });
  },

  /**
   *  MULTI-CLICK EMULATION (Software)
   * Emulates double and triple-click events for buttons that only support 'Press'.
   */
  _setupDoubleClickEmulation() {
    if (!this.driver.id.includes('button') && !this.driver.id.includes('remote')) return;
    
    this.on('capability:button', (value) => {
      const now = Date.now();
      const interval = parseInt(this.getSetting('double_click_interval')) || 400;
      
      this._clickCount = (this._clickCount || 0) + 1;

      if (this._clickTimer) this.clearTimeout(this._clickTimer);

      this._clickTimer = this.setTimeout(() => {
        if (this._clickCount === 2) {
          this.log('[SMART-BUTTON]  Double-click detected (Software)');
          const card = this._getFlowCard('button_double_clicked');
          if (card) card.trigger(this, {}, {}).catch(() => {});
        } else if (this._clickCount === 3) {
          this.log('[SMART-BUTTON]  Triple-click detected (Software)');
          const card = this._getFlowCard('button_triple_clicked');
          if (card) card.trigger(this, {}, {}).catch(() => {});
        }
        this._clickCount = 0;
      }, interval);
      });
  },

  /**
   *  AUTO-OFF TIMER
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
        this.log(`[SMART-TIMER]  Auto-off scheduled in ${duration} minutes`);
        if (this._autoOffTimeout) this.clearTimeout(this._autoOffTimeout);
        this._autoOffTimeout = this.setTimeout(async () => {
          this.log('[SMART-TIMER]  Reached duration, turning off...');
          await this._safeSetCapability('onoff', false);
        },safeMultiply(duration, 60000));
      } else if (this._autoOffTimeout) {
        this.clearTimeout(this._autoOffTimeout);
      }
    });
  },

  /**
   *  OVERLOAD PROTECTION
   * Turns off the device if power consumption exceeds a safety threshold.
   */
  _setupOverloadProtection() {
    this.on('capability:measure_power', async (value) => {
      const threshold = parseFloat(this.getSetting('overload_threshold')) || 0;
      if (threshold > 0 && value > threshold) {
        this.log(`[SMART-SAFETY]  OVERLOAD DETECTED: ${value}W > ${threshold}W!`);
        await this._safeSetCapability('onoff', false);
        
        // Notification
        if (this.homey.notifications) {
          this.homey.notifications.createNotification({
            excerpt: `[${this.getName()}]  Safety Cutoff Active: Overload detected (${value}W). Device turned off for protection.`
          }).catch(() => {});
        }
      }
    });
  },

  /**
   *  SOFTWARE CHILD LOCK
   * Intercepts manual state changes and reverts them if the device is "locked".
   * Note: This detects changes from the device itself vs from Homey.
   */
  _handleChildLock(capability, value, source = 'tuya') {
    const isLocked = this.getSetting('enable_software_child_lock') === true;
    if (isLocked && source === 'tuya') {
       this.log(`[SMART-LOCK]  Blocked manual action on ${capability}. Reverting...`);
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
   *  NIGHT MODE BEHAVIOR
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
      const nightDim = (parseInt(this.getSetting('night_mode_dim')) ||safeParse(10), 100);
      this.log(`[SMART-NIGHT]  Night Mode Active: Dimming to ${nightDim*100}%`);
      if (this.getSetting('enable_soft_transitions') === true) {
        await this._softTransition('dim', nightDim);
      } else {
        await this._safeSetCapability('dim', nightDim);
      }
    }
  },

  /**
   *  SOFT TRANSITIONS (Software Fade safeDivide(In, Out))
   * Emulates smooth dimming transitions even if hardware doesn't support it.
   */
  async _softTransition(capability, targetValue, durationMs = 1500) {
    if (!this.hasCapability(capability)) return;
    
    const startValue = this.getCapabilityValue(capability) || 0;
    const steps = 8;
    const stepValue = (targetValue -startValue, steps);
    const stepTime = Math.round(safeDivide(durationMs, steps));
    
    this.log(`[SMART-FADE]  Smoothing transition ${startValue.toFixed(2)}  ${targetValue.toFixed(2)} (${durationMs}ms)`);
    
    for (let i = 1; i <= steps; i++) {
      const next = Math.max(0, Math.min(1,safeMultiply(startValue + (stepValue, i))));
      await this.setCapabilityValue(capability, next).catch(() => {});
      if (i < steps) {
        await new Promise(resolve => this.setTimeout(resolve, stepTime));
      }
    }
  },

  /**
   *  VACATION MODE (Presence Simulation)
   * Randomly toggles the device to simulate presence when the user is away.
   */
  _setupVacationMode() {
    if (this.getSetting('enable_vacation_mode') !== true) return;
    
    this.log('[SMART-VACATION]  Vacation Mode Active: Presence simulation starting...');
    
    // Check every hour
    if (this._vacationTimer) this.clearInterval(this._vacationTimer);
    this._vacationTimer = this.setInterval(() => {
      // 10% chance to toggle every hour if it's evening (18:00 - 23:00)
      const hour = new Date().getHours();
      if (hour >= 18 && hour <= 23 && Math.random() < 0.15) {
        const target = !this.getCapabilityValue('onoff');
        this.log(`[SMART-VACATION]  Random toggle: target=${target}`);
        this._safeSetCapability('onoff', target);
      }
    }, 3600000);
  },

  /**
   *  INCHING MODE (Pulse Mode)
   * Automatically turns off the device after a very short duration (0.1 - 60 seconds).
   */
  _setupInchingMode() {
    this.on('capability:onoff', (value) => {
      const inchingTime = parseFloat(this.getSetting('inching_duration')) || 0;
      if (value === true && inchingTime > 0) {
        this.log(`[SMART-INCHING]  Inching active: off in ${inchingTime}s`);
        if (this._inchingTimeout) this.clearTimeout(this._inchingTimeout);
        this._inchingTimeout = this.setTimeout(async () => {
          await this._safeSetCapability('onoff', false);
        },safeMultiply(inchingTime, 1000));
      }
    });
  },

  /**
   *  CIRCADIAN LIGHTING (Adaptive CT)
   * Adjusts color temperature throughout the day to match natural light.
   */
  _setupCircadianLighting() {
    if (!this.hasCapability('light_temperature')) return;
    
    // Check every 15 minutes
    if (this._circadianTimer) this.clearInterval(this._circadianTimer);
    this._circadianTimer = this.setInterval(() => {
      if (this.getSetting('enable_circadian_lighting') === true) {
        this._applyCircadianCT().catch(e => this.error('[SMART-CIRCADIAN] Error:', e.message));
      }
    },safeMultiply(15, 60000));

    // Also apply when turned ON
    this.on('capability:onoff', (value) => {
      if (value === true && this.getSetting('enable_circadian_lighting') === true) {
        this._applyCircadianCT().catch(e => this.error('[SMART-CIRCADIAN] Error:', e.message));
      }
    });
  },

  async _applyCircadianCT() {
    if (!this.getCapabilityValue('onoff')) return; // Only if light is on
    
    const hour = new Date().getHours();
    let targetCT = 0.5; // Default neutral

    // Circadian Curve (Simplified)
    // 06:00 - 08:00: Warm to Cool (0.8 -> 0.4)
    // 08:00 - 17:00: Cool (0.3 - 0.4)
    // 17:00 - 21:00: Cool to Warm (0.4 -> 0.9)
    // 21:00 - 06:00: Warm (1.0)
    
    if (hour >= 6 && hour < 9) targetCT =(0.8 - ((hour - 6) * 0.15));
    else if (hour >= 9 && hour < 17) targetCT = 0.3;
    else if (hour >= 17 && hour < 21) targetCT =(0.3 + ((hour - 17) * 0.15));
    else targetCT = 1.0;

    this.log(`[SMART-CIRCADIAN]  Applying Adaptive CT for hour ${hour}: ${targetCT.toFixed(2)}`);
    await this._safeSetCapability('light_temperature', targetCT);
  },

  /**
   * Cleanup
   */
  _destroySmartFeatures() {
    if (this._autoOffTimeout) this.clearTimeout(this._autoOffTimeout);
    if (this._vacationTimer) this.clearInterval(this._vacationTimer);
    if (this._inchingTimeout) this.clearTimeout(this._inchingTimeout);
    if (this._circadianTimer) this.clearInterval(this._circadianTimer);
  }

};

module.exports = SmartFeatureEmulationMixin;
