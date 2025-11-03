'use strict';

/**
 * CountdownTimerManager - Native Zigbee Countdown Timer
 * 
 * Uses OnOff cluster attributes (discovered in Loïc's BSEED data):
 * - onTime (16385 / 0x4001): Duration before auto-off (seconds)
 * - offWaitTime (16386 / 0x4002): Delay before off (seconds)
 * 
 * This is NATIVE Zigbee functionality, not Tuya DP!
 * Works on any device with OnOff cluster supporting these attributes.
 * 
 * Source: D:\Download\loic\Bseed 2gang switch interview report.rtf
 * Device: _TZ3000_l9brjwau (TS0002)
 */

class CountdownTimerManager {
  
  constructor(device) {
    this.device = device;
    this.activeTimers = new Map();
    this.log = device.log.bind(device);
    this.error = device.error.bind(device);
  }
  
  /**
   * Set countdown timer for a gang/endpoint
   * @param {number} gang - Gang/endpoint number (1, 2, 3, etc.)
   * @param {number} seconds - Duration in seconds (0 = disable, max 86400 = 24h)
   * @returns {Promise<boolean>}
   */
  async setCountdown(gang, seconds) {
    try {
      // Validate input
      if (seconds < 0 || seconds > 86400) {
        throw new Error(`Invalid duration: ${seconds}s (must be 0-86400)`);
      }
      
      const endpoint = this.device.zclNode.endpoints[gang];
      
      if (!endpoint) {
        throw new Error(`Endpoint ${gang} not found`);
      }
      
      if (!endpoint.clusters.onOff) {
        throw new Error(`Endpoint ${gang} has no OnOff cluster`);
      }
      
      this.log(`[COUNTDOWN] Setting gang ${gang} for ${seconds}s`);
      
      // Write onTime attribute (native Zigbee)
      await endpoint.clusters.onOff.writeAttributes({
        onTime: seconds
      });
      
      if (seconds > 0) {
        // Turn on the gang (countdown starts)
        await endpoint.clusters.onOff.on();
        
        // Track timer locally
        this.activeTimers.set(gang, {
          startTime: Date.now(),
          duration: seconds,
          endTime: Date.now() + (seconds * 1000)
        });
        
        this.log(`[COUNTDOWN] ✅ Gang ${gang} will turn off in ${seconds}s`);
        
        // Trigger flow card
        try {
          await this.device.homey.flow.getDeviceTriggerCard('countdown_started')
            .trigger(this.device, {
              gang: gang,
              duration: seconds,
              minutes: Math.floor(seconds / 60)
            });
        } catch (err) {
          // Flow card may not exist yet
        }
        
        // Schedule local callback (backup, Zigbee should handle it)
        this._scheduleCallback(gang, seconds);
        
      } else {
        // Clear countdown
        this.activeTimers.delete(gang);
        this.log(`[COUNTDOWN] ✅ Gang ${gang} countdown cleared`);
        
        // Trigger flow card
        try {
          await this.device.homey.flow.getDeviceTriggerCard('countdown_cancelled')
            .trigger(this.device, { gang: gang });
        } catch (err) {
          // Flow card may not exist
        }
      }
      
      return true;
      
    } catch (err) {
      this.error(`[COUNTDOWN] Failed for gang ${gang}:`, err);
      throw err;
    }
  }
  
  /**
   * Get remaining time for a gang
   * @param {number} gang - Gang number
   * @returns {number} Remaining seconds (0 if not active)
   */
  getRemaining(gang) {
    const timer = this.activeTimers.get(gang);
    if (!timer) return 0;
    
    const remaining = Math.max(0, timer.endTime - Date.now());
    return Math.ceil(remaining / 1000);
  }
  
  /**
   * Cancel countdown for a gang
   * @param {number} gang - Gang number
   * @returns {Promise<boolean>}
   */
  async cancel(gang) {
    return await this.setCountdown(gang, 0);
  }
  
  /**
   * Get all active timers
   * @returns {Object} Map of gang → remaining seconds
   */
  getActiveTimers() {
    const timers = {};
    
    for (const [gang, timer] of this.activeTimers.entries()) {
      const remaining = this.getRemaining(gang);
      if (remaining > 0) {
        timers[`gang${gang}`] = remaining;
      } else {
        // Timer expired, remove it
        this.activeTimers.delete(gang);
      }
    }
    
    return timers;
  }
  
  /**
   * Check if gang has active countdown
   * @param {number} gang - Gang number
   * @returns {boolean}
   */
  hasActiveCountdown(gang) {
    return this.getRemaining(gang) > 0;
  }
  
  /**
   * Get countdown info for gang
   * @param {number} gang - Gang number
   * @returns {Object|null} Timer info or null
   */
  getCountdownInfo(gang) {
    const timer = this.activeTimers.get(gang);
    if (!timer) return null;
    
    const remaining = this.getRemaining(gang);
    if (remaining === 0) {
      this.activeTimers.delete(gang);
      return null;
    }
    
    return {
      gang: gang,
      startTime: timer.startTime,
      duration: timer.duration,
      remaining: remaining,
      endTime: timer.endTime,
      progress: ((timer.duration - remaining) / timer.duration) * 100
    };
  }
  
  /**
   * Private: Schedule local callback (backup)
   */
  _scheduleCallback(gang, seconds) {
    // Clear existing timeout if any
    if (this._timeouts && this._timeouts[gang]) {
      this.device.homey.clearTimeout(this._timeouts[gang]);
    }
    
    if (!this._timeouts) {
      this._timeouts = {};
    }
    
    // Schedule timeout (backup, Zigbee handles the actual turn-off)
    this._timeouts[gang] = this.device.homey.setTimeout(async () => {
      this.log(`[COUNTDOWN] ⏰ Gang ${gang} countdown completed`);
      
      // Remove from active timers
      this.activeTimers.delete(gang);
      
      // Trigger flow card
      try {
        await this.device.homey.flow.getDeviceTriggerCard('countdown_completed')
          .trigger(this.device, { gang: gang });
      } catch (err) {
        // Flow card may not exist
      }
      
      // Clean up timeout
      delete this._timeouts[gang];
      
    }, seconds * 1000);
  }
  
  /**
   * Clean up all timers (on device uninit)
   */
  destroy() {
    // Clear all timeouts
    if (this._timeouts) {
      for (const gang in this._timeouts) {
        this.device.homey.clearTimeout(this._timeouts[gang]);
      }
      this._timeouts = {};
    }
    
    // Clear active timers
    this.activeTimers.clear();
    
    this.log('[COUNTDOWN] Manager destroyed');
  }
}

module.exports = CountdownTimerManager;
