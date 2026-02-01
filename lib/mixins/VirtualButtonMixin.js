'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      VIRTUAL BUTTON MIXIN - v5.5.999                                        ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Adds virtual button capabilities to devices for remote control via app     ║
 * ║  Supports: toggle, dim up/down, identify                                    ║
 * ║  No re-pair issues: capabilities defined in driver.compose.json             ║
 * ║  v5.5.999: Enhanced state tracking for virtual buttons (packetninja pattern)║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

const VirtualButtonMixin = (Base) => {
  // v5.5.556: Guard against undefined Base class
  if (!Base || typeof Base !== 'function') {
    console.error('[VirtualButtonMixin] Base class is undefined or not a function');
    // Return a minimal class that won't crash
    return class VirtualButtonFallback {
      async initVirtualButtons() {
        console.log('[VirtualButtonMixin] Fallback mode - no virtual buttons');
      }
    };
  }
  return class extends Base {

  /**
   * v5.5.999: Get the last virtual button event
   * @param {number} gang - Gang number (1-based, optional)
   * @returns {Object|null} Last virtual button event or null
   */
  getLastVirtualButtonEvent(gang = null) {
    if (gang !== null) {
      return this._virtualButtonState?.gangs?.[gang]?.lastEvent ?? null;
    }
    return this._virtualButtonState?.lastEvent ?? null;
  }

  /**
   * v5.5.999: Get all virtual button states
   * @returns {Object} State object with all virtual button info
   */
  getVirtualButtonStates() {
    return this._virtualButtonState ?? {};
  }

  /**
   * Initialize virtual button handlers
   * Call this in onNodeInit after super.onNodeInit()
   * v5.5.999: Enhanced with state tracking (packetninja pattern)
   */
  async initVirtualButtons() {
    this.log('[VIRTUAL-BTN] Initializing virtual button handlers...');

    // v5.5.999: Initialize virtual button state tracking (packetninja pattern)
    this._virtualButtonState = {
      lastEvent: null,                    // Last virtual button event (any)
      totalPresses: 0,                    // Total virtual button presses
      gangs: {},                          // Per-gang state tracking
      history: []                         // Last 10 virtual button events
    };

    // Initialize per-gang state
    const gangCount = this.gangCount || 1;
    for (let g = 1; g <= gangCount; g++) {
      this._virtualButtonState.gangs[g] = {
        lastEvent: null,
        totalPresses: 0
      };
    }

    // Toggle button (single gang)
    if (this.hasCapability('button_toggle')) {
      this.registerCapabilityListener('button_toggle', async () => {
        await this._handleVirtualToggle();
      });
      this.log('[VIRTUAL-BTN] ✅ button.toggle registered');
    }

    // Multi-gang toggle buttons
    for (let i = 1; i <= 8; i++) {
      const cap = `button_toggle_${i}`;
      if (this.hasCapability(cap)) {
        this.registerCapabilityListener(cap, async () => {
          await this._handleVirtualToggle(i);
        });
        this.log(`[VIRTUAL-BTN] ✅ ${cap} registered`);
      }
    }

    // Dim up button
    if (this.hasCapability('button_dim_up')) {
      this.registerCapabilityListener('button_dim_up', async () => {
        await this._handleVirtualDim('up');
      });
      this.log('[VIRTUAL-BTN] ✅ button.dim_up registered');
    }

    // Dim down button
    if (this.hasCapability('button_dim_down')) {
      this.registerCapabilityListener('button_dim_down', async () => {
        await this._handleVirtualDim('down');
      });
      this.log('[VIRTUAL-BTN] ✅ button.dim_down registered');
    }

    // Identify button
    if (this.hasCapability('button_identify')) {
      this.registerCapabilityListener('button_identify', async () => {
        await this._handleVirtualIdentify();
      });
      this.log('[VIRTUAL-BTN] ✅ button.identify registered');
    }

    // v5.5.992: Cover control buttons (open/close/stop)
    if (this.hasCapability('button_open')) {
      this.registerCapabilityListener('button_open', async () => {
        await this._handleVirtualCover('up');
      });
      this.log('[VIRTUAL-BTN] ✅ button_open registered');
    }

    if (this.hasCapability('button_close')) {
      this.registerCapabilityListener('button_close', async () => {
        await this._handleVirtualCover('down');
      });
      this.log('[VIRTUAL-BTN] ✅ button_close registered');
    }

    if (this.hasCapability('button_stop')) {
      this.registerCapabilityListener('button_stop', async () => {
        await this._handleVirtualCover('idle');
      });
      this.log('[VIRTUAL-BTN] ✅ button_stop registered');
    }

    this.log('[VIRTUAL-BTN] ✅ Virtual buttons initialized');
  }

  /**
   * Handle virtual toggle button press
   * @param {number} gang - Gang number (1-8) or undefined for single gang
   * v5.5.999: Fixed BSEED 4-gang EP2-4 cluster access (diagnostic c33007b0)
   * v5.5.999: Enhanced with state tracking (packetninja pattern)
   */
  async _handleVirtualToggle(gang) {
    // v5.5.999: Fix capability name mapping - gang 1 uses 'onoff', not 'onoff.gang1'
    const capName = (!gang || gang === 1) ? 'onoff' : `onoff.gang${gang}`;
    const effectiveGang = gang || 1;

    // Find the correct capability
    let targetCap = null;
    if (this.hasCapability(capName)) {
      targetCap = capName;
    } else if (gang === 1 && this.hasCapability('onoff')) {
      targetCap = 'onoff';
    } else if (gang && this.hasCapability(`onoff.gang${gang}`)) {
      targetCap = `onoff.gang${gang}`;
    }

    if (!targetCap) {
      this.log(`[VIRTUAL-BTN] ⚠️ No capability found for gang ${gang}`);
      return;
    }

    try {
      const currentValue = this.getCapabilityValue(targetCap);
      const newValue = !currentValue;
      this.log(`[VIRTUAL-BTN] 🔘 Toggle ${targetCap}: ${currentValue} → ${newValue}`);

      // v5.5.999: Record virtual button event (packetninja pattern)
      this._recordVirtualButtonEvent(effectiveGang, 'toggle', {
        capability: targetCap,
        from: currentValue,
        to: newValue
      });

      // v5.7.38: ROBUST ZCL FALLBACK for multi-gang devices (BSEED diagnostic c33007b0 fix)
      // Always try direct ZCL first, then capability listener, then direct value set
      const node = this._zclNode || this.zclNode;
      const epNum = gang || 1;
      
      // v5.7.38: Check ZCL-only mode with explicit flag check
      const isZclOnly = this._isZclOnlyMode === true || this.isZclOnlyDevice === true;
      
      // v5.7.38: Helper to find onOff cluster with multiple lookup strategies
      const findOnOffCluster = (endpoint) => {
        if (!endpoint?.clusters) return null;
        return endpoint.clusters.onOff || 
               endpoint.clusters.genOnOff ||
               endpoint.clusters[6] ||
               endpoint.clusters['6'] ||
               endpoint.clusters['onOff'];
      };

      // v5.7.38: Try direct ZCL FIRST for ALL devices with _zclNode (not just ZCL-only)
      // This fixes BSEED EP2-4 issue where triggerCapabilityListener fails
      let success = false;
      
      if (node) {
        const onOff = findOnOffCluster(node?.endpoints?.[epNum]);
        if (onOff && typeof onOff[newValue ? 'setOn' : 'setOff'] === 'function') {
          try {
            await onOff[newValue ? 'setOn' : 'setOff']();
            await this.setCapabilityValue(targetCap, newValue).catch(() => {});
            this.log(`[VIRTUAL-BTN] ✅ Direct ZCL ${newValue ? 'ON' : 'OFF'} sent to EP${epNum}`);
            success = true;
          } catch (zclErr) {
            this.log(`[VIRTUAL-BTN] ⚠️ ZCL command failed: ${zclErr.message}`);
          }
        }
      }
      
      // v5.7.38: If ZCL failed, try capability listener (only for non-ZCL-only devices)
      if (!success && !isZclOnly) {
        try {
          await this.triggerCapabilityListener(targetCap, newValue);
          this.log(`[VIRTUAL-BTN] ✅ Capability listener succeeded for ${targetCap}`);
          success = true;
        } catch (listenerErr) {
          this.log(`[VIRTUAL-BTN] ⚠️ Listener failed: ${listenerErr.message}`);
        }
      }
      
      // v5.7.38: Last resort - set value directly (always works for UI update)
      if (!success) {
        this.log(`[VIRTUAL-BTN] ℹ️ Setting ${targetCap}=${newValue} directly (fallback)`);
        await this.setCapabilityValue(targetCap, newValue).catch(() => {});
      }
    } catch (err) {
      this.error(`[VIRTUAL-BTN] Toggle error: ${err.message}`);
    }
  }

  /**
   * Handle virtual dim button press
   * @param {string} direction - 'up' or 'down'
   * v5.5.999: Enhanced with state tracking (packetninja pattern)
   */
  async _handleVirtualDim(direction) {
    this.log(`[VIRTUAL-BTN] 💡 Dim ${direction} pressed`);

    try {
      if (!this.hasCapability('dim')) {
        this.log('[VIRTUAL-BTN] ⚠️ No dim capability');
        return;
      }

      const currentDim = this.getCapabilityValue('dim') || 0;
      const step = 0.1; // 10% step
      let newDim;

      if (direction === 'up') {
        newDim = Math.min(1, currentDim + step);
      } else {
        newDim = Math.max(0, currentDim - step);
      }

      // v5.5.999: Record dim event (packetninja pattern)
      this._recordVirtualButtonEvent(1, `dim_${direction}`, {
        from: currentDim,
        to: newDim
      });

      this.log(`[VIRTUAL-BTN] 💡 Dim ${direction}: ${Math.round(currentDim * 100)}% → ${Math.round(newDim * 100)}%`);

      await this.triggerCapabilityListener('dim', newDim);
    } catch (err) {
      this.error(`[VIRTUAL-BTN] Dim error: ${err.message}`);
      throw err;
    }
  }

  /**
   * Handle virtual identify button press
   * Makes the device flash/beep to help locate it
   * v5.5.999: Enhanced with state tracking (packetninja pattern)
   */
  async _handleVirtualIdentify() {
    this.log('[VIRTUAL-BTN] 🔍 Identify triggered');

    // v5.5.999: Record identify event (packetninja pattern)
    this._recordVirtualButtonEvent(1, 'identify', {});

    try {
      // Try ZCL Identify cluster first
      const ep1 = this.zclNode?.endpoints?.[1];
      const identifyCluster = ep1?.clusters?.identify;

      if (identifyCluster?.identify) {
        await identifyCluster.identify({ identifyTime: 10 });
        this.log('[VIRTUAL-BTN] ✅ ZCL Identify sent (10s)');
        return;
      }

      // Fallback: Toggle twice for visual identification
      if (this.hasCapability('onoff')) {
        const original = this.getCapabilityValue('onoff');
        await this.triggerCapabilityListener('onoff', !original);
        await new Promise(r => setTimeout(r, 500));
        await this.triggerCapabilityListener('onoff', original);
        await new Promise(r => setTimeout(r, 500));
        await this.triggerCapabilityListener('onoff', !original);
        await new Promise(r => setTimeout(r, 500));
        await this.triggerCapabilityListener('onoff', original);
        this.log('[VIRTUAL-BTN] ✅ Identify via toggle flash');
      }
    } catch (err) {
      this.error(`[VIRTUAL-BTN] Identify error: ${err.message}`);
    }
  }

  /**
   * v5.5.999: Record virtual button event (packetninja pattern)
   * @param {number} gang - Gang number (1-based)
   * @param {string} type - Event type ('toggle', 'dim_up', 'dim_down', 'identify', 'cover')
   * @param {Object} data - Additional event data
   */
  _recordVirtualButtonEvent(gang, type, data = {}) {
    if (!this._virtualButtonState) {
      this._virtualButtonState = { lastEvent: null, totalPresses: 0, gangs: {}, history: [] };
    }

    const event = {
      type,
      gang,
      timestamp: Date.now(),
      ...data
    };

    // Update global state
    this._virtualButtonState.lastEvent = event;
    this._virtualButtonState.totalPresses++;

    // Update per-gang state
    if (!this._virtualButtonState.gangs[gang]) {
      this._virtualButtonState.gangs[gang] = { lastEvent: null, totalPresses: 0 };
    }
    this._virtualButtonState.gangs[gang].lastEvent = event;
    this._virtualButtonState.gangs[gang].totalPresses++;

    // Add to history (keep last 10)
    this._virtualButtonState.history.push(event);
    if (this._virtualButtonState.history.length > 10) {
      this._virtualButtonState.history.shift();
    }

    this.log(`[VIRTUAL-BTN] 📝 Recorded event: ${type} for gang ${gang}`);
  }

  /**
   * v5.5.992: Handle virtual cover button press (open/close/stop)
   * @param {string} state - 'up' (open), 'down' (close), or 'idle' (stop)
   */
  async _handleVirtualCover(state) {
    this.log(`[VIRTUAL-BTN] 🪟 Cover command: ${state}`);

    // v5.5.999: Record cover event (packetninja pattern)
    this._recordVirtualButtonEvent(1, 'cover', { state });

    try {
      // Try windowcoverings_state capability first
      if (this.hasCapability('windowcoverings_state')) {
        await this.triggerCapabilityListener('windowcoverings_state', state);
        this.log(`[VIRTUAL-BTN] ✅ Cover state set to ${state}`);
        return;
      }

      // Fallback: Try ZCL windowCovering cluster
      const node = this._zclNode || this.zclNode;
      const ep1 = node?.endpoints?.[1];
      const coverCluster = ep1?.clusters?.windowCovering || ep1?.clusters?.[0x0102];

      if (coverCluster) {
        if (state === 'up' && coverCluster.upOpen) {
          await coverCluster.upOpen();
        } else if (state === 'down' && coverCluster.downClose) {
          await coverCluster.downClose();
        } else if (state === 'idle' && coverCluster.stop) {
          await coverCluster.stop();
        }
        this.log(`[VIRTUAL-BTN] ✅ ZCL cover command sent: ${state}`);
        return;
      }

      // Fallback: Try Tuya DP (DP1 for cover control)
      if (this._sendTuyaDP) {
        const dpValue = state === 'up' ? 0 : state === 'down' ? 2 : 1;
        await this._sendTuyaDP(1, dpValue, 'enum');
        this.log(`[VIRTUAL-BTN] ✅ Tuya DP cover command sent: ${state} (DP1=${dpValue})`);
      }
    } catch (err) {
      this.error(`[VIRTUAL-BTN] Cover error: ${err.message}`);
    }
  }
  };  // v5.5.556: Close the returned class
};

module.exports = VirtualButtonMixin;
