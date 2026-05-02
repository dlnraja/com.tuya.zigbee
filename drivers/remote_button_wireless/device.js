'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const { resolve: resolvePressType } = require('../../lib/utils/TuyaPressTypeMap');
const CI = require('../../lib/utils/CaseInsensitiveMatcher');

class RemoteButtonWirelessHybridDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Remote Button Wireless Hybrid device initialized');
    this._zclNode = zclNode;
    this._simulatedBrightness = 0.5;
    this._lastOnOffValue = null;
    this._lastOnOffTime = 0;
    this._isTS004F = (this.getSetting('zb_model_id') || '').includes('TS004F');

    if (this.hasCapability('dim')) {
      await this.setCapabilityValue('dim', this._simulatedBrightness).catch(this.error);
    }

    await this._enableTS004FSceneMode(zclNode);
    await this._setupBatteryReporting(zclNode);
    await this._setupKnobEventHandling(zclNode);
    await this._setupE000Detection(zclNode);
    await this._setupTuyaDPDetection(zclNode);

    this.log('Remote Button Wireless Hybrid initialization complete');
  }

  async _enableTS004FSceneMode(zclNode) {
    try {
      const modelId = this.getSetting('zb_model_id') || '';
      if (!CI.includesCI(modelId, 'TS004F')) return;
      
      const onOffCluster = zclNode.endpoints[1]?.clusters?.onOff;
      if (onOffCluster) {
        try {
          await onOffCluster.writeAttributes({ 32772: 1 });
        } catch (writeErr) {
          try { await onOffCluster.writeAttributes({ switchMode: 1 }); } catch (altErr) {}
        }
      }
    } catch (err) {
      this.log('[TS004F] Scene mode setup error:', err.message);
    }
  }

  async _setupBatteryReporting(zclNode) {
    try {
      const powerCluster = zclNode.endpoints[1]?.clusters?.[CLUSTER.POWER_CONFIGURATION.NAME];
      if (powerCluster) {
        await powerCluster.configureReporting({
          batteryPercentageRemaining: { minInterval: 3600, maxInterval: 65534, minChange: 1 },
        }).catch(err => this.log('Battery reporting config failed:', err.message));

        const batteryStatus = await powerCluster.readAttributes(['batteryPercentageRemaining']).catch(() => null);
        if (batteryStatus?.batteryPercentageRemaining !== undefined) {
          await this.setCapabilityValue('measure_battery', Math.round(batteryStatus.batteryPercentageRemaining)).catch(this.error);
        }
      }
    } catch (err) {
      this.log('Battery setup error:', err.message);
    }
  }

  async _setupKnobEventHandling(zclNode) {
    try {
      const ep = zclNode.endpoints[1];
      if (!ep) return;

      if (ep.clusters?.onOff) {
        ep.clusters.onOff.on('attr.onOff', (value) => {
          const now = Date.now();
          if (this._isTS004F) return;
          if (value === this._lastOnOffValue && (now - this._lastOnOffTime) < 5000) return;
          this._lastOnOffValue = value;
          this._lastOnOffTime = now;
          this._triggerButtonPress(value ? 'on' : 'off');
        });
        ep.clusters.onOff.on('on', () => this._triggerButtonPress('on'));
        ep.clusters.onOff.on('off', () => this._triggerButtonPress('off'));
        ep.clusters.onOff.on('toggle', () => this._triggerButtonPress('toggle'));
      }

      if (ep.clusters?.levelControl) {
        ep.clusters.levelControl.on('move', (p) => this._handleRotation(p.moveMode === 0 ? 'up' : 'down', p.rate || 50));
        ep.clusters.levelControl.on('step', (p) => this._handleRotationStep(p.stepMode === 0 ? 'up' : 'down', p.stepSize || 10));
      }

      await this._setupScenesCluster(zclNode);
      this._setupCommandListeners(zclNode);
    } catch (err) {
      this.log('Knob event handling setup error:', err.message);
    }
  }

  _setupCommandListeners(zclNode) {
    const ep = zclNode.endpoints[1];
    if (ep) {
      ep.on('command', (clusterId, commandId, payload) => {
        if (clusterId === 18) this._handleMultistateInput(payload);
      });
    }
  }

  async _setupScenesCluster(zclNode) {
    try {
      const ep = zclNode.endpoints[1];
      const sc = ep?.clusters?.scenes || ep?.bindings?.scenes;
      if (sc) {
        sc.on('recall', (p) => this._handleSceneCommand(p?.sceneId ?? 0));
        sc.on('recallScene', (p) => this._handleSceneCommand(p?.sceneId ?? 0));
        if (typeof sc.bind === 'function') await sc.bind().catch(() => {});
      }
      this._setupRawSceneListener(ep);
    } catch (e) { this.log('[SCENES] Setup error:', e.message); }
  }

  _setupRawSceneListener(endpoint) {
    if (!endpoint) return;
    const originalHandleFrame = endpoint.handleFrame?.bind(endpoint);
    endpoint.handleFrame = (clusterId, frame, meta) => {
      if (clusterId === 5 && frame && frame.length >= 4 && frame[0] === 0x05) {
        this._handleSceneCommand(frame[3]);
      }
      return originalHandleFrame ? originalHandleFrame(clusterId, frame, meta) : null;
    };
  }

  _handleSceneCommand(sceneId) {
    const map = { 0: 'single', 1: 'double', 2: 'hold', 3: 'triple' };
    this._triggerButtonPress(map[sceneId] || `scene_${sceneId}`);
  }

  _handleMultistateInput(payload) {
    const action = payload.presentValue ?? payload;
    const map = { 0: 'single', 1: 'single', 2: 'double', 3: 'hold' };
    this._triggerButtonPress(map[action] || 'single');
  }

  async _handleRotation(direction, rate) {
    this._updateSimulatedBrightness(direction === 'up' ? 0.1 : -0.1);
    direction === 'up' ? await this._triggerRotateRight() : await this._triggerRotateLeft();
  }

  async _handleRotationStep(direction, stepSize) {
    this._updateSimulatedBrightness(direction === 'up' ? 0.05 : -0.05);
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
    const card = this.homey.flow.getTriggerCard('remote_button_wireless_hybrid_rotate_left');
    if (card) await card.trigger(this, { brightness: Math.round(this._simulatedBrightness * 100) }).catch(() => {});
  }

  async _triggerRotateRight() {
    if (this.hasCapability('button.rotate_right')) {
      await this.setCapabilityValue('button.rotate_right', true).catch(() => {});
      this.homey.setTimeout(() => this.setCapabilityValue('button.rotate_right', false).catch(() => {}), 100);
    }
    const card = this.homey.flow.getTriggerCard('remote_button_wireless_hybrid_rotate_right');
    if (card) await card.trigger(this, { brightness: Math.round(this._simulatedBrightness * 100) }).catch(() => {});
  }

  async _triggerButtonPress(action) {
    if (this.hasCapability('button.press')) {
      await this.setCapabilityValue('button.press', true).catch(() => {});
      this.homey.setTimeout(() => this.setCapabilityValue('button.press', false).catch(() => {}), 100);
    }
    const cards = ['remote_button_wireless_hybrid_press'];
    if (['single', 'on', 'off', 'toggle'].includes(action)) cards.push('remote_button_wireless_hybrid_single_press');
    if (action === 'double') cards.push('remote_button_wireless_hybrid_double_press');
    if (['hold', 'long'].includes(action)) cards.push('remote_button_wireless_hybrid_long_press');
    
    for (const id of cards) {
      try {
        const card = this.homey.flow.getTriggerCard(id);
        if (card) await card.trigger(this, { action }).catch(() => {});
      } catch (e) {}
    }
  }

  async _setupE000Detection(zclNode) {
    try {
      const e = zclNode?.endpoints?.[1]?.clusters?.tuyaE000;
      if (e?.on) {
        e.on('buttonPress', async (d) => this._triggerButtonPress(resolvePressType(d?.pressType, 'KNOB-E000')));
        for (const c of ['cmd0','cmd1','cmd2','cmdFD','cmdFE','cmdFF']) {
          e.on(c , async ({ data }) => this._triggerButtonPress(data?.[0] !== undefined ? resolvePressType(data[0], 'KNOB-E000') : 'single'));
        }
      }
    } catch (e) {}
  }

  async _setupTuyaDPDetection(zclNode) {
    try {
      const tc = zclNode?.endpoints?.[1]?.clusters?.tuya;
      if (tc?.on) {
        tc.on('response', async (d) => this._triggerButtonPress(resolvePressType(d?.data ?? d?.value ?? 0, 'KNOB-DP')));
        tc.on('datapoint', async (d) => this._triggerButtonPress(resolvePressType(d?.data?.[0] ?? 0, 'KNOB-DP')));
      }
    } catch (e) {}
  }

  onDeleted() { this.log('Remote Button Wireless Hybrid deleted'); }
  async onEndDeviceAnnounce() {
    if (typeof this._updateLastSeen === 'function') this._updateLastSeen();
  }
}

module.exports = RemoteButtonWirelessHybridDevice;
