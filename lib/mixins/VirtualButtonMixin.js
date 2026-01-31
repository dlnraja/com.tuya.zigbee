'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      VIRTUAL BUTTON MIXIN - v5.5.412                                        ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Adds virtual button capabilities to devices for remote control via app     ║
 * ║  Supports: toggle, dim up/down, identify                                    ║
 * ║  No re-pair issues: capabilities defined in driver.compose.json             ║
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
   * Initialize virtual button handlers
   * Call this in onNodeInit after super.onNodeInit()
   */
  async initVirtualButtons() {
    this.log('[VIRTUAL-BTN] Initializing virtual button handlers...');

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
   */
  async _handleVirtualToggle(gang) {
    const capName = gang ? `onoff.gang${gang}` : 'onoff';
    const fallbackCap = gang === 1 ? 'onoff' : capName;

    // Find the correct capability
    let targetCap = null;
    if (this.hasCapability(capName)) {
      targetCap = capName;
    } else if (gang === 1 && this.hasCapability('onoff')) {
      targetCap = 'onoff';
    } else if (this.hasCapability(fallbackCap)) {
      targetCap = fallbackCap;
    }

    if (!targetCap) {
      this.log(`[VIRTUAL-BTN] ⚠️ No capability found for gang ${gang}`);
      return;
    }

    try {
      const currentValue = this.getCapabilityValue(targetCap);
      const newValue = !currentValue;
      this.log(`[VIRTUAL-BTN] 🔘 Toggle ${targetCap}: ${currentValue} → ${newValue}`);

      // v5.5.993: Improved ZCL fallback for multi-gang ZCL-only devices (BSEED diagnostic fix)
      // For ZCL-only devices, directly use ZCL commands instead of triggerCapabilityListener
      const node = this._zclNode || this.zclNode;
      const epNum = gang || 1;
      
      // v5.5.993: Check if device has registered capability listener for this capability
      // For ZCL-only mode devices, listeners are registered but triggerCapabilityListener fails
      const isZclOnly = this.isZclOnlyDevice || this._isZclOnlyMode;
      
      if (isZclOnly && node) {
        // Direct ZCL command for ZCL-only devices
        const onOff = node?.endpoints?.[epNum]?.clusters?.onOff || 
                      node?.endpoints?.[epNum]?.clusters?.genOnOff ||
                      node?.endpoints?.[epNum]?.clusters?.[6];
        if (onOff && typeof onOff[newValue ? 'setOn' : 'setOff'] === 'function') {
          await onOff[newValue ? 'setOn' : 'setOff']();
          await this.setCapabilityValue(targetCap, newValue).catch(() => {});
          this.log(`[VIRTUAL-BTN] ✅ Direct ZCL ${newValue ? 'ON' : 'OFF'} sent to EP${epNum}`);
        } else {
          this.log(`[VIRTUAL-BTN] ⚠️ No onOff cluster on EP${epNum}`);
        }
      } else {
        // Standard listener-based toggle for non-ZCL-only devices
        try {
          await this.triggerCapabilityListener(targetCap, newValue);
        } catch (listenerErr) {
          this.log(`[VIRTUAL-BTN] Listener failed, trying direct ZCL: ${listenerErr.message}`);
          const onOff = node?.endpoints?.[epNum]?.clusters?.onOff || 
                        node?.endpoints?.[epNum]?.clusters?.genOnOff ||
                        node?.endpoints?.[epNum]?.clusters?.[6];
          if (onOff && typeof onOff[newValue ? 'setOn' : 'setOff'] === 'function') {
            await onOff[newValue ? 'setOn' : 'setOff']();
            await this.setCapabilityValue(targetCap, newValue).catch(() => {});
            this.log(`[VIRTUAL-BTN] ✅ Direct ZCL ${newValue ? 'ON' : 'OFF'} sent to EP${epNum}`);
          } else {
            this.error(`[VIRTUAL-BTN] No ZCL cluster found for EP${epNum}`);
          }
        }
      }
    } catch (err) {
      this.error(`[VIRTUAL-BTN] Toggle error: ${err.message}`);
    }
  }

  /**
   * Handle virtual dim button press
   * @param {string} direction - 'up' or 'down'
   */
  async _handleVirtualDim(direction) {
    if (!this.hasCapability('dim')) {
      this.log('[VIRTUAL-BTN] ⚠️ No dim capability');
      return;
    }

    try {
      const currentDim = this.getCapabilityValue('dim') || 0;
      const step = 0.1; // 10% step
      let newDim;

      if (direction === 'up') {
        newDim = Math.min(1, currentDim + step);
      } else {
        newDim = Math.max(0, currentDim - step);
      }

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
   */
  async _handleVirtualIdentify() {
    this.log('[VIRTUAL-BTN] 🔍 Identify triggered');

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
   * v5.5.992: Handle virtual cover button press (open/close/stop)
   * @param {string} state - 'up' (open), 'down' (close), or 'idle' (stop)
   */
  async _handleVirtualCover(state) {
    this.log(`[VIRTUAL-BTN] 🪟 Cover command: ${state}`);

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
