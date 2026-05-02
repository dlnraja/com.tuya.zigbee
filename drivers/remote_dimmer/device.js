'use strict';
const { safeParse, safeDivide } = require('../../lib/utils/tuyaUtils.js');

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const OnOffBoundCluster = require('../../lib/clusters/OnOffBoundCluster');
const LevelControlBoundCluster = require('../../lib/clusters/LevelControlBoundCluster');
const ScenesBoundCluster = require('../../lib/clusters/ScenesBoundCluster');

/**
 * Lidl HG06323 / Livarno Lux Remote Control Dimmer (TS1001)
 * Also: Feibit FB20-002
 *
 * 4-button battery remote using standard ZCL output clusters:
 * - genOnOff (6): on/off button presses
 * - genLevelCtrl (8): brightness step/move/stop
 * - genScenes (5): scene recall
 *
 * Endpoint 1 output clusters: 6, 8, 5, 4, 3, 25(OTA), 10(time), 4096(touchlink)
 */
class RemoteDimmerDevice extends ZigBeeDevice {

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

    this.log('[RemoteDimmer] Init  Lidl HG06323/TS1001');

    // Store device info
    try {
      const mfr = this.getSetting('zb_manufacturer_name') || this.getData()?.manufacturerName || '';
      const mdl = this.getSetting('zb_model_id') || this.getData()?.modelId || '';
      if (mfr) await this.setSettings({ zb_manufacturer_name: mfr }).catch(() => {});
      if (mdl) await this.setSettings({ zb_model_id: mdl }).catch(() => {});
    } catch (e) { this.error('[RemoteDimmer] Settings error:', e.message); }

    // Last action tracking (for dedup)
    this._lastAction = null;
    this._lastActionTime = 0;

    // Bind OnOff output cluster  receive on/off button presses
    zclNode.endpoints[1].bind(CLUSTER.ON_OFF.NAME, new OnOffBoundCluster({
      onSetOn: () => this._handleAction('on'),
      onSetOff: () => this._handleAction('off'),
      onToggle: () => this._handleAction('toggle'),
    }));
    this.log('[RemoteDimmer] OnOff bound');

    // Bind LevelControl output cluster  receive brightness commands
    zclNode.endpoints[1].bind(CLUSTER.LEVEL_CONTROL.NAME, new LevelControlBoundCluster({
      onStep: (p) => this._handleAction(p.mode === 'up' ? 'brightness_step_up' : 'brightness_step_down', p),
      onStepWithOnOff: (p) => this._handleAction(p.mode === 'up' ? 'brightness_step_up' : 'brightness_step_down', p),
      onMove: (p) => this._handleAction(p.moveMode === 'up' ? 'brightness_move_up' : 'brightness_move_down', p),
      onMoveWithOnOff: (p) => this._handleAction(p.moveMode === 'up' ? 'brightness_move_up' : 'brightness_move_down', p),
      onStop: () => this._handleAction('brightness_stop'),
      onStopWithOnOff: () => this._handleAction('brightness_stop'),
      onMoveToLevel: (p) => this._handleAction('brightness_set', p),
      onMoveToLevelWithOnOff: (p) => this._handleAction('brightness_set', p),
    }));
    this.log('[RemoteDimmer] LevelControl bound');

    // Bind Scenes output cluster  receive scene button presses
    try {
      zclNode.endpoints[1].bind(CLUSTER.SCENES.NAME, new ScenesBoundCluster({
        onRecall: (p) => this._handleAction('scene', p),
      }));
      this.log('[RemoteDimmer] Scenes bound');
    } catch (e) { this.log('[RemoteDimmer] Scenes bind skipped:', e.message); }

    // Battery reporting from powerConfiguration input cluster
    try {
      const powerCfg = zclNode.endpoints[1].clusters.powerConfiguration;
      if (powerCfg) {
        powerCfg.on('attr.batteryPercentageRemaining', (value) => {
          const pct = Math.round(value);
          this.log('[RemoteDimmer] Battery:', pct, '%');
          this.setCapabilityValue('measure_battery', pct).catch(this.error);
          this.setCapabilityValue('alarm_battery', pct < 20).catch(this.error);
        });

        // Try to configure reporting
        await powerCfg.configureReporting({
          batteryPercentageRemaining: { minInterval: 3600, maxInterval: 43200, minChange: 2 },
        }).catch(() => {});
        this.log('[RemoteDimmer] Battery reporting configured');
      }
    } catch (e) { this.log('[RemoteDimmer] Battery setup:', e.message); }

    this.log('[RemoteDimmer] Ready');
  }

  /**
   * Handle remote button actions with deduplication
   */
  _handleAction(action, payload = {}) {
    const now = Date.now();
    // Dedup: skip if same action within 200ms
    if (action === this._lastAction && now - this._lastActionTime < 200) return;
    this._lastAction = action;
    this._lastActionTime = now;

    this.log('[RemoteDimmer] Action:', action, payload);

    // Trigger flow cards
    const triggerMap = {
      on:                    'remote_dimmer_button_on',
      off:                   'remote_dimmer_button_off',
      toggle:                'remote_dimmer_button_toggle',
      brightness_step_up:    'remote_dimmer_brightness_up',
      brightness_step_down:  'remote_dimmer_brightness_down',
      brightness_move_up:    'remote_dimmer_brightness_up',
      brightness_move_down:  'remote_dimmer_brightness_down',
      brightness_stop:       'remote_dimmer_brightness_stop',
      brightness_set:        'remote_dimmer_brightness_set',
      scene:                 'remote_dimmer_scene',
    };

    const cardId = triggerMap[action];
    if (cardId) {
      const tokens = { action };
      if (payload.stepSize !== undefined) tokens.step_size = payload.stepSize;
      if (payload.level !== undefined) tokens.level = Math.round((payload.level * 100));
      if (payload.rate !== undefined) tokens.rate = payload.rate;
      if (payload.sceneId !== undefined) tokens.scene_id = payload.sceneId;

      this.homey.flow.getDeviceTriggerCard(cardId)
        .trigger(this, tokens, {})
        .catch(err => this.error('[RemoteDimmer] Flow trigger error:', err.message));
    }
  }

  onDeleted() {
    this.log('[RemoteDimmer] Device deleted');
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

module.exports = RemoteDimmerDevice;
