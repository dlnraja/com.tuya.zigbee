'use strict';
// A8: NaN Safety - use safeDivide/safeMultiply
require('../../lib/utils/CaseInsensitiveMatcher');
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const { resolve: resolvePressType } = require('../../lib/utils/TuyaPressTypeMap');

class SmartKnobRotaryHybridDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Smart Knob Rotary Hybrid device initialized');
    
    // Store zclNode for later use
    this._zclNode = zclNode;

    // Initialize brightness simulation state
    this._simulatedBrightness = 0.5;

    // v5.5.990: Track OnOff state to filter heartbeat vs real button press
    this._lastOnOffValue = null;
    this._lastOnOffTime = 0;
    this._isTS004F = (this.getSetting('zb_model_id') || '').includes('TS004F');

    // Set initial dim value
    if (this.hasCapability('dim')) {
      await this.setCapabilityValue('dim', this._simulatedBrightness).catch(this.error);
    }

    // v5.5.976: Enable TS004F scene mode (critical for button events)
    await this._enableTS004FSceneMode(zclNode);

    // Setup battery reporting
    await this._setupBatteryReporting(zclNode);

    // Setup button/knob event handling
    await this._setupKnobEventHandling(zclNode);

    // v5.9.3: E000 + Tuya DP detection layers
    await this._setupE000Detection(zclNode);
    await this._setupTuyaDPDetection(zclNode);

    this.log('Smart Knob Rotary Hybrid initialization complete');
  }

  async _enableTS004FSceneMode(zclNode) {
    try {
      const modelId = this.getSetting('zb_model_id') || '';
      if (!CI.includesCI(modelId, 'TS004F')) return;
      
      if (zclNode.endpoints[1]?.clusters?.onOff) {
        const onOffCluster = zclNode.endpoints[1].clusters.onOff;
        try {
          await onOffCluster.writeAttributes({ 32772: 1 }); // 0x8004
        } catch (writeErr) {
          try {
            await onOffCluster.writeAttributes({ switchMode: 1 });
          } catch (altErr) { /* ignore */ }
        }
      }
    } catch (err) { /* ignore */ }
  }

  async _setupBatteryReporting(zclNode) {
    try {
      const ep1 = zclNode.endpoints[1];
      if (ep1 && ep1.clusters[CLUSTER.POWER_CONFIGURATION.NAME]) {
        const powerCluster = ep1.clusters[CLUSTER.POWER_CONFIGURATION.NAME];
        await powerCluster.configureReporting({
          batteryPercentageRemaining: {
            minInterval: 3600,
            maxInterval: 65534,
            minChange: 1,
          },
        }).catch(() => {});

        const batteryStatus = await powerCluster.readAttributes(['batteryPercentageRemaining']).catch(() => null);
        if (batteryStatus && batteryStatus.batteryPercentageRemaining !== undefined) {
          const batteryValue = Math.round(batteryStatus.batteryPercentageRemaining     / 2);
          await this.setCapabilityValue('measure_battery', batteryValue).catch(this.error);
        }
      }
    } catch (err) { /* ignore */ }
  }

  async _setupKnobEventHandling(zclNode) {
    try {
      // Handle On/Off cluster
      if (zclNode.endpoints[1] && zclNode.endpoints[1].clusters[CLUSTER.ON_OFF.NAME]) {
        const onOffCluster = zclNode.endpoints[1].clusters[CLUSTER.ON_OFF.NAME];
        onOffCluster.on('attr.onOff', (value) => {
          const now = Date.now();
          if (this._isTS004F) return;
          if (value === this._lastOnOffValue && (now - this._lastOnOffTime < 5000)) return;
          this._lastOnOffValue = value;
          this._lastOnOffTime = now;
          this._triggerButtonPress(value ? 'on' : 'off');
        });
        onOffCluster.on('on', () => this._triggerButtonPress('on'));
        onOffCluster.on('off', () => this._triggerButtonPress('off'));
        onOffCluster.on('toggle', () => this._triggerButtonPress('toggle'));
      }

      // Handle Level Control cluster
      if (zclNode.endpoints[1] && zclNode.endpoints[1].clusters[CLUSTER.LEVEL_CONTROL.NAME]) {
        const levelCluster = zclNode.endpoints[1].clusters[CLUSTER.LEVEL_CONTROL.NAME];
        levelCluster.on('move', (payload) => this._handleRotation(payload.moveMode === 0 ? 'up' : 'down', payload.rate || 50));
        levelCluster.on('step', (payload) => this._handleRotationStep(payload.stepMode === 0 ? 'up' : 'down', payload.stepSize || 10));
      }

      await this._setupScenesCluster(zclNode);
      this._setupCommandListeners(zclNode);
    } catch (err) { /* ignore */ }
  }

  _setupCommandListeners(zclNode) {
    const endpoint = zclNode.endpoints[1];
    if (!endpoint) return;
    endpoint.on('command', (clusterId, commandId, payload) => {
      if (clusterId === 18) this._handleMultistateInput(payload);
    });
  }

  async _setupScenesCluster(zclNode) {
    try {
      const ep = zclNode.endpoints[1];
      if (!ep) return;
      const sc = ep.clusters?.scenes || ep.clusters?.[5] || ep.bindings?.scenes || ep.bindings?.[5];
      if (sc) {
        sc.on('recall', (p) => this._handleSceneCommand(p?.sceneId ?? p?.groupId ?? p));
        sc.on('recallScene', (p) => this._handleSceneCommand(p?.sceneId ?? p));
      }
      this._setupRawSceneListener(ep);
    } catch (e) { /* ignore */ }
  }

  _setupRawSceneListener(endpoint) {
    const originalHandleFrame = endpoint.handleFrame?.bind(endpoint);
    endpoint.handleFrame = (clusterId, frame, meta) => {
      if (clusterId === 5 && frame && frame.length >= 4 && frame[0] === 0x05) {
        this._handleSceneCommand(frame[3]);
      }
      if (originalHandleFrame) return originalHandleFrame(clusterId, frame, meta);
    };
  }

  _handleSceneCommand(sceneId) {
    const map = { 0: 'single', 1: 'double', 2: 'hold', 3: 'triple' };
    this._triggerButtonPress(map[sceneId] || `scene_${sceneId}`);
  }

  _handleMultistateInput(payload) {
    const action = payload.presentValue || payload;
    if (action === 0 || action === 1) this._triggerButtonPress('single');
    else if (action === 2) this._triggerButtonPress('double');
    else if (action === 3) this._triggerButtonPress('hold');
  }

  async _handleRotation(direction, rate) {
    const delta = direction === 'up' ? 0.1 : -0.1;
    this._updateSimulatedBrightness(delta);
    direction === 'up' ? await this._triggerRotateRight() : await this._triggerRotateLeft();
  }

  async _handleRotationStep(direction, stepSize) {
    const delta = direction === 'up' ? (stepSize / 254) : -(stepSize / 254);
    this._updateSimulatedBrightness(delta);
    direction === 'up' ? await this._triggerRotateRight() : await this._triggerRotateLeft();
  }

  _updateSimulatedBrightness(delta) {
    this._simulatedBrightness = Math.max(0, Math.min(1, this._simulatedBrightness + delta));
    if (this.hasCapability('dim')) this.setCapabilityValue('dim', this._simulatedBrightness).catch(() => {});
  }

  async _triggerRotateLeft() {
    if (this.hasCapability('button.rotate_left')) {
      await this.setCapabilityValue('button.rotate_left', true).catch(() => {});
      this.homey.setTimeout(() => this.setCapabilityValue('button.rotate_left', false).catch(() => {}), 100);
    }
    const card = (() => { try { return this._getFlowCard('smart_knob_rotary_hybrid_rotate_left', 'trigger'); } catch(e) { return null; } })();
    if (card) await card.trigger(this, { brightness: Math.round(this._simulatedBrightness * 100) }).catch(() => {});
  }

  async _triggerRotateRight() {
    if (this.hasCapability('button.rotate_right')) {
      await this.setCapabilityValue('button.rotate_right', true).catch(() => {});
      this.homey.setTimeout(() => this.setCapabilityValue('button.rotate_right', false).catch(() => {}), 100);
    }
    const card = (() => { try { return this._getFlowCard('smart_knob_rotary_hybrid_rotate_right', 'trigger'); } catch(e) { return null; } })();
    if (card) await card.trigger(this, { brightness: Math.round(this._simulatedBrightness * 100) }).catch(() => {});
  }

  async _triggerButtonPress(action) {
    if (this.hasCapability('button.press')) {
      await this.setCapabilityValue('button.press', true).catch(() => {});
      this.homey.setTimeout(() => this.setCapabilityValue('button.press', false).catch(() => {}), 100);
    }
    const generic = (() => { try { return this._getFlowCard('smart_knob_rotary_hybrid_pressed', 'trigger'); } catch(e) { return null; } })();
    if (generic) await generic.trigger(this, { action }).catch(() => {});

    let id = null;
    if (['single', 'on', 'off', 'toggle'].includes(action)) id = 'smart_knob_rotary_hybrid_single_press';
    else if (action === 'double') id = 'smart_knob_rotary_hybrid_double_press';
    else if (['hold', 'long'].includes(action)) id = 'smart_knob_rotary_hybrid_long_press';
    
    if (id) {
      const card = this._getFlowCard(id, 'trigger');
      if (card) await card.trigger(this, { action }).catch(() => {});
    }
  }

  async _setupE000Detection(zclNode) {
    try {
      const ep = zclNode?.endpoints?.[1];
      const e = ep?.clusters?.tuyaE000 || ep?.clusters?.[57344];
      if (e?.on) {
        e.on('buttonPress', async (d) => this._triggerButtonPress(resolvePressType(d?.pressType, 'KNOB-E000')));
        ['cmd0','cmd1','cmd2','cmdFD','cmdFE','cmdFF'].forEach(c => {
          e.on(c, async ({ data }) => this._triggerButtonPress(data?.length >= 1 ? resolvePressType(data[0], 'KNOB-E000') : 'single'));
        });
      }
    } catch (e) { /* ignore */ }
  }

  async _setupTuyaDPDetection(zclNode) {
    try {
      const tc = zclNode?.endpoints?.[1]?.clusters?.tuya || zclNode?.endpoints?.[1]?.clusters?.[61184];
      if (tc?.on) {
        tc.on('response', async (d) => this._triggerButtonPress(resolvePressType(d?.data ?? d?.value ?? 0, 'KNOB-DP')));
        tc.on('datapoint', async (d) => this._triggerButtonPress(resolvePressType(d?.data?.[0] ?? 0, 'KNOB-DP')));
      }
    } catch (e) { /* ignore */ }
  }

  async onEndDeviceAnnounce() {
    if (typeof this._updateLastSeen === 'function') this._updateLastSeen();
    if (this._dataRecoveryManager) this._dataRecoveryManager.triggerRecovery();
  }
}

module.exports = SmartKnobRotaryHybridDevice;
