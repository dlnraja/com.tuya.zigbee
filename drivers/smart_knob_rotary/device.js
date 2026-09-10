'use strict';
const UnifiedBatteryHandler = require('../../lib/battery/UnifiedBatteryHandler');
// A8: NaN Safety - use safeDivide/safeMultiply
const CI = require('../../lib/utils/CaseInsensitiveMatcher');
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');

// P24.7: Safe import for TuyaZigbeeDevice (crash-resilient)
const { safeExtends } = require('../../lib/utils/ClassExtendsGuard');
const TuyaZigbeeDevice = safeExtends('TuyaZigbeeDevice', () => {
  return require('../../lib/tuya/TuyaZigbeeDevice');
});
const SmartKnobRotationMixin = require('../../lib/mixins/SmartKnobRotationMixin');
const { CLUSTER } = require('zigbee-clusters');
const { resolve: resolvePressType } = require('../../lib/utils/TuyaPressTypeMap');

class SmartKnobRotaryDevice extends SmartKnobRotationMixin(TuyaZigbeeDevice) {

  get knobFlowPrefix() {
    return 'smart_knob_rotary';
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Smart Knob Rotary device initialized');

    this._registerPassiveButtonCapabilityListeners();
    
    // Store zclNode for later use
    this._zclNode = zclNode;

    // Initialize brightness simulation state
    this._simulatedBrightness = 0.5;

    // v5.5.990: Track OnOff state to filter heartbeat vs real button press (Ernst02507 fix)
    this._lastOnOffValue = null;
    this._lastOnOffTime = 0;
    this._isTS004F = (this.getSetting('zb_model_id') || '').includes('TS004F');

    // Set initial dim value
    if (this.hasCapability('dim')) {
      await this.safeSetCapabilityValue('dim', this._simulatedBrightness).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
    }

    // WHY(P2448): command/dimmer mode — levelControl step/move for rotation.
    // Old scene-force wrote 0x8004=1 and killed brightness_step RX.
    await this._enableTS004FOperatingMode(zclNode);

    // Setup battery reporting
    await this._setupBatteryReporting(zclNode);

    // Setup button/knob event handling
    await this._setupKnobEventHandling(zclNode);

    // P2449: dim action listener + press+rotate helpers (no second levelControl bind)
    this._registerKnobDimListener();

    // v5.9.3: E000 + Tuya DP detection layers
    await this._setupE000Detection(zclNode);
    await this._setupTuyaDPDetection(zclNode);

    this.log('Smart Knob Rotary initialization complete');
  }

  /**
   * Homey may invoke maintenance button capabilities even when they are
   * declared non-setable. Keep them passive: hardware gestures remain the
   * only source of events, while UI invocations no longer fail with a
   * "Missing Capability Listener" error.
   */
  _registerPassiveButtonCapabilityListeners() {
    for (const capability of ['button.press', 'button.rotate_left', 'button.rotate_right']) {
      if (!this.hasCapability(capability)) {continue;}
      this.registerCapabilityListener(capability, async () => true);
    }
  }

  /**
   * WHY(P2448): ERS-10 / ZG-101ZD rotary needs genOnOff 0x8004=command (0) so
   * levelControl step/move frames reach Homey. Prior scene-force (0x8004=1) here and
   * in DeviceOperatingMode via /smart_knob/ regex — rotation stayed dead.
   * Also migrate compose default button_mode=scene → dimmer once per device.
   */
  async _enableTS004FOperatingMode(zclNode) {
    try {
      const modelId = this.getSetting('zb_model_id') || '';
      if (!CI.includesCI(modelId, 'TS004F') && modelId) {
        // Still apply when model empty (ABSENT wake) — classifier handles it
      }

      const DeviceOperatingMode = require('../../lib/zigbee/DeviceOperatingMode');
      if (this.getStoreValue('p2448_rotary_cmd_migrated') !== true) {
        const cur = String(this.getSetting('button_mode') || '').toLowerCase();
        if (!cur || cur === 'auto' || cur === 'scene') {
          await this.setSettings({ button_mode: 'dimmer' }).catch(() => {});
        }
        await this.setStoreValue('p2448_rotary_cmd_migrated', true).catch(() => {});
      }

      const r = await DeviceOperatingMode.applyDesiredMode(this, zclNode);
      this.log('[TS004F] operating mode:', r.desired || r.skipped, r.via || r.ok);
      DeviceOperatingMode.registerOperationModeListener(this, zclNode);
    } catch (err) {
      this.log('[TS004F] operating mode setup error:', err.message);
    }
  }

  async _setupBatteryReporting(zclNode) {
    try {
      const ep1 = zclNode.endpoints[1];
      if (ep1 && ep1.clusters[CLUSTER.POWER_CONFIGURATION.NAME]) {
        const powerCluster = ep1.clusters[CLUSTER.POWER_CONFIGURATION.NAME];

        // z2m #8072: DO NOT configureReporting on sleepy TS004x remotes —
        // it makes them drop off the network hourly ("needs 2 presses",
        // LED flashing, battery drain). Read once + passive reports only.

        // Read initial battery value
        const batteryStatus = await powerCluster.readAttributes(['batteryPercentageRemaining']).catch(() => null);
        if (batteryStatus && batteryStatus.batteryPercentageRemaining !== undefined) {
          const batteryValue = UnifiedBatteryHandler.normalizeZigbeeValue(batteryStatus.batteryPercentageRemaining, { manufacturer: (this.getSetting && this.getSetting('zb_manufacturer_name')) || '', batteryType: 'CR2032' });
          if (batteryValue == null) {return;}
          await this.safeSetCapabilityValue('measure_battery', batteryValue).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
          this.log('Battery level:', batteryValue, '%');
        }
      }
    } catch (err) {
      this.log('Battery setup error:', err.message);
    }
  }

  async _setupKnobEventHandling(zclNode) {
    try {
      // Handle On/Off cluster for toggle actions
      if (zclNode.endpoints[1] && zclNode.endpoints[1].clusters[CLUSTER.ON_OFF.NAME]) {
        const onOffCluster = zclNode.endpoints[1].clusters[CLUSTER.ON_OFF.NAME];
        
        // v5.5.990: Attribute change - filter heartbeat vs real button press (Ernst02507 fix)
        onOffCluster.on('attr.onOff', (value) => {
          const now = Date.now();
          const timeSinceLast = now - this._lastOnOffTime;
          const isSameValue = value === this._lastOnOffValue;
          
          this.log('[ONOFF] attr.onOff:', value, '| same:', isSameValue, '| delta:', timeSinceLast, 'ms');
          
          if (this._isTS004F) {
            this._lastOnOffValue = value;
            this._lastOnOffTime = now;
            return;
          }
          
          if (isSameValue && timeSinceLast < 5000) {
            return;
          }
          
          this._lastOnOffValue = value;
          this._lastOnOffTime = now;
          this._triggerButtonPress(value ? 'on' : 'off');
      });
        
        onOffCluster.on('on', () => {
          this.log('On command received');
          this._triggerButtonPress('on');
      });
        
        onOffCluster.on('off', () => {
          this.log('Off command received');
          this._triggerButtonPress('off');
      });
        
        onOffCluster.on('toggle', () => {
          this.log('Toggle command received');
          this._triggerButtonPress('toggle');
      });
      }

      // Handle Level Control cluster for rotation actions
      if (zclNode.endpoints[1] && zclNode.endpoints[1].clusters[CLUSTER.LEVEL_CONTROL.NAME]) {
        const levelCluster = zclNode.endpoints[1].clusters[CLUSTER.LEVEL_CONTROL.NAME];

        levelCluster.on('move', (payload) => {
          const direction = payload.moveMode === 0 ? 'up' : 'down';
          this._handleRotation(direction, payload.rate || 50);
      });

        levelCluster.on('moveWithOnOff', (payload) => {
          const direction = payload.moveMode === 0 ? 'up' : 'down';
          this._handleRotation(direction, payload.rate || 50);
      });

        levelCluster.on('step', (payload) => {
          const direction = payload.stepMode === 0 ? 'up' : 'down';
          this._handleRotationStep(direction, payload.stepSize || 10);
      });

        levelCluster.on('stepWithOnOff', (payload) => {
          const direction = payload.stepMode === 0 ? 'up' : 'down';
          this._handleRotationStep(direction, payload.stepSize || 10);
      });
      }

      await this._setupScenesCluster(zclNode);
      this._setupCommandListeners(zclNode);
      this._setupOnOffRotateFc(zclNode);

    } catch (err) {
      this.log('Knob event handling setup error:', err.message);
    }
  }

  /**
   * WHY(P2448): event-mode rotate_left/right arrives as genOnOff mfr cmd 0xFC
   * (same as PhysicalButtonMixin). Keep as parallel RX when user stays in scene.
   */
  _setupOnOffRotateFc(zclNode) {
    try {
      const ep = zclNode?.endpoints?.[1];
      if (!ep) {return;}
      const onOff = ep.clusters?.onOff || ep.clusters?.genOnOff || ep.clusters?.[6];
      if (onOff && typeof onOff.on === 'function') {
        onOff.on('onToggle', (payload) => {
          try {
            if (payload && Number(payload.cmdId) === 0xFC) {
              const dir = Number(payload.data?.[0] ?? payload.direction ?? 0);
              if (dir === 1) this._triggerRotateLeft();
              else if (dir === 2) { /* stop */ }
              else this._triggerRotateRight();
            }
          } catch (_e) { /* noop */ }
        });
      }
      const original = ep.handleFrame?.bind(ep);
      if (!original || ep._p2448RotateFcWrapped) {return;}
      ep._p2448RotateFcWrapped = true;
      const self = this;
      ep.handleFrame = (clusterId, frame, meta) => {
        try {
          const cid = Number(clusterId);
          if (cid === 6 || cid === 0x0006) {
            const data = Buffer.isBuffer(frame) ? frame
              : Array.isArray(frame) ? Buffer.from(frame) : null;
            if (data && data.length >= 3) {
              const { parseZclHeader } = require('../../lib/zigbee/ZigbeeHelpers');
              const hdr = parseZclHeader(data);
              if (hdr && hdr.cmdId === 0xFC) {
                const dir = data[hdr.payloadOffset] ?? 0;
                self.log('[KNOB-FC] rotate dir=', dir);
                if (dir === 1) self._triggerRotateLeft();
                else if (dir !== 2) self._triggerRotateRight();
              }
            }
          }
        } catch (_e) { /* noop */ }
        return original(clusterId, frame, meta);
      };
    } catch (e) {
      this.log('[KNOB-FC] setup error:', e.message);
    }
  }

  _setupCommandListeners(zclNode) {
    try {
      const endpoint = zclNode.endpoints[1];
      if (!endpoint) {return;}

      endpoint.on('command', (clusterId, commandId, payload) => {
        if (clusterId === 18) { 
          this._handleMultistateInput(payload);
        }
      });

    } catch (err) {
      this.log('Command listener setup error:', err.message);
    }
  }

  async _setupScenesCluster(zclNode) {
    try {
      const ep = zclNode.endpoints[1];
      if (!ep) {return;}

      const sc = ep.clusters?.scenes || ep.clusters?.[5] || 
                 ep.bindings?.scenes || ep.bindings?.[5];
      
      if (sc) {
        sc.on('recall', (p) => { 
          this._handleSceneCommand(p?.sceneId ?? p?.groupId ?? p);
      });
        sc.on('recallScene', (p) => { 
          this._handleSceneCommand(p?.sceneId ?? p);
      });
        
        if (typeof sc.bind === 'function') {
          await sc.bind().catch(() => {});
        }
      }
      this._setupRawSceneListener(ep);
    } catch (e) { 
      this.log('[SCENES] Setup error:', e.message); 
    }
  }

  _setupRawSceneListener(endpoint) {
    try {
      const originalHandleFrame = endpoint.handleFrame?.bind(endpoint);
      endpoint.handleFrame = (clusterId, frame, meta) => {
        if (clusterId === 5 || clusterId === 0x0005) {
          // v10.6.0 FIX: `frame` is a raw Buffer with the full ZCL header —
          // `frame[0]` is the frame CONTROL byte (0x01), never cmdId 0x05,
          // so this listener never fired. Parse the header properly; a scenes
          // recall payload is groupId(uint16) + sceneId(uint8).
          const { parseZclHeader } = require('../../lib/zigbee/ZigbeeHelpers');
          const data = Buffer.isBuffer(frame) ? frame
            : Array.isArray(frame) ? Buffer.from(frame) : null;
          const hdr = data ? parseZclHeader(data) : null;
          if (hdr && hdr.cmdId === 0x05 && data.length >= hdr.payloadOffset + 3) {
            const sceneId = data[hdr.payloadOffset + 2];
            this._handleSceneCommand(sceneId);
          }
        }
        if (originalHandleFrame) {
          return originalHandleFrame(clusterId, frame, meta);
        }
      };
    } catch (e) {
      this.log('[SCENES-RAW] Setup error:', e.message);
    }
  }

  _handleSceneCommand(sceneId) {
    const map = { 0: 'single', 1: 'double', 2: 'hold', 3: 'triple' };
    const sid = Number(sceneId);
    // WHY(P2449): also fire dedicated scene_recall flow card (was press-only)
    this._triggerKnobSceneRecall(Number.isFinite(sid) ? sid : sceneId).catch(() => {});
    this._triggerButtonPress(map[sceneId] || `scene_${sceneId}`);
  }

  _handleMultistateInput(payload) {
    const action = payload.presentValue || payload;
    switch (action) {
    case 0:
    case 1:
      this._triggerButtonPress('single');
      break;
    case 2:
      this._triggerButtonPress('double');
      break;
    case 3:
      this._triggerButtonPress('hold');
      break;
    }
  }

  async _handleRotation(direction, rate) {
    if (this._destroyed) {return;}
    const delta = direction === 'up' ? 0.1 : -0.1;
    this._updateSimulatedBrightness(delta);
    if (direction === 'up') {
      await this._triggerRotateRight();
    } else {
      await this._triggerRotateLeft();
    }
  }

  async _handleRotationStep(direction, stepSize) {
    if (this._destroyed) {return;}
    const delta = direction === 'up' ? stepSize / 254 : -(stepSize / 254);
    this._updateSimulatedBrightness(delta);
    // v10.4.0 (ZHA ts004f): step_size encodes rotation speed — 13 = slow,
    // 37 = fast. Expose it as a flow token so users can build speed-aware flows.
    this._lastRotationSpeed = stepSize <= 20 ? 'slow' : stepSize >= 30 ? 'fast' : 'normal';
    if (direction === 'up') {
      await this._triggerRotateRight();
    } else {
      await this._triggerRotateLeft();
    }
  }

  _rotationTokens() {
    return {
      brightness: Math.round(this._simulatedBrightness * 100),
      speed: this._lastRotationSpeed || 'normal'
    };
  }

  _updateSimulatedBrightness(delta) {
    this._simulatedBrightness = Math.max(0, Math.min(1, this._simulatedBrightness + delta));
    if (this.hasCapability('dim')) {
      this.safeSetCapabilityValue('dim', this._simulatedBrightness).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
    }
    this.log('Simulated brightness:', Math.round(this._simulatedBrightness * 100), '%');
    // WHY(P2449): brightness_changed flow was declared but never triggered
    this._triggerKnobBrightnessChanged().catch(() => {});
  }

  async _triggerRotateLeft() {
    // Delegate to mixin — also fires press_and_rotate_left when held
    await this._triggerKnobRotateLeft();
  }

  async _triggerRotateRight() {
    await this._triggerKnobRotateRight();
  }

  async _triggerButtonPress(action) {
    if (this._destroyed) {return;}
    if (action === 'hold' || action === 'long' || action === 'long_press') {
      this.markKnobPressHeld();
    } else if (action === 'single') {
      this.markKnobPressHeld(800);
    } else if (action === 'release') {
      this.clearKnobPressHeld();
    }
    if (this.hasCapability('button.press')) {
      await this.safeSetCapabilityValue('button.press', true).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
      this.homey.setTimeout(() => { if (this._destroyed) {return;} this.safeSetCapabilityValue('button.press', false).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} })); }, 100);
    }
    try {
      // SDK3: getDeviceTriggerCard(id) only — second arg was a no-op / risk
      const genericTrigger = (() => { try { return this.homey.flow.getDeviceTriggerCard('smart_knob_rotary_pressed'); } catch(e) { return null; } })();
      if (genericTrigger) {
        await genericTrigger.trigger(this, { action }).catch(() => {});
      }
    } catch (e) { /* ignore */ }

    let specificCardId = null;
    if (action === 'single' || action === 'on' || action === 'off' || action === 'toggle') {
      specificCardId = 'smart_knob_rotary_single_press';
    } else if (action === 'double') {
      specificCardId = 'smart_knob_rotary_double_press';
    } else if (action === 'hold' || action === 'long') {
      specificCardId = 'smart_knob_rotary_long_press';
    }
    
    if (specificCardId) {
      try {
        const triggerCard = this.homey.flow.getDeviceTriggerCard(specificCardId);
        if (triggerCard) {
            await triggerCard.trigger(this, { action }).catch(() => {});
        }
      } catch (e) { /* ignore */ }
    }
  }

  async _setupE000Detection(zclNode) {
    try {
      const ep = zclNode?.endpoints?.[1]; if (!ep ) {return;}
      const e = ep.clusters?.tuyaE000 || ep.clusters?.[57344];
      if (e?.on) {
        e.on('buttonPress', async (d) => { this._triggerButtonPress(resolvePressType(d?.pressType, 'KNOB-E000')); });
        for (const c of ['cmd0','cmd1','cmd2','cmdFD','cmdFE','cmdFF']) {
          e.on(c , async ({ data }) => { this._triggerButtonPress(data?.length >= 1 ? resolvePressType(data[0] , 'KNOB-E000') : 'single'); });
        }
      }
    } catch (e) { this.log('[E000] Error:', e.message); }
  }

  async _setupTuyaDPDetection(zclNode) {
    try {
      const tc = zclNode?.endpoints?.[1]?.clusters?.tuya || zclNode?.endpoints?.[1]?.clusters?.[61184];
      if (!tc?.on) {return;}
      tc.on('response', async (d) => { const v = d?.data ?? d?.value ?? 0; this._triggerButtonPress(resolvePressType(v, 'KNOB-DP')); });
      tc.on('datapoint', async (d) => { const v = d?.data?.[0] ?? 0; this._triggerButtonPress(resolvePressType(v, 'KNOB-DP')); });
    } catch (e) { this.log('[TUYA-DP] Error:', e.message); }
  }

  onDeleted() {
    super.onDeleted();
    this.log('Smart Knob Rotary device deleted');
  }

  async onEndDeviceAnnounce() {
    this.log('[REJOIN] Device announced itself, refreshing state...');
    if (typeof this._updateLastSeen === 'function') {this._updateLastSeen();}
    if (this._dataRecoveryManager) {
       this._dataRecoveryManager?.forceRecovery?.();
    }
  }
}

module.exports = SmartKnobRotaryDevice;
