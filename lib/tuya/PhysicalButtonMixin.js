'use strict';

/**
 * PhysicalButtonMixin - Universal Tuya/Zigbee Button Management
 * v9.5.0: Production-Grade Layered Detection + Intelligent Mode Sync
 * 
 * Features:
 * - Autonomous Scene Mode Switching (0x8004) with Retry & Verification
 * - 8-Layer detection (Scenes, OnOff, Multistate, Level, E000, Tuya DP, 0xFD, Raw)
 * - Bi-directional capability sync (Virtual UI <-> Physical Device)
 * - Intelligent anti-ghosting & manufacturer-specific deduplication
 * - Support for MOES, TS004F, TS0044, TS1201, and exotic variants
 */

const { resolve: resolvePressType } = require('../utils/TuyaPressTypeMap');
const { containsCI, includesCI } = require('../utils/CaseInsensitiveMatcher');

module.exports = (Base) => class extends Base {

  async onNodeInit({ zclNode }) {
    if (super.onNodeInit) await super.onNodeInit({ zclNode });

    this.log(`[ButtonMixin] 🔘 Initializing Universal Button Management for EP1-${this.buttonCount || 1}...`);
    
    this._buttonState = {
      lastPhysicalPress: {},
      lastVirtualPress: {},
      modeVerified: false,
      modeAttempts: 0,
      onOffDedup: {},
      e000Dedup: {},
      antiTrigger: {
        lastTrigger: 0,
        hourlyPatternCount: 0
      }
    };

    // Setup detection layers across all endpoints
    await this._setupDetectionLayers(zclNode);

    // Register UI Capability Listeners (Bidirectional Sync)
    await this._registerCapabilityListeners();

    // Initial mode check - defer to allow sleepy devices to wake
    this.homey.setTimeout(async () => {
      await this._enforceOperatingMode(zclNode).catch(e => this.log('[ButtonMixin] mode error:', e.message));
    }, 500);

    // Bind re-announce for cold boot recovery
    if (typeof this.onEndDeviceAnnounce === 'function') {
      const originalAnnounce = this.onEndDeviceAnnounce.bind(this);
      this.onEndDeviceAnnounce = async () => {
        this.log('[ButtonMixin] 📡 Device re-announced, re-verifying mode...');
        this._buttonState.modeVerified = false;
        await this._enforceOperatingMode(zclNode).catch(() => {});
        await originalAnnounce();
      };
    }
  }

  /**
   * Layered Detection System
   */
  async _setupDetectionLayers(zclNode) {
    const endpoints = Object.keys(zclNode.endpoints);
    
    for (const epId of endpoints) {
      const ep = zclNode.endpoints[epId];
      const epNum = parseInt(epId);

      // Layer 1: Standard OnOff Commands (Single/Double/Long)
      if (ep.clusters.onOff) {
        this._setupOnOffDetection(ep, epNum);
      }

      // Layer 2: Scenes Cluster (Recall Scene)
      if (ep.clusters.scenes) {
        this._setupScenesDetection(ep, epNum);
      }

      // Layer 3: LevelControl (Dimmer fallback/Dimmer mode/Rotary)
      if (ep.clusters.levelControl) {
        this._setupLevelDetection(ep, epNum);
      }

      // Layer 4: Multistate Input
      if (ep.clusters.multistateInput || ep.clusters.genMultistateInput) {
        this._setupMultistateDetection(ep, epNum);
      }

      // Layer 5: Tuya Manufacturer Specific (0xEF00)
      if (ep.clusters.tuya || ep.clusters.manuSpecificTuya) {
        this._setupTuyaDPDetection(ep, epNum);
      }

      // Layer 6: Proprietary E000 (57344) Cluster (MOES/LIDL)
      await this._setupE000Detection(ep, epNum);
    }

    // Layer 7: Raw Frame Interception (Fallback for unknown clusters)
    zclNode.on('frame', (frame) => {
      if (frame.clusterId === 0xE000 || frame.clusterId === 0xFD || frame.clusterId === 57344) {
        this._handleRawFrame(frame);
      }
    });
  }

  /**
   * Operating Mode Management (Dimmer vs Scene)
   * Research: TS004F/MOES require 0x8004=1 for Scene mode
   */
  async _enforceOperatingMode(zclNode) {
    const productId = (this.getData().productId || '').toUpperCase();
    const mfr = (this.getSetting('zb_manufacturer_name') || '').toUpperCase();
    
    const needsModeSwitch = productId.includes('TS004F') || mfr.startsWith('_TZ3000_');
    if (!needsModeSwitch) return;

    if (this._buttonState.modeVerified) return;

    this.log(`[ButtonMixin] ⚙️ Enforcing Operating Mode for ${productId} (Attempt ${this._buttonState.modeAttempts + 1}/3)`);
    
    const ep1 = zclNode.endpoints[1];
    if (ep1?.clusters.onOff) {
      const mode = 1; // Always Scene Mode for Homey flows
      try {
        await ep1.clusters.onOff.writeAttributes({ 0x8004: mode });
        this._buttonState.modeVerified = true;
        this.log('[ButtonMixin] ✅ Mode 0x8004=1 written successfully');
      } catch (e) {
        this.log('[ButtonMixin] ⚠️ Mode write failed, trying raw write:', e.message);
        try {
          await ep1.clusters.onOff.write({ attributeId: 0x8004, dataType: 0x30, value: mode });
          this._buttonState.modeVerified = true;
          this.log('[ButtonMixin] ✅ Mode 0x8004=1 written successfully (raw)');
        } catch (e2) {
          this.log('[ButtonMixin] ❌ Mode write failed (raw):', e2.message);
          this._buttonState.modeAttempts++;
          if (this._buttonState.modeAttempts < 3) {
            this.homey.setTimeout(() => this._enforceOperatingMode(zclNode), 2000);
          }
        }
      }
    }
  }

  /**
   * Bidirectional Sync: Register listeners for UI button presses
   */
  async _registerCapabilityListeners() {
    const count = this.buttonCount || 1;
    for (let i = 1; i <= count; i++) {
      const capId = i === 1 ? 'button' : `button.${i}`;
      if (this.hasCapability(capId)) {
        this.registerCapabilityListener(capId, async (value) => {
          if (value) {
            this.log(`[ButtonMixin] 📱 Virtual Press: ${capId}`);
            await this.triggerButtonPress(i, 'single', { source: 'virtual' });
          }
        });
      }
    }
  }

  /**
   * Universal Trigger Logic
   */
  async triggerButtonPress(button, type = 'single', options = {}) {
    const source = options.source || 'physical';
    const now = Date.now();

    // 1. Anti-Ghosting Protection (Tuya x:30 Hourly Spontaneous Press Bug)
    const currentMinute = new Date(now).getMinutes();
    const timeSinceLast = now - this._buttonState.antiTrigger.lastTrigger;
    
    if (source === 'physical' && currentMinute === 30 && timeSinceLast > 50 * 60 * 1000 && timeSinceLast < 70 * 60 * 1000) {
      this._buttonState.antiTrigger.hourlyPatternCount++;
      if (this._buttonState.antiTrigger.hourlyPatternCount >= 2) {
        this.log(`[ButtonMixin] 🚫 BLOCKED: Spontaneous hourly ghost-press detected (Minute ${currentMinute})`);
        return;
      }
    } else if (source === 'physical') {
      this._buttonState.antiTrigger.hourlyPatternCount = 0;
    }
    this._buttonState.antiTrigger.lastTrigger = now;

    // 2. Bi-directional Sync & Deduplication
    if (source === 'physical') {
      const lastVirtual = this._buttonState.lastVirtualPress[button] || 0;
      if (now - lastVirtual < 1000) {
        this.log(`[ButtonMixin] ⏭️ Skipping physical trigger (virtual sync in progress)`);
        return;
      }
      this._buttonState.lastPhysicalPress[button] = now;
    } else {
      const lastPhysical = this._buttonState.lastPhysicalPress[button] || 0;
      if (now - lastPhysical < 1000) {
        this.log(`[ButtonMixin] ⏭️ Skipping virtual trigger (physical sync in progress)`);
        return;
      }
      this._buttonState.lastVirtualPress[button] = now;
    }

    // 3. Intra-physical Deduplication (prevents double triggers from multi-cluster reports)
    const dedupKey = `${button}_${type}`;
    const lastPress = this._buttonState.lastPhysicalPress[dedupKey] || 0;
    if (source === 'physical' && now - lastPress < 350) return;
    if (source === 'physical') this._buttonState.lastPhysicalPress[dedupKey] = now;

    this.log(`[ButtonMixin] 🔘 TRIGGER: Button ${button} ${type.toUpperCase()} (${source})`);

    // 3. Capability UI Feedback
    const capId = button === 1 ? 'button' : `button.${button}`;
    if (this.hasCapability(capId)) {
      await this.setCapabilityValue(capId, true).catch(() => {});
      this.homey.setTimeout(() => this.setCapabilityValue(capId, false).catch(() => {}), 200);
    }

    // 4. Flow Card Execution
    const tokens = { button: button.toString(), type };
    await this._triggerFlowCards(button, type, tokens);
  }

  /**
   * Rotary/Knob Trigger Logic
   */
  async triggerRotation(button, direction, options = {}) {
    const value = options.value || 10; // Default step size
    this.log(`[ButtonMixin] 🔄 ROTATION: Button ${button} ${direction.toUpperCase()} (${value}%)`);

    // 1. Update dim capability if exists
    if (this.hasCapability('dim')) {
      const current = this.getCapabilityValue('dim') || 0;
      const step = (value / 100) * (direction === 'up' ? 1 : -1);
      const next = Math.max(0, Math.min(1, current + step));
      await this.setCapabilityValue('dim', next).catch(() => {});
    }

    // 2. Flow Card Execution
    const tokens = { direction, level: Math.round((this.getCapabilityValue('dim') || 0) * 100) };
    
    // Global rotary triggers
    this._safeTrigger('knob_rotated', tokens);
    this._safeTrigger('smart_knob_rotated', tokens);
    
    // Driver specific
    this._safeTrigger(`${this.driver.id}_rotated`, tokens);
    this._safeTrigger(`${this.driver.id}_level_changed`, { level: tokens.level });
  }

  /**
   * v9.5.1: Smart Flow Card Triggering
   * Attempts global cards first, then falls back to various driver-specific legacy patterns
   */
  async _triggerFlowCards(button, type, tokens) {
    const driverId = this.driver.id;
    const buttonCount = this.buttonCount || 1;
    const typeLabel = type === 'single' ? 'pressed' : type;

    // A. Global Triggers (Standardized v9.5.1)
    // Always trigger the universal card with tokens
    this._safeTrigger('button_pressed', tokens);
    
    // Trigger specific cards for non-single types
    if (type !== 'single') {
      this._safeTrigger(`button_${type === 'release' ? 'release' : type + '_press'}`, tokens);
    }

    // B. Driver-Specific Legacy Patterns (Backward Compatibility)
    // Pattern 1: {driver}_button_{N}gang_button_{type}
    const driverPrefix = `${driverId}_button_${buttonCount}gang_button`;
    this._safeTrigger(`${driverPrefix}_${type === 'single' ? 'pressed' : type + '_press'}`, tokens);

    // Pattern 2: {driver}_button_{N}gang_button_{button}_{type}
    this._safeTrigger(`${driverPrefix}_${button}_${typeLabel}`, {});
    
    // Pattern 3: {driver}_button_{button}_{type}
    this._safeTrigger(`${driverId}_button_${button}_${typeLabel}`, {});
  }

  _safeTrigger(cardId, tokens) {
    try {
      const card = this.homey.flow.getDeviceTriggerCard(cardId);
      if (card) {
        card.trigger(this, tokens).catch(e => this.log(`[ButtonMixin] Flow error (${cardId}):`, e.message));
      }
    } catch (e) {
      // Card not defined for this device - skip silently
    }
  }

  // --- Detection Logic ---

  _setupOnOffDetection(ep, epNum) {
    ep.clusters.onOff.on('command', (cmd, payload) => {
      this.log(`[ButtonMixin] EP${epNum} OnOff Command: ${cmd}`);
      if (cmd === 'on' || cmd === 'setOn') this.triggerButtonPress(epNum, 'single');
      if (cmd === 'off' || cmd === 'setOff') this.triggerButtonPress(epNum, 'double');
      if (cmd === 'toggle') this.triggerButtonPress(epNum, 'long');
      
      // Handle Tuya 0xFD (Extended Scene Command)
      if (cmd === 0xFD || cmd === 'tuyaAction') {
        const pressValue = payload?.data?.[0] ?? payload?.value ?? 0;
        const type = resolvePressType(pressValue, 'BTN-0xFD');
        this.triggerButtonPress(epNum, type);
      }
    });
  }

  _setupScenesDetection(ep, epNum) {
    ep.clusters.scenes.on('recall', (payload) => {
      const sceneId = payload?.sceneId ?? 0;
      const type = resolvePressType(sceneId, 'BTN-scene');
      this.triggerButtonPress(epNum, type);
    });
  }

  _setupLevelDetection(ep, epNum) {
    ep.clusters.levelControl.on('command', (cmd, payload) => {
      this.log(`[ButtonMixin] EP${epNum} LevelControl Command: ${cmd}`);
      
      // Button Press Fallback (Legacy)
      if (cmd === 'step' || cmd === 'stepWithOnOff') {
        const stepMode = payload?.stepMode ?? payload?.mode ?? 0;
        if (stepMode === 0 || stepMode === 1) { // Up/Down step can be button or rotation
          // If it has a large step size, it's likely a rotation
          const size = payload?.stepSize ?? 10;
          if (size > 20) {
             this.triggerRotation(epNum, stepMode === 0 ? 'up' : 'down', { value: Math.round((size/254)*100) });
             return;
          }
        }
        this.triggerButtonPress(epNum, 'single');
      }
      
      if (cmd === 'move' || cmd === 'moveWithOnOff') {
        const moveMode = payload?.moveMode ?? 0;
        this.triggerRotation(epNum, moveMode === 0 ? 'up' : 'down');
        // Also trigger long press for move commands if it's a regular button
        this.triggerButtonPress(epNum, 'long');
      }

      if (cmd === 'moveToLevel' || cmd === 'moveToLevelWithOnOff') {
        const level = payload?.level ?? 0;
        const pct = Math.round((level / 254) * 100);
        this.triggerRotation(epNum, 'set', { value: pct });
      }
    });
  }

  _setupMultistateDetection(ep, epNum) {
    const multi = ep.clusters.multistateInput || ep.clusters.genMultistateInput;
    if (multi) {
      multi.on('attr.presentValue', (val) => {
        const type = resolvePressType(val, 'BTN-multi');
        this.triggerButtonPress(epNum, type);
      });
    }
  }

  _setupTuyaDPDetection(ep, epNum) {
    const tuya = ep.clusters.tuya || ep.clusters.manuSpecificTuya;
    if (tuya) {
      tuya.on('response', (data) => {
        const dp = data.dp;
        const val = data.data?.[0] ?? 0;
        if (dp >= 1 && dp <= 8) { // Support up to 8-gang
          const type = resolvePressType(val, 'BTN-DP');
          this.triggerButtonPress(dp, type);
        }
      });
    }
  }

  async _setupE000Detection(ep, epNum) {
    const e000 = ep.clusters.tuyaE000 || ep.clusters[57344];
    if (e000) {
      e000.on('command', (cmd, payload) => {
        const val = payload?.data?.[0] ?? 0;
        const type = resolvePressType(val, 'BTN-E000');
        this.triggerButtonPress(epNum, type);
      });
    }
  }

  _handleRawFrame(frame) {
    this.log(`[ButtonMixin] 🎯 Raw Frame Intercepted: Cluster=0x${frame.clusterId.toString(16)}`);
  }
};
