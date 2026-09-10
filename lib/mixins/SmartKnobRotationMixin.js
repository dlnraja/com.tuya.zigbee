'use strict';

/**
 * SmartKnobRotationMixin (P2448 / P2449)
 *
 * Shared rotate RX + flow UX for smart_knob / smart_knob_switch / rotary siblings.
 * WHY: ButtonDevice forbids `dim` and lacks levelControl rotate → knobs paired on
 * smart_knob* looked dead for rotation despite compose declaring dim + cluster 8.
 *
 * RX paths (parallel):
 * - command/dimmer: levelControl step/move
 * - event/scene: genOnOff 0xFC rotate_left/right
 *
 * Dual-app: BOTH (reliability / UX parity).
 */

const { CLUSTER } = require('zigbee-clusters');

const PRESS_HOLD_MS = 2500;

function SmartKnobRotationMixin(Base) {
  return class SmartKnobRotationDevice extends Base {
    constructor(...args) {
      super(...args);
      // WHY(P2449): knobs need dim for rotation level UX — never strip it
      if (Array.isArray(this._forbiddenCapabilities)) {
        this._forbiddenCapabilities = this._forbiddenCapabilities.filter((c) => c !== 'dim');
      }
      this._simulatedBrightness = 0.5;
      this._lastRotationSpeed = 'normal';
      this._pressHeldUntil = 0;
      this._knobRotateFcWrapped = false;
    }

    /**
     * Override in device: flow card id prefix (e.g. smart_knob_rotary).
     */
    get knobFlowPrefix() {
      return this.driver?.id || 'smart_knob';
    }

    /**
     * Call from onNodeInit after super — enables command mode + levelControl + 0xFC.
     */
    async initSmartKnobRotation(zclNode, opts = {}) {
      if (!zclNode) return;
      this._zclNode = zclNode;

      try {
        const curDim = this.hasCapability?.('dim')
          ? Number(this.getCapabilityValue('dim'))
          : NaN;
        if (Number.isFinite(curDim) && curDim >= 0 && curDim <= 1) {
          this._simulatedBrightness = curDim;
        } else if (this.hasCapability?.('dim')) {
          await this.safeSetCapabilityValue('dim', this._simulatedBrightness).catch(() => {});
        }
      } catch (_e) { /* noop */ }

      if (opts.applyOperatingMode !== false) {
        await this._applyKnobOperatingMode(zclNode, opts);
      }

      this._setupKnobLevelControl(zclNode);
      this._setupKnobOnOffRotateFc(zclNode);
      this._registerKnobPassiveRotateCaps();
      this._registerKnobDimListener();
    }

    async _applyKnobOperatingMode(zclNode, opts = {}) {
      try {
        const DeviceOperatingMode = require('../zigbee/DeviceOperatingMode');
        const migrateKey = opts.migrateStoreKey || 'p2449_knob_cmd_migrated';
        const defaultMode = opts.defaultMode; // undefined → classifier family default
        const fam = DeviceOperatingMode.classifyOperatingFamily(this);
        if (this.getStoreValue(migrateKey) !== true) {
          const cur = String(this.getSetting('button_mode') || '').toLowerCase();
          const want = defaultMode
            || (fam.family === 'knob' ? 'dimmer' : fam.defaultMode)
            || 'dimmer';
          // Only migrate rotary-family to dimmer; leave kaflzta4 scene alone
          if (fam.family === 'knob' && (!cur || cur === 'auto' || cur === 'scene')) {
            await this.setSettings({ button_mode: want }).catch(() => {});
          }
          await this.setStoreValue(migrateKey, true).catch(() => {});
        }
        const r = await DeviceOperatingMode.applyDesiredMode(this, zclNode);
        this.log?.('[KNOB-MODE]', r.desired || r.skipped, r.via || r.ok);
        DeviceOperatingMode.registerOperationModeListener(this, zclNode);
      } catch (err) {
        this.log?.('[KNOB-MODE] error:', err.message);
      }
    }

    _registerKnobPassiveRotateCaps() {
      for (const capability of ['button.rotate_left', 'button.rotate_right', 'button.press']) {
        if (!this.hasCapability?.(capability)) continue;
        try {
          this.registerCapabilityListener(capability, async () => true);
        } catch (_e) { /* noop */ }
      }
    }

    _registerKnobDimListener() {
      if (!this.hasCapability?.('dim')) return;
      try {
        this.registerCapabilityListener('dim', async (value) => {
          const v = Math.max(0, Math.min(1, Number(value) || 0));
          this._simulatedBrightness = v;
          await this._triggerKnobBrightnessChanged();
          return true;
        });
      } catch (_e) { /* noop */ }
    }

    /** Mark press held so next rotation can fire press_and_rotate_* cards. */
    markKnobPressHeld(ms = PRESS_HOLD_MS) {
      this._pressHeldUntil = Date.now() + ms;
    }

    clearKnobPressHeld() {
      this._pressHeldUntil = 0;
    }

    isKnobPressHeld() {
      return Date.now() < (this._pressHeldUntil || 0);
    }

    _setupKnobLevelControl(zclNode) {
      try {
        const ep = zclNode.endpoints?.[1];
        if (!ep) return;
        const levelCluster = ep.clusters?.[CLUSTER.LEVEL_CONTROL.NAME]
          || ep.clusters?.levelControl
          || ep.clusters?.genLevelCtrl
          || ep.clusters?.[8];
        if (!levelCluster || typeof levelCluster.on !== 'function') return;
        if (levelCluster._p2449KnobBound) return;
        levelCluster._p2449KnobBound = true;

        const onMove = (payload) => {
          const direction = (payload?.moveMode === 0 || payload?.movemode === 0) ? 'up' : 'down';
          this._handleKnobRotation(direction, payload?.rate || 50);
        };
        const onStep = (payload) => {
          const direction = (payload?.stepMode === 0 || payload?.stepmode === 0) ? 'up' : 'down';
          this._handleKnobRotationStep(direction, payload?.stepSize || payload?.stepsize || 10);
        };

        levelCluster.on('move', onMove);
        levelCluster.on('moveWithOnOff', onMove);
        levelCluster.on('step', onStep);
        levelCluster.on('stepWithOnOff', onStep);
        this.log?.('[KNOB-RX] levelControl listeners bound');
      } catch (err) {
        this.log?.('[KNOB-RX] levelControl setup error:', err.message);
      }
    }

    _setupKnobOnOffRotateFc(zclNode) {
      try {
        const ep = zclNode?.endpoints?.[1];
        if (!ep || this._knobRotateFcWrapped) return;
        this._knobRotateFcWrapped = true;

        const onOff = ep.clusters?.onOff || ep.clusters?.genOnOff || ep.clusters?.[6];
        if (onOff && typeof onOff.on === 'function') {
          onOff.on('onToggle', (payload) => {
            try {
              if (payload && Number(payload.cmdId) === 0xFC) {
                const dir = Number(payload.data?.[0] ?? payload.direction ?? 0);
                if (dir === 1) this._triggerKnobRotateLeft();
                else if (dir !== 2) this._triggerKnobRotateRight();
              }
            } catch (_e) { /* noop */ }
          });
        }

        const original = ep.handleFrame?.bind(ep);
        if (!original) return;
        const self = this;
        ep.handleFrame = (clusterId, frame, meta) => {
          try {
            const cid = Number(clusterId);
            if (cid === 6 || cid === 0x0006) {
              const data = Buffer.isBuffer(frame)
                ? frame
                : Array.isArray(frame) ? Buffer.from(frame) : null;
              if (data && data.length >= 3) {
                const { parseZclHeader } = require('../zigbee/ZigbeeHelpers');
                const hdr = parseZclHeader(data);
                if (hdr && hdr.cmdId === 0xFC) {
                  const dir = data[hdr.payloadOffset] ?? 0;
                  if (dir === 1) self._triggerKnobRotateLeft();
                  else if (dir !== 2) self._triggerKnobRotateRight();
                }
              }
            }
          } catch (_e) { /* noop */ }
          return original(clusterId, frame, meta);
        };
      } catch (err) {
        this.log?.('[KNOB-FC] setup error:', err.message);
      }
    }

    async _handleKnobRotation(direction, _rate) {
      if (this._destroyed) return;
      const delta = direction === 'up' ? 0.1 : -0.1;
      await this._updateKnobSimulatedBrightness(delta);
      if (direction === 'up') await this._triggerKnobRotateRight();
      else await this._triggerKnobRotateLeft();
    }

    async _handleKnobRotationStep(direction, stepSize) {
      if (this._destroyed) return;
      const size = Number(stepSize) || 10;
      const delta = direction === 'up' ? size / 254 : -(size / 254);
      this._lastRotationSpeed = size <= 20 ? 'slow' : size >= 30 ? 'fast' : 'normal';
      await this._updateKnobSimulatedBrightness(delta);
      if (direction === 'up') await this._triggerKnobRotateRight();
      else await this._triggerKnobRotateLeft();
    }

    async _updateKnobSimulatedBrightness(delta) {
      this._simulatedBrightness = Math.max(0, Math.min(1, this._simulatedBrightness + delta));
      if (this.hasCapability?.('dim')) {
        const set = this.safeSetCapabilityValue || this.setCapabilityValue;
        await set.call(this, 'dim', this._simulatedBrightness).catch(() => {});
      }
      await this._triggerKnobBrightnessChanged();
    }

    /** Homey action card: set simulated brightness 0–100 or 0–1. */
    async setKnobBrightnessPercent(brightness) {
      const n = Number(brightness);
      if (!Number.isFinite(n)) return false;
      const dim = Math.max(0, Math.min(1, n > 1 ? n / 100 : n));
      this._simulatedBrightness = dim;
      if (this.hasCapability?.('dim')) {
        const set = this.safeSetCapabilityValue || this.setCapabilityValue;
        await set.call(this, 'dim', dim).catch(() => {});
      }
      await this._triggerKnobBrightnessChanged();
      return true;
    }

    getKnobBrightnessPercent() {
      if (this.hasCapability?.('dim')) {
        const v = Number(this.getCapabilityValue('dim'));
        if (Number.isFinite(v)) return Math.round(v * 100);
      }
      return Math.round((this._simulatedBrightness || 0) * 100);
    }

    _knobRotationTokens() {
      return {
        brightness: this.getKnobBrightnessPercent(),
        speed: this._lastRotationSpeed || 'normal',
      };
    }

    async _triggerKnobFlow(cardSuffix, tokens = {}) {
      const id = `${this.knobFlowPrefix}_${cardSuffix}`;
      try {
        const card = this.homey.flow.getDeviceTriggerCard(id);
        if (card) await card.trigger(this, tokens).catch(() => {});
      } catch (_e) { /* card may be absent on sibling driver */ }
    }

    async _pulseRotateCap(cap) {
      if (!this.hasCapability?.(cap)) return;
      const set = this.safeSetCapabilityValue || this.setCapabilityValue;
      await set.call(this, cap, true).catch(() => {});
      // WHY(P2451): Homey timer-context gate — never detach setTimeout via || fallback
      try {
        const { safeSetTimeout } = require('../utils/safe-timers');
        safeSetTimeout(this, () => {
          if (this._destroyed) return;
          set.call(this, cap, false).catch(() => {});
        }, 100);
      } catch (_e) {
        if (this.homey && typeof this.homey.setTimeout === 'function') {
          this.homey.setTimeout(() => {
            if (this._destroyed) return;
            set.call(this, cap, false).catch(() => {});
          }, 100);
        }
      }
    }

    async _triggerKnobRotateLeft() {
      if (this._destroyed) return;
      await this._pulseRotateCap('button.rotate_left');
      const tokens = this._knobRotationTokens();
      await this._triggerKnobFlow('rotate_left', tokens);
      if (this.isKnobPressHeld()) {
        await this._triggerKnobFlow('press_and_rotate_left', tokens);
      }
    }

    async _triggerKnobRotateRight() {
      if (this._destroyed) return;
      await this._pulseRotateCap('button.rotate_right');
      const tokens = this._knobRotationTokens();
      await this._triggerKnobFlow('rotate_right', tokens);
      if (this.isKnobPressHeld()) {
        await this._triggerKnobFlow('press_and_rotate_right', tokens);
      }
    }

    async _triggerKnobSceneRecall(sceneId) {
      const id = Number(sceneId);
      const tokens = { scene_id: Number.isFinite(id) ? id : 0 };
      const prefix = this.knobFlowPrefix;
      const gang = this.buttonCount || this.gangCount || 1;
      const candidates = [
        `${prefix}_scene_recall`,
        `${prefix}_button_${gang}gang_button_scene_recall`,
        `${prefix}_button_${gang}gang_button_1_scene_recall`,
        `${prefix}_button_1_scene_recall`,
      ];
      for (const cardId of candidates) {
        try {
          const card = this.homey.flow.getDeviceTriggerCard(cardId);
          if (card) await card.trigger(this, tokens).catch(() => {});
        } catch (_e) { /* card may be absent */ }
      }
    }

    async _triggerKnobBrightnessChanged() {
      try {
        const { emitBrightnessChanged } = require('../flow/DeclaredFlowCardAutoWire');
        await emitBrightnessChanged(this, this.getKnobBrightnessPercent());
      } catch (_e) {
        await this._triggerKnobFlow('brightness_changed', {
          brightness: this.getKnobBrightnessPercent(),
        });
      }
    }
  };
}

module.exports = SmartKnobRotationMixin;
