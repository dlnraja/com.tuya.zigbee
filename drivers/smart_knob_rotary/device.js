'use strict';
// A8: NaN Safety - use safeDivide/safeMultiply
require('../../lib/utils/CaseInsensitiveMatcher');
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const { resolve: resolvePressType } = require('../../lib/utils/TuyaPressTypeMap');

class SmartKnobRotaryDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Smart Knob Rotary device initialized');
    
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

    this.log('Smart Knob Rotary initialization complete');
  }

  /**
   * v5.5.976: Enable TS004F scene mode via attribute 0x8004 on OnOff cluster
   * Without this, TS004F devices may not send scene/button commands
   * Based on Ernst02507 interview data and Z2M/ZHA research
   */
  async _enableTS004FSceneMode(zclNode) {
    try {
      const modelId = this.getSetting('zb_model_id') || '';
      const mfr = this.getSetting('zb_manufacturer_name') || '';
      
      // Only for TS004F devices
      if (!CI.includesCI(modelId, 'TS004F')) {
        this.log('[TS004F] Not a TS004F device, skipping scene mode enable');
        return;
      }
      
      this.log('[TS004F] Attempting to enable scene mode for', mfr);
      
      if (zclNode.endpoints[1]?.clusters?.onOff) {
        const onOffCluster = zclNode.endpoints[1].clusters.onOff;
        
        // Try to write attribute 0x8004 = 1 to enable scene mode
        // This switches TS004F from dimmer mode to scene/command mode
        try {
          await onOffCluster.writeAttributes({ 32772: 1 }); // 0x8004 = 32772
          this.log('[TS004F]  Scene mode enabled via attribute 0x8004');
        } catch (writeErr) {
          // Some devices don't support this attribute - that's OK
          this.log('[TS004F] Could not write 0x8004:', writeErr.message);
          
          // Alternative: Try via raw Zigbee command
          try {
            await onOffCluster.writeAttributes({ switchMode: 1 });
            this.log('[TS004F]  Scene mode enabled via switchMode');
          } catch (altErr) {
            this.log('[TS004F] Alternative also failed:', altErr.message);
          }
        }
        
        // Read back to verify
        try {
          const attrs = await onOffCluster.readAttributes([32772]).catch(() => null);
          if (attrs) {
            this.log('[TS004F] Current mode attribute:', attrs);
          }
        } catch (readErr) {
          // Ignore read errors
        }
      }
    } catch (err) {
      this.log('[TS004F] Scene mode setup error:', err.message);
    }
  }

  async _setupBatteryReporting(zclNode) {
    try {
      const ep1 = zclNode.endpoints[1];
      if (ep1 && ep1.clusters[CLUSTER.POWER_CONFIGURATION.NAME]) {
        const powerCluster = ep1.clusters[CLUSTER.POWER_CONFIGURATION.NAME];
        
        // Configure battery reporting
        await powerCluster.configureReporting({
          batteryPercentageRemaining: {
            minInterval: 3600,
            maxInterval: 65534,
            minChange: 1,
          },
        }).catch(err => this.log('Battery reporting config failed:', err.message));

        // Read initial battery value
        const batteryStatus = await powerCluster.readAttributes(['batteryPercentageRemaining']).catch(() => null);
        if (batteryStatus && batteryStatus.batteryPercentageRemaining !== undefined) {
          const batteryValue = Math.round(batteryStatus.batteryPercentageRemaining  / 2);
          await this.setCapabilityValue('measure_battery', batteryValue).catch(this.error);
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

    } catch (err) {
      this.log('Knob event handling setup error:', err.message);
    }
  }

  _setupCommandListeners(zclNode) {
    try {
      const endpoint = zclNode.endpoints[1];
      if (!endpoint) return;

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
      if (!ep) return;

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
          if (frame && frame.length >= 4) {
            const cmdId = frame[0];
            if (cmdId === 0x05) {
              const sceneId = frame[3];
              this._handleSceneCommand(sceneId);
            }
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
    const delta = direction === 'up' ? 0.1 : -0.1;
    this._updateSimulatedBrightness(delta);
    if (direction === 'up') {
      await this._triggerRotateRight();
    } else {
      await this._triggerRotateLeft();
    }
  }

  async _handleRotationStep(direction, stepSize) {
    const delta = direction === 'up' ? (stepSize / 254) : -(stepSize / 254);
    this._updateSimulatedBrightness(delta);
    if (direction === 'up') {
      await this._triggerRotateRight();
    } else {
      await this._triggerRotateLeft();
    }
  }

  _updateSimulatedBrightness(delta) {
    this._simulatedBrightness = Math.max(0, Math.min(1, this._simulatedBrightness + delta));
    if (this.hasCapability('dim')) {
      this.setCapabilityValue('dim', this._simulatedBrightness).catch(this.error);
    }
    this.log('Simulated brightness:', Math.round(this._simulatedBrightness * 100), '%');
  }

  async _triggerRotateLeft() {
    if (this.hasCapability('button.rotate_left')) {
      await this.setCapabilityValue('button.rotate_left', true).catch(this.error);
      this.homey.setTimeout(() => {
        this.setCapabilityValue('button.rotate_left', false).catch(this.error);
      }, 100);
    }
    const rotateLeftTrigger = (() => { try { return this._getFlowCard('smart_knob_rotary_rotate_left', 'trigger'); } catch(e) { return null; } })();
    if (rotateLeftTrigger) {
      await rotateLeftTrigger.trigger(this, { brightness: Math.round(this._simulatedBrightness * 100) }).catch(this.error);
    }
  }

  async _triggerRotateRight() {
    if (this.hasCapability('button.rotate_right')) {
      await this.setCapabilityValue('button.rotate_right', true).catch(this.error);
      this.homey.setTimeout(() => {
        this.setCapabilityValue('button.rotate_right', false).catch(this.error);
      }, 100);
    }
    const rotateRightTrigger = (() => { try { return this._getFlowCard('smart_knob_rotary_rotate_right', 'trigger'); } catch(e) { return null; } })();
    if (rotateRightTrigger) {
      await rotateRightTrigger.trigger(this, { brightness: Math.round(this._simulatedBrightness * 100) }).catch(this.error);
    }
  }

  async _triggerButtonPress(action) {
    if (this.hasCapability('button.press')) {
      await this.setCapabilityValue('button.press', true).catch(this.error);
      this.homey.setTimeout(() => {
        this.setCapabilityValue('button.press', false).catch(this.error);
      }, 100);
    }
    try {
      const genericTrigger = (() => { try { return this._getFlowCard('smart_knob_rotary_press', 'trigger'); } catch(e) { return null; } })();
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
        const triggerCard = this._getFlowCard(specificCardId, 'trigger');
        if (triggerCard) {
            await triggerCard.trigger(this, { action }).catch(() => {});
        }
      } catch (e) { /* ignore */ }
    }
  }

  async _setupE000Detection(zclNode) {
    try {
      const ep = zclNode?.endpoints?.[1]; if (!ep ) return;
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
      if (!tc?.on) return;
      tc.on('response', async (d) => { const v = d?.data ?? d?.value ?? 0; this._triggerButtonPress(resolvePressType(v, 'KNOB-DP')); });
      tc.on('datapoint', async (d) => { const v = d?.data?.[0] ?? 0; this._triggerButtonPress(resolvePressType(v, 'KNOB-DP')); });
    } catch (e) { this.log('[TUYA-DP] Error:', e.message); }
  }

  onDeleted() {
    this.log('Smart Knob Rotary device deleted');
  }

  async onEndDeviceAnnounce() {
    this.log('[REJOIN] Device announced itself, refreshing state...');
    if (typeof this._updateLastSeen === 'function') this._updateLastSeen();
    if (this._dataRecoveryManager) {
       this._dataRecoveryManager.triggerRecovery();
    }
  }
}

module.exports = SmartKnobRotaryDevice;
