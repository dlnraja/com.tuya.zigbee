'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

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
      if (!modelId.includes('TS004F')) {
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
          this.log('[TS004F] ✅ Scene mode enabled via attribute 0x8004');
        } catch (writeErr) {
          // Some devices don't support this attribute - that's OK
          this.log('[TS004F] Could not write 0x8004:', writeErr.message);
          
          // Alternative: Try via raw Zigbee command
          try {
            await onOffCluster.writeAttributes({ switchMode: 1 });
            this.log('[TS004F] ✅ Scene mode enabled via switchMode');
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
      if (zclNode.endpoints[1] && zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]) {
        const powerCluster = zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME];
        
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
          const batteryValue = Math.round(batteryStatus.batteryPercentageRemaining / 2);
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
        // TS004F devices send OnOff heartbeat every ~10min which is NOT a button press
        // Real button events come via Scenes cluster for TS004F
        onOffCluster.on('attr.onOff', (value) => {
          const now = Date.now();
          const timeSinceLast = now - this._lastOnOffTime;
          const isSameValue = value === this._lastOnOffValue;
          
          this.log('[ONOFF] attr.onOff:', value, '| same:', isSameValue, '| delta:', timeSinceLast, 'ms');
          
          // For TS004F: Ignore attr reports - real button events come via Scenes cluster
          // This prevents heartbeat (every 10min) from triggering flows
          if (this._isTS004F) {
            this.log('[ONOFF] TS004F: Ignoring attr.onOff (use Scenes cluster for button events)');
            this._lastOnOffValue = value;
            this._lastOnOffTime = now;
            return;
          }
          
          // For non-TS004F: Filter same-value reports within 5 seconds (likely heartbeat)
          if (isSameValue && timeSinceLast < 5000) {
            this.log('[ONOFF] Filtered: same value within 5s (likely heartbeat)');
            return;
          }
          
          this._lastOnOffValue = value;
          this._lastOnOffTime = now;
          this._triggerButtonPress(value ? 'on' : 'off');
        });
        
        // v5.5.976: Handle command events (Ernst02507 interview shows these)
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
        
        // Handle onWithTimedOff (some devices use this)
        onOffCluster.on('onWithTimedOff', (payload) => {
          this.log('OnWithTimedOff command:', payload);
          this._triggerButtonPress('on');
        });
      }

      // Handle Level Control cluster for rotation actions
      if (zclNode.endpoints[1] && zclNode.endpoints[1].clusters[CLUSTER.LEVEL_CONTROL.NAME]) {
        const levelCluster = zclNode.endpoints[1].clusters[CLUSTER.LEVEL_CONTROL.NAME];

        // Move command (continuous rotation)
        levelCluster.on('move', (payload) => {
          this.log('Level move command:', payload);
          const direction = payload.moveMode === 0 ? 'up' : 'down';
          this._handleRotation(direction, payload.rate || 50);
        });

        // Move with on/off
        levelCluster.on('moveWithOnOff', (payload) => {
          this.log('Level moveWithOnOff command:', payload);
          const direction = payload.moveMode === 0 ? 'up' : 'down';
          this._handleRotation(direction, payload.rate || 50);
        });

        // Step command (discrete rotation steps)
        levelCluster.on('step', (payload) => {
          this.log('Level step command:', payload);
          const direction = payload.stepMode === 0 ? 'up' : 'down';
          this._handleRotationStep(direction, payload.stepSize || 10);
        });

        // Step with on/off
        levelCluster.on('stepWithOnOff', (payload) => {
          this.log('Level stepWithOnOff command:', payload);
          const direction = payload.stepMode === 0 ? 'up' : 'down';
          this._handleRotationStep(direction, payload.stepSize || 10);
        });

        // Stop command
        levelCluster.on('stop', () => {
          this.log('Level stop command received');
        });

        levelCluster.on('stopWithOnOff', () => {
          this.log('Level stopWithOnOff command received');
        });
      }

      // v5.5.976: Enhanced Scenes cluster handling (Ernst02507 interview shows scenes in bindings)
      // TS004F devices use scenes cluster for button press types
      await this._setupScenesCluster(zclNode);

      // Set up command listeners for button events
      this._setupCommandListeners(zclNode);

    } catch (err) {
      this.log('Knob event handling setup error:', err.message);
    }
  }

  _setupCommandListeners(zclNode) {
    try {
      // Listen for raw commands on endpoint 1
      const endpoint = zclNode.endpoints[1];
      if (!endpoint) return;

      // Generic command handler for button presses
      endpoint.on('command', (clusterId, commandId, payload) => {
        this.log(`Command received - Cluster: ${clusterId}, Command: ${commandId}`, payload);
        
        // Handle multistate input for button actions
        if (clusterId === 18) { // Multistate Input cluster
          this._handleMultistateInput(payload);
        }
      });

    } catch (err) {
      this.log('Command listener setup error:', err.message);
    }
  }

  // v5.5.990: Enhanced Scenes cluster for TS004F (Ernst02507 fix)
  // TS004F sends button events via Scenes cluster, NOT OnOff attr reports
  async _setupScenesCluster(zclNode) {
    try {
      const ep = zclNode.endpoints[1];
      if (!ep) return;

      // Try to get scenes cluster from bindings (output cluster)
      const sc = ep.clusters?.scenes || ep.clusters?.[5] || 
                 ep.bindings?.scenes || ep.bindings?.[5];
      
      if (sc) {
        this.log('[SCENES] Setting up Scenes cluster listeners');
        
        // Listen for all possible scene events
        sc.on('recall', (p) => { 
          this.log('[SCENES] recall:', JSON.stringify(p)); 
          this._handleSceneCommand(p?.sceneId ?? p?.groupId ?? p); 
        });
        sc.on('recallScene', (p) => { 
          this.log('[SCENES] recallScene:', JSON.stringify(p)); 
          this._handleSceneCommand(p?.sceneId ?? p); 
        });
        sc.on('storeScene', (p) => { 
          this.log('[SCENES] storeScene:', JSON.stringify(p)); 
        });
        sc.on('addScene', (p) => { 
          this.log('[SCENES] addScene:', JSON.stringify(p)); 
          this._handleSceneCommand(p?.sceneId ?? 0); 
        });
        
        // Bind to receive scene commands
        if (typeof sc.bind === 'function') {
          await sc.bind().catch(e => this.log('[SCENES] Bind error:', e.message));
        }
        
        this.log('[SCENES] ✅ Scenes cluster listeners configured');
      } else {
        this.log('[SCENES] No scenes cluster found');
      }

      // v5.5.990: Also listen for raw scene commands via endpoint
      this._setupRawSceneListener(ep);
      
    } catch (e) { 
      this.log('[SCENES] Setup error:', e.message); 
    }
  }

  // v5.5.990: Raw scene command listener for TS004F (Ernst02507)
  _setupRawSceneListener(endpoint) {
    try {
      // Listen for commands on scenes cluster (0x0005 = 5)
      const originalHandleFrame = endpoint.handleFrame?.bind(endpoint);
      
      endpoint.handleFrame = (clusterId, frame, meta) => {
        // Scenes cluster = 5
        if (clusterId === 5 || clusterId === 0x0005) {
          this.log('[SCENES-RAW] Frame on cluster 5:', frame?.toString('hex'), meta);
          
          // Parse scene command
          if (frame && frame.length >= 1) {
            const cmdId = frame[0];
            // recallScene = 0x05, addScene = 0x00
            if (cmdId === 0x05 && frame.length >= 4) {
              const groupId = frame.readUInt16LE(1);
              const sceneId = frame[3];
              this.log('[SCENES-RAW] Recall scene:', sceneId, 'group:', groupId);
              this._handleSceneCommand(sceneId);
            }
          }
        }
        
        // Call original handler
        if (originalHandleFrame) {
          return originalHandleFrame(clusterId, frame, meta);
        }
      };
      
      this.log('[SCENES-RAW] Raw frame interceptor installed');
    } catch (e) {
      this.log('[SCENES-RAW] Setup error:', e.message);
    }
  }

  _handleSceneCommand(sceneId) {
    // Scene IDs: 0=single, 1=double, 2=long (TS004F pattern)
    const map = { 0: 'single', 1: 'double', 2: 'hold', 3: 'triple' };
    this._triggerButtonPress(map[sceneId] || `scene_${sceneId}`);
  }

  _handleMultistateInput(payload) {
    const action = payload.presentValue || payload;
    this.log('Multistate input action:', action);

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
      default:
        this.log('Unknown multistate action:', action);
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
    this.log('Rotate left triggered');
    
    if (this.hasCapability('button.rotate_left')) {
      await this.setCapabilityValue('button.rotate_left', true).catch(this.error);
      this.homey.setTimeout(() => {
        this.setCapabilityValue('button.rotate_left', false).catch(this.error);
      }, 100);
    }

    // Trigger flow card
    const rotateLeftTrigger = this.homey.flow.getDeviceTriggerCard('smart_knob_rotary_rotate_left');
    if (rotateLeftTrigger) {
      await rotateLeftTrigger.trigger(this, { 
        brightness: Math.round(this._simulatedBrightness * 100) 
      }).catch(this.error);
    }
  }

  async _triggerRotateRight() {
    this.log('Rotate right triggered');
    
    if (this.hasCapability('button.rotate_right')) {
      await this.setCapabilityValue('button.rotate_right', true).catch(this.error);
      this.homey.setTimeout(() => {
        this.setCapabilityValue('button.rotate_right', false).catch(this.error);
      }, 100);
    }

    // Trigger flow card
    const rotateRightTrigger = this.homey.flow.getDeviceTriggerCard('smart_knob_rotary_rotate_right');
    if (rotateRightTrigger) {
      await rotateRightTrigger.trigger(this, { 
        brightness: Math.round(this._simulatedBrightness * 100) 
      }).catch(this.error);
    }
  }

  async _triggerButtonPress(action) {
    this.log('Button press triggered:', action);
    
    if (this.hasCapability('button.press')) {
      await this.setCapabilityValue('button.press', true).catch(this.error);
      this.homey.setTimeout(() => {
        this.setCapabilityValue('button.press', false).catch(this.error);
      }, 100);
    }

    // Trigger flow card
    const pressTrigger = this.homey.flow.getDeviceTriggerCard('smart_knob_rotary_pressed');
    if (pressTrigger) {
      await pressTrigger.trigger(this, { action }).catch(this.error);
    }
  }

  onDeleted() {
    this.log('Smart Knob Rotary device deleted');
  }

}

module.exports = SmartKnobRotaryDevice;

