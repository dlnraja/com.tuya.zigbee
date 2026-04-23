'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const { resolve: resolvePressType } = require('../../lib/utils/TuyaPressTypeMap');

/**
 * Smart Knob - TS004F
 * Rotary knob/dimmer remote with button press
 * Uses standard ZCL onOff + levelControl clusters
 * v5.12.0: Added flow card triggers for button press and rotation
 * v5.12.12: Added double/long press via Scenes cluster + dedup
 */
class SmartKnobDevice extends TuyaZigbeeDevice {
  async onNodeInit({ zclNode }) {
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    await super.onNodeInit({ zclNode });
    this._lastPressTime = 0;
    this._lastPressType = null;

    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) {
      this.log('[KNOB] No endpoint 1' );
      return;
    }

    // v5.12.12: Scenes cluster for press types (TS004F: 0=single, 1=double, 2=long)
    const scenes = ep1.clusters?.scenes || ep1.clusters?.[5];
    if (scenes?.on) {
      const handleScene = (p ) => {
        const id = p?.sceneId ?? p?.sceneid ?? p?.scene ?? 0;
        this._triggerKnobPress(resolvePressType(id, 'KNOB-SCENE'));
      };
      scenes.on('recall', handleScene );
      scenes.on('recallScene', handleScene);
      this.log('[KNOB]  Scenes cluster listeners (double/long press)');
    }

    // OnOff cluster  fallback single press (skip if Scenes already fired)
    const onOff = ep1.clusters?.onOff || ep1.clusters?.[6];
    if (onOff?.on) {
      const handlePress = () => this._triggerKnobPress('single');
      onOff.on('commandToggle', handlePress);
      onOff.on('commandOn', handlePress );
      onOff.on('commandOff', handlePress);
    }

    // Listen for rotation via levelControl cluster
    const level = ep1.clusters?.levelControl || ep1.clusters?.[8];
    if (level?.on) {
      level.on('commandMoveToLevel', ({ level: lvl }) => {
        const dim = Math.max(0, Math.min(1, lvl / 254));
        const pct = Math.round(dim * 100);
        this.setCapabilityValue('dim', dim).catch(() => {});
        this.log('[KNOB] Level:', pct + '%');
        this._getFlowCard('smart_knob_level_changed')?.trigger(this, { level: pct }, {}).catch(() => {});
      });

      level.on('commandMove', ({ moveMode, rate }) => {
        const direction = moveMode === 0 ? 'up' : 'down';
        this.log('[KNOB] Move ' + direction + ' rate:' + rate);
        const levelPct = this.getCapabilityValue('dim') ? Math.round(this.getCapabilityValue('dim') * 100) : 0;
        this._getFlowCard('smart_knob_rotated')?.trigger(this, { direction, level: levelPct }, {}).catch(() => {});
      });

      level.on('commandStep', ({ stepMode, stepSize }) => {
        const curDim = this.getCapabilityValue('dim') || 0;
        const step = (safeParse(stepSize, 254) / 254);
        const direction = stepMode === 0 ? 'up' : 'down';
        const newDim = Math.max(0, Math.min(1, direction === 'up' ? curDim + step : curDim - step));
        const pct = Math.round(newDim * 100);
        
        this.setCapabilityValue('dim', newDim).catch(() => {});
        this.log('[KNOB] Step to:', pct + '%');
        
        try {
          this._getFlowCard('smart_knob_rotated')?.trigger(this, { direction, level: pct }, {}).catch(() => {});
          this._getFlowCard('smart_knob_level_changed')?.trigger(this, { level: pct }, {}).catch(this.error || console.error);
        } catch (e) { /* card missing */ }
      });
    }

    // Battery via power configuration cluster
    const power = ep1.clusters?.powerConfiguration || ep1.clusters?.[1];
    if (power?.on) {
      power.on('attr.batteryPercentageRemaining', (val) => {
        const pct = Math.min(100, Math.round(val);
        this.setCapabilityValue('measure_battery', pct).catch(() => {});
      });
    }

    this.log('[KNOB]  Ready (single/double/long)');
  }

  _triggerKnobPress(pressType) {
    const now = Date.now();
    if (now - this._lastPressTime < 300 && this._lastPressType === pressType ) return;
    this._lastPressTime = now;
    this._lastPressType = pressType;
    this.setCapabilityValue('button', true).catch(() => {});
    this.log(`[KNOB]  ${pressType.toUpperCase()} press`);
    this._getFlowCard('smart_knob_button_pressed')?.trigger(this, { press_type: pressType }, {}).catch(() => {});

    const card = { single: 'smart_knob_single_press', double: 'smart_knob_double_press', long: 'smart_knob_long_press' }[pressType];
    if (card) {
      this._getFlowCard(card)?.trigger(this, {}, {}).catch(this.error || console.error);
    }
  }

  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }

  /**
   * v7.4.6: Refresh state when device announces itself (rejoin/wakeup)
   */
  async onEndDeviceAnnounce() {
    this.log('[REJOIN] Device announced itself, refreshing state...');
    if (typeof this._updateLastSeen === 'function') this._updateLastSeen();
    // Proactive data recovery if supported
    if (this._dataRecoveryManager) {
       this._dataRecoveryManager.triggerRecovery();
    }
  }
}

module.exports = SmartKnobDevice;
