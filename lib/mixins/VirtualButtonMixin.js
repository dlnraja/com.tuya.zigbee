'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      VIRTUAL BUTTON MIXIN - v6.1.0 (Autonomous Protocol Detection)           ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Adds virtual button capabilities to devices for remote control via app     ║
 * ║  Features:                                                                   ║
 * ║  - Autonomous protocol detection (self-contained, no external deps)          ║
 * ║  - Asymmetric mapping (Toggle X -> Custom Cap)                               ║
 * ║  - Bidirectional Sync (Zero-latency state reflection)                        ║
 * ║  - Self-Healing (Auto-retry on protocol failure)                             ║
 * ║  - Packetninja 2.0 (High-resolution event correlation)                       ║
 * ║  - Works standalone (ZigBeeDevice) without BaseUnifiedDevice                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// Known Tuya DP manufacturerName prefixes (TS0601 / _TZE family)
const TUYA_DP_MFR_PREFIXES = ['_TZE200_', '_TZE204_', '_TZE284_'];

const VirtualButtonMixin = (Base) => {
  if (!Base || typeof Base !== 'function') {
    console.error('[VirtualButtonMixin] Base class is undefined or not a function');
    return class VirtualButtonFallback {
      async initVirtualButtons() {
        console.log('[VirtualButtonMixin] Fallback mode active');
      }
    };
  }

  return class extends Base {
    /**
     * ═════════════════════════════════════════════════════════════════════════
     * v6.1.0: Autonomous Protocol Detection
     * Self-contained _isPureTuyaDP detection (no dependency on BaseUnifiedDevice)
     * ─────────────────────────────────────────────────────────────────────────
     * Detects protocol by probing:
     * 1. this._isPureTuyaDP (from BaseUnifiedDevice, if available)
     * 2. manufacturerName prefixes (_TZE200_, _TZE204_, _TZE284_)
     * 3. Presence of TuyaEF00Manager (sendDP capability)
     * 4. ZCL cluster presence (genOnOff or onOff)
     * ═════════════════════════════════════════════════════════════════════════
     */
    constructor(...args) {
      super(...args);

      // Auto-detect _isPureTuyaDP if not already set by BaseUnifiedDevice
      if (this._isPureTuyaDP === undefined) {
        const settings = typeof this.getSettings === 'function' ? this.getSettings() : {};
        const data = typeof this.getData === 'function' ? this.getData() : {};
        const store = typeof this.getStore === 'function' ? this.getStore() : {};

        const manufacturerName = settings.zb_manufacturer_name
          || store.zb_manufacturer_name
          || data.manufacturerName
          || '';

        const productId = (settings.zb_model_id || store.zb_model_id || data.modelId || '').toUpperCase();

        // Rule: TS0601 is always Tuya DP
        if (productId === 'TS0601') {
          this._isPureTuyaDP = true;
        }
        // Rule: _TZE* prefix is always Tuya DP
        else if (TUYA_DP_MFR_PREFIXES.some(p => manufacturerName.startsWith(p))) {
          this._isPureTuyaDP = true;
        }
        // Rule: has TuyaEF00Manager → Tuya DP
        else if (this.tuyaEF00Manager || this._tuyaEF00Manager) {
          this._isPureTuyaDP = true;
        }
        // Default: ZCL mode
        else {
          this._isPureTuyaDP = false;
        }

        this.log(`[VIRTUAL-BTN] 🔍 Autonomous Protocol: ${this._isPureTuyaDP ? 'Tuya DP (0xEF00)' : 'ZCL Standard'}`);
      }
    }

    /**
     * v6.1.0: Fallback _safeSetCapability if not provided by BaseUnifiedDevice
     * Wraps setCapabilityValue with existence check and error guard
     */
    async _safeSetCapability(capability, value) {
      try {
        if (!this.hasCapability(capability)) {
          await this.addCapability(capability).catch(() => {});
        }
        if (this.hasCapability(capability)) {
          if (typeof this.safeSetCapabilityValue === 'function') {
            await this.safeSetCapabilityValue(capability, value);
          } else {
            await this.setCapabilityValue(capability, value);
          }
          return true;
        }
      } catch (err) {
        this.log(`[VIRTUAL-BTN] ⚠️ _safeSetCapability ${capability}=${value}: ${err.message}`);
      }
      return false;
    }

    /**
     * v5.5.999 / v6.1.0: Get the last virtual button event
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
     * v5.5.999 / v6.1.0: Get all virtual button states
     * @returns {Object} State object with all virtual button info
     */
    getVirtualButtonStates() {
      return this._virtualButtonState ?? {};
    }

    /**
     * v6.1.0: Fallback markAppCommand if not provided by PhysicalButtonMixin
     */
    markAppCommand(gang, value) {
      // v8.1.0: Prevent infinite loops by syncing with PhysicalButtonMixin if it exists
      if (typeof super.markAppCommand === 'function') {
        super.markAppCommand(gang, value);
        return;
      }

      // Ensure state tracking exists
      if (!this._appCommandPending) {
        this._lastOnoffState = {};
        this._appCommandPending = {};
        this._appCommandTimestamp = {};
      }

      const key = gang || 1;
      this._appCommandPending[key] = true;
      this._lastOnoffState[key] = value;
      this._appCommandTimestamp[key] = Date.now();

      clearTimeout(this._appCommandTimeout?.[key]);
      if (!this._appCommandTimeout) {this._appCommandTimeout = {};}
      this._appCommandTimeout[key] = setTimeout(() => {
        this._appCommandPending[key] = false;
      }, 2000);
    }

    /**
     * v6.0.0: Initialize virtual button handlers with self-healing and asymmetric support
     */
    async initVirtualButtons() {
      if (this._virtualButtonsInitialized) {
        this.log('[VIRTUAL-BTN] ⚠️ Already initialized, skipping duplicate registration');
        return;
      }
      this._virtualButtonsInitialized = true;

      this.log('[VIRTUAL-BTN] 🚀 Initializing Antigravity v6.0.0...');

      // Initialize state tracking
      this._virtualButtonState = {
        lastEvent: null,
        totalPresses: 0,
        gangs: {},
        history: [],
        pendingCommands: new Set()
      };

      const gangCount = this.gangCount || 1;
      for (let g = 1; g <= gangCount; g++) {
        this._virtualButtonState.gangs[g] = {
          lastEvent: null,
          totalPresses: 0,
          consecutiveFailures: 0
        };
      }

      // 1. Register Primary Toggle
      if (this.hasCapability('button.toggle')) {
        this.registerCapabilityListener('button.toggle', async () => {
          await this._handleVirtualToggle(1);
        });
        this.log('[VIRTUAL-BTN] ✅ button.toggle (Gang 1)');
      }

      // 2. Register Multi-Gang Toggles (Asymmetric Support)
      for (let i = 1; i <= 8; i++) {
        const cap = `button.toggle_${i}`;
        if (this.hasCapability(cap)) {
          this.registerCapabilityListener(cap, async () => {
            await this._handleVirtualToggle(i);
          });
          this.log(`[VIRTUAL-BTN] ✅ ${cap} (Gang ${i})`);
        }
      }

      // 3. Register Control Buttons
      const CONTROL_MAP = {
        'button_dim_up': { action: 'dim', value: 'up' },
        'button_dim_down': { action: 'dim', value: 'down' },
        'button.identify': { action: 'identify' },
        'button_open': { action: 'cover', value: 'up' },
        'button_close': { action: 'cover', value: 'down' },
        'button_stop': { action: 'cover', value: 'idle' }
      };

      for (const [cap, config] of Object.entries(CONTROL_MAP)) {
        if (this.hasCapability(cap)) {
          this.registerCapabilityListener(cap, async () => {
            if (config.action === 'dim') {await this._handleVirtualDim(config.value);}
            if (config.action === 'identify') {await this._handleVirtualIdentify();}
            if (config.action === 'cover') {await this._handleVirtualCover(config.value);}
          });
          this.log(`[VIRTUAL-BTN] ✅ ${cap} (${config.action})`);
        }
      }

      // v6.0.0: Auto-registration for asymmetric scene buttons
      // If a device has button.X but no physical listener, VirtualButtonMixin can handle it
      for (let i = 1; i <= 8; i++) {
        const cap = `button.${i}`;
        if (this.hasCapability(cap) && !this._isButtonDevice) {
           this.registerCapabilityListener(cap, async () => {
             this.log(`[VIRTUAL-BTN] 🔘 Asymmetric button.${i} pressed`);
             this._triggerPhysicalFlow?.(i, 'single'); // Treat as physical single press
           });
        }
      }

      this.log('[VIRTUAL-BTN] ✨ Initialization complete');
    }

    /**
     * v6.0.0: Robust Toggle with Bidirectional Sync and Self-Healing
     */
    async _handleVirtualToggle(gang = 1) {
      const targetCap = gang === 1 ? 'onoff' : `onoff.gang${gang}`;
      
      // Fallback for asymmetric naming (onoff.1, onoff.2, etc.)
      const asymmetricCap = `onoff.${gang}`;
      const finalCap = this.hasCapability(targetCap) ? targetCap : this.hasCapability(asymmetricCap) ? asymmetricCap : null;

      if (!finalCap) {
        this.log(`[VIRTUAL-BTN] ⚠️ No onoff capability for gang ${gang}`);
        return;
      }

      try {
        const currentValue = this.getCapabilityValue(finalCap);
        const newValue = !currentValue;
        
        this.log(`[VIRTUAL-BTN] [G${gang}] Toggle Request: ${currentValue} → ${newValue}`);

        // Record event
        this._recordVirtualButtonEvent(gang, 'toggle', { cap: finalCap, from: currentValue, to: newValue });

        // Bidirectional Sync: Optimistically update UI
        if (typeof this._safeSetCapability === 'function') {
          this._safeSetCapability(finalCap, newValue);
        } else {
          await this.setCapabilityValue(finalCap, newValue).catch(() => {});
        }

        // Execution with Self-Healing Fallback
        let success = false;
        
        // Strategy A: Protocol-Aware Execution
        if (this._isPureTuyaDP) {
          success = await this._tryExecuteTuyaDP(gang, newValue);
        } else {
          success = await this._tryExecuteZCL(gang, newValue);
        }

        // Strategy B: Cross-Protocol Fallback (Self-Healing)
        if (!success) {
          this.log(`[VIRTUAL-BTN] 🔄 [G${gang}] Primary protocol failed, attempting fallback...`);
          if (this._isPureTuyaDP) {
            success = await this._tryExecuteZCL(gang, newValue);
          } else {
            success = await this._tryExecuteTuyaDP(gang, newValue);
          }
        }

        // Strategy C: Last Resort (UI Only)
        if (!success) {
          this.warn(`[VIRTUAL-BTN] ❌ [G${gang}] All protocols failed. Device may be offline.`);
          this._virtualButtonState.gangs[gang].consecutiveFailures++;
          // Revert UI if needed? (Optionally keep optimistic state for better UX)
        } else {
          this._virtualButtonState.gangs[gang].consecutiveFailures = 0;
        }

      } catch (err) {
        this.error(`[VIRTUAL-BTN] Toggle Critical Error: ${err.message}`);
      }
    }

    /**
     * Helper: Try ZCL Execution
     */
    async _tryExecuteZCL(gang, value) {
      const node = this._zclNode || this.zclNode;
      if (!node) {return false;}

      const epNum = gang || 1;
      const endpoint = node.endpoints?.[epNum];
      if (!endpoint) {return false;}

      const cluster = endpoint.clusters.onOff || endpoint.clusters.genOnOff || endpoint.clusters[6];
      if (!cluster) {return false;}

      try {
        // Mark as App command to prevent physical loop
        if (typeof this.markAppCommand === 'function') {
           this.markAppCommand(gang, value);
        }

        await cluster[value ? 'setOn' : 'setOff']();
        return true;
      } catch (e) {
        this.log(`[ZCL-EXEC] ⚠️ Failed: ${e.message}`);
        return false;
      }
    }

    /**
     * Helper: Try Tuya DP Execution
     */
    async _tryExecuteTuyaDP(gang, value) {
      if (typeof this._sendTuyaDP !== 'function' && !this.tuyaEF00Manager) {return false;}

      try {
        // Mark as App command
        if (typeof this.markAppCommand === 'function') {
           this.markAppCommand(gang, value);
        }

        if (this.tuyaEF00Manager) {
          await this.tuyaEF00Manager.sendDP(gang, value ? 1 : 0, 'bool');
        } else {
          await this._sendTuyaDP(gang, value ? 1 : 0, 'bool');
        }
        return true;
      } catch (e) {
        this.log(`[DP-EXEC] ⚠️ Failed: ${e.message}`);
        return false;
      }
    }

    /**
     * v6.0.0: Record event with Packetninja 2.0 correlation
     */
    _recordVirtualButtonEvent(gang, type, data = {}) {
      const event = {
        type,
        gang,
        timestamp: Date.now(),
        correlationId: `vbtn-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        ...data
      };

      this._virtualButtonState.lastEvent = event;
      this._virtualButtonState.totalPresses++;
      this._virtualButtonState.gangs[gang].lastEvent = event;
      this._virtualButtonState.gangs[gang].totalPresses++;

      this._virtualButtonState.history.push(event);
      if (this._virtualButtonState.history.length > 20) {this._virtualButtonState.history.shift();}

      this.log(`[VIRTUAL-BTN] 📝 Event: ${type} G${gang} [${event.correlationId}]`);

      // Trigger global virtual flow card
      try {
        this.homey.flow.getDeviceTriggerCard('virtual_button_pressed')
          .trigger(this, { type, gang, correlationId: event.correlationId }, {})
          .catch(() => {});
      } catch (e) { /* ignore if card not in app.json */ }
    }

    /**
     * Handle Dimming (v6.0.0)
     */
    async _handleVirtualDim(direction) {
      try {
        if (!this.hasCapability('dim')) {return;}
        const current = this.getCapabilityValue('dim') || 0;
        const step = 0.1;
        const next = direction === 'up' ? Math.min(1, current + step) : Math.max(0, current - step);
        
        this._recordVirtualButtonEvent(1, `dim_${direction}`, { from: current, to: next });
        await this.triggerCapabilityListener('dim', next);
      } catch (err) {
        this.error(`[VIRTUAL-BTN] Dim Error: ${err.message}`);
      }
    }

    /**
     * Handle Identify (v6.0.0)
     */
    async _handleVirtualIdentify() {
      this.log('[VIRTUAL-BTN] 🔍 Identify');
      this._recordVirtualButtonEvent(1, 'identify');
      try {
        const idCluster = this.zclNode?.endpoints?.[1]?.clusters?.identify;
        if (idCluster?.identify) {
          await idCluster.identify({ identifyTime: 10 });
        } else if (this.hasCapability('onoff')) {
          // Visual Flash Fallback
          const orig = this.getCapabilityValue('onoff');
          for (let i = 0; i < 3; i++) {
            await this.triggerCapabilityListener('onoff', !orig);
            await new Promise(r => setTimeout(r, 400));
            await this.triggerCapabilityListener('onoff', orig);
            await new Promise(r => setTimeout(r, 400));
          }
        }
      } catch (e) { this.error(e); }
    }

    /**
     * Handle Cover (v6.0.0)
     */
    async _handleVirtualCover(state) {
      this.log(`[VIRTUAL-BTN] 🪟 Cover: ${state}`);
      this._recordVirtualButtonEvent(1, 'cover', { state });
      try {
        if (this.hasCapability('windowcoverings_state')) {
          await this.triggerCapabilityListener('windowcoverings_state', state);
        } else if (this._sendTuyaDP) {
          const val = state === 'up' ? 0 : state === 'down' ? 2 : 1;
          await this._sendTuyaDP(1, val, 'enum');
        }
      } catch (e) { this.error(e); }
    }
  };
};

module.exports = VirtualButtonMixin;
