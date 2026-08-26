'use strict';

/**
 * VirtualButtonMixin — Homey app UI ↔ physical multi-gang devices
 *
 * Contract:
 * 1. App/UI taps update capabilities via `_safeSetCapability` / `safeSetCapabilityValue`
 *    (never raw `setCapabilityValue('button', …)` — that loops flows).
 * 2. Before sending ZCL/DP commands, call `markAppCommand(gang)` so PhysicalButtonMixin
 *    does not treat the echo as a physical press.
 * 3. Anti-spam: leading-edge 300ms throttle per gang on virtual toggles.
 * 4. Protocol: prefer Tuya EF00 when manufacturer is `_TZExxx_`, else ZCL on/off/level.
 *
 * Order: PhysicalButtonMixin(VirtualButtonMixin(UnifiedSwitchBase))
 */

// Known Tuya DP manufacturerName prefixes (TS0601 / _TZE family)
const TUYA_DP_MFR_PREFIXES = ['_TZE200_', '_TZE204_', '_TZE284_'];
const { equalsCI, startsWithCI } = require('../utils/CaseInsensitiveMatcher');
const { safeSetTimeout, safeClearTimeout } = require('../utils/safe-timers');

const VirtualButtonMixin = (Base) => {
  if (!Base || typeof Base !== 'function') {
    return class VirtualButtonFallback {
      async initVirtualButtons() {
        // Fallback mode - no-op when base class unavailable
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

        const productId = settings.zb_model_id || store.zb_model_id || data.modelId || '';

        // Rule: TS0601 is always Tuya DP
        if (equalsCI(productId, 'TS0601')) {
          this._isPureTuyaDP = true;
        }
        // Rule: _TZE* prefix is always Tuya DP
        else if (TUYA_DP_MFR_PREFIXES.some(p => startsWithCI(manufacturerName, p))) {
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

        this.log(` Autonomous Protocol: ${this._isPureTuyaDP ? 'Tuya DP (0xEF00)' : 'ZCL Standard'}`);
      }
    }

    /**
     * v6.1.0: Fallback _safeSetCapability if not provided by BaseUnifiedDevice
     * Wraps setCapabilityValue with existence check and error guard
     */
    async _safeSetCapability(capability, value) {
      try {
        if (this._destroyed) {return false;}
        // WHY (P2235): never auto-add onoff/dim on button-class devices (UI pollution)
        const forbidden = this._forbiddenCapabilities || [];
        if (forbidden.includes(capability)) {return false;}
        const { isSceneRemoteDevice } = require('../utils/scene-remote-classify');
        const isButtonClass = isSceneRemoteDevice(this);
        if (isButtonClass && (capability === 'onoff' || capability === 'dim' || /^onoff\./.test(capability))) {
          return false;
        }
        if (!this.hasCapability(capability)) {
          if (isButtonClass) {return false;}
          await this.addCapability(capability).catch(() => {});
        }
        if (this.hasCapability(capability)) {
          try {
            const { commitCapability } = require('../layers/commitCapability');
            await commitCapability(this, capability, value, 'ui', 0.95);
          } catch (_e) {
            if (typeof this.safeSetCapabilityValue === 'function') {
              await this.safeSetCapabilityValue(capability, value, { source: 'ui' });
            } else {
              await super.setCapabilityValue(capability, value);
            }
          }
          return true;
        }
      } catch (err) {
        this.log(`[VIRTUAL-BTN] _safeSetCapability ${capability}=${value}: ${err.message}`);
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
     * v9.0.40: Standardized helper to check if an app command is pending
     */
    isAppCommandPending(gang = 1) {
      if (typeof super.isAppCommandPending === 'function') {
        return super.isAppCommandPending(gang);
      }
      return this._appCommandPendingMap?.[gang] ?? this._appCommandPending ?? false;
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

      // Ensure state tracking exists safely without breaking legacy boolean logic
      if (typeof this._appCommandPendingMap !== 'object') {
        this._lastOnoffState = {};
        this._appCommandPendingMap = {};
        this._appCommandTimestamp = {};
      }

      const key = gang || 1;
      this._appCommandPendingMap[key] = true;
      
      // LEGACY COMPATIBILITY: Some older drivers check `!this._appCommandPending` (expecting boolean)
      this._appCommandPending = true;

      this._lastOnoffState[key] = value;
      this._appCommandTimestamp[key] = Date.now();

      if (this._appCommandTimeout?.[key]) {
        safeClearTimeout(this, this._appCommandTimeout[key]);
      }
      if (!this._appCommandTimeout) {this._appCommandTimeout = {};}
      this._appCommandTimeout[key] = safeSetTimeout(this, () => { 
        if (this._destroyed) {return;} 
        this._appCommandPendingMap[key] = false; 
        
        // Recompute global legacy boolean
        this._appCommandPending = Object.values(this._appCommandPendingMap).some(Boolean);
      }, 2000);
    }

    /**
     * v6.0.0: Initialize virtual button handlers with self-healing and asymmetric support
     */
    async initVirtualButtons() {
      if (this._virtualButtonsInitialized) {
        this.log(' Already initialized, skipping duplicate registration');
        return;
      }
      this._virtualButtonsInitialized = true;

      this.log(' Initializing Antigravity v6.0.0...');

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
        this.log(' button.toggle (Gang 1)');
      }

      // 2. Register Multi-Gang Toggles (Asymmetric Support)
      for (let i = 1; i <= 8; i++) {
        const cap = `button.toggle_${i}`;
        if (this.hasCapability(cap)) {
          this.registerCapabilityListener(cap, async () => {
            await this._handleVirtualToggle(i);
          });
          this.log(` ${cap} (Gang ${i})`);
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
          this.log(` ${cap} (${config.action})`);
        }
      }

      // v6.0.0: Auto-registration for asymmetric scene buttons.
      // ButtonDevice owns a dedicated router; mixed switch/button devices still
      // need listeners for Homey's button.N UI controls.
      const hasDedicatedButtonCapabilityRouter = typeof this._registerButtonCapabilityListeners === 'function';
      if (!hasDedicatedButtonCapabilityRouter) {
        for (let i = 1; i <= 8; i++) {
          const cap = `button.${i}`;
          if (this.hasCapability(cap)) {
             this.registerCapabilityListener(cap, async () => {
               this.log(` Asymmetric button.${i} pressed`);
               if (typeof this.triggerButtonPress === 'function') {
                 await this.triggerButtonPress(i, 'single', 1, { source: 'virtual' });
               } else {
                 await this._triggerPhysicalFlow?.(i, 'single', { source: 'virtual', _internalTrigger: true });
                 if (typeof this._recordVirtualButtonEvent === 'function') {
                   this._recordVirtualButtonEvent(i, 'single');
                 }
               }
               return true;
             });
             this.log(` ${cap} (scene trigger)`);
          }
        }
      }

      this.log(' Initialization complete');
    }

    /**
     * v6.0.0: Robust Toggle with Bidirectional Sync and Self-Healing
     */
    async _handleVirtualToggle(gang = 1) {
      // v10.6.0 ANTISPAM: leading-edge throttle — a misbehaving dashboard or a
      // flow loop spamming a virtual toggle would otherwise fire one ZCL/DP
      // command per tap (flood risk on sleepy devices, threat (a) of the
      // antispam audit). 300ms per gang; taps inside the window are dropped
      // WITH the optimistic UI toggle skipped too (state stays coherent).
      const nowTap = Date.now();
      this._virtualToggleLastTap = this._virtualToggleLastTap || {};
      if (nowTap - (this._virtualToggleLastTap[gang] || 0) < 300) {
        this.log(` [G${gang}] Tap dropped (anti-spam 300ms)`);
        return;
      }
      this._virtualToggleLastTap[gang] = nowTap;

      // WHY (P2235): scene remotes must never TX OnOff even if a phantom onoff
      // capability still exists (stale pair / DCM race). UI → flow only.
      const { isSceneRemoteDevice } = require('../utils/scene-remote-classify');
      const isSceneRemote = isSceneRemoteDevice(this);
      if (isSceneRemote) {
        this.log(`[VIRTUAL-BTN] [G${gang}] scene remote — skip onoff TX (UI is flow-only)`);
        return;
      }

      const targetCap = gang === 1 ? 'onoff' : `onoff.gang${gang}`;
      
      // Fallback for asymmetric naming (onoff.1, onoff.2, etc.)
      const asymmetricCap = `onoff.${gang}`;
      const finalCap = this.hasCapability(targetCap) ? targetCap : this.hasCapability(asymmetricCap) ? asymmetricCap : null;

      if (!finalCap) {
        this.log(` No onoff capability for gang ${gang}`);
        return;
      }

      try {
        const currentValue = this.getCapabilityValue(finalCap);
        const newValue = !currentValue;
        
        this.log(`[VIRTUAL-BTN] [G${gang}] Toggle Request: ${currentValue} → ${newValue}`);

        // Record event
        this._recordVirtualButtonEvent(gang, 'toggle', { cap: finalCap, from: currentValue, to: newValue });

        // WHY (P2235): markAppCommand BEFORE optimistic UI — closes ghost physical echo race
        if (typeof this.markAppCommand === 'function') {
          this.markAppCommand(gang, newValue);
        }

        // Bidirectional Sync: Optimistically update UI
        if (typeof this._safeSetCapability === 'function') {
          await this._safeSetCapability(finalCap, newValue);
        } else {
          await this.safeSetCapabilityValue(finalCap, newValue).catch(() => {});
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
          this.log(` [G${gang}] Primary protocol failed, attempting fallback...`);
          if (this._isPureTuyaDP) {
            success = await this._tryExecuteZCL(gang, newValue);
          } else {
            success = await this._tryExecuteTuyaDP(gang, newValue);
          }
        }

        // Strategy C: Last Resort (UI Only)
        if (!success) {
          this.warn(` [G${gang}] All protocols failed. Device may be offline.`);
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

      const cluster = endpoint?.clusters?.onOff || endpoint?.clusters?.genOnOff || endpoint?.clusters?.[6] || endpoint?.clusters?.['onOff'];
      if (!cluster) {return false;}

      try {
        // v10.6.0 ANTISPAM: enforce the TX rate limiter (was dead code —
        // canSendCommand had zero call sites). Battery devices: 10 tx/min.
        if (typeof this.canSendCommand === 'function' && !this.canSendCommand('virtual_button')) {
          this.log(`[ZCL-EXEC]  [G${gang}] TX blocked by rate limiter (sleepy-device flood protection)`);
          return false;
        }
        // Mark as App command to prevent physical loop
        if (typeof this.markAppCommand === 'function') {
           this.markAppCommand(gang, value);
        }

        await cluster[value ? 'setOn' : 'setOff']();
        return true;
      } catch (e) {
        this.log(`[ZCL-EXEC]  Failed: ${e.message}`);
        return false;
      }
    }

    /**
     * Helper: Try Tuya DP Execution
     */
    async _tryExecuteTuyaDP(gang, value) {
      if (typeof this._sendTuyaDP !== 'function' && !this.tuyaEF00Manager) {return false;}

      try {
        // v10.6.0 ANTISPAM: TX rate limiter (same as ZCL path)
        if (typeof this.canSendCommand === 'function' && !this.canSendCommand('virtual_button')) {
          this.log(`[DP-EXEC]  [G${gang}] TX blocked by rate limiter (sleepy-device flood protection)`);
          return false;
        }
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
        this.log(`[DP-EXEC]  Failed: ${e.message}`);
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

      // WHY(P2283): doctrine requires lastVirtualPress stamp on every virtual path
      // (docs/BIDIRECTIONAL_BUTTONS.md) — was missing → physical echo after UI toggle.
      try {
        const { stampVirtual } = require('../utils/BidirectionalButtonState');
        stampVirtual(this, gang, event.timestamp);
      } catch (_e) {
        if (!this._virtualPhysicalDedup) {
          this._virtualPhysicalDedup = { lastVirtualPress: {}, lastPhysicalPress: {}, dedupWindow: 2000 };
        }
        this._virtualPhysicalDedup.lastVirtualPress[gang] = event.timestamp;
      }

      this.log(` Event: ${type} G${gang} [${event.correlationId}]`);

      // Trigger global virtual flow card
      try {
        this.homey.flow.getDeviceTriggerCard('virtual_button_pressed')
          .trigger(this, { type, gang, correlationId: event.correlationId }, {})
          .catch(() => {});
      } catch (e) { /* ignore if card not in app.json */ }
    }

    /**
     * Handle Dimming (v6.0.0)
     * v9.0.103: Replaced triggerCapabilityListener with direct ZCL LevelControl
     */
    async _handleVirtualDim(direction) {
      try {
        if (!this.hasCapability('dim')) {return;}
        const current = this.getCapabilityValue('dim') || 0;
        const step = 0.1;
        const next = direction === 'up' ? Math.min(1, current + step) : Math.max(0, current - step);

        this._recordVirtualButtonEvent(1, `dim_${direction}`, { from: current, to: next });

        // Try direct ZCL LevelControl command first (avoids triggerCapabilityListener echo)
        try {
          const ep = this.zclNode?.endpoints?.[1];
          const lc = ep?.clusters?.levelControl || ep?.clusters?.[8];
          if (lc?.step) {
            const stepMode = direction === 'up' ? 0 : 1; // 0=up, 1=down
            await lc.step({ stepMode, stepSize: 25, transitionTime: 0 });
            await this.safeSetCapabilityValue('dim', next);
            return;
          }
        } catch (_) { /* fallback */ }

        // Fallback: send onoff toggle + setDim via registerCapabilityListener
        if (typeof this._setDimValue === 'function') {
          await this._setDimValue(next);
        } else {
          await this.safeSetCapabilityValue('dim', next);
        }
      } catch (err) {
        this.error(`[VIRTUAL-BTN] Dim Error: ${err.message}`);
      }
    }

    /**
     * Handle Identify (v6.0.0)
     * v9.0.103: Replaced triggerCapabilityListener with direct ZCL commands
     */
    async _handleVirtualIdentify() {
      this.log(' Identify');
      this._recordVirtualButtonEvent(1, 'identify');
      try {
        // Method 1: ZCL Identify cluster (preferred)
        const idCluster = this.zclNode?.endpoints?.[1]?.clusters?.identify;
        if (idCluster?.identify) {
          await idCluster.identify({ identifyTime: 10 });
          return;
        }

        // Method 2: Direct ZCL OnOff toggle for visual flash (no triggerCapabilityListener)
        if (this.hasCapability('onoff')) {
          const ep = this.zclNode?.endpoints?.[1];
          const onOff = ep?.clusters?.onOff || ep?.clusters?.[6];
          if (onOff) {
            for (let i = 0; i < 3; i++) {
              await onOff.toggle().catch(() => {});
              await new Promise(r => safeSetTimeout(this, r, 400));
            }
            // Read final state to sync UI
            try {
              const data = await onOff.readAttributes(['onOff']);
              if (data?.onOff != null) {
                if (this._destroyed) {return;}
                await this.safeSetCapabilityValue('onoff', !!data.onOff);
              }
            } catch (_) {}
            return;
          }
        }

        this.log('[VIRTUAL-BTN] Identify: no ZCL cluster available');
      } catch (e) { this.error(e); }
    }

    /**
     * Handle Cover (v6.0.0)
     * v9.0.103: Replaced triggerCapabilityListener with direct ZCL WindowCovering
     */
    async _handleVirtualCover(state) {
      this.log(` Cover: ${state}`);
      this._recordVirtualButtonEvent(1, 'cover', { state });
      try {
        // Method 1: Direct ZCL WindowCovering commands
        const ep = this.zclNode?.endpoints?.[1];
        const wc = ep?.clusters?.windowCovering || ep?.clusters?.[258];
        if (wc) {
          if (state === 'up') {await wc.upOpen?.() || wc.sendCommand?.('upOpen');}
          else if (state === 'down') {await wc.downClose?.() || wc.sendCommand?.('downClose');}
          else {await wc.stop?.() || wc.sendCommand?.('stop');}
          await this.safeSetCapabilityValue('windowcoverings_state', state);
          return;
        }

        // Method 2: Tuya DP fallback
        if (this._sendTuyaDP) {
          const val = state === 'up' ? 0 : state === 'down' ? 2 : 1;
          await this._sendTuyaDP(1, val, 'enum');
          return;
        }

        // Method 3: Update UI only (no device command available)
        if (this.hasCapability('windowcoverings_state')) {
          await this.safeSetCapabilityValue('windowcoverings_state', state);
        }
      } catch (e) { this.error(e); }
    }
  };
};

module.exports = VirtualButtonMixin;
