'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  🔄 VIRTUAL BI-DIRECTIONAL PHYSICS (Mode B)                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Handles Tuya Mode B physical switches bound to virtual capabilities.        ║
 * ║  Prevents infinite loops where:                                              ║
 * ║  Physical Switch -> Virtual Update -> Physical Command -> Virtual Update     ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

class VirtualBidirectionalSync {
  
  constructor(device) {
    this.device = device;
    this.logger = this.device.log ? this.device : console;
    
    // Track transaction IDs / Debounce timers per capability
    this.syncLocks = new Map();
    
    // Lock timeout (ms) - Time to ignore echoes after a command is sent
    this.LOCK_TIMEOUT = 1500;
  }

  /**
   * Called when physical device reports a state change (e.g., user pressed the wall switch)
   * Updates the virtual Homey capability ONLY if it wasn't triggered by Homey itself recently.
   * 
   * @param {string} capability - Homey capability (e.g. 'onoff')
   * @param {any} value - New value
   */
  async onPhysicalStateChange(capability, value) {
    if (this.isLocked(capability)) {
      this.logger.log(`[MODE_B] 🛡️ Anti-loop engaged: Ignoring physical echo for ${capability}`);
      return false;
    }

    try {
      this.logger.log(`[MODE_B] 📥 Physical sync received for ${capability} -> ${value}`);
      
      // Temporarily lock to prevent any trigger cascades in Homey
      this.lock(capability, 500); 
      
      await this.device.setCapabilityValue(capability, value);
      return true;
    } catch (err) {
      this.logger.error(`[MODE_B] Failed to sync physical state to virtual:`, err.message);
      return false;
    }
  }

  /**
   * Called when Homey sends a command (e.g., flow triggered or app button pressed)
   * Wraps the actual command execution to prevent echoes from the physical switch.
   * 
   * @param {string} capability - Homey capability
   * @param {any} value - Target value
   * @param {Function} executeCommand - Callback to execute the actual Tuya/Zigbee command
   */
  async handleVirtualCommand(capability, value, executeCommand) {
    this.logger.log(`[MODE_B] 📤 Virtual command triggered for ${capability} -> ${value}`);
    
    // Lock capability to ignore incoming physical echoes
    this.lock(capability, this.LOCK_TIMEOUT);

    try {
      // Execute the actual hardware command
      await executeCommand();
      return true;
    } catch (err) {
      this.logger.error(`[MODE_B] Virtual command execution failed:`, err.message);
      // Unlock early on failure
      this.unlock(capability);
      throw err;
    }
  }

  /**
   * Lock a capability to ignore updates
   */
  lock(capability, timeoutMs = this.LOCK_TIMEOUT) {
    if (this.syncLocks.has(capability)) {
      clearTimeout(this.syncLocks.get(capability));
    }
    
    const timer = this.homey.setTimeout(() => {
      if (this._destroyed) return;
      this.unlock(capability);
    }, timeoutMs);
    
    this.syncLocks.set(capability, timer);
  }

  /**
   * Unlock a capability manually
   */
  unlock(capability) {
    if (this.syncLocks.has(capability)) {
      clearTimeout(this.syncLocks.get(capability));
      this.syncLocks.delete(capability);
      this.logger.log(`[MODE_B] 🔓 Lock released for ${capability}`);
    }
  }

  /**
   * Check if capability is currently locked
   */
  isLocked(capability) {
    return this.syncLocks.has(capability);
  }

  /**
   * Cleanup memory
   */
  destroy() {
    for (const [cap, timer] of this.syncLocks.entries()) {
      clearTimeout(timer);
    }
    this.syncLocks.clear();
  }
}

module.exports = VirtualBidirectionalSync;
