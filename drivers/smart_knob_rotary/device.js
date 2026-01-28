'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class SmartKnobRotaryDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Smart Knob Rotary device initialized');

    // Initialize brightness simulation state
    this._simulatedBrightness = 0.5;

    // Set initial dim value
    if (this.hasCapability('dim')) {
      await this.setCapabilityValue('dim', this._simulatedBrightness).catch(this.error);
    }

    // Setup battery reporting
    await this._setupBatteryReporting(zclNode);

    // Setup button/knob event handling
    await this._setupKnobEventHandling(zclNode);

    this.log('Smart Knob Rotary initialization complete');
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
        zclNode.endpoints[1].clusters[CLUSTER.ON_OFF.NAME].on('attr.onOff', (value) => {
          this.log('On/Off toggle received:', value);
          this._triggerButtonPress('toggle');
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

      // Handle Scenes cluster for scene button presses
      if (zclNode.endpoints[1] && zclNode.endpoints[1].clusters[CLUSTER.SCENES.NAME]) {
        zclNode.endpoints[1].clusters[CLUSTER.SCENES.NAME].on('recall', (payload) => {
          this.log('Scene recall:', payload);
          this._triggerButtonPress(`scene_${payload.sceneId}`);
        });
      }

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

